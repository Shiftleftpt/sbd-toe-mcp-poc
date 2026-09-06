/**
 * consult_security_requirements
 *
 * Deterministic resolution of requirements, controls and artifacts for a given
 * application context using the published SbD-ToE runtime contract.
 *
 * Resolution order:
 *   1. Filter canonical requirements by risk level
 *   2. Optionally narrow by concern-mapped categories
 *   3. Resolve controls primarily via requirement_control_links
 *   4. Complement with ontology domain_mapping traversal
 *   5. Resolve artifacts via control.artifact_types and artifact_requirements
 */

import type {
  Artifact,
  ArtifactRequirement,
  Control,
  Requirement,
  RequirementControlLink
} from "./ontology-loader.js";
import { estimateSize } from "../serving/response-shaping.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { categoriesForConcerns, type Concern } from "./prepare-codegen-context.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";
import { getOntologyData } from "./ontology-loader.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { consultAffordances } from "../serving/affordances.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(v);
}

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[\s/]+/g, "-").replace(/_/g, "-");
}

export interface RequirementSlim {
  requirement_id: string;
  name: string;
  category: string;
  type: string;
}

export interface ControlSlim {
  control_id: string;
  name: string;
  domain: string;
  control_type: string;
  applicable_lifecycle_phases: string[];
  chapter_ids?: string[];
  _confidence: "direct" | "derived";
}

export interface ArtifactSlim {
  artifact_type_id: string;
  name: string;
  category?: string;
  lifecycle_phases: string[];
  mandatory: boolean;
  _coverage: "direct" | "derived";
}

export interface ControlWithConfidence extends Control {
  _confidence: "direct" | "derived";
}

export interface ArtifactWithCoverage extends Artifact {
  mandatory: boolean;
  source_requirement_ids: string[];
  source_control_ids: string[];
  _coverage: "direct" | "derived";
}

/**
 * Declared coverage gap (Codex handover 2026-08-29, gap (a)): active requirements with
 * no `requirement_control_links` entry. The link layer is the semantic layer of
 * 2026-04-07, outside the deterministic recompile; requirements added since (AGN ×4,
 * ARC-014/015, DEP-011…014, DPL-010/011, OPS-011…014, GOV-013/014, THR-008, VAL-008)
 * carry no control link. They are SERVED with the absence declared — never omitted,
 * never given invented controls.
 */
export interface RequirementControlLinkGap {
  count: number;
  requirement_ids: string[];
  note: string;
}

export interface ConsultCoverageGaps {
  requirements_without_control_link: RequirementControlLinkGap;
}

/**
 * O que o `consult` resolve, DERIVADO (não escrito à mão): um concern é suportado quando o
 * mapa publicado lhe dá pelo menos uma categoria. Depois da correcção do P0 são os 24 —
 * a função fica porque o mecanismo tem de cobrir o que vier, não só o que já apareceu.
 */
let consultSupportCache: string[] | null = null;
export function consultSupportedConcerns(): string[] {
  if (consultSupportCache) return consultSupportCache;
  consultSupportCache = buildActivationVocabulary()
    .concerns.values.map((c) => String(c.value))
    .filter((c) => categoriesForConcerns([c as Concern]).size > 0)
    .sort();
  return consultSupportCache;
}

