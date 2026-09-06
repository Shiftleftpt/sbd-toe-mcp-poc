/**
 * get_threat_landscape
 *
 * Deterministic threat resolution for a given application context using the
 * published SbD-ToE runtime bundle.
 *
 * Resolution order:
 *   1. Resolve consult-mode requirements and controls
 *   2. Scope threats by active requirement bundle/chapter context
 *   3. Resolve mitigated_by with direct > derived > heuristic confidence
 *   4. Enrich threats with related antipatterns and violated requirements
 */

import type {
  AntiPattern,
  AntiPatternRequirementLink,
  AntiPatternThreatLink,
  Threat
} from "./ontology-loader.js";
import {
  getOntologyData,
  resolveRequirementBundle,
  resolveThreatChapterNumber
} from "./ontology-loader.js";
import { estimateSize } from "../serving/response-shaping.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { _resolveConsultResult } from "./consult-security-requirements.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { threatLandscapeAffordances } from "../serving/affordances.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";

export interface MitigatingControl {
  control_id: string;
  name: string;
  domain: string;
}

export interface RelatedAntiPattern {
  antipattern_id: string;
  label: string;
  violated_requirement_ids: string[];
}

export interface ThreatWithConfidence extends Threat {
  id: string;
  name: string;
  mitigation_confidence: "direct" | "derived" | "heuristic";
  mitigated_by: MitigatingControl[];
  related_antipatterns: RelatedAntiPattern[];
  /** v1.16 §1.23: nomes legíveis dos controlos (233/233 no bundle). */
  associated_control_names: string[];
}

