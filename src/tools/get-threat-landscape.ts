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
  const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : 25;
  const totalThreats = full.threats.length;
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
  /**
   * 0.20.0-beta.26 (§17-C) — quando TODOS os concerns declarados são não-roteáveis, o
   * roteamento cai para o âmbito largo e devolve ~25 ameaças de GOVERNAÇÃO (MT-001..025,
   * 8,4k tk) que não têm nada a ver com o que foi pedido. Cobrar esse payload para dizer
   * «não sei» é o oposto do contrato: agora pede DECLARAÇÃO, com a lista do que resolve.
   */
  const allUnsupported = declaredConcerns.length > 0 && unsupportedHere.length === declaredConcerns.length;
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
        values: [...new Set(unsupportedHere)].sort(),
        supported_values: support.supported,
        note:
          `Concerns VÁLIDOS do vocabulário que o mapa de ameaças não resolve: ${[...new Set(unsupportedHere)].sort().join(", ")}. ` +
          "Não são zero ameaças — são zero ameaças ROTEÁVEIS por este mapa. Como são TODOS os que declaraste, " +
          "a resposta é um pedido de declaração (`needs_input`) em vez de um panorama largo que não pediste. " +
          "NÃO concluas ausência de ameaças a partir desta resposta: para estes concerns usa select_sbd_toe_requirements."
      },
      needs_input: {
        reason:
          `Nenhum dos concerns declarados (${[...new Set(declaredConcerns)].sort().join(", ")}) é roteável pelo mapa de ameaças. ` +
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
      coverage: { total: 0, returned: 0, offset: 0, nextOffset: null, hasMore: false }
    } as unknown as GetThreatLandscapeResult;
  }

  const shaped = {
    ...full,
    ...(unsupportedHere.length > 0
      ? {
          unsupported_concerns: {
            values: [...new Set(unsupportedHere)].sort(),
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
      // 0.16.0 (v1.16 §1.23): nomes legíveis expostos — os dados subiram, a promessa diz a verdade nova.
      associated_control_names: threat.associated_control_names ?? [],
      associated_control_ids: threat.associated_control_ids ?? [],
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