export interface ConsultSecurityRequirementsResult {
  risk_level: string;
  active_categories: string[];
  active_domains: string[];
  requirements: Requirement[];
  controls: ControlWithConfidence[];
  artifacts: ArtifactWithCoverage[];
  rule_trace: string[];
  /**
   * 0.20.0-beta.27: concerns válidos que ESTA superfície não resolve — mesmo mecanismo do
   * get_threat_landscape (beta.23). Presente só quando há algum; nunca um vazio mudo.
   */
  unsupported_concerns?: {
    values: string[];
    supported_values: string[];
    note: string;
  };
  /**
   * 0.20.0-beta.27 — o concern RESOLVE mas o NÍVEL não tem nada dessas categorias.
   * `privacy`@L1 dava 0 sem uma palavra: não é ausência de obrigação, é o nível. O
   * `select` já o dizia desde a beta.22 (needs_input explicando o nível); o `consult` não —
   * a mesma classe, noutra tool, encontrada pela invariante entre superfícies.
   */
  empty_at_level?: {
    concerns: string[];
    level: string;
    categories: string[];
    present_at_levels: string[];
    note: string;
  };
  coverage_gaps: ConsultCoverageGaps;
  meta: {
    requirementCount: number;
    controlCount: number;
    artifactCount: number;
    concernsApplied: string[] | null;
    note: string;
  };
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

export interface ConsultRequirementsIndexEntry {
  category: string;
  count: number;
  requirement_ids: string[];
}

export interface ConsultSecurityRequirementsOutput {
  size_estimate?: { chars: number; approx_tokens: number };
  projection_note?: string;
  provenance: McpProvenance;
  risk_level: string;
  active_categories: string[];
  active_domains: string[];
  requirements: RequirementSlim[];
  controls: ControlSlim[];
  artifacts: ArtifactSlim[];
  rule_trace: string[];
  /** 0.20.0-beta.27: resolvido, mas o NÍVEL não tem requisitos destas categorias. */
  empty_at_level?: {
    concerns: string[];
    level: string;
    categories: string[];
    present_at_levels: string[];
    note: string;
  };
  /** 0.20.0-beta.27: concerns válidos que esta superfície não resolve — nunca um vazio mudo. */
  unsupported_concerns?: {
    values: string[];
    supported_values: string[];
    note: string;
  };
  coverage_gaps: ConsultCoverageGaps;
  /** mode: "index" (opt-in, additive): per-category index replacing the full requirement bodies. */
  index?: ConsultRequirementsIndexEntry[];
  meta: {
    requirementCount: number;
    controlCount: number;
    artifactCount: number;
    concernsApplied: string[] | null;
    note: string;
  };
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next: Affordance[];
}

function pushArtifactCandidate(
  bucket: Map<string, ArtifactWithCoverage>,
  artifact: Artifact,
  attrs: {
    mandatory: boolean;
    source_requirement_ids?: string[];
    source_control_ids?: string[];
    coverage: "direct" | "derived";
  }
): void {
  const existing = bucket.get(artifact.artifact_type_id);
  const nextRequirementIds = new Set([
    ...(existing?.source_requirement_ids ?? []),
    ...(attrs.source_requirement_ids ?? []),
  ]);
  const nextControlIds = new Set([
    ...(existing?.source_control_ids ?? []),
    ...(attrs.source_control_ids ?? []),
  ]);

  bucket.set(artifact.artifact_type_id, {
    ...artifact,
    mandatory: existing?.mandatory === true || attrs.mandatory,
    source_requirement_ids: [...nextRequirementIds].sort(),
    source_control_ids: [...nextControlIds].sort(),
    _coverage:
      existing?._coverage === "direct" || attrs.coverage === "direct" ? "direct" : "derived",
  });
}

function buildArtifacts(
  activeRequirements: Requirement[],
  activeControls: ControlWithConfidence[],
  artifacts: Artifact[],
  artifactRequirements: ArtifactRequirement[]
): ArtifactWithCoverage[] {
  const artifactById = new Map(artifacts.map((artifact) => [artifact.artifact_type_id, artifact]));
  const artifactsByKey = new Map<string, Artifact>();
  for (const artifact of artifacts) {
    artifactsByKey.set(normalizeToken(artifact.artifact_type_id), artifact);
    artifactsByKey.set(normalizeToken(artifact.name), artifact);
    for (const alias of artifact.canonical_aliases ?? []) {
      artifactsByKey.set(normalizeToken(alias), artifact);
    }
  }
  const activeRequirementIds = new Set(activeRequirements.map((requirement) => requirement.requirement_id));
  const activeControlIds = new Set(activeControls.map((control) => control.control_id));
  const bucket = new Map<string, ArtifactWithCoverage>();

  for (const link of artifactRequirements) {
    const requirementActive = activeRequirementIds.has(link.requirement_id);
    const controlHits = link.source_control_ids.filter((controlId) => activeControlIds.has(controlId));
    if (!requirementActive && controlHits.length === 0) continue;

    const artifact = artifactById.get(link.artifact_type_id);
    if (!artifact) continue;

    pushArtifactCandidate(bucket, artifact, {
      mandatory: link.mandatory,
      source_requirement_ids: requirementActive ? [link.requirement_id] : [],
      source_control_ids: controlHits,
      coverage: "direct",
    });
  }

  for (const control of activeControls) {
    for (const artifactType of control.artifact_types ?? []) {
      const artifact =
        artifactById.get(artifactType) ??
        artifactsByKey.get(normalizeToken(artifactType));
      if (!artifact) continue;

      pushArtifactCandidate(bucket, artifact, {
        mandatory: false,
        source_control_ids: [control.control_id],
        coverage: control._confidence === "direct" ? "direct" : "derived",
      });
    }
  }

  for (const artifact of artifacts) {
    const producedBy = artifact.produced_by_controls.filter((controlId) => activeControlIds.has(controlId));
    const validatedBy = artifact.validated_by_controls.filter((controlId) => activeControlIds.has(controlId));
    const controlHits = [...new Set([...producedBy, ...validatedBy])];
    if (controlHits.length === 0) continue;

    pushArtifactCandidate(bucket, artifact, {
      mandatory: false,
      source_control_ids: controlHits,
      coverage: "derived",
    });
  }

  return [...bucket.values()].sort((a, b) => {
    if (a._coverage !== b._coverage) {
      return a._coverage === "direct" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

function buildControls(
  filteredRequirements: Requirement[],
  allControls: Control[],
  requirementControlLinks: RequirementControlLink[],
  activeDomains: string[]
): ControlWithConfidence[] {
  const controlById = new Map(allControls.map((control) => [control.control_id, control]));
  const activeRequirementIds = new Set(filteredRequirements.map((requirement) => requirement.requirement_id));

  const directControlIds = new Set(
    requirementControlLinks
      .filter(
        (link) => link.link_type === "maps_to_control" && activeRequirementIds.has(link.source_id)
      )
      .map((link) => link.target_id)
  );

  const controls = new Map<string, ControlWithConfidence>();

  for (const controlId of directControlIds) {
    const control = controlById.get(controlId);
    if (!control) continue;
    controls.set(control.control_id, { ...control, _confidence: "direct" });
  }

  const activeDomainsSet = new Set(activeDomains);
  for (const control of allControls) {
    if (!activeDomainsSet.has(control.domain) || controls.has(control.control_id)) continue;
    controls.set(control.control_id, { ...control, _confidence: "derived" });
  }

  return [...controls.values()].sort((a, b) => {
    if (a._confidence !== b._confidence) {
      return a._confidence === "direct" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function _resolveConsultResult(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): ConsultSecurityRequirementsResult {
  const {
    domainMapping,
    concernsMap,
    requirements: allRequirements,
    controls: allControls,
    artifacts: allArtifacts = [],
    artifactRequirements = [],
    requirementControlLinks = [],
  } = ontologyData;

  const riskLevelArg = args["risk_level"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw Object.assign(
      new Error(`Invalid risk_level: "${String(riskLevelArg)}". Allowed values: L1, L2, L3.`),
      { rpcError: { code: -32602, message: `Invalid risk_level: "${String(riskLevelArg)}"` } }
    );
  }
  const riskLevel: RiskLevel = riskLevelArg;

  let concernsApplied: string[] | null = null;
  const concernsArg = args["concerns"];
  if (Array.isArray(concernsArg) && concernsArg.length > 0) {
    concernsApplied = concernsArg.filter((concern): concern is string => typeof concern === "string");
  }

  let filteredRequirements = allRequirements.filter(
    (requirement) => requirement.applicable_levels?.[riskLevel] === true
  );
  /** Quantos se aplicam ao NÍVEL, antes de qualquer filtro de concern (o trace precisa). */
  const atLevelCount = filteredRequirements.length;

  /**
   * 0.20.0-beta.27 (P0 da adenda) — o `consult` resolvia concerns por `concernsMap` CRU,
   * enquanto o vocabulário publicado e o `select` resolvem por `concernsMap ∪ suplemento`.
   * Os 11 concerns mais recentes vivem só no suplemento: `privacy` dava `requirementCount: 0`
   * e `active_categories: []` enquanto o vocabulário publicava 5 e o select devolvia 5.
   *
   * Três agravantes que o tornam pior que o caso do mapa de ameaças: não havia
   * `unsupported_concerns`; o `rule_trace` AFIRMAVA «0 requirements active» (asserção falsa,
   * não silêncio); e o guia encaminhava esse vazio para «manual-grounded», o selo epistémico
   * mais forte do servidor.
   *
   * Correcção à CLASSE, não à instância: passa a usar a MESMA resolução publicada — e o
   * que ainda assim não resolver é DECLARADO, para o mecanismo cobrir também o que vier.
   */
  const unresolvedConcerns: string[] = [];
  if (concernsApplied && concernsApplied.length > 0) {
    const concernCategories = new Set<string>();
    for (const concern of concernsApplied) {
      const categories = categoriesForConcerns([concern as Concern]);
      if (categories.size === 0) unresolvedConcerns.push(concern);
      for (const category of categories) concernCategories.add(category);
    }
    filteredRequirements = filteredRequirements.filter((requirement) =>
      concernCategories.has(requirement.category)
    );
  }

  const active_categories = [...new Set(filteredRequirements.map((requirement) => requirement.category))].sort();

  const activeDomainsSet = new Set<string>();
  for (const category of active_categories) {
    const domains = domainMapping[category] ?? [];
    for (const domain of domains) activeDomainsSet.add(domain);
  }
  const active_domains = [...activeDomainsSet].sort();

  const controls = buildControls(
    filteredRequirements,
    allControls,
    requirementControlLinks,
    active_domains
  );
  const artifacts = buildArtifacts(filteredRequirements, controls, allArtifacts, artifactRequirements);

  const directControlCount = controls.filter((control) => control._confidence === "direct").length;
  const derivedControlCount = controls.length - directControlCount;
  const directArtifactCount = artifacts.filter((artifact) => artifact._coverage === "direct").length;

  // Declared gap (a): active requirements with no maps_to_control link. Declared as a
  // count + the ids (coverage-preserving) — the requirement stays in `requirements`.
  const linkedRequirementIds = new Set(
    requirementControlLinks
      .filter((link) => link.link_type === "maps_to_control")
      .map((link) => link.source_id)
  );
  const requirementsWithoutControlLink = filteredRequirements
    .map((requirement) => requirement.requirement_id)
    .filter((requirementId) => !linkedRequirementIds.has(requirementId))
    .sort();
  const coverage_gaps: ConsultCoverageGaps = {
    requirements_without_control_link: {
      count: requirementsWithoutControlLink.length,
      requirement_ids: requirementsWithoutControlLink,
      note:
        `${requirementsWithoutControlLink.length} of ${filteredRequirements.length} active requirements have no ` +
        `requirement_control_links entry in the consumed bundle (link layer of 2026-04-07 not refreshed for ` +
        `requirements published since) — declared gap, not an absence of obligation: the requirement is served, ` +
        `its controls are at most domain-derived (\`_confidence: "derived"\`) and never invented; routed to Codex.`,
    },
  };

  // beta.27: resolveu categorias e o nível esvaziou — declara-se, com onde existem.
  let emptyAtLevel: ConsultSecurityRequirementsResult["empty_at_level"];
  if (concernsApplied && concernsApplied.length > 0 && filteredRequirements.length === 0 && unresolvedConcerns.length === 0) {
    const resolvedCategories = [...new Set(concernsApplied.flatMap((c) => [...categoriesForConcerns([c as Concern])]))].sort();
    const presentAt = (["L1", "L2", "L3"] as const).filter((other) =>
      allRequirements.some((r) => resolvedCategories.includes(r.category) && r.applicable_levels?.[other] === true)
    );
    emptyAtLevel = {
      concerns: [...concernsApplied],
      level: riskLevel,
      categories: resolvedCategories,
      present_at_levels: presentAt,
      note:
        `O concern RESOLVEU (categorias ${resolvedCategories.join(", ") || "—"}), mas nenhum requisito dessas categorias se aplica a ${riskLevel}. ` +
        (presentAt.length > 0
          ? `Existem em ${presentAt.join("/")}. `
          : "Não existem em nenhum nível publicado. ") +
        "NÃO é ausência de obrigação nem «não aplicável» — é o NÍVEL. Não apresentes isto como «manual-grounded: nada se aplica»."
    };
  }

  const rule_trace: string[] = [];
  // beta.27: o filtro de NÍVEL conta o que o nível activa — não o que sobra depois dos
  // concerns. Dizer «0 requirements active» a L2 (que tem 247) por o concern não ter
  // resolvido era uma asserção FALSA, e o consumidor citava-a como facto do manual.
  rule_trace.push(
    `REQUIREMENT_APPLIES_BY_RISK(risk_level=${riskLevel}): ${atLevelCount} requirements active`
  );
  if (directControlCount > 0) {
    rule_trace.push(
      `CONTROL_ACTIVE_BY_REQUIREMENT_LINK: ${directControlCount} controls mapped from requirement_control_links`
    );
  }
  if (active_categories.length > 0 && derivedControlCount > 0) {
    rule_trace.push(
      `CONTROL_ACTIVE_BY_DOMAIN_MAPPING: ${active_categories.length} categories -> ${activeDomainsSet.size} domains -> ${derivedControlCount} derived controls`
    );
  }
  if (directArtifactCount > 0) {
    rule_trace.push(
      `ARTIFACT_ACTIVE_BY_REQUIREMENT_OR_CONTROL: ${directArtifactCount} artifacts resolved from artifact_requirements`
    );
  }
  if (artifacts.length > directArtifactCount) {
    rule_trace.push(
      `ARTIFACT_ACTIVE_BY_CONTROL_ARTIFACT_TYPES: ${artifacts.length - directArtifactCount} derived artifacts from control coverage`
    );
  }
  if (concernsApplied && concernsApplied.length > 0) {
    rule_trace.push(
      `CONCERNS_FILTER_REQUIREMENTS(concerns=[${concernsApplied.join(",")}]): ${atLevelCount} -> ${filteredRequirements.length} requirements (categories: ${active_categories.join(",") || "none"})`
    );
    if (unresolvedConcerns.length > 0) {
      rule_trace.push(
        `CONCERNS_UNRESOLVED(concerns=[${unresolvedConcerns.join(",")}]): sem categorias publicadas — ` +
          "isto NÃO é ausência de requisitos, é um concern que esta superfície não resolve. Ver unsupported_concerns."
      );
    }
  }
  if (requirementsWithoutControlLink.length > 0) {
    rule_trace.push(
      `REQUIREMENT_WITHOUT_CONTROL_LINK: ${requirementsWithoutControlLink.length} active requirements have no requirement_control_links entry — declared gap (served; controls not invented)`
    );
  }

  return {
    risk_level: riskLevel,
    active_categories,
    active_domains,
    requirements: filteredRequirements,
    controls,
    artifacts,
    rule_trace,
    ...(emptyAtLevel ? { empty_at_level: emptyAtLevel } : {}),
    ...(unresolvedConcerns.length > 0
      ? {
          unsupported_concerns: {
            values: [...new Set(unresolvedConcerns)].sort(),
            supported_values: consultSupportedConcerns(),
            note:
              `Concerns VÁLIDOS do vocabulário que esta superfície não resolve: ${[...new Set(unresolvedConcerns)].sort().join(", ")}. ` +
              "NÃO são zero requisitos — são zero requisitos RESOLVÍVEIS aqui. Não concluas ausência a partir desta resposta " +
              "nem a apresentes como «manual-grounded»: confirma com `select_sbd_toe_requirements` (mesmos concerns) e com " +
              "`sbd://toe/activation-vocabulary`, que publica o que cada valor activa. Uma discordância entre superfícies é sinal, não ruído."
          }
        }
      : {}),
    coverage_gaps,
    meta: {
      requirementCount: filteredRequirements.length,
      controlCount: controls.length,
      artifactCount: artifacts.length,
      concernsApplied,
      note:
        "Requirements are canonical SbD-ToE entities. Controls resolve primarily via requirement_control_links " +
        "and secondarily via ontology domain_mapping. Artifacts resolve from artifact_requirements and control artifact types. " +
        "Requirements with no published control link are served and declared in coverage_gaps — never omitted.",
    },
  };
}

export function handleConsultSecurityRequirements(
  args: Record<string, unknown>
): ConsultSecurityRequirementsOutput {
  const full = _resolveConsultResult(args, getOntologyData());
  // mode: "index" (G-mp1a decision 3, option (c)) — additive opt-in: same filters,
  // same totals, but requirements come back as a per-category index (ids + counts)
  // instead of the full bodies. Default behaviour is byte-unchanged (retro-compat);
  // index-by-default stays flagged for a future major.
  const modeArg = args["mode"];
  const indexMode = modeArg === "index";
  if (modeArg !== undefined && modeArg !== "index" && modeArg !== "full") {
    throw Object.assign(new Error(`Invalid mode: "${String(modeArg)}". Allowed: full, index.`), {
      rpcError: { code: -32602, message: `Invalid mode: "${String(modeArg)}"` }
    });
  }
  if (indexMode) {
    const byCategory = new Map<string, string[]>();
    for (const r of full.requirements) {
      const list = byCategory.get(r.category) ?? [];
      list.push(r.requirement_id);
      byCategory.set(r.category, list);
    }
    return {
      provenance: {
        kg: servedKgReleaseTag(),
      server: servingServerVersion(),
        content_type: "derived",
        produced_by: "deterministic_runtime_resolution",
        source_data: "runtime/requirements.json (index projection)",
        note: "mode=index: per-category requirement index (ids + counts) — same filters and totals as the full mode; fetch bodies with mode omitted or resolve_entities."
      },
      risk_level: full.risk_level,
      active_categories: full.active_categories,
      active_domains: full.active_domains,
      requirements: [],
      controls: [],
      artifacts: [],
      rule_trace: [...full.rule_trace, "MODE_INDEX: requirement bodies elided — per-category index returned (declared, not silent)"],
      ...(full.empty_at_level ? { empty_at_level: full.empty_at_level } : {}),
      ...(full.unsupported_concerns ? { unsupported_concerns: full.unsupported_concerns } : {}),
      coverage_gaps: full.coverage_gaps,
      index: [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, ids]) => ({ category, count: ids.length, requirement_ids: ids.sort() })),
      size_estimate: estimateSize(full.requirements),
      projection_note:
        "requirements/controls são PROJECÇÕES (id/name/category/type) — corpo completo via resolve_entities; mode:'index' devolve só ids por categoria.",
      meta: { ...full.meta, note: `${full.meta.note} mode=index: controls/artifacts counts in meta; bodies via the default mode.` },
      next: consultAffordances(full.risk_level, full.meta.concernsApplied ?? undefined)
    };
  }
  return {
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "deterministic_runtime_resolution",
      source_data:
        "ontology/sbdtoe-ontology.yaml + runtime/requirements.json + runtime/controls.json + runtime/artifacts.json + runtime/artifact_requirements.json + runtime/requirement_control_links.json",
      note:
        "Normative resolution uses the published deterministic runtime bundle. Controls are explicit when linked from requirements, otherwise derived via ontology domain_mapping.",
    },
    risk_level: full.risk_level,
    active_categories: full.active_categories,
    active_domains: full.active_domains,
    requirements: full.requirements.map((requirement) => ({
      requirement_id: requirement.requirement_id,
      name: requirement.name,
      category: requirement.category,
      type: requirement.type,
    })),
    controls: full.controls.map((control) => ({
      control_id: control.control_id,
      name: control.name,
      domain: control.domain,
      control_type: control.control_type,
      applicable_lifecycle_phases: control.applicable_lifecycle_phases,
      ...(control.chapter_ids ? { chapter_ids: control.chapter_ids } : {}),
      _confidence: control._confidence,
    })),
    artifacts: full.artifacts.map((artifact) => ({
      artifact_type_id: artifact.artifact_type_id,
      name: artifact.name,
      ...(artifact.category ? { category: artifact.category } : {}),
      lifecycle_phases: artifact.lifecycle_phases,
      mandatory: artifact.mandatory,
      _coverage: artifact._coverage,
    })),
    rule_trace: full.rule_trace,
    ...(full.empty_at_level ? { empty_at_level: full.empty_at_level } : {}),
    ...(full.unsupported_concerns ? { unsupported_concerns: full.unsupported_concerns } : {}),
    coverage_gaps: full.coverage_gaps,
    meta: full.meta,
    next: consultAffordances(full.risk_level, full.meta.concernsApplied ?? undefined),
  };
}