export interface McpProvenance {
  /** 0.20.0-beta.23: versão do SERVIDOR que produziu esta resposta (≠ `kg`, o conhecimento servido). */
  server: string;
  /** Compact version stamp: kg release_tag of the served pin (0.13.0). */
  kg: string;
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

export interface GetThreatLandscapeResult {
  provenance: McpProvenance;
  risk_level: string;
  threats: ThreatWithConfidence[];
  meta: {
    threatCount: number;
    activeChapters: string[];
    activeBundles: string[];
    concernsApplied: string[] | null;
    note: string;
  };
  /**
   * 0.20.0-beta.23 (P0-2): concerns VÁLIDOS do vocabulário que este mapa de ameaças
   * não resolve. Sem isto, 11 dos 24 concerns devolviam `total: 0` + `activeChapters: []`
   * indistinguíveis de «não há ameaças» — e o agente afirmava ausência com fundamento
   * no manual a partir de uma lista vazia. Zero mudo é o que este contrato proíbe.
   */
  unsupported_concerns?: {
    values: string[];
    supported_values: string[];
    note: string;
  };
  /** RF-H advisory band — adjacent tools the caller likely needs next (advisory; set by the handler). */
  next?: Affordance[];
}

function chapterNumber(chapterId: string): number {
  const match = /^(\d+)/.exec(chapterId);
  return match?.[1] !== undefined ? Number.parseInt(match[1], 10) : NaN;
}

/**
 * Concern → domain-chapter routing for threat selection. Requirements for some
 * concerns are defined in the requirements chapter (02) while the matching THREATS
 * live in the domain chapter — e.g. logging requirements are source_chapter 2, but
 * logging threats are in 12-monitorizacao-operacoes. Maps only the unambiguous
 * concerns (the concern name is the chapter's own domain) so those threats surface;
 * ambiguous concerns fall back to the requirement source_chapter.
 */
const CONCERN_TO_DOMAIN_CHAPTER: Readonly<Record<string, number>> = {
  logging: 12,
  iac: 8,
  distribution: 11,
  architecture: 4,
  requirements: 2
};

/**
 * Quais concerns o ROTEAMENTO DE AMEAÇAS resolve. Derivado (não declarado à mão): um
 * concern é suportado quando, declarado sozinho, activa pelo menos um capítulo de
 * ameaças. Estável entre níveis (verificado nos três) e calculado uma vez por processo.
 */
let SUPPORT_CACHE: { supported: string[]; unsupported: string[] } | null = null;
let probingSupport = false;
export function threatConcernSupport(): { supported: string[]; unsupported: string[] } {
  if (SUPPORT_CACHE) return SUPPORT_CACHE;
  if (probingSupport) return { supported: [], unsupported: [] };
  probingSupport = true;
  const supported: string[] = [];
  const unsupported: string[] = [];
  try {
    for (const entry of buildActivationVocabulary().concerns.values) {
      const concern = String(entry.value);
      const probe = handleGetThreatLandscape({ risk_level: "L3", concerns: [concern] });
      (probe.meta.threatCount > 0 ? supported : unsupported).push(concern);
    }
  } finally {
    probingSupport = false;
  }
  SUPPORT_CACHE = { supported: supported.sort(), unsupported: unsupported.sort() };
  return SUPPORT_CACHE;
}

function buildAntipatternIndexes(
  antipatterns: AntiPattern[],
  antipatternRequirementLinks: AntiPatternRequirementLink[],
  antipatternThreatLinks: AntiPatternThreatLink[]
): {
  antipatternById: Map<string, AntiPattern>;
  requirementIdsByAntipattern: Map<string, string[]>;
  antipatternIdsByThreat: Map<string, string[]>;
} {
  const antipatternById = new Map(
    antipatterns.map((antipattern) => [antipattern.antipattern_id, antipattern])
  );

  const requirementIdsByAntipattern = new Map<string, string[]>();
  for (const link of antipatternRequirementLinks) {
    const existing = requirementIdsByAntipattern.get(link.source_id) ?? [];
    existing.push(link.target_id);
    requirementIdsByAntipattern.set(link.source_id, existing);
  }

  const antipatternIdsByThreat = new Map<string, string[]>();
  for (const link of antipatternThreatLinks) {
    const existing = antipatternIdsByThreat.get(link.target_id) ?? [];
    existing.push(link.source_id);
    antipatternIdsByThreat.set(link.target_id, existing);
  }

  return { antipatternById, requirementIdsByAntipattern, antipatternIdsByThreat };
}

export function _resolveThreatLandscape(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): Omit<GetThreatLandscapeResult, "provenance"> {
  const {
    threats: allThreats,
    antipatterns = [],
    antipatternRequirementLinks = [],
    antipatternThreatLinks = [],
  } = ontologyData;

  const consult = _resolveConsultResult(args, ontologyData);
  const activeRequirementIds = new Set(
    consult.requirements.map((requirement) => requirement.requirement_id)
  );
  const activeDomains = new Set(consult.active_domains);
  const activeControls = consult.controls.map((control) => ({
    control_id: control.control_id,
    name: control.name,
    domain: control.domain,
    chapter_ids: control.chapter_ids ?? [],
    defining_chapter_ids: control.defining_chapter_ids ?? [],
  }));
  const activeControlIds = new Set(activeControls.map((control) => control.control_id));

  const inputConcerns = Array.isArray(args["concerns"])
    ? (args["concerns"] as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  const hasConcerns = inputConcerns.length > 0;

  // Threat routing is by THREAT DOMAIN, not by the requirements catalog's source
  // chapter. Base concerns (auth/encryption/validation/access/session) all have their
  // requirements catalogued in chapter 02, so routing by source_chapter collapsed every
  // base concern onto ch.02 — surfacing the requirements-process meta-threats
  // (MT-021..038) instead of the domain threats. We route by the concern's domain
  // (CONCERN_TO_DOMAIN_CHAPTER) and by the chapters the resolved CONTROLS live in.
  const activeChapterNumbers = new Set<number>();
  const activeBundles = new Set<string>();
  for (const concern of inputConcerns) {
    const domainChapter = CONCERN_TO_DOMAIN_CHAPTER[concern];
    if (domainChapter !== undefined) activeChapterNumbers.add(domainChapter);
  }
  // G-b decision 2 (2026-08-30): the DEFINING chapters of the activated controls count
  // as in-scope — a control that defines its content in a chapter brings that chapter's
  // threats with it (e.g. C1, identity/auth, defines in ch.02).
  const definingBundles = new Set<string>();
  for (const control of activeControls) {
    for (const chapterId of control.chapter_ids) {
      activeBundles.add(chapterId);
      const num = chapterNumber(chapterId);
      if (!Number.isNaN(num)) activeChapterNumbers.add(num);
    }
    for (const chapterId of control.defining_chapter_ids) {
      definingBundles.add(chapterId);
      activeBundles.add(chapterId);
      const num = chapterNumber(chapterId);
      if (!Number.isNaN(num)) activeChapterNumbers.add(num);
    }
  }
  // With no concern filter the caller wants the full landscape — fall back to every
  // applicable requirement's chapter/bundle (broad, spans all domains, not just ch.02).
  if (!hasConcerns) {
    for (const requirement of consult.requirements) {
      if (!Number.isNaN(requirement.source_chapter)) activeChapterNumbers.add(requirement.source_chapter);
      const bundle = resolveRequirementBundle(requirement);
      if (typeof bundle === "string" && bundle.length > 0) activeBundles.add(bundle);
    }
  }
  // Chapter 02 (requisitos-seguranca) holds the requirements-process meta-threats.
  // Surface them when the caller explicitly targets requirements OR when an activated
  // control DEFINES in ch.02 (G-b decision 2) — never as a side effect of a control
  // merely catalogued there.
  const wantsRequirements =
    !hasConcerns ||
    inputConcerns.includes("requirements") ||
    definingBundles.has("02-requisitos-seguranca");
  if (!wantsRequirements) {
    activeChapterNumbers.delete(2);
    activeBundles.delete("02-requisitos-seguranca");
  }

  const controlsByChapter = new Map<string, MitigatingControl[]>();
  for (const control of activeControls) {
    for (const chapterId of new Set([...control.chapter_ids, ...control.defining_chapter_ids])) {
      const existing = controlsByChapter.get(chapterId) ?? [];
      if (!existing.some((c) => c.control_id === control.control_id)) {
        existing.push({
          control_id: control.control_id,
          name: control.name,
          domain: control.domain,
        });
      }
      controlsByChapter.set(chapterId, existing);
    }
  }

  const {
    antipatternById,
    requirementIdsByAntipattern,
    antipatternIdsByThreat,
  } = buildAntipatternIndexes(antipatterns, antipatternRequirementLinks, antipatternThreatLinks);

  const threats: ThreatWithConfidence[] = [];

  for (const threat of allThreats) {
    const threatId = threat.id ?? threat.mitigated_threat_id ?? "";
    const threatName = threat.title ?? threat.threat_label_raw ?? "";
    const threatChapterId = threat.chapter_id ?? "";
    const threatChapterNumber = resolveThreatChapterNumber(threat);
    const directControlIds = (threat.canonical_control_ids ?? []).filter((controlId) =>
      activeControlIds.has(controlId)
    );
    const derivedControls = controlsByChapter.get(threatChapterId) ?? [];

    const relatedAntipatternIds = antipatternIdsByThreat.get(threatId) ?? [];
    const related_antipatterns: RelatedAntiPattern[] = relatedAntipatternIds
      .map((antipatternId) => {
        const antipattern = antipatternById.get(antipatternId);
        if (!antipattern) return undefined;
        const violatedRequirementIds = [
          ...new Set(requirementIdsByAntipattern.get(antipatternId) ?? []),
        ];
        return {
          antipattern_id: antipattern.antipattern_id,
          label: antipattern.label,
          violated_requirement_ids: violatedRequirementIds,
        };
      })
      .filter((item): item is RelatedAntiPattern => item !== undefined);

    const hasActiveRequirementLink = related_antipatterns.some((antipattern) =>
      antipattern.violated_requirement_ids.some((requirementId) =>
        activeRequirementIds.has(requirementId)
      )
    );

    const directMatch = directControlIds.length > 0;
    const bundleMatch = threatChapterId.length > 0 && activeBundles.has(threatChapterId);
    const chapterMatch =
      !Number.isNaN(threatChapterNumber) && activeChapterNumbers.has(threatChapterNumber);
    const derivedMatch = bundleMatch || chapterMatch || hasActiveRequirementLink;

    const lowerThreatChapter = threatChapterId.toLowerCase();
    const heuristicMatch = [...activeDomains].some((domain) =>
      lowerThreatChapter.includes(domain.replace(/_/g, "-"))
    );

    if (!directMatch && !derivedMatch && !heuristicMatch) {
      continue;
    }

    let mitigation_confidence: ThreatWithConfidence["mitigation_confidence"];
    let mitigated_by: MitigatingControl[];

    if (directMatch) {
      mitigation_confidence = "direct";
      mitigated_by = activeControls
        .filter((control) => directControlIds.includes(control.control_id))
        .map(({ chapter_ids: _chapterIds, ...control }) => control);
    } else if (derivedControls.length > 0) {
      mitigation_confidence = "derived";
      mitigated_by = derivedControls;
    } else if (derivedMatch) {
      mitigation_confidence = "derived";
      mitigated_by = [];
    } else {
      mitigation_confidence = "heuristic";
      mitigated_by = [];
    }

    threats.push({
      ...threat,
      id: threatId,
      name: threatName,
      mitigation_confidence,
      mitigated_by,
      related_antipatterns,
      associated_control_names: threat.associated_control_names ?? [],
    });
  }

  threats.sort((left, right) => {
    const rank = { direct: 0, derived: 1, heuristic: 2 } as const;
    const confidenceOrder = rank[left.mitigation_confidence] - rank[right.mitigation_confidence];
    if (confidenceOrder !== 0) return confidenceOrder;
    return (left.chapter_id ?? "").localeCompare(right.chapter_id ?? "");
  });

  return {
    risk_level: consult.risk_level,
    threats,
    meta: {
      threatCount: threats.length,
      activeChapters: [...activeChapterNumbers].sort((a, b) => a - b).map(String),
      activeBundles: [...activeBundles].sort(),
      concernsApplied: consult.meta.concernsApplied,
      note:
        "Threat applicability resolves from consult-mode requirement scope; the defining chapters of activated controls count as in-scope (G-b 2026-08-30). mitigation_confidence uses direct control references first, then chapter/bundle or antipattern-derived alignment, then heuristic domain fallback. ORDEM (0.20.0-beta.26): as ameaças vêm ordenadas por mitigation_confidence e, dentro do mesmo grau, por chapter_id — NÃO é um ranking de relevância para a tua tarefa, e a paginação segue essa mesma ordem. Não presumas que as primeiras são as mais relevantes; para reduzir o âmbito, declara `concerns`.",
    },
  };
}

export function handleGetThreatLandscape(
  args: Record<string, unknown>
): GetThreatLandscapeResult {
  const full = _resolveThreatLandscape(args, getOntologyData());
  // 0.15.0 (P0-1): paginação universal — default 25; coverage + size_estimate sempre.
  /**
   * 0.20.0-beta.28 — a deduplicação é um NÍVEL DE SERIALIZAÇÃO, não uma remoção.
   * `associated_control_ids` é contrato publicado (v1.14 §1.21): renomeá-lo por omissão
   * seria a mesma classe de dano que este ciclo combate. `full` fica byte-idêntico;
   * `standard`/`minimal` trocam os arrays repetidos por refs + legenda (−50% medido).
   */
  const detailArg = typeof args["detail"] === "string" ? (args["detail"] as string) : undefined;
  if (detailArg !== undefined && !["full", "standard", "minimal"].includes(detailArg)) {
    throw Object.assign(new Error(`Invalid detail: "${detailArg}". Allowed: full, standard, minimal.`), {
      rpcError: { code: -32602, message: `Invalid detail: "${detailArg}". Allowed: full, standard, minimal.` }
    });
  }
  const dedupe = detailArg === "standard" || detailArg === "minimal";

  const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : 25;
  const totalThreats = full.threats.length;
  const allThreatsForRouting = full.threats;
  const pagedThreats = full.threats.slice(offsetArg, offsetArg + limitArg);
  const nextOffset = offsetArg + pagedThreats.length < totalThreats ? offsetArg + pagedThreats.length : null;
  full.threats = pagedThreats;
  // 0.20.0-beta.23 (P0-2): concerns válidos que este roteamento não resolve são
  // DECLARADOS. `total: 0` com `activeChapters: []` não distingue «não há ameaças» de
  // «este concern não se resolve aqui» — e o agent-guide mandava afirmar ausência
  // fundamentada no manual a partir dessa lista vazia.
  const declaredConcerns = Array.isArray(args["concerns"])
    ? (args["concerns"] as unknown[]).filter((c): c is string => typeof c === "string")
    : [];
  const support = declaredConcerns.length > 0 ? threatConcernSupport() : { supported: [], unsupported: [] };
  const unsupportedHere = declaredConcerns.filter((c) => support.unsupported.includes(c));
  // beta.27: valores FORA do vocabulário eram ignorados em silêncio aqui (o `select`
  // declara-os em `unknown_concerns` desde a beta.22). Mesma classe, quarta instância —
  // apanhada pela invariante entre superfícies, não por um avaliador.
  // A fonte de «conhecido» é o VOCABULÁRIO, não a sondagem de suporte: `threatConcernSupport()`
  // devolve listas vazias enquanto está a sondar (guarda de recursão), e usá-la aqui fazia a
  // cache classificar TODOS os concerns como desconhecidos — resultado dependente da ordem
  // da primeira chamada. Apanhado pela suite antes de sair da lane.
  const knownConcerns = new Set(buildActivationVocabulary().concerns.values.map((c) => String(c.value)));
  const unknownHere = declaredConcerns.filter((c) => !knownConcerns.has(c));
  /**
   * 0.20.0-beta.26 (§17-C) — quando TODOS os concerns declarados são não-roteáveis, o
   * roteamento cai para o âmbito largo e devolve ~25 ameaças de GOVERNAÇÃO (MT-001..025,
   * 8,4k tk) que não têm nada a ver com o que foi pedido. Cobrar esse payload para dizer
   * «não sei» é o oposto do contrato: agora pede DECLARAÇÃO, com a lista do que resolve.
   */
  const allUnsupported =
    declaredConcerns.length > 0 && unsupportedHere.length + unknownHere.length === declaredConcerns.length;
  if (allUnsupported) {
    return {
      provenance: {
        kg: servedKgReleaseTag(),
        server: servingServerVersion(),
        content_type: "derived",
        produced_by: "threat_resolution_pipeline",
        source_data: "runtime/v1/manual_threat_mitigation.jsonl + activation vocabulary",
        note: "Pedido de DECLARAÇÃO, não resultado: nenhum dos concerns declarados é roteável por este mapa."
      },
      risk_level: full.risk_level,
      threats: [],
      /**
       * A garantia da beta.23 mantém-se LITERAL: quem aprendeu a ler
       * `unsupported_concerns` continua a lê-lo. O `needs_input` acrescenta-se — não
       * substitui. Uma promessa cumprida não se retira por se ter arranjado melhor.
       */
      unsupported_concerns: {
        values: [...new Set([...unsupportedHere, ...unknownHere])].sort(),
        supported_values: support.supported,
        note:
          `Concerns VÁLIDOS do vocabulário que o mapa de ameaças não resolve: ${[...new Set(unsupportedHere)].sort().join(", ")}. ` +
          "Não são zero ameaças — são zero ameaças ROTEÁVEIS por este mapa. Como são TODOS os que declaraste, " +
          "a resposta é um pedido de declaração (`needs_input`) em vez de um panorama largo que não pediste. " +
          "NÃO concluas ausência de ameaças a partir desta resposta: para estes concerns usa select_sbd_toe_requirements."
      },
      needs_input: {
        reason:
          `Nenhum dos concerns declarados (${[...new Set(declaredConcerns)].sort().join(", ")}) é roteável pelo mapa de ameaças` +
          (unknownHere.length > 0 ? ` (fora do vocabulário: ${[...new Set(unknownHere)].sort().join(", ")})` : "") + ". " +
          "Sem esta paragem a resposta seria o âmbito largo — ameaças de GOVERNAÇÃO sem relação com o que pediste, " +
          "a custo de payload cheio, para acabar a dizer que não sabe. Zero útil não é uma resposta.",
        supported_concerns: support.supported,
        note:
          "Estes concerns TÊM requisitos — o que falta é roteamento de AMEAÇAS. Para eles usa " +
          "`select_sbd_toe_requirements` com os mesmos concerns; para ameaças, declara um valor de `supported_concerns` " +
          "(ou chama sem `concerns` se queres mesmo o panorama largo, sabendo que é largo).",
        next: [
          { intent: "Requisitos dos concerns que declaraste (existem)", tool: "select_sbd_toe_requirements", with: `risk_level="${full.risk_level}", concerns=[${declaredConcerns.map((c) => `"${c}"`).join(", ")}]`, kind: "structural" as const },
          { intent: "Ameaças de um concern que este mapa resolve", tool: "get_threat_landscape", with: `risk_level="${full.risk_level}", concerns=["${support.supported[0] ?? "auth"}"]`, kind: "structural" as const }
        ]
      },
      meta: {
        threatCount: 0,
        activeChapters: [],
        activeBundles: [],
        concernsApplied: declaredConcerns,
        note: "needs_input: nenhum concern roteável declarado. Nada foi resolvido — e por isso nada é cobrado."
      },
      coverage: { total: 0, returned: 0, offset: 0, nextOffset: null, hasMore: false },
      // RF-H: a banda `next` está em TODAS as respostas — um pedido de declaração também
      // é uma resposta. Apanhado pela suite de affordances antes de sair da lane.
      next: threatLandscapeAffordances(full.risk_level, support.supported.slice(0, 2))
    } as unknown as GetThreatLandscapeResult;
  }

  /**
   * 0.20.0-beta.27 — o concern RESOLVE mas o NÍVEL não traz capítulos: zero ameaças sem
   * uma palavra. Mesma classe do `empty_at_level` do consult, encontrada pela invariante
   * entre superfícies (privacy@L1, threat_modeling@L1).
   */
  const emptyByLevel =
    declaredConcerns.length > 0 &&
    unsupportedHere.length === 0 &&
    unknownHere.length === 0 &&
    full.threats.length === 0;

  /**
   * 0.20.0-beta.28 — COBERTURA NOMINAL SEM ROUTING REAL.
   *
   * `files` e `privacy` devolviam ~15 meta-ameaças de governação (MT-021..) vindas do
   * cap. 02, sem uma única ameaça dos capítulos do próprio concern — «pior que o
   * unsupported_concerns honesto: antes dizia que não sabia, agora entrega irrelevante com
   * ar de fundamentado». O routing continua nominalmente a resolver; o que faltava era
   * dizer que nada veio do domínio pedido.
   */
  /**
   * 0.20.0-beta.28 — BASE DO ROUTING declarada.
   *
   * `files`/`privacy` devolviam dezenas de ameaças de capítulos sem relação com o concern
   * (06/07/08/12 para manipulação de ficheiros) porque o routing passa pelos capítulos onde
   * os CONTROLOS activados se definem — não por um domínio de ameaças do concern. As
   * ameaças eram reais; a relevância era nominal, e nada o dizia.
   *
   * Duas afirmações, ambas derivadas dos dados do próprio roteamento:
   *  - a BASE: domínio próprio do concern, ou capítulos dos controlos activados;
   *  - se o concern TEM domínio próprio e ele não contribuiu com uma única ameaça, isso é
   *    cobertura NOMINAL e é dito como tal.
   * O cap. 02 nunca conta como prova de domínio: é o capítulo das meta-ameaças de processo.
   */
  const vocabForRouting = buildActivationVocabulary();
  const domainChapters = new Set<number>();
  for (const c of declaredConcerns) {
    const own = CONCERN_TO_DOMAIN_CHAPTER[c];
    if (own !== undefined) domainChapters.add(own);
    const entry = vocabForRouting.concerns.values.find((x) => String(x.value) === c);
    for (const chapter of entry?.activates_chapters ?? []) {
      const n = chapterNumber(chapter);
      if (!Number.isNaN(n)) domainChapters.add(n);
    }
  }
  domainChapters.delete(2);
  // conjunto COMPLETO (antes da paginação): paginar não pode mudar o veredicto
  const allThreatChapters = new Set(allThreatsForRouting.map((t) => chapterNumber(String(t.chapter_id ?? ""))));
  const hasDomain = domainChapters.size > 0;
  const fromDomain = [...domainChapters].some((c) => allThreatChapters.has(c));
  const nominalOnly = declaredConcerns.length > 0 && totalThreats > 0 && hasDomain && !fromDomain;

  /**
   * Deduplicação: `associated_control_names` vinha repetido verbatim em cada ameaça —
   * 241 entradas para 13 nomes distintos, 2.585 tk de um payload de 11.944 (~22%).
   * Legenda + referências: nenhum nome se perde, muda só a codificação.
   */
  const controlLegend: string[] = [];
  const refOf = (name: string): number => {
    const at = controlLegend.indexOf(name);
    if (at >= 0) return at;
    controlLegend.push(name);
    return controlLegend.length - 1;
  };
  // `associated_control_ids` era a instância AO LADO da mesma classe, no mesmo payload:
  // os CTRL-* repetidos verbatim ×36. A varredura apanhou-a; corrige-se com a de cima.
  const controlIdLegend: string[] = [];
  const refOfId = (id: string): number => {
    const at = controlIdLegend.indexOf(id);
    if (at >= 0) return at;
    controlIdLegend.push(id);
    return controlIdLegend.length - 1;
  };
  const shaped = {
    ...full,
    ...(dedupe
      ? {
          associated_control_legend: {
            names: controlLegend,
            ids: controlIdLegend,
      note:
        `Os ${controlLegend.length} nomes e ${controlIdLegend.length} ids DISTINTOS de controlos associados; cada ameaça ` +
        "refere-os por índice em `associated_control_name_refs` e `associated_control_id_refs`. Dedup de " +
              "serialização (0.20.0-beta.28): nada se perde — antes vinham repetidos verbatim em cada ameaça."
          }
        }
      : {}),
    ...(declaredConcerns.length > 0 && totalThreats > 0
      ? {
          routing_basis: {
            basis: hasDomain ? ("domain_chapter" as const) : ("activated_controls" as const),
            note: hasDomain
              ? `Estes concerns têm capítulo(s) de ameaças próprio(s): ${[...domainChapters].sort((a, b) => a - b).join(", ")}.`
              : "Estes concerns NÃO têm capítulo de ameaças próprio: as ameaças chegam pelos capítulos onde se DEFINEM os controlos que eles activam. São ameaças reais do âmbito activado, mas não são «as ameaças deste domínio» — o manual pode não publicar ameaças específicas para ele. Os REQUISITOS existem: `select_sbd_toe_requirements`."
          }
        }
      : {}),
    ...(nominalOnly
      ? {
          routing_note: {
            declared_concerns: [...new Set(declaredConcerns)].sort(),
            domain_chapters: [...domainChapters].sort((a, b) => a - b).map(String),
            threat_chapters: [...allThreatChapters].filter((n) => !Number.isNaN(n)).sort((a, b) => a - b).map(String),
            note:
              (hasDomain
                ? `COBERTURA NOMINAL: nenhuma das ${totalThreats} ameaças vem dos capítulos de domínio dos concerns ` +
                  `declarados (${[...domainChapters].sort((a, b) => a - b).join(", ")}). `
                : `COBERTURA NOMINAL: os concerns declarados não têm capítulo de ameaças próprio — as ${totalThreats} ` +
                  "ameaças vêm todas do âmbito alargado. ") +
              "São sobretudo meta-ameaças de PROCESSO (cap. 02) e do âmbito largo, NÃO ameaças específicas do domínio " +
              "que pediste. Não as apresentes como o panorama de ameaças desse domínio: para estes concerns o manual " +
              "pode simplesmente não publicar ameaças roteáveis. Os REQUISITOS existem — usa `select_sbd_toe_requirements`."
          }
        }
      : {}),
    ...(emptyByLevel
      ? {
          empty_at_level: {
            concerns: [...new Set(declaredConcerns)].sort(),
            level: full.risk_level,
            note:
              `Os concerns declarados são roteáveis, mas a ${full.risk_level} não activam capítulo nenhum — por isso zero ameaças. ` +
              "NÃO é ausência de ameaças nem «não aplicável»: é o NÍVEL. Confirma noutro nível ou com " +
              "`select_sbd_toe_requirements`, e não apresentes este vazio como «manual-grounded»."
          }
        }
      : {}),
    ...(unsupportedHere.length + unknownHere.length > 0
      ? {
          unsupported_concerns: {
            values: [...new Set([...unsupportedHere, ...unknownHere])].sort(),
            supported_values: support.supported,
            note:
              `Concerns VÁLIDOS do vocabulário que o mapa de ameaças não resolve: ${[...new Set(unsupportedHere)].sort().join(", ")}. ` +
              "Não são zero ameaças — são zero ameaças ROTEÁVEIS por este mapa, que cobre os domínios listados em supported_values. " +
              "NÃO concluas ausência de ameaças a partir desta resposta, nem a declares fundamentada no manual: para estes concerns usa " +
              "select_sbd_toe_requirements (os requisitos existem e aplicam-se) e consulta o capítulo de domínio."
          }
        }
      : {}),
    coverage: { total: totalThreats, returned: pagedThreats.length, offset: offsetArg, nextOffset, hasMore: nextOffset !== null },
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "threat_resolution_pipeline",
      source_data:
        "runtime/v1/manual_threat_mitigation.jsonl (threat_substantive; legacy runtime/threats.json superseded) + runtime/requirement_control_links.json + runtime/antipatterns.json + runtime/antipattern_requirement_links.json + runtime/antipattern_threat_links.json",
      note:
        "Threat entries are canonical runtime entities. Mitigation and antipattern enrichment are derived structurally from the published deterministic runtime bundle.",
    },
    threats: full.threats.map((threat) => ({
      id: threat.id,
      name: threat.name,
      mitigation_confidence: threat.mitigation_confidence,
      mitigated_by: threat.mitigated_by,
      related_antipatterns: threat.related_antipatterns,
      // Surface the threat's own association fields carried by the substrate.
      // Contract v1.14 §1.21: associated_control_ids are structural CTRL-* ids with a
      // DECLARED derivation; associated_controls_text is the Manual's prose;
      // associated_controls stays as-is for compatibility. Nothing invented.
      associated_controls: threat.associated_controls ?? [],
      // 0.20.0-beta.28: os NOMES vão para uma legenda e ficam aqui as referências —
      // vinham repetidos verbatim em cada ameaça (241 entradas para 13 nomes distintos,
      // ~22% do payload). Dedup de serialização: nenhum nome se perde.
      ...(dedupe
        ? { associated_control_name_refs: (threat.associated_control_names ?? []).map(refOf) }
        : { associated_control_names: threat.associated_control_names ?? [] }),
      ...(dedupe
        ? { associated_control_id_refs: (threat.associated_control_ids ?? []).map(refOfId) }
        : { associated_control_ids: threat.associated_control_ids ?? [] }),
      ...(threat.associated_controls_text ? { associated_controls_text: threat.associated_controls_text } : {}),
      ...(threat.associated_control_ids_derivation
        ? { associated_control_ids_derivation: threat.associated_control_ids_derivation }
        : {}),
      ...(threat.mitigated_threat_id ? { mitigated_threat_id: threat.mitigated_threat_id } : {}),
      ...(threat.chapter_id ? { chapter_id: threat.chapter_id } : {}),
      ...(threat.mitigation_summary ? { mitigation_summary: threat.mitigation_summary } : {}),
      ...(threat.how_it_arises ? { how_it_arises: threat.how_it_arises } : {}),
      ...(threat.methodology ? { methodology: threat.methodology } : {}),
      ...(threat.essence ? { essence: threat.essence } : {}),
      ...(threat.threat_category ? { threat_category: threat.threat_category } : {}),
      ...(threat.mitigation_strength ? { mitigation_strength: threat.mitigation_strength } : {}),
    })),
    next: threatLandscapeAffordances(full.risk_level, full.meta.concernsApplied ?? undefined),
  };
  return { ...shaped, size_estimate: estimateSize(shaped) } as unknown as GetThreatLandscapeResult;
}
