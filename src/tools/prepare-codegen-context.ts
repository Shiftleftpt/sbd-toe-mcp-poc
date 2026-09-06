/**
 * prepare_sbd_toe_codegen_context
 *
 * Prepares deterministic, bite-sized grounded context for a downstream LLM to
 * generate, review or plan tests for code. **This tool does not generate code
 * and does not edit files.**
 *
 * Pipeline:
 *   1. Validate input + scope gate.
 *   2. Activation: map task text + concerns to concerns -> slice families
 *      and (if requested) regulatory frameworks. Activation is auditable via
 *      `activation_trace`.
 *   3. Resolution: pull deterministic data from the three published sources
 *      (runtime v0, runtime v1, overlay).
 *   4. Output: produce `activated_scope`, `g2_context`, `manual_grounding`,
 *      `regulatory_overlay`, `citation_map`, `completeness_report`,
 *      `llm_codegen_instructions` and `security_rationale_template`.
 *
 * Strict rules:
 *   - No canonical IDs are invented. Every ID surfaces only when the
 *     deterministic source publishes it.
 *   - Names are surfaced only when `manual_rastreabilidade.jsonl` carries
 *     them. Otherwise the entity is returned without a name.
 *   - If `runtime/v1` is missing, the tool returns `unsupported_scope` with
 *     a clear reason — it never falls back to invented data.
 *   - If overlay is requested but absent, the tool returns
 *     `unsupported_scope` for the overlay branch — never silently empty.
 */

import {
  RuntimeV1AssetMissingError,
  getG2Runtime,
  getV1EntityDisplayName,
  type AppSecRelation,
  type AppSecSlice,
  type ArtifactV1,
  type ControlObjectiveV1,
  type G2RuntimeData,
  type MechanismV1,
  type PracticeV1
} from "./g2-runtime-loader.js";
import {
  getOntologyData,
  type Control,
  type EvidencePattern,
  type Requirement
} from "./ontology-loader.js";
import {
  getRegulatoryOverlay,
  type RegulatoryFramework,
  type RegulatoryMapping,
  type RegulatoryObligation,
  type RegulatoryOverlayData,
  type RegulatoryPlaybook,
  resolveRegulatoryFramework
} from "./regulatory-overlay-loader.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { expandQueryWithAliases } from "../backend/semantic-index-gateway.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { requirementCategoryOf } from "../serving/requirement-id.js";
import { prepareCodegenAffordances } from "../serving/affordances.js";
import {
  runSelection,
  runSelectionWithActivation,
  normalizeDeclaredTechnologies,
  stackTokensFromVocabulary,
  type SelectionResult
} from "../serving/selection.js";
import { REQUIREMENT_CEILING_BY_DETAIL, COST_PER_REQ_TK, BASE_TK, PAYLOAD_PROMISE_TK, projectedCostTk } from "../serving/payload-ceilings.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CodegenMode = "codegen" | "review" | "test-plan";
export type RiskLevel = "L1" | "L2" | "L3";

/**
 * Response ENCODING level (v2 token diet, epic v2-token-diet slice s1).
 *
 * - `full` (default): classic payload, byte-identical to previous releases —
 *   whether `detail` is omitted or explicitly "full".
 * - `standard` / `minimal`: same citable ID set, deduplicated encoding
 *   (inverted `citations`, grouped `manual_grounding`, top-level
 *   `provenance_legend` instead of per-item `source`). No information is
 *   lost — only the serialization changes. Since s3b (revised ADENDA
 *   2026-07-05 — no top-N/subsetting) `minimal` differs from `standard`
 *   ONLY in traceability serialization: evidence cap 10→5 and the minimal
 *   `manual_grounding` form; the activated scope stays complete and
 *   byte-identical to `standard`.
 * - `ultrathin` (s3c, reactivated by the operator 2026-07-05): one level below
 *   `minimal`, same rules (COMPLETE activated set, no top-k, nothing id-only,
 *   never silent) but requirements/controls WITHOUT the published
 *   `description` (executable `descriptions_ref` → detail="minimal"),
 *   evidence_patterns 0 inline (counts + rest-ref → detail="minimal"),
 *   `manual_grounding` reduced to {total_entries, manual_commit_sha,
 *   groups_ref} and `completeness_report` diagnostics trimmed to exact counts
 *   (+ executable ref). Citable ID set unchanged (invariant 3).
 *
 * The default flips to `standard` only at graduation to the next stable
 * release (documented as breaking) — never on the beta line.
 */
export type CodegenDetailLevel = "ultrathin" | "minimal" | "standard" | "full";

export interface PrepareCodegenContextInput {
  task: string;
  risk_level?: RiskLevel;
  mode?: CodegenMode;
  stack?: string;
  exposure?: "local" | "internal" | "authenticated" | "public";
  data_sensitivity?: "low" | "personal" | "regulated" | "secrets";
  concerns?: string[];
  changed_files?: string[];
  /**
   * 0.20.0-beta.21 — semântica da SELECÇÃO (não confundir com `mode`, que é
   * codegen/review/test-plan): `declarative` (default) responde ao declarado e não
   * interpreta o `task`; `discover` corre o motor inferencial histórico, marcado
   * exploratório. Vocabulário: sbd://toe/activation-vocabulary.
   */
  selection_mode?: "declarative" | "discover";
  /**
   * 0.20.0-beta.21 — tecnologias DECLARADAS do vocabulário fechado
   * (sbd://toe/activation-vocabulary): activam capítulos por tabela publicada.
   * Substituem o casamento de substring sobre o texto livre de `stack`.
   */
  technologies?: string[];
  regulatory_frameworks?: string[];
  include_regulatory_overlay?: boolean;
  detail?: CodegenDetailLevel;
  /**
   * v2 token diet, s2 — escape hatch for clients that cannot make a second
   * call: when true, `detail: "standard" | "minimal"` keeps `g2_context.relations`
   * inline (dieted: no per-item `source`) instead of `relations_ref`.
   * Ignored at `detail: "full"` (full is always byte-identical to the classic
   * payload, relations inline).
   */
  include_relations?: boolean;
  debug?: boolean;
}

export type PrepareCodegenStatus =
  | "ready_for_codegen"
  | "needs_clarification"
  | "needs_input"
  | "needs_decomposition"
  | "unsupported_scope";

export interface ActivationTraceEntry {
  /** Triggered by: explicit concern, task term, changed file, framework hint, semantic alias, compound term, or intent keyword. */
  source:
    | "explicit_concern"
    | "task_term"
    /** 0.20.0-beta.22: mapeamento determinístico concern → slice family (era `task_term` órfão). */
    | "concern_slice_mapping"
    /** 0.20.0-beta.22: token exacto do vocabulário fechado encontrado no `stack` declarado. */
    | "stack_token"
    /** 0.20.0-beta.22: regra NOMEADA accionada por tecnologia declarada (ex.: SES-008-por-tecnologia). */
    | "named_rule"
    | "compound_term"
    | "alias_expansion"
    | "intent_keyword"
    | "changed_file"
    | "regulatory_framework"
    | "risk_level"
    | "exposure"
    | "data_sensitivity"
    | "context_chapter"
    | "scope_gate";
  /** What the activation produced (concern, slice_family, framework_id, decision). */
  produced: string;
  /** The literal token or input that triggered the activation. */
  trigger: string;
  /**
   * Deterministic score for the activation, in [0,1].
   * 1.0 = explicit input (concern, risk_level, framework).
   * 0.8 = task term direct match.
   * 0.7 = compound term match.
   * 0.6 = task term via alias expansion.
   * 0.5 = intent keyword or changed_file heuristic.
   * Scores are auditable and never used to invent entities — they only rank
   * what the deterministic resolvers already returned.
   */
  score: number;
  /** Confidence band — `deterministic` for explicit/lexicon, `semantic` for alias/intent activations. */
  confidence: "deterministic" | "semantic";
  /** Auditable reason explaining why the activation fired. */
  reason: string;
}

export interface ActivatedScope {
  requirements: Array<{
    requirement_id: string;
    name: string;
    category: string;
    source: "runtime_v0";
  }>;
  controls: Array<{
    control_id: string;
    name: string;
    domain: string;
    control_type: string;
    source: "runtime_v0";
    confidence: "direct" | "derived";
  }>;
  slices: Array<{
    slice_id: string;
    objective_family: string;
    scope: string;
    contract_status: string;
    source: "runtime_v1";
  }>;
  regulatory_obligations: Array<{
    obligation_id: string;
    framework_id: string;
    title: string;
    source: "overlay";
  }>;
}

export interface G2ContextEntity {
  entity_id: string;
  entity_type: "ControlObjective" | "Mechanism" | "Practice" | "Artifact";
  slice_id: string;
  slice_family: string;
  /** Surfaced only when `manual_rastreabilidade.jsonl` publishes a v1_entity_name. */
  name?: string;
  source: "runtime_v1";
}

export interface G2ContextRelation {
  subject_id: string;
  subject_type: string | null;
  predicate: string;
  object_id: string;
  object_type: string | null;
  source: "runtime_v1";
}

export interface G2ContextEvidencePattern {
  id: string;
  maps_to_requirement_id?: string;
  maps_to_control_id?: string;
  evidence_expectation?: string;
  verification_logic?: string;
  expected_artifact_type_ids?: string[];
  /** Score in [0,1] driving cap order. 1.0 = direct control match, 0.7 = active requirement, 0.5 = derived control match. */
  relevance_score: number;
  source: "runtime_v0";
}

const EVIDENCE_PATTERN_CAP = 25;

/**
 * v2 token diet, s3 — evidence-pattern cap applied at `detail: "standard" |
 * "minimal"` ON TOP of the classic cap: the dieted list is the deterministic
 * PREFIX (relevance_score desc, id asc — the exact order the core already
 * emits) of the classic top-{@link EVIDENCE_PATTERN_CAP} list. Never silent:
 * `completeness_report` reports total/returned/capped and, when anything was
 * cut, `evidence_patterns_rest` says how to retrieve the rest (same tool,
 * `detail: "full"`).
 */
const STANDARD_EVIDENCE_PATTERN_CAP = 10;

/**
 * v2 token diet, s3b (revised per the 2026-07-05 operator ADENDA in
 * agentic/planeado/v2-token-diet/EPIC.md — no top-N, no subsetting of the
 * activated set): at `detail: "minimal"` the evidence cap tightens 10→5 with
 * the SAME s3 mechanism (deterministic prefix, never-silent counts +
 * executable rest-reference). This cap — together with the minimal
 * `manual_grounding` form — is the ONLY divergence from `standard`; the
 * activated scope (requirements/controls/slices/entities, with the verbatim
 * published descriptions) stays COMPLETE and byte-identical to `standard`.
 */
const MINIMAL_EVIDENCE_PATTERN_CAP = 5;

/**
 * v2 token diet, s3c (operator ADENDA 2026-07-05, reactivated same day): at
 * `detail: "ultrathin"` NO evidence pattern goes inline (cap 0) — the SAME s3
 * never-silent mechanism still applies in full: `completeness_report` reports
 * total/returned(=0)/capped(=total) and `evidence_patterns_rest` is the
 * executable reference to the CHEAPEST level that returns them inline
 * (detail="minimal" ⇒ top-5; "standard" ⇒ 10; "full" ⇒ classic 25).
 */
const ULTRATHIN_EVIDENCE_PATTERN_CAP = 0;

export interface G2Context {
  control_objectives: G2ContextEntity[];
  mechanisms: G2ContextEntity[];
  practices: G2ContextEntity[];
  artifacts: G2ContextEntity[];
  relations: G2ContextRelation[];
  evidence_patterns: G2ContextEvidencePattern[];
}

export interface ManualGroundingEntry {
  rastreabilidade_role: string;
  manual_chapter?: string | null;
  manual_file?: string | null;
  manual_commit_sha?: string;
  manual_v2_entity_id?: string;
  manual_v2_entity_label?: string;
  manual_v2_entity_type?: string;
  v1_entity_id?: string;
  v1_entity_name?: string;
  source: "runtime_v1";
}

export interface RegulatoryOverlayContext {
  frameworks: Array<{
    framework_id: string;
    short_code: string;
    name: string;
    scope_summary: string;
    source: "overlay";
  }>;
  obligations: Array<{
    obligation_id: string;
    framework_id: string;
    title: string;
    citation?: string;
    obligation_kind: string;
    source: "overlay";
  }>;
  mappings: Array<{
    mapping_id: string;
    framework_id: string;
    obligation_id: string;
    mapping_type: string;
    target_id: string;
    target_type: string;
    confidence?: number;
    source: "overlay";
  }>;
  playbooks: Array<{
    playbook_id: string;
    framework_ids: string[];
    title: string;
    source: "overlay";
  }>;
}

export interface CitationMapEntry {
  source:
    | "runtime_v0"
    | "runtime_v1"
    | "overlay"
    | "manual"
    | "manual_rastreabilidade";
  source_data: string;
}

export interface CompletenessReport {
  expected_objectives: number;
  returned_objectives: number;
  m_recall: number;
  expected_mechanisms: number;
  returned_mechanisms: number;
  expected_practices: number;
  returned_practices: number;
  expected_artifacts: number;
  returned_artifacts: number;
  named_v1_entities: number;
  unnamed_v1_entities: number;
  v1_consistency_mismatches: string[];
  v1_manifest_warnings: string[];
  /** Total evidence patterns matched before the relevance cap was applied. */
  evidence_patterns_total: number;
  /** Patterns retained in `g2_context.evidence_patterns` after the cap. */
  evidence_patterns_returned: number;
  /** Patterns dropped because of the cap (visible in debug.rejected_candidates). */
  evidence_patterns_capped: number;
  /** Cap value applied during this resolution. */
  evidence_pattern_cap: number;
  /**
   * MP1 selection summary (G-mp1a O2, 2026-08-31): the requirement set comes from
   * the selection engine (baseline ∪ context-activated chapters, narrowed by the
   * task's declared signals). Never-silent: what the narrowing excluded is counted
   * here and fully listed by the executable ref. Additive key.
   */
  selection?: {
    eligible: number;
    selected: number;
    narrowed_out_categories: number;
    narrowed_out_requirements: number;
    /** Opcionais no perfil ultrathin (dieta s3c): a banda continua declarada no
     * select e nos perfis standard/minimal/full; recuperação via narrowed_out_ref. */
    excluded_by_level_categories?: number;
    excluded_by_level_requirements?: number;
    /** 0.19.0 (dieta por forma — tectos vigiam): fracção só-lexical da selecção; o
     * sumário completo + aviso + candidatos vivem no select_sbd_toe_requirements. */
    lexical_share?: number;
    narrowed_out_ref: { tool: "select_sbd_toe_requirements"; note: string };
  };
}

export interface SecurityRationaleTemplate {
  task: string;
  decisions: Array<{
    decision: "<fill: what design choice was made>";
    rationale: "<fill: why, citing IDs from citation_map>";
    cited_ids: ["<requirement_id|control_id|slice_id|obligation_id>"];
  }>;
  validations: Array<{
    surface: "<fill: code path being validated>";
    rule: "<fill: validation rule>";
    rejection_behaviour: "<fill: how invalid input is rejected>";
  }>;
  expected_evidence: Array<{
    artefact: "<fill: test, log, doc, sbom, scan, attestation, ...>";
    location: "<fill: where to find it>";
    verifies: "<fill: which control/requirement id>";
  }>;
  residual_risk: "<fill: anything NOT addressed by this change>";
}

export interface PrepareCodegenContextResultReady {
  status: "ready_for_codegen";
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next?: Affordance[];
  mode: CodegenMode;
  input_echo: Required<Pick<PrepareCodegenContextInput, "task">> &
    Omit<PrepareCodegenContextInput, "task">;
  activation_trace: ActivationTraceEntry[];
  activated_scope: ActivatedScope;
  g2_context: G2Context;
  manual_grounding: ManualGroundingEntry[];
  regulatory_overlay: RegulatoryOverlayContext;
  citation_map: Record<string, CitationMapEntry>;
  completeness_report: CompletenessReport;
  llm_codegen_instructions: string[];
  security_rationale_template: SecurityRationaleTemplate;
  provenance: {
    /** Compact version stamp: kg release_tag of the served pin (0.13.0). */
    kg: string;
    /** 0.20.0-beta.23: versão do SERVIDOR que produziu esta resposta (≠ `kg`). */
    server: string;
    runtime_v0: string;
    runtime_v1: string;
    overlay: string | "absent";
  };
  debug?: {
    rejected_candidates: ActivationTraceEntry[];
    notes: string[];
  };
}

export interface PrepareCodegenContextResultBlocked {
  status: "needs_clarification" | "needs_decomposition" | "unsupported_scope" | "needs_input";
  /**
   * 0.20.0-beta.23 (P1, mesma classe): um BLOQUEIO também é uma resposta, e também
   * tem de ser atribuível. Antes desta vaga o payload bloqueado não trazia
   * proveniência nenhuma — dois servidores diferentes bloqueavam de forma
   * indistinguível.
   */
  provenance: { kg: string; server: string };
  /** 0.19.4: presente quando o bloqueio é o TECTO DE REQUISITOS por detail (a
   * promessa de tokens do nível dieted): limite derivado da medição, projecção
   * de custo, e lotes de divisão ensinados (concerns por área, estimados). */
  requirement_ceiling?: {
    detail: string;
    limit: number;
    selected: number;
    cost_per_req_tk: number;
    projected_tk: number;
    promise_tk: number;
    batches: Array<{ concerns: string[]; estimated_requirements: number }>;
  };
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next?: Affordance[];
  mode: CodegenMode;
  input_echo: Required<Pick<PrepareCodegenContextInput, "task">> &
    Omit<PrepareCodegenContextInput, "task">;
  reasons: string[];
  suggestions: string[];
  partial_activation_trace: ActivationTraceEntry[];
  debug?: {
    rejected_candidates: ActivationTraceEntry[];
    notes: string[];
  };
}

// ---------------------------------------------------------------------------
// Detail-level encoding types (v2 token diet, s1 — dedup, nothing removed)
// ---------------------------------------------------------------------------

/** An item shape with the repeated per-item `source` field removed (the
 * provenance is carried once, in `provenance_legend`). */
export type WithoutSource<T> = Omit<T, "source">;

/**
 * Inverted citation encoding (replaces `citation_map` in `standard`/`minimal`).
 * Grouped by source; `source_data` is an ORDERED run-length map
 * `file → count`: the first N₁ citable ids come from the first file, the
 * next N₂ from the second, and so on. This preserves the exact per-id
 * `{source, source_data}` of the classic `citation_map` with zero repetition.
 *
 * s3: the ids themselves are NOT repeated when they already appear verbatim in
 * a payload section — `ids_from` lists, aligned 1:1 with the `source_data`
 * files, the payload path whose ids (in payload order) are the run for that
 * file. `keys(section[slice])` paths iterate the slice groups in order, then
 * the entity-id keys in order. The explicit `ids` array is kept ONLY as a
 * lossless fallback when a file has no static payload-path mapping (expected
 * never for the published bundle). Exactly one of `ids_from`/`ids` is present.
 */
export interface CitationsGroup {
  /** Ordered map: published file → number of consecutive citable ids. */
  source_data: Record<string, number>;
  /** Payload paths (aligned with `source_data` keys) whose ids, in payload
   * order, are the ids for each file's run. */
  ids_from?: string[];
  /** Lossless fallback: explicit ids, ordered by the `source_data` runs. */
  ids?: string[];
}

export type CitationsBySource = Partial<
  Record<CitationMapEntry["source"], CitationsGroup>
>;

/**
 * `manual_grounding` grouped by (rastreabilidade_role, manual_chapter,
 * manual_file, manual_commit_sha) — the fields that repeat verbatim across
 * entries. Total information is preserved: `v1_entity_ids` lists every entry
 * of the group, and `v1_entity_names` carries ONLY the names that are not
 * already recoverable from the `g2_context` entity lists in the same payload
 * (normally empty — names come from the same rastreabilidade source).
 */
export interface ManualGroundingGroup {
  rastreabilidade_role: string;
  manual_chapter?: string | null;
  manual_file?: string | null;
  manual_commit_sha?: string;
  v1_entity_ids: string[];
  /** Lossless guard: names NOT recoverable via g2_context entity `name`. */
  v1_entity_names?: Record<string, string>;
}

export interface ManualGroundingGrouped {
  /** Number of flat entries the groups encode (dedup audit: sum of group sizes). */
  total_entries: number;
  groups: ManualGroundingGroup[];
  /** Lossless guard: entries without a v1_entity_id (expected empty). */
  ungrouped?: Array<WithoutSource<ManualGroundingEntry>>;
}

/**
 * v2 token diet, s3b (revised ADENDA 2026-07-05) — minimal-form grounding
 * group: the SAME group as {@link ManualGroundingGroup} (1:1, same order) with
 * the per-group `v1_entity_ids` list replaced by its exact count (`entries`).
 * The grounding id SET is NOT lost: every grounding v1_entity_id is an
 * activated entity id already present verbatim in this payload's
 * `g2_context` entity maps (the grounding is resolved FROM those ids) — only
 * the id→(chapter,file) traceability assignment moves behind the executable
 * `groups_ref` (same input, detail="standard"). Never silent: `entries`
 * counts sum to `total_entries`.
 */
export interface ManualGroundingMinimalGroup {
  rastreabilidade_role: string;
  manual_chapter?: string | null;
  manual_file?: string | null;
  /** Present ONLY when the sha could not be hoisted to the top level
   * (mixed/absent shas across groups — never expected for the published
   * bundle; lossless guard). */
  manual_commit_sha?: string;
  /** Exact number of v1_entity_ids the detail="standard" group carries. */
  entries: number;
  /** Lossless guard: names NOT recoverable via g2_context entity `name`
   * (kept verbatim from the standard group; expected never). */
  v1_entity_names?: Record<string, string>;
}

/** Executable reference to the full per-group grounding ids (s3b). */
export interface GroundingGroupsRef {
  tool: "prepare_sbd_toe_codegen_context";
  /** Merge over this call's input_echo: same input, detail="standard". */
  with: { detail: "standard" };
  note: string;
}

/**
 * `manual_grounding` at `detail: "minimal"` (s3b revised): aggregated
 * provenance — total count, the manual_commit_sha shared by every group
 * (hoisted), and the (role, chapter, file) group list with per-group entry
 * COUNTS instead of per-group id lists — plus the executable `groups_ref`.
 * The citable id set is untouched (invariant 3): grounding ids never feed
 * `citations`/`ids_from`, and the id set itself stays reconstructible from
 * this same payload's g2_context entity maps without any extra call.
 */
export interface ManualGroundingMinimal {
  /** Number of flat detail="full" entries the groups encode (Σ entries). */
  total_entries: number;
  /** Hoisted provenance: present iff EVERY group carries this same sha
   * (expected always for the published bundle); otherwise each group keeps
   * its own `manual_commit_sha` inline (lossless guard). */
  manual_commit_sha?: string;
  groups: ManualGroundingMinimalGroup[];
  /** How to obtain the full per-group v1_entity_ids (detail="standard"). */
  groups_ref: GroundingGroupsRef;
  /** Lossless guard: entries without a v1_entity_id (expected empty). */
  ungrouped?: Array<WithoutSource<ManualGroundingEntry>>;
}

/**
 * `manual_grounding` at `detail: "ultrathin"` (s3c): aggregate provenance ONLY
 * — `{total_entries, manual_commit_sha, groups_ref}` — derived from the s3b
 * minimal form with the (role, chapter, file) group list elided too. Never
 * silent: `total_entries` is the exact flat detail="full" entry count and
 * `groups_ref` is the executable reference (same input, detail="standard")
 * that returns the full 1:1 grouping with per-group v1_entity_ids. Lossless
 * guards (both expected never for the published bundle): if the sha could not
 * be hoisted OR any group carries non-recoverable `v1_entity_names`, the s3b
 * minimal `groups` list survives inline; `ungrouped` entries survive verbatim.
 * Invariant-3 note (same as minimal): grounding ids never feed
 * `citations`/`ids_from`, and the grounding id SET stays reconstructible from
 * this same payload's g2_context entity maps without any extra call.
 */
export interface ManualGroundingUltrathin {
  /** Number of flat detail="full" entries the elided groups encode. */
  total_entries: number;
  /** Hoisted provenance (expected always: one published manual commit). */
  manual_commit_sha?: string;
  /** Lossless guard: present ONLY when hoisting failed or a group carried
   * v1_entity_names (never expected) — the s3b minimal groups, verbatim. */
  groups?: ManualGroundingMinimalGroup[];
  /** How to obtain the full per-group v1_entity_ids (detail="standard"). */
  groups_ref: GroundingGroupsRef;
  /** Lossless guard: entries without a v1_entity_id (expected empty). */
  ungrouped?: Array<WithoutSource<ManualGroundingEntry>>;
}

/**
 * v2 token diet, s3 — dieted requirement projection. `category` is elided when
 * (and only when) it equals the category segment of the `requirement_id` —
 * the segment immediately before the number (`AUT-003` → `AUT`,
 * `REQ-AGN-001` → `AGN`; consumer contract v1.10 §1.18, single source
 * `src/serving/requirement-id.ts`). True for all 255 published requirements;
 * the field survives verbatim on any future mismatch — lossless guard. `description` is the PUBLISHED bundle
 * field (data/publish/runtime/requirements.json), verbatim, never paraphrased
 * — the "how" the full projection historically dropped.
 */
export interface DietedRequirement {
  requirement_id: string;
  name: string;
  type?: string;
  /** Present only on the (never expected) category ≠ id-category-segment mismatch. */
  category?: string;
  /** Verbatim `description` from the published bundle. */
  description?: string;
}

/**
 * v2 token diet, s3 — dieted control projection: classic fields minus `source`
 * plus, for `confidence: "direct"` controls only, the verbatim published
 * `description` (data/publish/runtime/controls.json).
 */
export type DietedControl = WithoutSource<ActivatedScope["controls"][number]> & {
  description?: string;
};

/**
 * v2 token diet, s3c — executable reference left in `activated_scope` at
 * `detail: "ultrathin"`, where the verbatim published `description` fields
 * (the "how", s3) are elided from requirements and direct controls. Never
 * silent: the lists themselves stay COMPLETE (same ids, same order, name
 * always present — nothing id-only); only the description field moves behind
 * this reference. detail="minimal" is the cheapest level that returns the
 * same complete scope WITH the descriptions (verbatim, never paraphrased).
 */
export interface ActivatedScopeDescriptionsRef {
  tool: "prepare_sbd_toe_codegen_context";
  /** Merge over this call's input_echo: same input, detail="minimal". */
  with: { detail: "minimal" };
  note: string;
}

export interface DietedActivatedScope {
  requirements: DietedRequirement[];
  controls: DietedControl[];
  slices: Array<WithoutSource<ActivatedScope["slices"][number]>>;
  regulatory_obligations: Array<
    WithoutSource<ActivatedScope["regulatory_obligations"][number]>
  >;
  /** Present ONLY at detail="ultrathin" (s3c): how to obtain the verbatim
   * published descriptions elided from requirements + direct controls. */
  descriptions_ref?: ActivatedScopeDescriptionsRef;
}

/**
 * v2 token diet, s2 — Relations on-demand. In `standard`/`minimal` the inline
 * `g2_context.relations` array (~4.3K tokens) is replaced by a REFERENCE to
 * executable calls of the `trace_sbd_toe_graph` tool whose union returns a
 * superset of the elided relations. Anchors are activated slice_ids/entity_ids
 * from THIS payload — domain ids, never internal IRIs (EPIC invariant 6).
 *
 * Relation kind → curated lens mapping (see buildRelationsRef):
 *  - (objective → mechanism/practice) edges, where the objective has a
 *    belongsToSlice edge to an activated slice S:
 *      `slice_implementation(anchor=S)` — each row (slice, objective, kind,
 *      target) carries BOTH the objective→target edge (kind selects the
 *      predicate) and the objective's belongsToSlice edge.
 *  - (objective, belongsToSlice, S) for objectives with ≥1 mechanism/practice
 *    edge: same `slice_implementation(anchor=S)` rows.
 *  - (objective → target) edges whose objective is activated but has NO
 *    belongsToSlice edge in the published graph (data gap):
 *      `objective_realization(anchor=objective)`.
 *  - (objective → target) edges where only the TARGET is activated
 *    (cross-slice): `mechanism_provenance(anchor=target)` — the predicate is
 *    recovered from the target's entity_type in this same payload.
 *  - (entity, belongsToSlice, slice) for Mechanism/Practice/Artifact subjects
 *    (and objectives without mechanism/practice edges): NO curated lens
 *    returns these edges, and they are 100% redundant with the payload — every
 *    `g2_context` entity already carries `slice_id`. Counted as
 *    `coverage.implicit_in_entities` (never silently dropped).
 *  - Anything not covered above stays INLINE in `residual_relations`
 *    (expected empty; never-silent guard).
 */
export interface RelationsRefLensCall {
  lens: "slice_implementation" | "objective_realization" | "mechanism_provenance";
  /** Activated slice_id or entity_id from this payload (id, never an IRI). */
  anchor: string;
}

export interface RelationsRef {
  tool: "trace_sbd_toe_graph";
  /** Executable calls whose union covers the lens-recoverable relations. */
  lenses: RelationsRefLensCall[];
  /** Exact number of relations that would go inline at detail=full (audit). */
  total_relations: number;
  /** Never-silent split of total_relations by recovery path. */
  coverage: {
    /** Recoverable by executing the `lenses` calls above. */
    via_lenses: number;
    /** belongsToSlice edges equal to the `slice_id` field of a g2_context entity. */
    implicit_in_entities: number;
    /** Relations kept inline in `residual_relations` (expected 0). */
    residual_inline: number;
  };
  /** Only present when a relation is neither lens-recoverable nor implicit. */
  residual_relations?: Array<WithoutSource<G2ContextRelation>>;
  note: string;
}

/**
 * v2 token diet, s3 — slice-grouped entity encoding for `standard`/`minimal`:
 * `{ slice_id: { entity_id: name | null } }`. Lossless re-encoding of the
 * classic entity list: `entity_type` is the list the map lives in,
 * `slice_id` is the group key, `slice_family` is
 * `activated_scope.slices[].objective_family` for that slice_id, and a `null`
 * name means the full projection omits `name` (unnamed in rastreabilidade).
 * Group/key order preserves the classic list order (insertion order).
 */
export type SliceGroupedEntityNames = Record<string, Record<string, string | null>>;

/**
 * v2 token diet, s3 — dieted evidence pattern: classic projection minus
 * `source` (s1 legend) and minus the tool-computed `relevance_score` (the
 * DETERMINISTIC list order — relevance_score desc, then id asc — already
 * carries the ranking; documented in the codegen-instructions resource).
 */
export type DietedEvidencePattern = Omit<
  G2ContextEvidencePattern,
  "source" | "relevance_score"
>;

export interface DietedG2Context {
  control_objectives: SliceGroupedEntityNames;
  mechanisms: SliceGroupedEntityNames;
  practices: SliceGroupedEntityNames;
  artifacts: SliceGroupedEntityNames;
  /** Inline only with `include_relations: true` (s2); otherwise see relations_ref. */
  relations?: Array<WithoutSource<G2ContextRelation>>;
  /** Present when relations are elided (s2 default at standard/minimal). */
  relations_ref?: RelationsRef;
  /** s3: deterministic top-{@link STANDARD_EVIDENCE_PATTERN_CAP} prefix of the
   * classic list (see completeness_report for the never-silent counts). */
  evidence_patterns: DietedEvidencePattern[];
}

export interface DietedRegulatoryOverlayContext {
  frameworks: Array<WithoutSource<RegulatoryOverlayContext["frameworks"][number]>>;
  obligations: Array<WithoutSource<RegulatoryOverlayContext["obligations"][number]>>;
  mappings: Array<WithoutSource<RegulatoryOverlayContext["mappings"][number]>>;
  playbooks: Array<WithoutSource<RegulatoryOverlayContext["playbooks"][number]>>;
}

/**
 * Section → source map for the dieted encoding: each list is
 * source-homogeneous BY CONSTRUCTION (the projection types hardcode a single
 * source literal per list), so one entry per list reconstitutes the `source`
 * of every item with no exceptions. Published as part of the
 * `sbd://toe/codegen-instructions/{mode}` resource (s3 moved the verbose
 * legend out of every payload); the inline `provenance_legend` keeps a
 * one-line pointer.
 */
const PROVENANCE_SOURCES = {
  "activated_scope.requirements": "runtime_v0",
  "activated_scope.controls": "runtime_v0",
  "activated_scope.slices": "runtime_v1",
  "activated_scope.regulatory_obligations": "overlay",
  "g2_context.control_objectives": "runtime_v1",
  "g2_context.mechanisms": "runtime_v1",
  "g2_context.practices": "runtime_v1",
  "g2_context.artifacts": "runtime_v1",
  "g2_context.relations": "runtime_v1",
  "g2_context.evidence_patterns": "runtime_v0",
  "manual_grounding.groups": "runtime_v1",
  "regulatory_overlay.frameworks": "overlay",
  "regulatory_overlay.obligations": "overlay",
  "regulatory_overlay.mappings": "overlay",
  "regulatory_overlay.playbooks": "overlay"
} as const;

/**
 * Inline legend for `standard`/`minimal` (s3: slim pointer — the full legend,
 * including the section→source table and every derivation rule of the dieted
 * encoding, lives in the `sbd://toe/codegen-instructions/{mode}` resource,
 * section `detail_encoding`).
 */
const PROVENANCE_LEGEND = {
  note:
    "Deduplicated encoding (detail=standard/minimal): per-item `source` fields " +
    "are elided (every list is source-homogeneous), requirement `category` = " +
    "requirement_id category segment (the one before the number: AUT-003→AUT, " +
    "REQ-AGN-001→AGN), g2_context entity lists are grouped as " +
    "{slice_id: {entity_id: name|null}}, and citations ids are referenced via " +
    "ids_from payload paths. Full legend: read_sbd_toe_resource(" +
    "sbd://toe/codegen-instructions/{mode}), section detail_encoding."
} as const;

export type ProvenanceLegend = typeof PROVENANCE_LEGEND;

/**
 * Inline legend for `ultrathin` (s3c) — the standard/minimal legend text is
 * frozen within a bundle pin (snapshots are byte-frozen; the only edit so far is
 * the v1.10 category-segment wording, beta.3, bundle re-pin); ultrathin carries
 * its own note with the extra cut rules. Full legend: same MCP resource, section
 * `detail_encoding` (incl. the `ultrathin` entry).
 */
const PROVENANCE_LEGEND_ULTRATHIN: ProvenanceLegend = {
  note:
    "Deduplicated encoding (detail=ultrathin): same rules as detail=standard/" +
    "minimal — per-item `source` elided, requirement `category` = " +
    "requirement_id category segment (before the number), g2_context entity lists grouped as " +
    "{slice_id: {entity_id: name|null}}, citations ids via ids_from payload " +
    "paths — PLUS: published `description` fields elided (executable " +
    "activated_scope.descriptions_ref, detail='minimal'), evidence_patterns 0 " +
    "inline (counts + rest-ref in completeness_report), manual_grounding " +
    "aggregate-only (total + sha + groups_ref) and completeness diagnostics " +
    "as exact counts (+ ref). Nothing silently dropped. Full legend: MCP " +
    "read_sbd_toe_resource(sbd://toe/codegen-instructions/{mode}), detail_encoding."
} as const;

/**
 * v2 token diet, s4 — cheap turns, not fewer turns: short note (≈50 tokens)
 * appended to every `standard`/`minimal` ready payload. The production
 * write-test-edit loop is legitimate; what must not repeat is the cost of
 * re-requesting THIS payload — an identical call returns a byte-identical
 * result (deterministic, tested), so the context already in the session is
 * the source for the loop. Follow-ups that genuinely need more go through
 * `detail: "minimal"` or a targeted `consult_security_requirements` call —
 * never a repeat of the full payload. `full` carries NO hint (byte-identical
 * to the classic payload, EPIC invariant 1).
 */
export const REPEAT_CALL_HINT =
  "Identical input returns this exact payload (deterministic) — reuse the context already received; deepen via detail:'minimal' or a targeted consult_security_requirements.";

/**
 * v2 token diet, s3 — reference that replaces the inline
 * `llm_codegen_instructions` + `security_rationale_template` boilerplate at
 * `detail: "standard" | "minimal"` (both stay inline at `full`). The MCP
 * resource carries, per mode, the exact instruction slots and the template
 * skeleton; `active_conditions` lists which conditional slots apply to THIS
 * call, so the inline full content is reconstructible byte-identically.
 */
export interface CodegenInstructionsRef {
  resource: string;
  /** Conditional instruction slots active for this call (see the resource's
   * `llm_codegen_instructions.slots[].when`). */
  active_conditions: InstructionCondition[];
  note: string;
}

/**
 * v2 token diet, s3 — never-silent counter left in place of the elided
 * `activation_trace` at `detail: "standard" | "minimal"` (the full trace is
 * included when `debug: true`, and always at `detail: "full"`).
 */
export interface ActivationTraceRef {
  entries: number;
  note: string;
}

/**
 * v2 token diet, s3 — executable reference for retrieving the evidence
 * patterns omitted by the standard cap (boundList discipline: the counts live
 * in the same completeness_report; this says HOW to get the rest).
 */
export interface EvidencePatternsRest {
  tool: "prepare_sbd_toe_codegen_context";
  /** Merge over this call's input_echo: same input, detail="full" (the
   * classic top-25) at standard/minimal; detail="minimal" (the CHEAPEST level
   * that returns patterns inline) at ultrathin (s3c). */
  with: { detail: "full" } | { detail: "minimal" };
  note: string;
}

/** Completeness report at `standard`/`minimal`: classic counters (with the
 * s3 cap values) plus, when patterns were cut, the executable rest-reference. */
export type DietedCompletenessReport = CompletenessReport & {
  evidence_patterns_rest?: EvidencePatternsRest;
};

/**
 * v2 token diet, s3c — executable reference for the completeness diagnostics
 * elided at `detail: "ultrathin"` (never silent: exact counts stay inline;
 * detail="minimal" is the cheapest level whose completeness_report carries
 * the full text arrays inline).
 */
export interface V1DiagnosticsRef {
  tool: "prepare_sbd_toe_codegen_context";
  /** Merge over this call's input_echo: same input, detail="minimal". */
  with: { detail: "minimal" };
  note: string;
}

/**
 * Completeness report at `detail: "ultrathin"` (s3c) — trimmed to the
 * essentials that support the never-silent discipline. KEPT verbatim: every
 * expected/returned count and m_recall (recall audit), named/unnamed entity
 * counts, and the evidence counts (total / returned=0 / capped=total / cap=0)
 * with the executable `evidence_patterns_rest`. CUT (serialization only, each
 * replaced by its exact count + the executable `v1_diagnostics_ref` when any
 * count > 0): the `v1_consistency_mismatches` and `v1_manifest_warnings` TEXT
 * arrays (the verbose per-slice contract-warning strings, ~100 tokens/call).
 */
export type UltrathinCompletenessReport = Omit<
  DietedCompletenessReport,
  "v1_consistency_mismatches" | "v1_manifest_warnings"
> & {
  /** Exact length of the elided v1_consistency_mismatches array (expected 0). */
  v1_consistency_mismatches_count: number;
  /** Exact length of the elided v1_manifest_warnings array. */
  v1_manifest_warnings_count: number;
  /** Present iff either count above is > 0: how to obtain the full texts. */
  v1_diagnostics_ref?: V1DiagnosticsRef;
};

/**
 * `ready_for_codegen` result at `detail: "standard" | "minimal"`. Same citable
 * ID set as the full result (invariant 3) — the encoding is deduplicated (s1),
 * relations are served on-demand (s2) and, since s3:
 *   - `g2_context.evidence_patterns` is capped 25→10 (deterministic prefix;
 *     never-silent counts + rest-reference in `completeness_report`);
 *   - `llm_codegen_instructions` + `security_rationale_template` move to the
 *     `sbd://toe/codegen-instructions/{mode}` MCP resource
 *     (`codegen_instructions_ref` carries the URI + active conditions);
 *   - `activation_trace` is included only with `debug: true`
 *     (`activation_trace_ref` keeps the never-silent count otherwise);
 *   - requirements and `direct` controls carry the verbatim published
 *     `description` (the "how"), and derivable fields (`category`,
 *     `entity_type`, `slice_family`, `relevance_score`, repeated citation ids)
 *     are elided per the resource's `detail_encoding` legend.
 *
 * s3b (revised per the 2026-07-05 operator ADENDA — NO top-N/subsetting):
 * `minimal` diverges from `standard` ONLY in serialization of traceability,
 * never in execution context. The activated scope (requirements + controls
 * with descriptions, slices, obligations, g2 entities, citations,
 * relations_ref) is byte-identical to `standard`; `minimal` additionally
 *   - caps `g2_context.evidence_patterns` 10→5 (same s3 mechanism: prefix,
 *     counts, rest-ref);
 *   - serves `manual_grounding` in the minimal form ({@link
 *     ManualGroundingMinimal}: counts + hoisted sha + executable groups_ref).
 *
 * s3c (`detail: "ultrathin"`, operator ADENDA 2026-07-05): one level below
 * `minimal`, same rules (activated set COMPLETE, no top-k, nothing id-only,
 * never silent). Diverges from `minimal` ONLY in:
 *   - requirements/controls WITHOUT the published `description` (fields kept:
 *     requirement {requirement_id, name, type}; control {control_id, name,
 *     domain, control_type, confidence}; the `category` lossless guard is
 *     unchanged) + executable `activated_scope.descriptions_ref`;
 *   - `g2_context.evidence_patterns` cap 5→0 (counts + rest-ref to the
 *     cheapest level that returns them: detail="minimal");
 *   - `manual_grounding` in the ultrathin form ({@link ManualGroundingUltrathin}:
 *     total + hoisted sha + executable groups_ref, group list elided);
 *   - `completeness_report` diagnostics trimmed ({@link
 *     UltrathinCompletenessReport}: text arrays → exact counts + executable ref).
 * Everything else — g2 entity maps (id→name|null), relations_ref, citations,
 * codegen_instructions_ref, repeat_call_hint, provenance, next — is
 * byte-identical to the other dieted levels.
 */
export interface PrepareCodegenContextResultReadyDieted {
  status: "ready_for_codegen";
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next?: Affordance[];
  mode: CodegenMode;
  input_echo: PrepareCodegenContextResultReady["input_echo"];
  /** Present only with `debug: true` (s3); see activation_trace_ref otherwise. */
  activation_trace?: ActivationTraceEntry[];
  /** Present when activation_trace is elided (never-silent counter). */
  activation_trace_ref?: ActivationTraceRef;
  provenance_legend: ProvenanceLegend;
  activated_scope: DietedActivatedScope;
  g2_context: DietedG2Context;
  /** Grouped (standard), minimal (s3b) or ultrathin form (s3c). */
  manual_grounding:
    | ManualGroundingGrouped
    | ManualGroundingMinimal
    | ManualGroundingUltrathin;
  regulatory_overlay: DietedRegulatoryOverlayContext;
  citations: CitationsBySource;
  completeness_report: DietedCompletenessReport | UltrathinCompletenessReport;
  codegen_instructions_ref: CodegenInstructionsRef;
  /** s4 — reuse note ({@link REPEAT_CALL_HINT}): identical re-call is
   * deterministic; the context already received is the loop's source. */
  repeat_call_hint: string;
  provenance: PrepareCodegenContextResultReady["provenance"];
  debug?: PrepareCodegenContextResultReady["debug"];
}

export type PrepareCodegenContextResult =
  | PrepareCodegenContextResultReady
  | PrepareCodegenContextResultReadyDieted
  | PrepareCodegenContextResultBlocked;

// ---------------------------------------------------------------------------
// Activation lexicon (small, auditable; WP6 layers semantic scoring on top)
// ---------------------------------------------------------------------------

export const VALID_CONCERNS = [
  "auth",
  "logging",
  "validation",
  "api",
  "config",
  "integrity",
  "distribution",
  "ide",
  "requirements",
  "architecture",
  "iac",
  "encryption",
  "secrets",
  "build",
  "supply_chain",
  "testing",
  "threat_modeling",
  "monitoring",
  "release",
  "deployment",
  "integration",
  // v1.8.0 wave (2026-08-31, contract v1.15): file-handling (FIL) and personal-data
  // privacy (PRI) catalogues — new base categories of ch. 02.
  "files",
  "privacy",
  // AI-agent / automation governance catalogue (REQ-AGN-001…004, category AGN;
  // consumer contract v1.10 §1.18) — maps through the loader's concernsMap
  // (`agents: ["AGN"]`, absorbed from master bc8c9189 in 0.20.0-beta.3).
  "agents"
] as const;

export type Concern = (typeof VALID_CONCERNS)[number];

const CONCERN_LEXICON: ReadonlySet<string> = new Set(VALID_CONCERNS);

/**
 * Mapping of literal task tokens (lower-case) to the concerns they activate.
 * Single-source-of-truth, audited table. Tokens are matched via
 * whole-word/substring search on the lower-cased task string.
 */
const TASK_TERM_TO_CONCERNS: ReadonlyArray<readonly [string, readonly Concern[]]> = [
  ["auth", ["auth"]],
  ["authentication", ["auth"]],
  ["authorization", ["auth"]],
  ["login", ["auth", "encryption"]],
  ["session", ["auth"]],
  ["jwt", ["auth"]],
  ["oauth", ["auth"]],
  ["token", ["auth"]],
  ["password", ["auth", "encryption"]],
  ["validation", ["validation", "api"]],
  ["validate", ["validation", "api"]],
  ["sanitize", ["validation"]],
  ["sanitization", ["validation"]],
  ["payload", ["validation", "api"]],
  ["input", ["validation"]],
  ["schema", ["validation", "api"]],
  ["endpoint", ["api"]],
  ["route", ["api"]],
  ["rest", ["api"]],
  ["http", ["api"]],
  ["graphql", ["api"]],
  ["logging", ["logging", "monitoring"]],
  ["audit", ["logging"]],
  ["log", ["logging"]],
  ["secret", ["secrets"]],
  ["hardcoded", ["secrets", "config"]],
  ["credential", ["secrets", "auth"]],
  ["api key", ["secrets"]],
  ["env var", ["secrets", "config"]],
  ["environment variable", ["secrets", "config"]],
  ["sbom", ["supply_chain"]],
  ["dependency", ["supply_chain"]],
  ["dependencies", ["supply_chain"]],
  ["build", ["build", "supply_chain"]],
  ["ci/cd", ["build", "release"]],
  ["pipeline", ["build", "release"]],
  ["release", ["release"]],
  ["deploy", ["deployment", "release"]],
  ["rollback", ["release"]],
  ["terraform", ["iac"]],
  ["ansible", ["iac"]],
  ["kubernetes", ["deployment", "config"]],
  ["docker", ["deployment", "config"]],
  ["container", ["deployment"]],
  ["ai agent", ["agents"]],
  ["agentic", ["agents"]],
  ["kill-switch", ["agents"]],
  ["kill switch", ["agents"]],
  ["autonomy level", ["agents"]],
  ["threat model", ["threat_modeling"]],
  ["stride", ["threat_modeling"]],
  ["linddun", ["threat_modeling"]],
  ["test", ["testing"]],
  ["spec", ["testing"]],
  ["e2e", ["testing"]],
  ["fuzz", ["testing"]],
  ["encryption", ["encryption"]],
  ["tls", ["encryption", "api"]],
  ["cipher", ["encryption"]],
  ["hash", ["encryption"]],
  ["trust boundary", ["architecture"]],
  ["architecture", ["architecture"]],
  ["microservice", ["architecture", "integration"]],
  ["service-to-service", ["integration", "architecture"]],
  ["grpc", ["integration", "api"]],
  ["rpc", ["integration", "api"]],
  ["webhook", ["integration", "api"]],
  ["queue", ["integration"]],
  // pós-P2 2026-08-31: integração por mensageria exige registo de eventos críticos → logging.
  ["message queue", ["integration", "logging"]],
  // pós-P2 2026-08-31: mTLS = gestão de material criptográfico → secrets (CFG/ENC).
  ["mtls", ["encryption", "integration", "secrets"]],
  // v1.8.0 wave (FIL/PRI, léxico ancorado no Manual cap. 02):
  ["file", ["files"]],
  ["upload", ["files", "validation"]],
  ["uploading", ["files", "validation"]],
  ["attachment", ["files"]],
  ["photo", ["files"]],
  ["pii", ["privacy"]],
  ["personal data", ["privacy"]],
  ["signature", ["integrity", "encryption"]],
  ["signing", ["integrity"]],
  // "image" saiu da tabela: homónimo desambiguado por contexto (bloco R-image em activate()).
  ["spa", ["validation", "api"]],
  ["frontend", ["validation"]],
  ["pubsub", ["integration"]],
  ["monitoring", ["monitoring", "logging"]],
  ["metric", ["monitoring"]],
  ["alert", ["monitoring"]]
] as const;

/**
 * Supplements the legacy `ontology.concernsMap` (which only knows the original
 * 12 concerns) with mappings for the WP5 concerns that target runtime v0
 * categories. Keys are concerns added by this module. The categories map to
 * existing runtime v0 categories so the v0 requirement filter still works.
 */
/**
 * Declared context activators (G-mp1a/D3). Module scope + exported since
 * 0.20.0-beta.21 (declarative-first): `sbd://toe/activation-vocabulary` publishes
 * them — the vocabulary IS the contract, so it is derived from these tables and
 * never restated by hand.
 */
export const EXPOSURE_CONCERNS: Readonly<Record<string, readonly Concern[]>> = {
  internal: ["auth", "logging"],
  authenticated: ["auth", "logging"],
  public: ["auth", "logging", "api", "validation", "architecture"]
};

export const SENSITIVITY_CONCERNS: Readonly<Record<string, readonly Concern[]>> = {
  // v1.8.0: personal/regulated data now also activates the PRI catalogue (privacy).
  personal: ["encryption", "validation", "logging", "privacy"],
  regulated: ["encryption", "validation", "logging", "privacy"],
  secrets: ["secrets"]
};

export const CONCERN_TO_V0_CATEGORIES_SUPPLEMENT: Readonly<Record<Concern, string[]>> = {
  // Existing concerns intentionally left empty — fall back to ontology.concernsMap.
  auth: [],
  logging: [],
  validation: [],
  api: [],
  config: [],
  integrity: [],
  distribution: [],
  ide: [],
  requirements: [],
  architecture: [],
  iac: [],
  encryption: [],
  // New WP5 concerns -> runtime v0 categories
  secrets: ["CFG", "ENC"],
  build: ["CIC", "DEV"],
  supply_chain: ["CIC", "INT", "DEP"],
  testing: ["TST"],
  threat_modeling: ["THR"],
  monitoring: ["LOG", "OPS"],
  release: ["DPL", "OPS"],
  // pós-P2 2026-08-31: deploy activa também a categoria base DST (cap. 02 — "Deploy
  // apenas via pipeline validado" e afins); supplement do serving, loader inalterado.
  deployment: ["DPL", "IAC", "CNT", "DST"],
  integration: ["API", "INT"],
  // v1.8.0 wave: the loader concernsMap predates FIL/PRI — served-side supplement.
  files: ["FIL"],
  privacy: ["PRI"],
  // `agents` → AGN comes from ontology.concernsMap (loader); nothing to supplement.
  agents: []
};

const CONCERN_TO_SLICE_FAMILY: Readonly<Record<Concern, string | null>> = {
  auth: "ACO-IAT",
  validation: "ACO-IVF",
  logging: "ACO-SLG",
  api: "ACO-IVF",
  config: "ACO-SPC",
  integrity: "ACO-SCBI",
  distribution: "ACO-RPR",
  ide: null,
  requirements: null,
  architecture: "ACO-ATB",
  iac: "ACO-RPR",
  encryption: "ACO-SPC",
  secrets: "ACO-SPC",
  build: "ACO-SCBI",
  supply_chain: "ACO-SCBI",
  testing: "ACO-TSV",
  threat_modeling: "ACO-TMR",
  monitoring: "ACO-SLG",
  release: "ACO-RPR",
  deployment: "ACO-RPR",
  integration: "ACO-ITS",
  // No published AppSec Core slice family yet for the v1.8.0 FIL/PRI catalogues —
  // anchor when AppSec Core publishes one; null = no grounding family, and the
  // decomposition gate ignores null families.
  files: null,
  privacy: null,
  // No AppSec Core slice family for the AGN catalogue (no published control link
  // for REQ-AGN-001…004 — declared gap, never invented).
  agents: null
};

/**
 * PT codegen aliases that complement `CANONICAL_ALIASES_PT_EN` in the semantic
 * gateway. Each PT token is paired with the EN tokens that should be appended
 * before lexicon matching. Kept small and auditable.
 */
const CODEGEN_PT_ALIASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["segredo", ["secret"]],
  ["segredos", ["secrets"]],
  ["senha", ["password"]],
  ["validação", ["validation"]],
  ["validar", ["validate"]],
  ["sanitizar", ["sanitize"]],
  ["autenticação", ["authentication", "auth"]],
  ["autorização", ["authorization"]],
  ["registo", ["log"]],
  ["registos", ["logs"]],
  ["implantação", ["deployment", "deploy"]],
  ["lançamento", ["release"]],
  ["cadeia de fornecimento", ["supply chain"]],
  ["integração", ["integration"]],
  ["fronteira", ["boundary"]],
  ["arquitetura", ["architecture"]],
  // R3 do ciclo MP1 (2026-08-31, crescimento por semântica do Manual — cap. 02
  // categoria SES = sessões; nunca por caso do oráculo): sessão/sessões → session.
  ["sessão", ["session"]],
  ["sessões", ["session"]],
  // v1.8.0 (FIL/PRI):
  ["ficheiro", ["file"]],
  ["ficheiros", ["file"]],
  ["anexo", ["attachment"]],
  ["anexos", ["attachment"]],
  ["fotografia", ["photo"]],
  ["fotografias", ["photo"]],
  ["dados pessoais", ["personal data"]],
  ["finalidade", ["personal data"]],
  ["chave de api", ["api key"]],
  ["chave de cliente", ["api key"]],
  ["chaves de cliente", ["api key"]],
  ["mensageria", ["message queue"]],
  ["fila de mensagens", ["message queue"]],
  ["assinatura", ["signature"]],
  ["imagem", ["image"]],
  ["variável de ambiente", ["environment variable"]]
] as const;

/**
 * Compound (multi-token) phrases that activate multiple concerns at once.
 * Single tokens stay in `TASK_TERM_TO_CONCERNS`; compounds capture the
 * canonical multi-domain asks the codegen scope gate needs to cover.
 */
const COMPOUND_TERM_TO_CONCERNS: ReadonlyArray<readonly [string, readonly Concern[]]> = [
  ["endpoint seguro", ["api", "auth", "validation", "logging"]],
  ["secure endpoint", ["api", "auth", "validation", "logging"]],
  ["api segura", ["api", "auth", "validation", "logging"]],
  ["secure api", ["api", "auth", "validation", "logging"]],
  ["segredo hardcoded", ["secrets", "config"]],
  ["hardcoded secret", ["secrets", "config"]],
  ["hardcoded credential", ["secrets", "config", "auth"]],
  ["pipeline release", ["build", "release"]],
  ["release pipeline", ["build", "release"]],
  ["build pipeline", ["build", "supply_chain"]],
  ["ci pipeline", ["build", "supply_chain"]],
  ["trust boundary", ["architecture"]],
  ["fronteira de confiança", ["architecture"]],
  ["formulário de registo", ["auth", "validation"]],
  ["registration form", ["auth", "validation"]],
  ["service to service", ["integration", "architecture"]],
  ["serviço a serviço", ["integration", "architecture"]],
  ["secret rotation", ["secrets"]],
  ["rotação de segredo", ["secrets"]]
] as const;

/**
 * Codegen-specific intent classification. We do NOT reuse the semantic gateway
 * `classifyQueryIntent` here because its matcher uses bidirectional substring
 * matching that produces false positives (e.g. PT "este" matches keyword
 * "teste", which would spuriously activate `ci_cd_gates`). For activation
 * gating we need whole-word matches.
 *
 * Each entry lists keywords that must appear as whole words in the (alias-
 * expanded) task text, and the concerns the intent activates.
 */
const CODEGEN_INTENTS: ReadonlyArray<{
  intent: string;
  keywords: readonly string[];
  concerns: readonly Concern[];
}> = [
  {
    intent: "dependency_governance",
    keywords: ["sbom", "sca", "dependency", "dependencies", "vendor"],
    concerns: ["supply_chain"]
  },
  {
    intent: "ci_cd_gates",
    keywords: ["ci/cd", "pipeline", "workflow", "github actions"],
    concerns: ["build", "release"]
  },
  {
    intent: "repo_bootstrap",
    keywords: ["bootstrap", "scaffold"],
    concerns: ["architecture"]
  }
];

function taskMatchesKeyword(taskLower: string, keyword: string): boolean {
  // Whole-word / boundary match on lower-cased task text.
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i");
  return pattern.test(taskLower);
}

const VAGUE_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(torna|make).{0,40}\b(segur[ao]|secure)\b/i,
    reason: "Pedido excessivamente abrangente ('make secure' / 'tornar seguro')"
  },
  {
    pattern: /\b(implementa|implement).{0,30}\b(compliance|cra|gdpr|nis2|dora)\b.{0,30}\b(toda|all)\b/i,
    reason: "Cobertura regulatória 'toda a API/aplicação' deve ser decomposta"
  },
  {
    pattern: /\b(fix|corrige|resolve)\b.{0,40}\b(all|todos|todas|every)\b.{0,40}\b(security|seguran[çc]a|issues|problemas)\b/i,
    reason: "Reparação 'de todos os problemas' é uma meta, não uma tarefa de codegen"
  },
  {
    pattern: /\b(complete|whole|across).{0,30}\b(architecture|api|application|app|repo|codebase)\b/i,
    reason: "Âmbito a cobrir toda a arquitectura/API/repo deve ser decomposto"
  },
  {
    pattern: /\bgera(r)? .{0,30}\barquitetura\b.{0,30}\bcompleta\b/i,
    reason: "Geração de arquitectura completa não é uma tarefa de codegen"
  },
  {
    pattern: /\b(whole|entire|complete|todo o|all of the)\b[^.]{0,15}\bmanual\b|\bmanual\b[^.]{0,15}\b(inteiro|completo|todo)\b/i,
    reason: "Aplicar o manual inteiro é uma meta, não uma tarefa de codegen — decompõe num pedido concreto."
  },
  {
    pattern: /\b(give me everything|d[áa]-?me tudo|quero tudo|aplica tudo)\b/i,
    reason: "'Dá-me tudo' deve ser decomposto numa superfície técnica concreta (endpoint + fase + 1-3 concerns)."
  }
];

/**
 * Technologies clearly outside the SbD-ToE manual's scope (advanced cryptography /
 * distributed-ledger / experimental). The grounded codegen has no material for
 * these, so the request is unsupported rather than decomposable.
 */
const UNSUPPORTED_TECH_PATTERN =
  /\b(homomorphic|quantum[- ]?(resistant|safe)?|post[- ]?quantum|blockchain|smart contract|zero[- ]?knowledge|zk[- ]?(snark|stark|proof)s?|secure multiparty|federated learning)\b/i;

// ---------------------------------------------------------------------------
// Input normalization
// ---------------------------------------------------------------------------

export interface NormalizedInput {
  task: string;
  taskTrimmed: string;
  taskLower: string;
  tokenCount: number;
  mode: CodegenMode;
  risk_level?: RiskLevel;
  stack?: string;
  exposure?: PrepareCodegenContextInput["exposure"];
  data_sensitivity?: PrepareCodegenContextInput["data_sensitivity"];
  concerns: Concern[];
  unknownConcerns: string[];
  changed_files: string[];
  regulatory_frameworks: string[];
  include_regulatory_overlay: boolean;
  debug: boolean;
}

export function normalizeInput(raw: unknown): NormalizedInput {
  const data = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  const task = typeof data.task === "string" ? data.task : "";
  const taskTrimmed = task.trim();
  const taskLower = taskTrimmed.toLowerCase();
  const tokenCount = taskTrimmed.length === 0 ? 0 : taskTrimmed.split(/\s+/).length;

  const modeRaw = typeof data.mode === "string" ? data.mode : "codegen";
  const mode: CodegenMode =
    modeRaw === "review" || modeRaw === "test-plan" ? modeRaw : "codegen";

  const risk_level =
    data.risk_level === "L1" || data.risk_level === "L2" || data.risk_level === "L3"
      ? (data.risk_level as RiskLevel)
      : undefined;

  const concernsRaw = Array.isArray(data.concerns) ? data.concerns : [];
  const concerns: Concern[] = [];
  const unknownConcerns: string[] = [];
  for (const entry of concernsRaw) {
    if (typeof entry !== "string") continue;
    if (CONCERN_LEXICON.has(entry)) {
      concerns.push(entry as Concern);
    } else {
      unknownConcerns.push(entry);
    }
  }

  const changed_files = Array.isArray(data.changed_files)
    ? data.changed_files.filter((entry): entry is string => typeof entry === "string")
    : [];

  const regulatory_frameworks = Array.isArray(data.regulatory_frameworks)
    ? data.regulatory_frameworks.filter(
        (entry): entry is string => typeof entry === "string" && entry.length > 0
      )
    : [];

  const normalized: NormalizedInput = {
    task,
    taskTrimmed,
    taskLower,
    tokenCount,
    mode,
    concerns,
    unknownConcerns,
    changed_files,
    regulatory_frameworks,
    include_regulatory_overlay: data.include_regulatory_overlay === true,
    debug: data.debug === true
  };
  if (risk_level) normalized.risk_level = risk_level;
  if (typeof data.stack === "string") normalized.stack = data.stack;
  if (
    data.exposure === "local" ||
    data.exposure === "internal" ||
    data.exposure === "authenticated" ||
    data.exposure === "public"
  ) {
    normalized.exposure = data.exposure;
  }
  if (
    data.data_sensitivity === "low" ||
    data.data_sensitivity === "personal" ||
    data.data_sensitivity === "regulated" ||
    data.data_sensitivity === "secrets"
  ) {
    normalized.data_sensitivity = data.data_sensitivity;
  }
  return normalized;
}

function inputEcho(
  raw: PrepareCodegenContextInput
): Required<Pick<PrepareCodegenContextInput, "task">> &
  Omit<PrepareCodegenContextInput, "task"> {
  return {
    task: raw.task ?? "",
    ...(raw.risk_level ? { risk_level: raw.risk_level } : {}),
    ...(raw.mode ? { mode: raw.mode } : {}),
    ...(raw.stack ? { stack: raw.stack } : {}),
    ...(raw.exposure ? { exposure: raw.exposure } : {}),
    ...(raw.data_sensitivity ? { data_sensitivity: raw.data_sensitivity } : {}),
    ...(raw.concerns ? { concerns: raw.concerns } : {}),
    ...(raw.changed_files ? { changed_files: raw.changed_files } : {}),
    ...(raw.regulatory_frameworks
      ? { regulatory_frameworks: raw.regulatory_frameworks }
      : {}),
    ...(typeof raw.include_regulatory_overlay === "boolean"
      ? { include_regulatory_overlay: raw.include_regulatory_overlay }
      : {}),
    ...(typeof raw.debug === "boolean" ? { debug: raw.debug } : {})
  };
}

// ---------------------------------------------------------------------------
// Activation engine
// ---------------------------------------------------------------------------

export interface ActivationResult {
  concerns: Concern[];
  sliceFamilies: string[];
  /** P3 do ciclo MP1 (2026-08-31): famílias contadas para o gate de decomposição —
   * UM SINAL = UMA SUPERFÍCIE. Só o concern PRIMÁRIO de cada sinal (posição 0 do
   * mapeamento do termo/frase; explícitos/intents/ficheiros contam por si) contribui
   * a sua família; concerns de suporte (posições secundárias, ex.: mtls→secrets,
   * message queue→logging) activam categorias mas não são superfícies novas.
   * `sliceFamilies` (grounding) fica intocado. */
  decompositionFamilies: string[];
  trace: ActivationTraceEntry[];
  rejected: ActivationTraceEntry[];
  notes: string[];
  /** Per-concern aggregated score (max over contributing trace entries). */
  concernScores: Map<Concern, number>;
  /** Per-slice-family aggregated score. */
  sliceFamilyScores: Map<string, number>;
}

function expandTaskText(taskLower: string): {
  expanded: string;
  appliedAliases: Array<{ pt: string; en: readonly string[] }>;
} {
  const gatewayExpansion = expandQueryWithAliases(taskLower).toLowerCase();
  let expanded = gatewayExpansion;
  const applied: Array<{ pt: string; en: readonly string[] }> = [];
  for (const [pt, en] of CODEGEN_PT_ALIASES) {
    if (expanded.includes(pt)) {
      expanded = `${expanded} ${en.join(" ")}`;
      applied.push({ pt, en });
    }
  }
  return { expanded, appliedAliases: applied };
}

function recordActivation(
  trace: ActivationTraceEntry[],
  concerns: Set<Concern>,
  scores: Map<Concern, number>,
  rejected: ActivationTraceEntry[],
  entry: ActivationTraceEntry,
  targetConcern: Concern,
  options: { capDuplicates: boolean }
): void {
  const existing = scores.get(targetConcern);
  if (existing === undefined) {
    concerns.add(targetConcern);
    scores.set(targetConcern, entry.score);
    trace.push(entry);
    return;
  }
  if (entry.score > existing) {
    scores.set(targetConcern, entry.score);
    trace.push(entry);
    return;
  }
  if (options.capDuplicates) {
    rejected.push(entry);
  } else {
    trace.push(entry);
  }
}

export function activate(
  input: NormalizedInput,
  options: { declaredOnly?: boolean } = {}
): ActivationResult {
  const declaredOnly = options.declaredOnly ?? false;
  const trace: ActivationTraceEntry[] = [];
  const rejected: ActivationTraceEntry[] = [];
  const notes: string[] = [];
  const concerns = new Set<Concern>();
  const concernScores = new Map<Concern, number>();

  // 1) Explicit concerns from the caller (highest authority).
  for (const concern of input.concerns) {
    recordActivation(
      trace,
      concerns,
      concernScores,
      rejected,
      {
        source: "explicit_concern",
        produced: concern,
        trigger: concern,
        score: 1.0,
        confidence: "deterministic",
        reason: "User supplied this concern in the `concerns` array."
      },
      concern,
      { capDuplicates: false }
    );
  }
  for (const unknown of input.unknownConcerns) {
    rejected.push({
      source: "explicit_concern",
      produced: "<rejected>",
      trigger: unknown,
      score: 0,
      confidence: "deterministic",
      reason: `Concern '${unknown}' is not in the WP5/WP6 lexicon (${VALID_CONCERNS.join(", ")}).`
    });
  }

  // 0.20.0-beta.21 — DECLARATIVO PRIMEIRO: tudo o que se segue até ao bloco 4 é
  // INFERÊNCIA SOBRE PROSA/PATHS (termos da tarefa, aliases, compostos, homónimo
  // da imagem, intenções, e as heurísticas de NOME de ficheiro). No caminho
  // declarativo (default nesta linha) NÃO corre: o servidor responde ao que lhe
  // declararam. Fica disponível em mode="discover" — instrumento de investigação
  // (oráculo histórico + estudo de paráfrase), marcado exploratório na resposta.
  if (!declaredOnly) {
    // 2) Alias expansion + direct task-term matches.
    const { expanded, appliedAliases } = expandTaskText(input.taskLower);
    for (const alias of appliedAliases) {
      notes.push(
        `alias_expansion: '${alias.pt}' -> [${alias.en.join(", ")}]`
      );
    }

    // 2a) Compound phrases (run first — they encode canonical multi-domain asks).
    // Whole-word match prevents accidental hits inside larger tokens.
    for (const [phrase, mapped] of COMPOUND_TERM_TO_CONCERNS) {
      if (!taskMatchesKeyword(expanded, phrase)) continue;
      for (const concern of mapped) {
        recordActivation(
          trace,
          concerns,
          concernScores,
          rejected,
          {
            source: "compound_term",
            produced: concern,
            trigger: phrase,
            score: 0.7,
            confidence: "semantic",
            reason: `Compound phrase '${phrase}' activates ${concern}.`
          },
          concern,
          { capDuplicates: true }
        );
      }
    }

    // 2b) Single-token task terms. Whole-word matching prevents false positives
    // like `test` inside `latest` or `log` inside `logical`.
    for (const [term, mapped] of TASK_TERM_TO_CONCERNS) {
      if (!taskMatchesKeyword(expanded, term)) continue;
      const viaAlias =
        !taskMatchesKeyword(input.taskLower, term) &&
        appliedAliases.some((alias) => alias.en.includes(term));
      for (const concern of mapped) {
        recordActivation(
          trace,
          concerns,
          concernScores,
          rejected,
          {
            source: viaAlias ? "alias_expansion" : "task_term",
            produced: concern,
            trigger: term,
            score: viaAlias ? 0.6 : 0.8,
            confidence: viaAlias ? "semantic" : "deterministic",
            reason: viaAlias
              ? `Task text matches '${term}' after PT/EN alias expansion.`
              : `Task text contains '${term}'.`
          },
          concern,
          { capDuplicates: true }
        );
      }
    }

    // 2b-bis) R-image (vaga v1.8.0, 2026-08-31): "image"/"imagem" é homónimo —
    // imagem de container vs ficheiro de imagem (finding do replay DualGauge).
    // Desambiguação DECLARADA por contexto: image+docker/registry/container → sentido
    // container (deployment/distribution); image+file/upload/photo → FIL (files);
    // ambos os contextos → ambos; nenhum → sentido histórico (deployment/distribution).
    if (taskMatchesKeyword(expanded, "image")) {
      const containerCtx = /docker|registry|container|kubernetes|k8s|\boci\b/.test(expanded);
      const fileCtx = /upload|file|photo|picture|png|jpe?g|gif|avatar|galeria|gallery|perfil|profile/.test(expanded);
      const senses: Array<{ concern: Concern; reason: string }> = [];
      if (fileCtx) {
        senses.push({ concern: "files", reason: "R-image: 'image' em contexto file/upload/photo → ficheiro de imagem (FIL)" });
      }
      if (containerCtx || !fileCtx) {
        senses.push(
          { concern: "deployment", reason: containerCtx ? "R-image: 'image' em contexto docker/registry/container → imagem de container" : "R-image: 'image' sem contexto discriminante → sentido histórico (deployment)" },
          { concern: "distribution", reason: containerCtx ? "R-image: 'image' em contexto docker/registry/container → distribuição de imagem" : "R-image: 'image' sem contexto discriminante → sentido histórico (distribution)" }
        );
      }
      for (const { concern, reason } of senses) {
        recordActivation(
          trace, concerns, concernScores, rejected,
          { source: "task_term", produced: concern, trigger: "image", score: 0.8, confidence: "deterministic", reason },
          concern,
          { capDuplicates: true }
        );
      }
    }

    // 2c) Whole-word intent classification (codegen-specific; stricter than the
    // gateway's substring matcher to avoid PT/EN false positives).
    for (const intentEntry of CODEGEN_INTENTS) {
      const matchedKeyword = intentEntry.keywords.find((keyword) =>
        taskMatchesKeyword(expanded, keyword)
      );
      if (!matchedKeyword) continue;
      for (const concern of intentEntry.concerns) {
        recordActivation(
          trace,
          concerns,
          concernScores,
          rejected,
          {
            source: "intent_keyword",
            produced: concern,
            trigger: intentEntry.intent,
            score: 0.5,
            confidence: "semantic",
            reason: `Intent '${intentEntry.intent}' matched keyword '${matchedKeyword}'.`
          },
          concern,
          { capDuplicates: false }
        );
      }
    }

    // 3) Changed-file path heuristics.
    for (const file of input.changed_files) {
      const lower = file.toLowerCase();
      const fileHits: Concern[] = [];
      if (/route|router|controller|handler|endpoint/.test(lower)) fileHits.push("api");
      if (/auth|session|jwt|login/.test(lower)) fileHits.push("auth");
      if (/log|logger/.test(lower)) fileHits.push("logging");
      if (/config|env|settings/.test(lower)) fileHits.push("config");
      if (/secret|credential/.test(lower)) fileHits.push("secrets");
      if (/test|spec/.test(lower)) fileHits.push("testing");
      if (/dockerfile|docker-compose|k8s|kubernetes|terraform/.test(lower))
        fileHits.push("deployment");
      for (const concern of fileHits) {
        recordActivation(
          trace,
          concerns,
          concernScores,
          rejected,
          {
            source: "changed_file",
            produced: concern,
            trigger: file,
            score: 0.5,
            confidence: "semantic",
            reason: `Changed file path matches '${concern}' heuristics.`
          },
          concern,
          { capDuplicates: true }
        );
      }
    }

  }

  // 4) Slice families (ranked by max contributing concern score).
  const sliceFamilyScores = new Map<string, number>();
  for (const concern of concerns) {
    const family = CONCERN_TO_SLICE_FAMILY[concern];
    if (!family) continue;
    const score = concernScores.get(concern) ?? 0;
    const existing = sliceFamilyScores.get(family);
    if (existing === undefined || score > existing) {
      sliceFamilyScores.set(family, score);
    }
    trace.push({
      // 0.20.0-beta.22 (P2-A): isto NUNCA foi um termo da tarefa — é o mapeamento
      // determinístico concern → slice family. A etiqueta `task_term` era órfã do
      // motor lexical e aparecia mesmo com `task` vazio. Em `discover` o task_term
      // legítimo (casamento de palavras) mantém-se; aqui a fonte diz o que é.
      source: declaredOnly ? "concern_slice_mapping" : "task_term",
      produced: family,
      trigger: concern,
      score,
      confidence: "deterministic",
      reason: `Concern '${concern}' maps to AppSec Core slice family '${family}'.`
    });
  }

  // 4b) Declared context activators (G-mp1a / D3, 2026-08-31): exposure and
  // data_sensitivity stop being decorative — they activate concerns by DECLARED
  // rule (each with its own trace source), because the reference selection
  // semantics says an authenticated/public surface must be auditable and a
  // personal/regulated data context must carry crypto+masking+validation.
  if (input.exposure && EXPOSURE_CONCERNS[input.exposure]) {
    for (const concern of EXPOSURE_CONCERNS[input.exposure] ?? []) {
      recordActivation(
        trace, concerns, concernScores, rejected,
        {
          source: "exposure",
          produced: concern,
          trigger: input.exposure,
          score: 0.9,
          confidence: "deterministic",
          reason: `exposure='${input.exposure}' activates ${concern} by declared rule (auditable exposed surface).`
        },
        concern,
        { capDuplicates: true }
      );
    }
  }
  if (input.data_sensitivity && SENSITIVITY_CONCERNS[input.data_sensitivity]) {
    for (const concern of SENSITIVITY_CONCERNS[input.data_sensitivity] ?? []) {
      recordActivation(
        trace, concerns, concernScores, rejected,
        {
          source: "data_sensitivity",
          produced: concern,
          trigger: input.data_sensitivity,
          score: 0.9,
          confidence: "deterministic",
          reason: `data_sensitivity='${input.data_sensitivity}' activates ${concern} by declared rule (ENC/masking/validation for personal or regulated data).`
        },
        concern,
        { capDuplicates: true }
      );
    }
  }

  // 5-pre) 0.20.0-beta.22 (P1-D): o `stack` é a ÚNICA leitura de texto que resta no
  // caminho declarativo (token EXACTO de um conjunto fechado — normalizar o declarado).
  // Deixava de fora o rasto: os capítulos apareciam sem que o auditor pudesse ver
  // porquê. Agora cada token reconhecido emite a sua entrada.
  if (declaredOnly && input.stack) {
    for (const token of stackTokensFromVocabulary(input.stack)) {
      trace.push({
        source: "stack_token",
        produced: token,
        trigger: "stack",
        score: 0.9,
        confidence: "deterministic",
        reason: `token exacto de \`technologies\` encontrado em \`stack\`: '${token}' (normalização de valor declarado; o texto livre à volta é ignorado)`
      });
    }
  }

  // 5) Risk level (informational trace entry, no concern activation).
  if (input.risk_level) {
    trace.push({
      source: "risk_level",
      produced: input.risk_level,
      trigger: input.risk_level,
      score: 1.0,
      confidence: "deterministic",
      reason: `Risk level ${input.risk_level} filters runtime v0 requirements.`
    });
  }

  // P3 (2026-08-31): primary-concern families for the decomposition gate.
  const primaryOfSignal = new Map<string, Concern>();
  for (const [term, mapped] of TASK_TERM_TO_CONCERNS) {
    if (mapped.length > 0) primaryOfSignal.set(term, mapped[0]!);
  }
  for (const [phrase, mapped] of COMPOUND_TERM_TO_CONCERNS) {
    if (mapped.length > 0) primaryOfSignal.set(phrase, mapped[0]!);
  }
  const primaryConcerns = new Set<Concern>();
  for (const entry of trace) {
    if (
      entry.source === "risk_level" ||
      entry.source === "exposure" ||
      entry.source === "data_sensitivity" ||
      entry.source === "scope_gate"
    ) {
      continue; // contexto/informativos — não são superfícies
    }
    if (!concerns.has(entry.produced as Concern)) continue;
    const rowPrimary = primaryOfSignal.get(entry.trigger);
    if (rowPrimary === undefined || rowPrimary === entry.produced) {
      primaryConcerns.add(entry.produced as Concern);
    }
  }
  const decompositionFamilies = [
    ...new Set(
      [...primaryConcerns]
        .map((concern) => CONCERN_TO_SLICE_FAMILY[concern])
        .filter((family): family is string => typeof family === "string")
    )
  ].sort();

  return {
    concerns: [...concerns],
    decompositionFamilies,
    sliceFamilies: [...sliceFamilyScores.keys()].sort(
      (a, b) =>
        (sliceFamilyScores.get(b) ?? 0) - (sliceFamilyScores.get(a) ?? 0) ||
        a.localeCompare(b)
    ),
    trace,
    rejected,
    notes,
    concernScores,
    sliceFamilyScores
  };
}

// ---------------------------------------------------------------------------
// Scope gate
// ---------------------------------------------------------------------------

interface GateDecision {
  status: PrepareCodegenStatus | "ready_for_codegen";
  reasons: string[];
  suggestions: string[];
}

function gateBeforeActivation(input: NormalizedInput): GateDecision | null {
  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (UNSUPPORTED_TECH_PATTERN.test(input.taskTrimmed)) {
    return {
      status: "unsupported_scope",
      reasons: [
        "A task refere tecnologia fora do âmbito do manual SbD-ToE (ex.: criptografia homomórfica, quantum/post-quantum, blockchain, zero-knowledge)."
      ],
      suggestions: [
        "O SbD-ToE cobre AppSec geral; para esta tecnologia o codegen grounded não tem material.",
        "Reformula para uma superfície coberta (auth, validação, secrets, dependências/SBOM, CI/CD, IaC, monitorização)."
      ]
    };
  }

  if (input.taskTrimmed.length === 0) {
    reasons.push("Campo `task` está vazio.");
    suggestions.push("Indica o que pretendes fazer ('Adicionar validação ao endpoint X').");
  } else if (input.tokenCount < 4) {
    reasons.push(`Task tem apenas ${input.tokenCount} palavras — demasiado curta para grounding.`);
    suggestions.push("Inclui pelo menos endpoint/módulo, ação concreta e contexto.");
  }

  for (const { pattern, reason } of VAGUE_PATTERNS) {
    if (pattern.test(input.taskTrimmed)) {
      return {
        status: "needs_decomposition",
        reasons: [reason],
        suggestions: [
          "Decompõe o pedido em tarefas concretas (uma superfície técnica + uma fase + 1-3 concerns).",
          "Exemplo OK: 'Adicionar validação de payload ao endpoint PATCH /users/:id/email.'"
        ]
      };
    }
  }

  if (reasons.length > 0) {
    return { status: "needs_clarification", reasons, suggestions };
  }

  return null;
}

interface PostActivationGateInput {
  input: NormalizedInput;
  activation: ActivationResult;
  estimatedRequirements: number;
  /** 0.20.0-beta.21: as superfícies vieram de DECLARAÇÕES do chamador (não de prosa). */
  declaredSurfaces?: boolean;
}

function gateAfterActivation(args: PostActivationGateInput): GateDecision | null {
  const { input, activation, estimatedRequirements } = args;
  const declaredSurfaces = args.declaredSurfaces === true;
  const reasons: string[] = [];
  const suggestions: string[] = [];

  // P3 do ciclo MP1 (2026-08-31): o gate conta SUPERFÍCIES (famílias dos concerns
  // primários de cada sinal), não o total de famílias activadas — concerns de
  // suporte de um mesmo sinal (mtls→secrets, mensageria→logging) não pedem
  // decomposição. GC-10 é o caso de referência: 1 integração legítima.
  // 0.20.0-beta.21 («declarativo primeiro»): o gate de decomposição nasceu para travar
  // pedidos VAGOS cuja prosa activava meio catálogo. Quando as famílias vêm de
  // DECLARAÇÕES explícitas, bloquear contradiz o contrato — o chamador não foi vago,
  // foi preciso. O guarda do tamanho da resposta passa a ser (e já era) o tecto de
  // requisitos por detail (0.19.4). Em `discover` a regra mantém-se tal e qual.
  if (!declaredSurfaces && activation.decompositionFamilies.length > 3) {
    reasons.push(
      `Pedido activa ${activation.decompositionFamilies.length} superfícies (famílias primárias: ${activation.decompositionFamilies.join(
        ", "
      )}) — máximo recomendado: 3. Concerns de suporte do mesmo sinal não contam.`
    );
    suggestions.push(
      "Reparte por slice family. Cada PR/PR-step deve ficar em 1–3 slices."
    );
  }

  // G-mp1a decision 2 (2026-08-31, D1): the former hard cap "max 50 activated
  // requirements" is GONE — a legitimate L2 task activates >50 by design (the
  // cap 02 baseline is a real catalogue). The gate guards TASK scope (vague /
  // multi-family asks above) and PAYLOAD (the detail diet + budgets), never a
  // requirement count. estimatedRequirements stays as a debug figure only.
  void estimatedRequirements;

  // D1 (G-mp1a): with the requirement-count cap gone, the no-signal guard is the
  // vagueness catch-all. The informational risk_level trace entry must not defeat
  // it — only real signals (concerns) count.
  if (!declaredSurfaces && activation.concerns.length === 0 && input.tokenCount >= 4) {
    return {
      status: "needs_clarification",
      reasons: [
        "Não consegui activar nenhum concern a partir da task. O ask pode ser demasiado abstracto ou usar terminologia fora do lexicon."
      ],
      suggestions: [
        "Adiciona `concerns` explícitos (e.g. ['api', 'validation']).",
        `Concerns suportados: ${VALID_CONCERNS.join(", ")}.`
      ]
    };
  }

  if (reasons.length > 0) {
    return { status: "needs_decomposition", reasons, suggestions };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

function resolveActivatedSlices(
  data: G2RuntimeData,
  sliceFamilies: string[]
): AppSecSlice[] {
  if (sliceFamilies.length === 0) return [];
  const set = new Set(sliceFamilies);
  return data.slices.filter((slice) => set.has(slice.objective_family));
}

function entitiesForSlices<T extends { slice_id: string }>(
  entities: T[],
  sliceIds: Set<string>
): T[] {
  if (sliceIds.size === 0) return [];
  return entities.filter((entity) => sliceIds.has(entity.slice_id));
}

function projectV1Entity(
  entity: ControlObjectiveV1 | MechanismV1 | PracticeV1 | ArtifactV1,
  data: G2RuntimeData
): G2ContextEntity {
  const name = getV1EntityDisplayName(data, entity.entity_id);
  const projected: G2ContextEntity = {
    entity_id: entity.entity_id,
    entity_type: entity.entity_type,
    slice_id: entity.slice_id,
    slice_family: entity.slice_family,
    source: "runtime_v1"
  };
  if (name) projected.name = name;
  return projected;
}

function projectRelation(relation: AppSecRelation): G2ContextRelation {
  return {
    subject_id: relation.subject_id,
    subject_type: relation.subject_type,
    predicate: relation.predicate,
    object_id: relation.object_id,
    object_type: relation.object_type,
    source: "runtime_v1"
  };
}

export function categoriesForConcerns(concerns: Concern[]): Set<string> {
  const ontology = getOntologyData();
  const categories = new Set<string>();
  for (const concern of concerns) {
    for (const category of ontology.concernsMap[concern] ?? []) {
      categories.add(category);
    }
    for (const category of CONCERN_TO_V0_CATEGORIES_SUPPLEMENT[concern] ?? []) {
      categories.add(category);
    }
  }
  return categories;
}

function resolveRuntimeV0(args: {
  riskLevel: RiskLevel | undefined;
  concerns: Concern[];
  /** MP1 engine override: when given, this exact requirement set is used instead of the category filter. */
  selectedRequirements?: Requirement[];
}): {
  requirements: Requirement[];
  controls: Array<Control & { confidence: "direct" | "derived" }>;
  evidencePatterns: EvidencePattern[];
  activeCategories: string[];
} {
  const ontology = getOntologyData();
  const concernCategories = categoriesForConcerns(args.concerns);

  let filteredRequirements: Requirement[];
  if (args.selectedRequirements) {
    // MP1 engine (G-mp1a O2): the selection operation already produced the set
    // (baseline ∪ context ⊕ narrowing, all declared) — use it verbatim.
    filteredRequirements = args.selectedRequirements;
  } else {
    filteredRequirements = ontology.requirements;
    if (args.riskLevel) {
      filteredRequirements = filteredRequirements.filter(
        (requirement) => requirement.applicable_levels?.[args.riskLevel as RiskLevel] === true
      );
    }
    if (concernCategories.size > 0) {
      filteredRequirements = filteredRequirements.filter((requirement) =>
        concernCategories.has(requirement.category)
      );
    }
  }

  const links = ontology.requirementControlLinks ?? [];
  const requirementIds = new Set(filteredRequirements.map((r) => r.requirement_id));
  const directControlIds = new Set<string>();
  for (const link of links) {
    if (link.link_type !== "maps_to_control") continue;
    if (!requirementIds.has(link.source_id)) continue;
    directControlIds.add(link.target_id);
  }

  const activeDomains = new Set<string>();
  for (const category of concernCategories) {
    const domains = ontology.domainMapping[category] ?? [];
    for (const domain of domains) activeDomains.add(domain);
  }

  const controlsOut: Array<Control & { confidence: "direct" | "derived" }> = [];
  const seenControlIds = new Set<string>();
  for (const control of ontology.controls) {
    if (directControlIds.has(control.control_id)) {
      controlsOut.push({ ...control, confidence: "direct" });
      seenControlIds.add(control.control_id);
    }
  }
  if (activeDomains.size > 0) {
    for (const control of ontology.controls) {
      if (seenControlIds.has(control.control_id)) continue;
      if (!activeDomains.has(control.domain)) continue;
      controlsOut.push({ ...control, confidence: "derived" });
      seenControlIds.add(control.control_id);
    }
  }

  const evidenceMatches: EvidencePattern[] = [];
  if (ontology.evidencePatterns) {
    for (const pattern of ontology.evidencePatterns) {
      const touchesRequirement =
        typeof pattern.maps_to_requirement_id === "string" &&
        requirementIds.has(pattern.maps_to_requirement_id);
      const touchesControl =
        typeof pattern.maps_to_control_id === "string" &&
        seenControlIds.has(pattern.maps_to_control_id);
      if (touchesRequirement || touchesControl) {
        evidenceMatches.push(pattern);
      }
    }
  }

  return {
    requirements: filteredRequirements,
    controls: controlsOut,
    evidencePatterns: evidenceMatches,
    activeCategories: [...concernCategories].sort()
  };
}

function estimateV0RequirementCount(
  riskLevel: RiskLevel | undefined,
  concerns: Concern[]
): number {
  // Estimate before producing the heavy output, to drive the scope gate.
  const ontology = getOntologyData();
  let filtered = ontology.requirements;
  if (riskLevel) {
    filtered = filtered.filter(
      (requirement) => requirement.applicable_levels?.[riskLevel] === true
    );
  }
  if (concerns.length > 0) {
    const categories = categoriesForConcerns(concerns);
    if (categories.size > 0) {
      filtered = filtered.filter((requirement) => categories.has(requirement.category));
    }
  }
  return filtered.length;
}

// ---------------------------------------------------------------------------
// Regulatory overlay resolution
// ---------------------------------------------------------------------------

interface OverlayResolution {
  status: "skipped" | "absent" | "resolved" | "unsupported";
  reasons: string[];
  context: RegulatoryOverlayContext;
  activatedObligations: RegulatoryObligation[];
  activatedFrameworks: RegulatoryFramework[];
}

function resolveOverlay(input: NormalizedInput): OverlayResolution {
  const wantsOverlay =
    input.include_regulatory_overlay || input.regulatory_frameworks.length > 0;
  const emptyContext: RegulatoryOverlayContext = {
    frameworks: [],
    obligations: [],
    mappings: [],
    playbooks: []
  };

  if (!wantsOverlay) {
    return {
      status: "skipped",
      reasons: [],
      context: emptyContext,
      activatedObligations: [],
      activatedFrameworks: []
    };
  }

  const data: RegulatoryOverlayData = getRegulatoryOverlay();
  if (data.status === "absent") {
    return {
      status: "absent",
      reasons: [
        `Overlay regulatório ausente: ${
          data.absentReason ?? "overlay artefacts not published"
        }.`
      ],
      context: emptyContext,
      activatedObligations: [],
      activatedFrameworks: []
    };
  }

  const requested = input.regulatory_frameworks;
  if (requested.length === 0) {
    return {
      status: "resolved",
      reasons: [
        "include_regulatory_overlay=true sem frameworks específicos — devolvemos apenas catálogo de frameworks publicados."
      ],
      context: {
        frameworks: data.frameworks.map((framework) => ({
          framework_id: framework.framework_id,
          short_code: framework.short_code,
          name: framework.name,
          scope_summary: framework.scope_summary,
          source: "overlay" as const
        })),
        obligations: [],
        mappings: [],
        playbooks: []
      },
      activatedObligations: [],
      activatedFrameworks: data.frameworks
    };
  }

  const activatedFrameworks: RegulatoryFramework[] = [];
  const unmatched: string[] = [];
  for (const requestedFramework of requested) {
    const resolved = resolveRegulatoryFramework(data, requestedFramework);
    if (resolved) activatedFrameworks.push(resolved);
    else unmatched.push(requestedFramework);
  }

  if (activatedFrameworks.length === 0) {
    return {
      status: "unsupported",
      reasons: [
        `Nenhuma framework regulatória pedida foi reconhecida: [${unmatched.join(", ")}].`,
        `Frameworks publicadas: ${data.frameworks
          .map((framework) => `${framework.short_code} (${framework.framework_id})`)
          .join(", ")}.`
      ],
      context: emptyContext,
      activatedObligations: [],
      activatedFrameworks: []
    };
  }

  const activatedFrameworkIds = new Set(
    activatedFrameworks.map((framework) => framework.framework_id)
  );

  const obligations: RegulatoryObligation[] = [];
  for (const frameworkId of activatedFrameworkIds) {
    const bucket = data.obligationsByFramework.get(frameworkId) ?? [];
    for (const obligation of bucket) obligations.push(obligation);
  }

  const obligationIds = new Set(obligations.map((entry) => entry.obligation_id));
  const mappings: RegulatoryMapping[] = [];
  for (const obligationId of obligationIds) {
    const bucket = data.mappingsByObligation.get(obligationId) ?? [];
    for (const mapping of bucket) mappings.push(mapping);
  }

  const playbookIds = new Set<string>();
  for (const mapping of mappings) {
    if (mapping.playbook_id) playbookIds.add(mapping.playbook_id);
  }
  const playbooks: RegulatoryPlaybook[] = [];
  for (const playbookId of playbookIds) {
    const playbook = data.playbooksById.get(playbookId);
    if (playbook) playbooks.push(playbook);
  }

  return {
    status: "resolved",
    reasons:
      unmatched.length > 0
        ? [`Frameworks não reconhecidas, ignoradas: [${unmatched.join(", ")}].`]
        : [],
    context: {
      frameworks: activatedFrameworks.map((framework) => ({
        framework_id: framework.framework_id,
        short_code: framework.short_code,
        name: framework.name,
        scope_summary: framework.scope_summary,
        source: "overlay" as const
      })),
      obligations: obligations.map((obligation) => {
        const out: RegulatoryOverlayContext["obligations"][number] = {
          obligation_id: obligation.obligation_id,
          framework_id: obligation.framework_id,
          title: obligation.title,
          obligation_kind: obligation.obligation_kind,
          source: "overlay" as const
        };
        if (obligation.citation) out.citation = obligation.citation;
        return out;
      }),
      mappings: mappings.map((mapping) => {
        const out: RegulatoryOverlayContext["mappings"][number] = {
          mapping_id: mapping.mapping_id,
          framework_id: mapping.framework_id,
          obligation_id: mapping.obligation_id,
          mapping_type: mapping.mapping_type,
          target_id: mapping.target_id,
          target_type: mapping.target_type,
          source: "overlay" as const
        };
        if (typeof mapping.confidence === "number") out.confidence = mapping.confidence;
        return out;
      }),
      playbooks: playbooks.map((playbook) => ({
        playbook_id: playbook.playbook_id,
        framework_ids: playbook.framework_ids,
        title: playbook.title,
        source: "overlay" as const
      }))
    },
    activatedObligations: obligations,
    activatedFrameworks
  };
}

// ---------------------------------------------------------------------------
// LLM instructions (s3: slot table — single source of truth for the inline
// `full` content AND the sbd://toe/codegen-instructions/{mode} MCP resource)
// ---------------------------------------------------------------------------

/**
 * Conditions under which a conditional instruction slot is included inline at
 * `detail: "full"`. The dieted `codegen_instructions_ref.active_conditions`
 * lists the conditions active for a given call, so a client reading the
 * resource reconstructs the inline instruction list byte-identically.
 */
export type InstructionCondition =
  | "always"
  | "regulatory_overlay"
  | "risk_level:L1"
  | "risk_level:L2"
  | "risk_level:L3"
  | "citation_map_empty";

export interface InstructionSlot {
  when: InstructionCondition;
  text: string;
}

/**
 * Ordered instruction slots for a mode. The emission order of
 * {@link buildLlmInstructions} is EXACTLY this list filtered by active
 * conditions — the classic (pre-s3) output is byte-identical by construction.
 */
export function instructionSlotsForMode(mode: CodegenMode): InstructionSlot[] {
  const slots: InstructionSlot[] = [
    {
      when: "always",
      text: "Generate code or review changes ONLY against the deterministic IDs provided in `citation_map`. Do NOT invent SbD-ToE requirement, control, slice, mechanism or obligation IDs."
    },
    {
      when: "always",
      text: "For each non-trivial design decision, populate the `security_rationale_template.decisions[].cited_ids` with IDs from `citation_map`. If no ID applies, say so explicitly."
    },
    {
      when: "always",
      text: "List concrete validations in `security_rationale_template.validations` (surface, rule, rejection behaviour). Do NOT claim conformity without naming the validation."
    },
    {
      when: "always",
      text: "List expected evidence in `security_rationale_template.expected_evidence` (test paths, log shapes, SBOM, attestation, scan reports). Code on its own is NOT evidence of compliance."
    },
    {
      when: "regulatory_overlay",
      text: "Regulatory obligations are an EXTERNAL cross-check. Cite obligation IDs in security_rationale only when the change directly addresses them. Do NOT declare GDPR/DORA/CRA/NIS2 compliance."
    },
    {
      when: "always",
      text: "If the requested task does not match the activated scope, REPLY with `status: needs_clarification` and request specifics — do not fabricate IDs."
    }
  ];
  if (mode === "review") {
    slots.push({
      when: "always",
      text: "Review mode: enumerate findings per changed_file, mapped to the activated_scope. Each finding must reference at least one citation_map ID or say 'no normative ID covers this'."
    });
  }
  if (mode === "test-plan") {
    slots.push({
      when: "always",
      text: "Test-plan mode: produce a checklist of tests grouped by validated_id, with input/expectation, and reference evidence_patterns when available."
    });
  }
  for (const level of ["L1", "L2", "L3"] as const) {
    slots.push({
      when: `risk_level:${level}`,
      text: `Risk level ${level} is the active filter — do not propose controls applicable only at a higher level unless explicitly justified.`
    });
  }
  slots.push({
    when: "citation_map_empty",
    text: "Citation_map is empty. This is a strong signal the activated scope did not yield deterministic anchors — request clarification before generating code."
  });
  return slots;
}

/** Conditional slots active for a call (deterministic, from resolved inputs). */
function activeInstructionConditions(args: {
  hasOverlay: boolean;
  riskLevel: RiskLevel | undefined;
  citationMapEmpty: boolean;
}): InstructionCondition[] {
  const active: InstructionCondition[] = [];
  if (args.hasOverlay) active.push("regulatory_overlay");
  if (args.riskLevel) active.push(`risk_level:${args.riskLevel}`);
  if (args.citationMapEmpty) active.push("citation_map_empty");
  return active;
}

function buildLlmInstructions(args: {
  mode: CodegenMode;
  citedIds: string[];
  hasOverlay: boolean;
  riskLevel: RiskLevel | undefined;
}): string[] {
  const active = new Set<InstructionCondition>(
    activeInstructionConditions({
      hasOverlay: args.hasOverlay,
      riskLevel: args.riskLevel,
      citationMapEmpty: args.citedIds.length === 0
    })
  );
  return instructionSlotsForMode(args.mode)
    .filter((slot) => slot.when === "always" || active.has(slot.when))
    .map((slot) => slot.text);
}

/** Constant part of the security_rationale_template (everything except `task`). */
const SECURITY_RATIONALE_TEMPLATE_SKELETON: Omit<SecurityRationaleTemplate, "task"> = {
  decisions: [
    {
      decision: "<fill: what design choice was made>",
      rationale: "<fill: why, citing IDs from citation_map>",
      cited_ids: ["<requirement_id|control_id|slice_id|obligation_id>"]
    }
  ],
  validations: [
    {
      surface: "<fill: code path being validated>",
      rule: "<fill: validation rule>",
      rejection_behaviour: "<fill: how invalid input is rejected>"
    }
  ],
  expected_evidence: [
    {
      artefact: "<fill: test, log, doc, sbom, scan, attestation, ...>",
      location: "<fill: where to find it>",
      verifies: "<fill: which control/requirement id>"
    }
  ],
  residual_risk: "<fill: anything NOT addressed by this change>"
};

function buildSecurityRationaleTemplate(task: string): SecurityRationaleTemplate {
  return { task, ...SECURITY_RATIONALE_TEMPLATE_SKELETON };
}

// ---------------------------------------------------------------------------
// MCP resource: sbd://toe/codegen-instructions/{mode} (v2 token diet, s3)
// ---------------------------------------------------------------------------

export const CODEGEN_INSTRUCTION_MODES: readonly CodegenMode[] = [
  "codegen",
  "review",
  "test-plan"
] as const;

export const CODEGEN_INSTRUCTIONS_RESOURCE_URI_PREFIX =
  "sbd://toe/codegen-instructions/";

export function codegenInstructionsResourceUri(mode: CodegenMode): string {
  return `${CODEGEN_INSTRUCTIONS_RESOURCE_URI_PREFIX}${mode}`;
}

/**
 * Full legend of the dieted (`standard`/`minimal`) encoding, published in the
 * codegen-instructions resource. Every rule here is a lossless, deterministic
 * derivation over the SAME payload (or an executable reference) — nothing is
 * silently dropped (EPIC invariant 2) and no data changes, only serialization
 * (EPIC invariant 4).
 */
const DETAIL_ENCODING_LEGEND = {
  note:
    "How to read a detail=standard/minimal payload of prepare_sbd_toe_codegen_context. " +
    "Every rule below is a deterministic re-encoding of the same published data: " +
    "nothing is silently dropped, and detail=full always returns the classic inline payload.",
  sources: {
    note:
      "Per-item `source` fields are elided. Every list below is source-homogeneous " +
      "(no exceptions): apply the listed source to each of its items. " +
      "g2_context.relations applies only when relations come inline " +
      "(include_relations=true); otherwise g2_context.relations_ref is a derived " +
      "reference to trace_sbd_toe_graph calls, not a source list.",
    map: PROVENANCE_SOURCES
  },
  citations:
    "citations.<source>.source_data is an ordered run-length map file -> count. " +
    "The citable ids are NOT repeated: citations.<source>.ids_from is aligned 1:1 " +
    "with the source_data files, and names the payload path whose ids (in payload " +
    "order) form that file's run. Paths of the form " +
    "keys(g2_context.<list>[slice]) iterate the slice groups in order, then the " +
    "entity-id keys in order. If a file ever has no path mapping, the group " +
    "carries explicit `ids` instead (lossless fallback).",
  activated_scope_requirements:
    "requirement `category` is elided because it equals the requirement_id " +
    "category segment — the one immediately before the number (AUT-003→AUT, " +
    "REQ-AGN-001→AGN; consumer contract v1.10 §1.18). Verbatim bundle invariant; " +
    "the field survives inline on any future mismatch. `description` is the verbatim published field from " +
    "data/publish/runtime/requirements.json — never paraphrased.",
  activated_scope_controls:
    "controls with confidence='direct' carry the verbatim published `description` " +
    "from data/publish/runtime/controls.json.",
  g2_entities:
    "g2_context.control_objectives/mechanisms/practices/artifacts are grouped as " +
    "{slice_id: {entity_id: name|null}}. entity_type is the list the map lives in " +
    "(ControlObjective/Mechanism/Practice/Artifact), slice_id is the group key, " +
    "slice_family is activated_scope.slices[].objective_family for that slice_id, " +
    "and a null name means the entity is unnamed in the published rastreabilidade " +
    "(the full projection omits `name` for it).",
  evidence_patterns:
    "g2_context.evidence_patterns is the deterministic prefix (relevance desc, " +
    "then id asc; the tool-computed relevance_score is elided — the order carries " +
    "the ranking) of the classic detail=full list, capped per " +
    "completeness_report.evidence_pattern_cap. completeness_report reports " +
    "total/returned/capped and, when anything was cut, evidence_patterns_rest " +
    "says how to retrieve the rest (same input, detail='full'; with debug=true " +
    "the ids beyond the classic cap are listed in debug.rejected_candidates).",
  manual_grounding_minimal:
    "At detail=minimal, manual_grounding is the aggregated-provenance form " +
    "(s3b): total_entries, the manual_commit_sha shared by every group " +
    "(hoisted; a group keeps its own sha inline only if hoisting was not " +
    "possible), and the (rastreabilidade_role, manual_chapter, manual_file) " +
    "groups with the exact per-group `entries` COUNT instead of the " +
    "v1_entity_ids list (counts sum to total_entries — never silent). The " +
    "grounding id set is already in the same payload (g2_context entity-map " +
    "keys); manual_grounding.groups_ref is the executable reference (same " +
    "input, detail='standard') for the per-group id lists — groups align " +
    "1:1, same order. detail=standard keeps the full grouping inline.",
  activation_trace:
    "activation_trace is elided at detail=standard/minimal; " +
    "activation_trace_ref.entries keeps the exact count. Re-call with debug=true " +
    "to include the full trace (it is always inline at detail=full).",
  relations_ref:
    "Inline g2_context.relations are elided at detail=standard/minimal (re-call " +
    "with include_relations=true to restore them). Recover the elided graph edges " +
    "by executing trace_sbd_toe_graph with each {lens, anchor} pair listed " +
    "(anchors are activated slice/entity ids from the same payload); the " +
    "belongsToSlice edges counted as coverage.implicit_in_entities are already " +
    "encoded by the slice grouping key of every g2_context entity; any relation " +
    "covered by neither stays inline in residual_relations (never silent).",
  ultrathin:
    "detail=ultrathin (s3c) applies every rule above PLUS: (1) requirements " +
    "{requirement_id, name, type} and controls {control_id, name, domain, " +
    "control_type, confidence} keep the COMPLETE activated set (same ids, " +
    "same order, name always present) but elide the published `description` " +
    "— activated_scope.descriptions_ref is the executable reference (same " +
    "input, detail='minimal') for the verbatim descriptions; (2) " +
    "g2_context.evidence_patterns is empty (cap 0) — completeness_report " +
    "keeps total/returned=0/capped=total and evidence_patterns_rest points " +
    "to detail='minimal' (cheapest level returning patterns inline; " +
    "'standard' returns 10, 'full' the classic 25); (3) manual_grounding is " +
    "{total_entries, manual_commit_sha, groups_ref} — the group list is " +
    "elided (detail='standard' returns the full 1:1 grouping); (4) " +
    "v1_consistency_mismatches/v1_manifest_warnings text arrays are replaced " +
    "by exact *_count fields (+ v1_diagnostics_ref when any count > 0, " +
    "detail='minimal' returns the texts). The citable id set and the " +
    "citations/ids_from encoding are IDENTICAL to the other dieted levels."
} as const;

export interface CodegenInstructionsResourceContent {
  resource: string;
  line_note: string;
  mode: CodegenMode;
  note: string;
  llm_codegen_instructions: {
    assembly: string;
    slots: InstructionSlot[];
  };
  security_rationale_template: {
    assembly: string;
    template: { task: null } & Omit<SecurityRationaleTemplate, "task">;
  };
  detail_encoding: typeof DETAIL_ENCODING_LEGEND;
}

/**
 * Content of the `sbd://toe/codegen-instructions/{mode}` MCP resource — the
 * static-per-mode boilerplate that detail=standard/minimal payloads reference
 * instead of carrying inline. Reconstructing the inline `full` content from
 * this resource is byte-exact (tested):
 *   - llm_codegen_instructions = slots filtered by `when` ("always" +
 *     codegen_instructions_ref.active_conditions), in order;
 *   - security_rationale_template = template with `task` set to the trimmed
 *     task string (input_echo.task.trim()).
 */
export function buildCodegenInstructionsResourceContent(
  mode: CodegenMode
): CodegenInstructionsResourceContent {
  return {
    resource: codegenInstructionsResourceUri(mode),
    mode,
    note:
      "Static per-mode boilerplate for prepare_sbd_toe_codegen_context at " +
      "detail=standard/minimal (kept inline at detail=full). Also carries the " +
      "detail_encoding legend for the dieted payload.",
    // 0.15.0 item 8, invertido para esta linha (0.20-beta): aqui o trace EXISTE.
    line_note:
      "Nesta linha 0.20 (beta) o trace_sbd_toe_graph existe: execute os " +
      "relations_ref directamente ({lens, anchor}). include_relations=true no " +
      "prepare continua disponível como atalho para relações inline.",
    llm_codegen_instructions: {
      assembly:
        "Include each slot whose `when` is 'always' or appears in this call's " +
        "codegen_instructions_ref.active_conditions, in the listed order — the " +
        "result is byte-identical to the detail=full inline llm_codegen_instructions.",
      slots: instructionSlotsForMode(mode)
    },
    security_rationale_template: {
      assembly:
        "Set `task` to the trimmed task string (input_echo.task.trim()); every " +
        "other field is verbatim — the result is byte-identical to the " +
        "detail=full inline security_rationale_template.",
      template: { task: null, ...SECURITY_RATIONALE_TEMPLATE_SKELETON }
    },
    detail_encoding: DETAIL_ENCODING_LEGEND
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const PROVENANCE_V0 = "data/publish/runtime/*.json + data/publish/ontology/*";
const PROVENANCE_V1 = "data/publish/runtime/v1/*";
const PROVENANCE_OVERLAY = "data/publish/overlay/*";

function blocked(
  input: NormalizedInput,
  raw: PrepareCodegenContextInput,
  status: PrepareCodegenContextResultBlocked["status"],
  reasons: string[],
  suggestions: string[],
  partial: ActivationTraceEntry[],
  debug?: { rejected: ActivationTraceEntry[]; notes: string[] }
): PrepareCodegenContextResultBlocked {
  const result: PrepareCodegenContextResultBlocked = {
    status,
    provenance: { kg: servedKgReleaseTag(), server: servingServerVersion() },
    mode: input.mode,
    input_echo: inputEcho(raw),
    reasons,
    suggestions,
    partial_activation_trace: partial
  };
  if (input.debug && debug) {
    result.debug = {
      rejected_candidates: debug.rejected,
      notes: debug.notes
    };
  }
  return result;
}

const DETAIL_LEVELS: ReadonlySet<string> = new Set([
  "ultrathin",
  "minimal",
  "standard",
  "full"
]);

/**
 * Validate the `detail` input (v2 token diet, s1). Invalid values fail fast
 * with a JSON-RPC -32602 (same pattern as trace-graph's lens validation);
 * omission defaults to `full` — the classic, byte-identical payload.
 */
function parseDetail(raw: unknown): CodegenDetailLevel {
  const value =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>).detail
      : undefined;
  if (value === undefined) return "full";
  if (typeof value === "string" && DETAIL_LEVELS.has(value)) {
    return value as CodegenDetailLevel;
  }
  throw Object.assign(
    new Error(
      `Invalid "detail": ${JSON.stringify(value)}. Use one of: ultrathin, minimal, standard, full.`
    ),
    {
      rpcError: {
        code: -32602,
        message: 'Invalid "detail". Use one of: ultrathin, minimal, standard, full.'
      }
    }
  );
}

/**
 * Validate the `include_relations` input (v2 token diet, s2). Only booleans
 * (or omission = false) are accepted — same fail-fast pattern as parseDetail.
 */
function parseIncludeRelations(raw: unknown): boolean {
  const value =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>).include_relations
      : undefined;
  if (value === undefined) return false;
  if (typeof value === "boolean") return value;
  throw Object.assign(
    new Error(
      `Invalid "include_relations": ${JSON.stringify(value)}. Use a boolean.`
    ),
    {
      rpcError: {
        code: -32602,
        message: 'Invalid "include_relations". Use a boolean.'
      }
    }
  );
}

// Relation predicates published in data/publish/runtime/v1/relations.jsonl —
// the same three the RDF projection exposes to trace_sbd_toe_graph lenses.
const PRED_BELONGS_TO_SLICE = "belongsToSlice";
const PRED_IMPLEMENTED_BY_MECHANISM = "objective_implemented_by_mechanism";
const PRED_REALIZED_BY_PRACTICE = "objective_realized_by_practice";

// s3: slimmed — the full explanation lives in the codegen-instructions MCP
// resource (detail_encoding.relations_ref). Kept URI-free on purpose: the
// no-leak gate scans relations_ref for any scheme://.
const RELATIONS_REF_NOTE =
  "Inline g2_context.relations elided; execute each listed trace_sbd_toe_graph " +
  "{lens, anchor} call to recover them, or re-call with include_relations=true. " +
  "Encoding details: MCP resource codegen-instructions, detail_encoding.relations_ref.";

/**
 * v2 token diet, s2 — build the `relations_ref` for `detail: "standard" |
 * "minimal"`. See the {@link RelationsRefLensCall} doc block for the full
 * relation-kind → lens mapping. Coverage is decided per relation and counted
 * (never-silent): every inline relation is either recoverable by executing
 * one of the referenced curated lenses, byte-redundant with an entity's
 * `slice_id` in this same payload, or kept inline in `residual_relations`.
 * Deterministic: lens order follows activated_scope.slices order, then sorted
 * fallback anchors.
 */
function buildRelationsRef(result: PrepareCodegenContextResultReady): RelationsRef {
  const relations = result.g2_context.relations;
  const activatedSliceIds = result.activated_scope.slices.map((slice) => slice.slice_id);
  const activatedSliceIdSet = new Set(activatedSliceIds);

  const entitySliceById = new Map<string, string>();
  const entityTypeById = new Map<string, G2ContextEntity["entity_type"]>();
  for (const list of [
    result.g2_context.control_objectives,
    result.g2_context.mechanisms,
    result.g2_context.practices,
    result.g2_context.artifacts
  ]) {
    for (const entity of list) {
      entitySliceById.set(entity.entity_id, entity.slice_id);
      entityTypeById.set(entity.entity_id, entity.entity_type);
    }
  }

  // Objective → activated slice via an explicit belongsToSlice edge (the
  // pattern slice_implementation anchors on), and objectives that have at
  // least one mechanism/practice edge (required by that lens's UNION).
  const sliceEdgeBySubject = new Map<string, string>();
  const subjectsWithTargets = new Set<string>();
  for (const relation of relations) {
    if (
      relation.predicate === PRED_BELONGS_TO_SLICE &&
      activatedSliceIdSet.has(relation.object_id)
    ) {
      if (!sliceEdgeBySubject.has(relation.subject_id)) {
        sliceEdgeBySubject.set(relation.subject_id, relation.object_id);
      }
    } else if (
      relation.predicate === PRED_IMPLEMENTED_BY_MECHANISM ||
      relation.predicate === PRED_REALIZED_BY_PRACTICE
    ) {
      subjectsWithTargets.add(relation.subject_id);
    }
  }

  const sliceImplementationAnchors = new Set<string>();
  const objectiveRealizationAnchors = new Set<string>();
  const mechanismProvenanceAnchors = new Set<string>();
  let viaLenses = 0;
  let implicitInEntities = 0;
  const residual: Array<WithoutSource<G2ContextRelation>> = [];

  for (const relation of relations) {
    if (relation.predicate === PRED_BELONGS_TO_SLICE) {
      if (
        activatedSliceIdSet.has(relation.object_id) &&
        subjectsWithTargets.has(relation.subject_id)
      ) {
        // slice_implementation(anchor=slice) rows carry this edge.
        sliceImplementationAnchors.add(relation.object_id);
        viaLenses += 1;
      } else if (entitySliceById.get(relation.subject_id) === relation.object_id) {
        // Redundant with the entity's own slice_id in g2_context.
        implicitInEntities += 1;
      } else {
        const { source: _source, ...rest } = relation;
        residual.push(rest);
      }
      continue;
    }
    if (
      relation.predicate === PRED_IMPLEMENTED_BY_MECHANISM ||
      relation.predicate === PRED_REALIZED_BY_PRACTICE
    ) {
      const sliceAnchor = sliceEdgeBySubject.get(relation.subject_id);
      if (sliceAnchor !== undefined) {
        sliceImplementationAnchors.add(sliceAnchor);
        viaLenses += 1;
      } else if (entitySliceById.has(relation.subject_id)) {
        // Activated objective without a belongsToSlice edge (data gap).
        objectiveRealizationAnchors.add(relation.subject_id);
        viaLenses += 1;
      } else if (
        (relation.predicate === PRED_IMPLEMENTED_BY_MECHANISM &&
          entityTypeById.get(relation.object_id) === "Mechanism") ||
        (relation.predicate === PRED_REALIZED_BY_PRACTICE &&
          entityTypeById.get(relation.object_id) === "Practice")
      ) {
        // Only the target is activated (cross-slice edge); the predicate is
        // recoverable from the target's entity_type in this payload.
        mechanismProvenanceAnchors.add(relation.object_id);
        viaLenses += 1;
      } else {
        const { source: _source, ...rest } = relation;
        residual.push(rest);
      }
      continue;
    }
    // Unknown predicate — never silently dropped.
    const { source: _source, ...rest } = relation;
    residual.push(rest);
  }

  const lenses: RelationsRefLensCall[] = [
    ...activatedSliceIds
      .filter((sliceId) => sliceImplementationAnchors.has(sliceId))
      .map((anchor): RelationsRefLensCall => ({ lens: "slice_implementation", anchor })),
    ...[...objectiveRealizationAnchors]
      .sort()
      .map((anchor): RelationsRefLensCall => ({ lens: "objective_realization", anchor })),
    ...[...mechanismProvenanceAnchors]
      .sort()
      .map((anchor): RelationsRefLensCall => ({ lens: "mechanism_provenance", anchor }))
  ];

  const relationsRef: RelationsRef = {
    tool: "trace_sbd_toe_graph",
    lenses,
    total_relations: relations.length,
    coverage: {
      via_lenses: viaLenses,
      implicit_in_entities: implicitInEntities,
      residual_inline: residual.length
    },
    note: RELATIONS_REF_NOTE
  };
  if (residual.length > 0) relationsRef.residual_relations = residual;
  return relationsRef;
}

function stripSource<T extends { source: unknown }>(
  items: readonly T[]
): Array<Omit<T, "source">> {
  return items.map(({ source: _source, ...rest }) => rest);
}

/**
 * Static map published-file → payload path whose ids, in payload order, are
 * exactly the citation_map run for that file (the citation_map is BUILT by
 * iterating those very lists, in this order — see the core's citation block).
 * Paths use the mini-syntax documented in the resource's
 * `detail_encoding.citations` legend. No file outside this table is expected;
 * if one ever appears, the group falls back to explicit `ids` (lossless).
 */
const CITATION_FILE_TO_PAYLOAD_PATH: Readonly<Record<string, string>> = {
  "data/publish/runtime/requirements.json":
    "activated_scope.requirements[].requirement_id",
  "data/publish/runtime/controls.json": "activated_scope.controls[].control_id",
  "data/publish/runtime/v1/slices.json": "activated_scope.slices[].slice_id",
  "data/publish/runtime/v1/control_objectives.json":
    "keys(g2_context.control_objectives[slice])",
  "data/publish/runtime/v1/mechanisms.json": "keys(g2_context.mechanisms[slice])",
  "data/publish/runtime/v1/practices.json": "keys(g2_context.practices[slice])",
  "data/publish/runtime/v1/artifacts.json": "keys(g2_context.artifacts[slice])",
  "data/publish/overlay/external_frameworks.json":
    "regulatory_overlay.frameworks[].framework_id",
  "data/publish/overlay/external_obligations.json":
    "activated_scope.regulatory_obligations[].obligation_id"
};

/**
 * Invert the classic `citation_map` (id → {source, source_data}) into
 * source-grouped `citations` (see {@link CitationsGroup}). Pure re-encoding:
 * the exact per-id source and source_data are reconstructible from the
 * ordered run-length `source_data` map — nothing is dropped. s3: ids already
 * present verbatim in a payload section are referenced via `ids_from` instead
 * of repeated; a group keeps explicit `ids` only if one of its files has no
 * payload-path mapping (never expected for the published bundle).
 */
function invertCitationMap(
  citationMap: Record<string, CitationMapEntry>
): CitationsBySource {
  const bySource = new Map<CitationMapEntry["source"], Map<string, string[]>>();
  for (const [id, entry] of Object.entries(citationMap)) {
    let files = bySource.get(entry.source);
    if (!files) {
      files = new Map();
      bySource.set(entry.source, files);
    }
    let ids = files.get(entry.source_data);
    if (!ids) {
      ids = [];
      files.set(entry.source_data, ids);
    }
    ids.push(id);
  }
  const citations: CitationsBySource = {};
  for (const [source, files] of bySource) {
    const source_data: Record<string, number> = {};
    const ids: string[] = [];
    const idsFrom: string[] = [];
    let allFilesMapped = true;
    for (const [file, fileIds] of files) {
      source_data[file] = fileIds.length;
      ids.push(...fileIds);
      const path = CITATION_FILE_TO_PAYLOAD_PATH[file];
      if (path === undefined) allFilesMapped = false;
      else idsFrom.push(path);
    }
    citations[source] = allFilesMapped
      ? { source_data, ids_from: idsFrom }
      : { source_data, ids };
  }
  return citations;
}

/**
 * Group the flat `manual_grounding` entries by the tuple that repeats
 * verbatim: (rastreabilidade_role, manual_chapter, manual_file,
 * manual_commit_sha). Names are elided ONLY when recoverable from the
 * `g2_context` entity lists in the same payload (they come from the same
 * rastreabilidade source); any non-recoverable name is kept explicitly in
 * `v1_entity_names`, so no information is lost.
 */
function groupManualGrounding(
  result: PrepareCodegenContextResultReady
): ManualGroundingGrouped {
  const g2Names = new Map<string, string | undefined>();
  for (const list of [
    result.g2_context.control_objectives,
    result.g2_context.mechanisms,
    result.g2_context.practices,
    result.g2_context.artifacts
  ]) {
    for (const entity of list) g2Names.set(entity.entity_id, entity.name);
  }

  // Object sentinel: serializes unlike any string/null value, so an absent
  // field can never collide with a real published value in the group key.
  const ABSENT = { absent: true };
  const groups = new Map<string, ManualGroundingGroup>();
  const ungrouped: Array<WithoutSource<ManualGroundingEntry>> = [];

  for (const entry of result.manual_grounding) {
    if (!entry.v1_entity_id) {
      // Lossless guard — the loader keys entries by v1_entity_id, so this is
      // not expected; if it ever happens the entry survives verbatim.
      const { source: _source, ...rest } = entry;
      ungrouped.push(rest);
      continue;
    }
    const hasChapter = "manual_chapter" in entry;
    const hasFile = "manual_file" in entry;
    const hasSha = entry.manual_commit_sha !== undefined;
    const key = JSON.stringify([
      entry.rastreabilidade_role,
      hasChapter ? entry.manual_chapter ?? null : ABSENT,
      hasFile ? entry.manual_file ?? null : ABSENT,
      hasSha ? entry.manual_commit_sha : ABSENT
    ]);
    let group = groups.get(key);
    if (!group) {
      group = {
        rastreabilidade_role: entry.rastreabilidade_role,
        ...(hasChapter ? { manual_chapter: entry.manual_chapter ?? null } : {}),
        ...(hasFile ? { manual_file: entry.manual_file ?? null } : {}),
        ...(hasSha ? { manual_commit_sha: entry.manual_commit_sha } : {}),
        v1_entity_ids: []
      };
      groups.set(key, group);
    }
    group.v1_entity_ids.push(entry.v1_entity_id);
    if (
      entry.v1_entity_name &&
      g2Names.get(entry.v1_entity_id) !== entry.v1_entity_name
    ) {
      (group.v1_entity_names ??= {})[entry.v1_entity_id] = entry.v1_entity_name;
    }
  }

  const grouped: ManualGroundingGrouped = {
    total_entries: result.manual_grounding.length,
    groups: [...groups.values()]
  };
  if (ungrouped.length > 0) grouped.ungrouped = ungrouped;
  return grouped;
}

// s3b: kept URI-free on purpose (no-leak discipline, same as RELATIONS_REF_NOTE).
const GROUNDING_GROUPS_REF_NOTE =
  "Per-group v1_entity_ids elided at detail=minimal (each group carries its " +
  "exact `entries` count). The grounding id set is already in this payload — " +
  "every grounding id is an entity-id key of the g2_context maps. Re-call " +
  "with the same input at detail='standard' for the per-group id lists " +
  "(groups align 1:1, same order).";

/**
 * v2 token diet, s3b (revised ADENDA 2026-07-05) — minimal-form
 * `manual_grounding`, derived from the detail="standard" grouping (so the 1:1
 * group alignment holds by construction). Serialization-only cut, never
 * silent:
 *   - per-group `v1_entity_ids` → exact `entries` count (Σ == total_entries);
 *   - `manual_commit_sha` hoisted to the top level iff EVERY group carries
 *     the same sha (expected always: one published manual commit); otherwise
 *     each group keeps its own sha inline (lossless guard);
 *   - `v1_entity_names` (never expected) and `ungrouped` (never expected)
 *     survive verbatim — no name or entry can be lost;
 *   - `groups_ref` is the executable reference to the full grouping.
 * Invariant-3 note: grounding ids never feed `citations`/`ids_from`, and the
 * id set stays reconstructible from this same payload's g2_context entity
 * maps without any extra call.
 */
function buildMinimalGrounding(grouped: ManualGroundingGrouped): ManualGroundingMinimal {
  const shas = grouped.groups.map((group) => group.manual_commit_sha);
  const hoistedSha =
    grouped.groups.length > 0 &&
    shas[0] !== undefined &&
    shas.every((sha) => sha === shas[0])
      ? shas[0]
      : undefined;

  const minimal: ManualGroundingMinimal = {
    total_entries: grouped.total_entries,
    ...(hoistedSha !== undefined ? { manual_commit_sha: hoistedSha } : {}),
    groups: grouped.groups.map((group) => ({
      rastreabilidade_role: group.rastreabilidade_role,
      ...("manual_chapter" in group ? { manual_chapter: group.manual_chapter } : {}),
      ...("manual_file" in group ? { manual_file: group.manual_file } : {}),
      ...(hoistedSha === undefined && group.manual_commit_sha !== undefined
        ? { manual_commit_sha: group.manual_commit_sha }
        : {}),
      entries: group.v1_entity_ids.length,
      ...(group.v1_entity_names ? { v1_entity_names: group.v1_entity_names } : {})
    })),
    groups_ref: {
      tool: "prepare_sbd_toe_codegen_context",
      with: { detail: "standard" },
      note: GROUNDING_GROUPS_REF_NOTE
    }
  };
  if (grouped.ungrouped) minimal.ungrouped = grouped.ungrouped;
  return minimal;
}

// s3c notes — all NEW constants (the s1–s4 note texts are byte-frozen by the
// standard/minimal golden snapshots and are never edited). Kept URI-free
// (no-leak discipline, same as RELATIONS_REF_NOTE).
const GROUNDING_GROUPS_REF_NOTE_ULTRATHIN =
  "Grounding group list elided at detail=ultrathin (total_entries is the " +
  "exact flat entry count; manual_commit_sha is the shared published manual " +
  "commit). The grounding id set is already in this payload — every " +
  "grounding id is an entity-id key of the g2_context maps. Re-call with the " +
  "same input at detail='standard' for the full (role, chapter, file) groups " +
  "with per-group v1_entity_ids; detail='minimal' returns the groups with " +
  "per-group counts.";

const DESCRIPTIONS_REF_NOTE =
  "Published `description` fields (the 'how') elided at detail=ultrathin — " +
  "the requirement/control lists themselves are COMPLETE (same ids, same " +
  "order, name always present). Re-call with the same input at " +
  "detail='minimal' for the same complete scope WITH the verbatim published " +
  "descriptions (requirements + direct controls).";

const EVIDENCE_PATTERNS_REST_NOTE_ULTRATHIN =
  "No evidence pattern goes inline at detail=ultrathin (returned=0; " +
  "capped=total). Re-call with the same input at detail='minimal' for the " +
  "deterministic top-5 (cheapest level that returns patterns inline); " +
  "detail='standard' returns the top-10 and detail='full' the classic " +
  "top-25 (each list is a deterministic prefix of the next).";

const ACTIVATION_TRACE_REF_NOTE_ULTRATHIN =
  "activation_trace elided at detail=ultrathin — re-call with debug=true to " +
  "include it (always inline at detail=full).";

const V1_DIAGNOSTICS_REF_NOTE =
  "v1_consistency_mismatches/v1_manifest_warnings texts elided at " +
  "detail=ultrathin (exact counts inline). Re-call with the same input at " +
  "detail='minimal' for the full text arrays in completeness_report.";

/**
 * v2 token diet, s3c — ultrathin-form `manual_grounding`, derived from the
 * s3b minimal form (so `total_entries`, the hoisted sha and the ungrouped
 * guard are byte-identical by construction). Serialization-only cut, never
 * silent: the (role, chapter, file) group list with per-group counts is
 * elided; `total_entries` keeps the exact flat count and `groups_ref` is the
 * executable reference to the full grouping (same input, detail="standard").
 * Lossless guards (expected never): if the sha was not hoistable or any group
 * carries `v1_entity_names`, the minimal `groups` list survives inline.
 */
function buildUltrathinGrounding(
  minimal: ManualGroundingMinimal
): ManualGroundingUltrathin {
  const mustKeepGroups =
    minimal.manual_commit_sha === undefined ||
    minimal.groups.some(
      (group) =>
        group.v1_entity_names !== undefined || group.manual_commit_sha !== undefined
    );
  const ultrathin: ManualGroundingUltrathin = {
    total_entries: minimal.total_entries,
    ...(minimal.manual_commit_sha !== undefined
      ? { manual_commit_sha: minimal.manual_commit_sha }
      : {}),
    ...(mustKeepGroups && minimal.groups.length > 0 ? { groups: minimal.groups } : {}),
    groups_ref: {
      tool: "prepare_sbd_toe_codegen_context",
      with: { detail: "standard" },
      note: GROUNDING_GROUPS_REF_NOTE_ULTRATHIN
    }
  };
  if (minimal.ungrouped) ultrathin.ungrouped = minimal.ungrouped;
  return ultrathin;
}

/**
 * v2 token diet, s3c — trim the completeness report for `detail: "ultrathin"`.
 * Every COUNT survives verbatim (never-silent backbone: expected/returned per
 * entity kind, m_recall, named/unnamed, evidence total/returned/capped/cap and
 * the rest-ref); only the two diagnostic TEXT arrays are re-encoded as exact
 * counts + the executable `v1_diagnostics_ref` (see
 * {@link UltrathinCompletenessReport} for what is cut and why).
 */
function trimCompletenessForUltrathin(
  report: DietedCompletenessReport
): UltrathinCompletenessReport {
  const { v1_consistency_mismatches, v1_manifest_warnings, ...kept } = report;
  // 0.15.0: ultrathin OMITE os counts excluded_by_level (dieta; tecto 4.840 vigia) —
  // a banda fica declarada no select e nos perfis standard/minimal/full.
  if (kept.selection) {
    const { excluded_by_level_categories: _c, excluded_by_level_requirements: _r, lexical_share: _lx, ...selRest } = kept.selection;
    kept.selection = selRest as typeof kept.selection;
  }
  return {
    ...kept,
    v1_consistency_mismatches_count: v1_consistency_mismatches.length,
    v1_manifest_warnings_count: v1_manifest_warnings.length,
    ...(v1_consistency_mismatches.length + v1_manifest_warnings.length > 0
      ? {
          v1_diagnostics_ref: {
            tool: "prepare_sbd_toe_codegen_context",
            with: { detail: "minimal" },
            note: V1_DIAGNOSTICS_REF_NOTE
          } satisfies V1DiagnosticsRef
        }
      : {})
  };
}

/** Slice-grouped, name-only entity encoding (see {@link SliceGroupedEntityNames}). */
function groupEntitiesBySlice(
  entities: readonly G2ContextEntity[]
): SliceGroupedEntityNames {
  const grouped: SliceGroupedEntityNames = {};
  for (const entity of entities) {
    (grouped[entity.slice_id] ??= {})[entity.entity_id] = entity.name ?? null;
  }
  return grouped;
}

/** `category` is derivable iff it equals the requirement_id category segment
 * (the one before the number — `REQ-AGN-001` → `AGN`; grammar v1.10 §1.18,
 * single source `requirementCategoryOf`). Bundle-wide invariant, guarded per item. */
function categoryIsDerivable(requirementId: string, category: string): boolean {
  const derived = requirementCategoryOf(requirementId);
  return derived !== undefined && derived === category;
}

/** Dieted requirements: `source`/derivable `category` elided, verbatim
 * published `description` appended (s3 — the "how"). s3c: at
 * `detail: "ultrathin"` (`includeDescriptions: false`) the description is
 * elided too — each item is exactly {requirement_id, name, type} (plus the
 * unchanged `category` lossless guard) with the executable
 * `activated_scope.descriptions_ref` pointing at detail="minimal". */
function dietRequirements(
  requirements: ActivatedScope["requirements"],
  includeDescriptions: boolean
): DietedRequirement[] {
  const descriptionById = new Map<string, string>();
  if (includeDescriptions) {
    for (const requirement of getOntologyData().requirements) {
      if (requirement.description) {
        descriptionById.set(requirement.requirement_id, requirement.description);
      }
    }
  }
  return requirements.map((item) => {
    const { source: _source, category, ...rest } = item as (typeof requirements)[number] & {
      type?: string;
    };
    const description = descriptionById.get(item.requirement_id);
    return {
      ...rest,
      ...(categoryIsDerivable(item.requirement_id, category) ? {} : { category }),
      ...(description ? { description } : {})
    };
  });
}

/** Dieted controls: `source` elided; `direct` controls carry the verbatim
 * published `description` (s3 — the "how"). s3c: at `detail: "ultrathin"`
 * (`includeDescriptions: false`) the description is elided — each item is
 * exactly {control_id, name, domain, control_type, confidence} (every
 * non-description published field: small, useful, and required to keep the
 * item more than id-only). */
function dietControls(
  controls: ActivatedScope["controls"],
  includeDescriptions: boolean
): DietedControl[] {
  const descriptionById = new Map<string, string>();
  if (includeDescriptions) {
    for (const control of getOntologyData().controls) {
      if (control.description) descriptionById.set(control.control_id, control.description);
    }
  }
  return controls.map((item) => {
    const { source: _source, ...rest } = item;
    const description =
      item.confidence === "direct" ? descriptionById.get(item.control_id) : undefined;
    return { ...rest, ...(description ? { description } : {}) };
  });
}

/**
 * v2 token diet, s1+s2+s3 — dieted encoding for `detail: "standard" |
 * "minimal"`. Pure post-processing over the byte-identical full result. The
 * citable ID set is EXACTLY the full one (invariant 3; the omitted evidence
 * patterns carry no citation_map ids — verified by tests). Every cut is
 * either a lossless derivable-field re-encoding documented in the
 * codegen-instructions resource legend, or an explicit bound with
 * total/returned/omitted counts plus an executable reference to the rest
 * (invariant 2 — never silent):
 *   - s1: inverted citations, grouped grounding, per-item `source` legend;
 *   - s2: relations on-demand via `relations_ref` (include_relations restores);
 *   - s3: evidence cap 25→10 (deterministic prefix; counts + rest-ref in
 *     completeness_report), instructions/template → MCP resource, trace only
 *     with debug, verbatim published `description` on requirements + direct
 *     controls, and derivable-field dedup (category, entity_type/slice_family
 *     via slice-grouped entity maps, relevance_score, citation id repeats);
 *   - s3b (revised ADENDA 2026-07-05 — no top-N): `minimal` keeps the
 *     activated scope byte-identical to `standard` and diverges ONLY on
 *     traceability serialization — evidence cap 10→5 (same mechanism) and
 *     `manual_grounding` in the minimal form (counts + hoisted sha +
 *     executable groups_ref);
 *   - s3c (`ultrathin`, operator reactivation 2026-07-05): same complete
 *     activated set, but descriptions elided (descriptions_ref →
 *     detail="minimal"), evidence cap 5→0 (rest-ref → detail="minimal"),
 *     grounding aggregate-only and completeness diagnostics as counts + ref.
 */
function applyStructuralDiet(
  result: PrepareCodegenContextResultReady,
  detail: Exclude<CodegenDetailLevel, "full">,
  includeRelations: boolean
): PrepareCodegenContextResultReadyDieted {
  // s3/s3b/s3c evidence cap (standard 10, minimal 5, ultrathin 0):
  // deterministic prefix of the classic (already sorted: relevance_score desc,
  // id asc) list; each dieted list is by construction a prefix of the next
  // level's. Never-silent counts below; the rest-ref points to detail="full"
  // (classic top-25) at standard/minimal and to detail="minimal" (the
  // CHEAPEST level that returns patterns inline) at ultrathin.
  const ultrathin = detail === "ultrathin";
  const evidenceCap = ultrathin
    ? ULTRATHIN_EVIDENCE_PATTERN_CAP
    : detail === "minimal"
      ? MINIMAL_EVIDENCE_PATTERN_CAP
      : STANDARD_EVIDENCE_PATTERN_CAP;
  const evidenceKept = result.g2_context.evidence_patterns.slice(0, evidenceCap);
  const evidenceTotal = result.completeness_report.evidence_patterns_total;
  const evidenceCapped = evidenceTotal - evidenceKept.length;
  const completeness: DietedCompletenessReport = {
    ...result.completeness_report,
    evidence_patterns_returned: evidenceKept.length,
    evidence_patterns_capped: evidenceCapped,
    evidence_pattern_cap: evidenceCap,
    ...(evidenceCapped > 0
      ? {
          evidence_patterns_rest: (ultrathin
            ? {
                tool: "prepare_sbd_toe_codegen_context",
                with: { detail: "minimal" },
                note: EVIDENCE_PATTERNS_REST_NOTE_ULTRATHIN
              }
            : {
                tool: "prepare_sbd_toe_codegen_context",
                with: { detail: "full" },
                note:
                  "Re-call with the same input at detail='full' for the classic inline " +
                  `top-${EVIDENCE_PATTERN_CAP} evidence_patterns (this list is its ` +
                  "deterministic prefix); with debug=true, ids beyond the classic cap " +
                  "are listed in debug.rejected_candidates."
              }) satisfies EvidencePatternsRest
        }
      : {})
  };

  // s3 instructions → resource: conditions computed from the SAME resolved
  // inputs the core used, so resource + active_conditions reconstruct the
  // inline full content byte-identically.
  const echoedRisk = result.input_echo.risk_level;
  const riskLevel: RiskLevel | undefined =
    echoedRisk === "L1" || echoedRisk === "L2" || echoedRisk === "L3"
      ? echoedRisk
      : undefined;
  const instructionsRef: CodegenInstructionsRef = {
    resource: codegenInstructionsResourceUri(result.mode),
    active_conditions: activeInstructionConditions({
      hasOverlay: result.activated_scope.regulatory_obligations.length > 0,
      riskLevel,
      citationMapEmpty: Object.keys(result.citation_map).length === 0
    }),
    note:
      "Slots por índice: read_sbd_toe_resource(uri, slot=\"<n>\"); active_conditions filtram; byte-identical ao detail=full."
  };

  const dieted: PrepareCodegenContextResultReadyDieted = {
    status: result.status,
    mode: result.mode,
    // Echo the requested detail (and the include_relations escape hatch, when
    // active) for audit; the FULL result never echoes either (explicit "full"
    // must stay byte-identical to the omitted form).
    input_echo: {
      ...result.input_echo,
      detail,
      ...(includeRelations ? { include_relations: true } : {})
    },
    // s3: activation_trace only with debug=true; never-silent counter otherwise
    // (s3c: ultrathin carries its own note — the standard/minimal text is
    // byte-frozen by the golden snapshots).
    ...(result.debug
      ? { activation_trace: result.activation_trace }
      : {
          activation_trace_ref: {
            entries: result.activation_trace.length,
            note: ultrathin
              ? ACTIVATION_TRACE_REF_NOTE_ULTRATHIN
              : "activation_trace elided at detail=standard/minimal — re-call with " +
                "debug=true to include it (always inline at detail=full)."
          } satisfies ActivationTraceRef
        }),
    provenance_legend: ultrathin ? PROVENANCE_LEGEND_ULTRATHIN : PROVENANCE_LEGEND,
    // s3c: ultrathin elides the published descriptions (executable
    // descriptions_ref → detail="minimal"); the lists stay COMPLETE.
    activated_scope: {
      requirements: dietRequirements(result.activated_scope.requirements, !ultrathin),
      controls: dietControls(result.activated_scope.controls, !ultrathin),
      slices: stripSource(result.activated_scope.slices),
      regulatory_obligations: stripSource(result.activated_scope.regulatory_obligations),
      ...(ultrathin
        ? {
            descriptions_ref: {
              tool: "prepare_sbd_toe_codegen_context",
              with: { detail: "minimal" },
              note: DESCRIPTIONS_REF_NOTE
            } satisfies ActivatedScopeDescriptionsRef
          }
        : {})
    },
    g2_context: {
      control_objectives: groupEntitiesBySlice(result.g2_context.control_objectives),
      mechanisms: groupEntitiesBySlice(result.g2_context.mechanisms),
      practices: groupEntitiesBySlice(result.g2_context.practices),
      artifacts: groupEntitiesBySlice(result.g2_context.artifacts),
      ...(includeRelations
        ? { relations: stripSource(result.g2_context.relations) }
        : { relations_ref: buildRelationsRef(result) }),
      evidence_patterns: evidenceKept.map(
        ({ source: _source, relevance_score: _score, ...rest }) => rest
      )
    },
    // s3b: minimal serves the count+provenance form (executable groups_ref);
    // standard keeps the full grouping; s3c: ultrathin serves the aggregate
    // form only (total + hoisted sha + groups_ref, group list elided).
    manual_grounding: ultrathin
      ? buildUltrathinGrounding(buildMinimalGrounding(groupManualGrounding(result)))
      : detail === "minimal"
        ? buildMinimalGrounding(groupManualGrounding(result))
        : groupManualGrounding(result),
    regulatory_overlay: {
      frameworks: stripSource(result.regulatory_overlay.frameworks),
      obligations: stripSource(result.regulatory_overlay.obligations),
      mappings: stripSource(result.regulatory_overlay.mappings),
      playbooks: stripSource(result.regulatory_overlay.playbooks)
    },
    citations: invertCitationMap(result.citation_map),
    // s3c: ultrathin trims the diagnostic text arrays to exact counts + ref.
    completeness_report: ultrathin
      ? trimCompletenessForUltrathin(completeness)
      : completeness,
    codegen_instructions_ref: instructionsRef,
    // s4: identical re-call is deterministic — point the client back at the
    // context it already holds (full stays byte-identical: no hint there).
    repeat_call_hint: REPEAT_CALL_HINT,
    provenance: result.provenance
  };
  if (result.debug) {
    // 0.20.0-beta.26 (§17-A, menor): a nota contava o cap CLÁSSICO (returned=25) mesmo
    // quando o nível dietado devolvia 5 — o número que o consumidor lia não era o que
    // recebeu. Passa a contar o efectivo, dizendo qual é o cap deste `detail`.
    dieted.debug = {
      ...result.debug,
      notes: result.debug.notes.map((note) =>
        note.startsWith("evidence_patterns: total=")
          ? `evidence_patterns: total=${evidenceTotal} returned=${evidenceKept.length} capped=${evidenceCapped} (cap efectivo do detail="${detail}": ${evidenceCap}; cap clássico: ${EVIDENCE_PATTERN_CAP})`
          : note
      )
    };
  }
  return dieted;
}

export function handlePrepareCodegenContext(
  raw: PrepareCodegenContextInput
): PrepareCodegenContextResult {
  // v2 token diet (s1/s2): `detail` and `include_relations` select the
  // response ENCODING only — they are validated up-front and never influence
  // activation/resolution.
  const detail = parseDetail(raw);
  const includeRelations = parseIncludeRelations(raw);
  const result = prepareCodegenContextCore(raw);
  const shaped =
    detail !== "full" && result.status === "ready_for_codegen"
      ? applyStructuralDiet(result, detail, includeRelations)
      : result;
  // RF-H: append the advisory band (status-aware, pure) around the deterministic result.
  return { ...shaped, next: prepareCodegenAffordances(result.status, "citation_map" in result ? Object.keys(result.citation_map).filter((id) => /^[A-Z]{3}-\d{3}$/.test(id)) : []) };
}

function prepareCodegenContextCore(
  raw: PrepareCodegenContextInput
): PrepareCodegenContextResultReady | PrepareCodegenContextResultBlocked {
  const input = normalizeInput(raw);

  const preGate = gateBeforeActivation(input);
  if (preGate && preGate.status !== "ready_for_codegen") {
    return blocked(
      input,
      raw,
      preGate.status as PrepareCodegenContextResultBlocked["status"],
      preGate.reasons,
      preGate.suggestions,
      [],
      { rejected: [], notes: [] }
    );
  }

  // 0.20.0-beta.21 — «declarativo primeiro»: por defeito o prepare responde ao
  // DECLARADO. Sem nenhuma declaração não adivinha a partir do `task`: devolve
  // needs_input com o vocabulário e a receita (o gateway semântico e o
  // classificador de intenção vivem no bloco lexical, que aqui não corre).
  const selectionMode = raw.selection_mode === "discover" ? "discover" : "declarative";
  const declaredTechnologies = normalizeDeclaredTechnologies(
    Array.isArray(raw.technologies) ? raw.technologies.filter((t): t is string => typeof t === "string") : [],
    input.stack
  );
  const declarativeSelection = selectionMode !== "discover";
  const hasDeclaredActivator =
    input.concerns.length > 0 ||
    input.exposure !== undefined ||
    input.data_sensitivity !== undefined ||
    input.changed_files.length > 0 ||
    declaredTechnologies.length > 0;
  // P1-A (0.20.0-beta.22): a decisão de needs_input é UMA e vive no motor — indexada
  // à activação produzida, não à presença de campos. O prepare reage ao veredicto
  // (abaixo, depois de correr a selecção), em vez de ter a sua própria regra.
  const activation = activate(input, { declaredOnly: declarativeSelection });

  // (c) The scope gate measures the request's FOCUS, not its full semantic
  // expansion: explicit concerns when given, else the concerns activated by
  // deterministic sources (explicit input + direct lexicon task terms). Semantic
  // intent-keyword/alias expansions still enrich the output context and trace —
  // they just don't inflate the requirement count and trip decomposition. Falls
  // back to the full activation when no deterministic concern was resolved.
  const deterministicConcerns = [
    ...new Set(
      activation.trace
        .filter((entry) => entry.confidence === "deterministic" && CONCERN_LEXICON.has(entry.produced))
        .map((entry) => entry.produced as Concern)
    )
  ];
  const focusConcerns =
    input.concerns.length > 0
      ? input.concerns
      : deterministicConcerns.length > 0
        ? deterministicConcerns
        : activation.concerns;

  void focusConcerns; // kept for the debug notes below; the gate no longer counts requirements
  // MP1 selection (G-mp1a O2): the engine composes baseline ∪ context and narrows
  // by the task's declared signals — this is the requirement set served.
  const selection: SelectionResult = runSelectionWithActivation(
    input,
    activation,
    selectionMode === "discover" ? (raw.technologies ?? []) : declaredTechnologies,
    selectionMode
  );
  if (selection.needs_input) {
    const ni = selection.needs_input;
    return blocked(
      input,
      raw,
      "needs_input",
      [
        ni.reason,
        "Contrato v1.18-beta: o servidor responde ao declarado e NÃO interpreta o `task` — que fica registado para auditoria."
      ],
      [
        `Lê o vocabulário fechado: read_sbd_toe_resource(uri="${ni.vocabulary_resource}").`,
        `Re-chama declarando, por exemplo: ${ni.example.with}.`,
        ...(ni.candidates_to_confirm.from_task_text.length > 0
          ? [`SUGESTÃO A CONFIRMAR (não é selecção), derivada do texto: [${ni.candidates_to_confirm.from_task_text.join(", ")}] — confirma e declara.`]
          : []),
        ...(ni.inert_declarations?.length ? [`Declarações inertes nesta chamada: ${ni.inert_declarations.join("; ")}.`] : []),
        `Queres o comportamento inferencial antigo? selection_mode="discover" (exploratório).`
      ],
      activation.trace
    );
  }
  const estimatedRequirements = selection.selected.length;

  // 0.19.4 («a promessa do minimal», lead opção 2): tecto de requisitos por-id
  // por nível de detail, derivado da medição (~68 tk/req min/std, ~29 ultrathin)
  // para que tecto×custo caiba na promessa de cada nível. `full` fica SEM tecto
  // (promessa = completude; nível do oráculo). Mesma filosofia do
  // needs_decomposition: nunca erro seco, nunca degradação silenciosa.
  const ceilingDetail = parseDetail(raw);
  const requirementCeiling = REQUIREMENT_CEILING_BY_DETAIL[ceilingDetail];
  if (requirementCeiling !== undefined && selection.selected.length > requirementCeiling) {
    const byCategory = new Map<string, number>();
    for (const r of selection.selected) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1);
    const remaining = new Set(byCategory.keys());
    const batches: Array<{ concerns: string[]; estimated_requirements: number }> = [];
    while (remaining.size > 0 && batches.length < 3) {
      let best: Concern | null = null;
      let bestCats: string[] = [];
      let bestWeight = 0;
      for (const concern of VALID_CONCERNS) {
        const cats = [...categoriesForConcerns([concern as Concern])].filter((c) => remaining.has(c));
        const weight = cats.reduce((n, c) => n + (byCategory.get(c) ?? 0), 0);
        if (weight > bestWeight) { best = concern as Concern; bestCats = cats; bestWeight = weight; }
      }
      if (!best) break;
      batches.push({ concerns: [best], estimated_requirements: bestWeight });
      for (const c of bestCats) remaining.delete(c);
    }
    const projected = projectedCostTk(ceilingDetail, selection.selected.length) ?? 0;
    const b = blocked(
      input,
      raw,
      "needs_decomposition",
      [
        `Selecção de ${selection.selected.length} requisitos excede o tecto de ${requirementCeiling} para detail="${ceilingDetail}" ` +
          `(medição: ~${COST_PER_REQ_TK[ceilingDetail] ?? 0} tk/req sobre base ~${BASE_TK[ceilingDetail] ?? 0} tk ⇒ ~${projected} tk, ` +
          `acima da promessa de ${PAYLOAD_PROMISE_TK[ceilingDetail] ?? 0} tk deste nível).`
      ],
      [
        "Divide por área — repete SÓ com task + risk_level + concerns do lote; os activadores largos (exposure/data_sensitivity/stack) ficam FORA da chamada do lote, porque concerns SOMAM activação, não restringem. Lotes (estimativas por área do pedido original): " +
          batches.map((bt, i) => `${i + 1}) concerns=[${bt.concerns.map((c) => `"${c}"`).join(", ")}] (~${bt.estimated_requirements} reqs)`).join("; ") +
          ". Categorias sem lote entram na chamada mais próxima.",
        `Em alternativa usa detail="full" (sem tecto — payload completo, custo alto) ou reduz o âmbito da task.`
      ],
      activation.trace,
      input.debug ? { rejected: activation.rejected, notes: activation.notes } : undefined
    );
    b.requirement_ceiling = {
      detail: ceilingDetail,
      limit: requirementCeiling,
      selected: selection.selected.length,
      cost_per_req_tk: COST_PER_REQ_TK[ceilingDetail] ?? 0,
      projected_tk: projected,
      promise_tk: PAYLOAD_PROMISE_TK[ceilingDetail] ?? 0,
      batches
    };
    return b;
  }

  const postGate = gateAfterActivation({
    input,
    activation,
    estimatedRequirements,
    // Só é "declarado" quando o chamador declarou mesmo: no caminho declarativo a
    // ausência de declarações já devolveu needs_input antes de chegar aqui, logo
    // este ponto implica declaração real. Em discover o gate mantém-se inteiro.
    declaredSurfaces: declarativeSelection && hasDeclaredActivator
  });
  if (postGate && postGate.status !== "ready_for_codegen") {
    return blocked(
      input,
      raw,
      postGate.status as PrepareCodegenContextResultBlocked["status"],
      postGate.reasons,
      postGate.suggestions,
      activation.trace,
      { rejected: activation.rejected, notes: activation.notes }
    );
  }

  // Runtime v1 — fail clearly if assets missing.
  let g2Data: G2RuntimeData;
  try {
    g2Data = getG2Runtime();
  } catch (error) {
    if (error instanceof RuntimeV1AssetMissingError) {
      return blocked(
        input,
        raw,
        "unsupported_scope",
        [
          "AppSec Core v1 runtime ausente neste deployment.",
          `Ficheiros em falta: ${error.missingPaths.join(", ")}.`
        ],
        [
          "Deployment incompleto (runtime v1 ausente) — reporta ao operador do MCP (reinstalar/actualizar o pacote publicado); em alternativa usa record types runtime v0 noutras tools."
        ],
        activation.trace,
        { rejected: activation.rejected, notes: activation.notes }
      );
    }
    throw error;
  }

  const overlayResolution = resolveOverlay(input);
  if (overlayResolution.status === "absent" || overlayResolution.status === "unsupported") {
    return blocked(
      input,
      raw,
      "unsupported_scope",
      overlayResolution.reasons,
      [
        "Remove `regulatory_frameworks` / `include_regulatory_overlay` se o overlay não estiver publicado neste deployment, ou pede o conjunto reduzido de frameworks suportadas."
      ],
      activation.trace,
      { rejected: activation.rejected, notes: activation.notes }
    );
  }

  // ----- Resolve activated scope ----------------------------------------
  const ontologyForSelection = getOntologyData();
  const selectedIds = new Set(selection.selected.map((r) => r.requirement_id));
  const v0 = resolveRuntimeV0({
    riskLevel: input.risk_level,
    concerns: activation.concerns,
    selectedRequirements: ontologyForSelection.requirements.filter((r) => selectedIds.has(r.requirement_id))
  });

  const activatedSlices = resolveActivatedSlices(g2Data, activation.sliceFamilies);
  const activatedSliceIds = new Set(activatedSlices.map((slice) => slice.slice_id));

  const activatedCOs = entitiesForSlices(g2Data.controlObjectives, activatedSliceIds);
  const activatedMechanisms = entitiesForSlices(g2Data.mechanisms, activatedSliceIds);
  const activatedPractices = entitiesForSlices(g2Data.practices, activatedSliceIds);
  const activatedArtifacts = entitiesForSlices(g2Data.artifacts, activatedSliceIds);

  const activatedEntityIds = new Set<string>();
  for (const list of [
    activatedCOs,
    activatedMechanisms,
    activatedPractices,
    activatedArtifacts
  ]) {
    for (const entity of list) activatedEntityIds.add(entity.entity_id);
  }

  const activatedRelations = g2Data.relations.filter((relation) => {
    if (activatedSliceIds.has(relation.object_id)) return true;
    if (activatedEntityIds.has(relation.subject_id)) return true;
    if (activatedEntityIds.has(relation.object_id)) return true;
    return false;
  });

  const directControlIds = new Set(
    v0.controls.filter((control) => control.confidence === "direct").map(
      (control) => control.control_id
    )
  );
  const derivedControlIds = new Set(
    v0.controls.filter((control) => control.confidence === "derived").map(
      (control) => control.control_id
    )
  );
  const activeRequirementIdsForEvidence = new Set(
    v0.requirements.map((requirement) => requirement.requirement_id)
  );

  function projectEvidencePattern(
    pattern: EvidencePattern,
    relevanceScore: number
  ): G2ContextEvidencePattern {
    const projection: G2ContextEvidencePattern = {
      id: pattern.id,
      relevance_score: relevanceScore,
      source: "runtime_v0"
    };
    if (pattern.maps_to_requirement_id)
      projection.maps_to_requirement_id = pattern.maps_to_requirement_id;
    if (pattern.maps_to_control_id)
      projection.maps_to_control_id = pattern.maps_to_control_id;
    if (pattern.evidence_expectation)
      projection.evidence_expectation = pattern.evidence_expectation;
    if (pattern.verification_logic)
      projection.verification_logic = pattern.verification_logic;
    if (pattern.expected_artifact_type_ids && pattern.expected_artifact_type_ids.length > 0) {
      projection.expected_artifact_type_ids = pattern.expected_artifact_type_ids;
    }
    return projection;
  }

  /**
   * 0.20.0-beta.26 (§17-A) — ORDENAÇÃO POR PERTENÇA AO ÂMBITO.
   *
   * A ordenação anterior dava 1.0 a qualquer EP ligado a um CONTROLO directo e só 0.7 ao
   * EP ligado a um REQUISITO do âmbito activado: a pertença ao controlo ganhava à pertença
   * ao requisito, e o desempate por id fazia o resto. Efeito medido: numa tarefa de
   * validação (âmbito ERR/VAL) vinham 5 em 5 EPs de fora — EP-API-002/003/007, EP-AUT-010,
   * EP-CFG-005 — e nem um EP-VAL/EP-ERR; em `auth` funcionava por SORTE ALFABÉTICA
   * (ACC < API < AUT < CFG < ERR < VAL). Pior: em «exigir reautenticação» o `minimal`
   * omitia EP-AUT-009, o padrão do requisito que a tarefa NOMEIA.
   *
   * Isto não é um modelo de relevância — é uma comparação de PERTENÇA, e é por isso que
   * pode ser uma invariante testável: o requisito do âmbito activado vem primeiro, depois
   * o controlo directo, depois o derivado, e o id só desempata dentro do mesmo escalão.
   */
  const scoredEvidencePatterns = v0.evidencePatterns.map((pattern) => {
    let score = 0;
    if (
      pattern.maps_to_requirement_id &&
      activeRequirementIdsForEvidence.has(pattern.maps_to_requirement_id)
    ) {
      score = Math.max(score, 1.0);
    }
    if (
      pattern.maps_to_control_id &&
      directControlIds.has(pattern.maps_to_control_id)
    ) {
      score = Math.max(score, 0.7);
    }
    if (
      pattern.maps_to_control_id &&
      derivedControlIds.has(pattern.maps_to_control_id)
    ) {
      score = Math.max(score, 0.5);
    }
    return { pattern, score };
  });
  scoredEvidencePatterns.sort((a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id));
  const keptEvidencePatterns = scoredEvidencePatterns.slice(0, EVIDENCE_PATTERN_CAP);
  const cappedEvidencePatterns = scoredEvidencePatterns.slice(EVIDENCE_PATTERN_CAP);

  const g2Context: G2Context = {
    control_objectives: activatedCOs.map((entity) => projectV1Entity(entity, g2Data)),
    mechanisms: activatedMechanisms.map((entity) => projectV1Entity(entity, g2Data)),
    practices: activatedPractices.map((entity) => projectV1Entity(entity, g2Data)),
    artifacts: activatedArtifacts.map((entity) => projectV1Entity(entity, g2Data)),
    relations: activatedRelations.map(projectRelation),
    evidence_patterns: keptEvidencePatterns.map(({ pattern, score }) =>
      projectEvidencePattern(pattern, score)
    )
  };

  // ----- Manual grounding ----------------------------------------------
  const manualGrounding: ManualGroundingEntry[] = [];
  for (const entityId of activatedEntityIds) {
    const bucket = g2Data.rastreabilidadeByV1EntityId.get(entityId);
    if (!bucket) continue;
    for (const entry of bucket) {
      manualGrounding.push({
        rastreabilidade_role: entry.rastreabilidade_role,
        ...(entry.manual_chapter !== undefined
          ? { manual_chapter: entry.manual_chapter }
          : {}),
        ...(entry.manual_file !== undefined ? { manual_file: entry.manual_file } : {}),
        ...(entry.manual_commit_sha ? { manual_commit_sha: entry.manual_commit_sha } : {}),
        ...(entry.v1_entity_id ? { v1_entity_id: entry.v1_entity_id } : {}),
        ...(entry.v1_entity_name ? { v1_entity_name: entry.v1_entity_name } : {}),
        source: "runtime_v1"
      });
    }
  }

  // ----- Activated scope projection ------------------------------------
  const activatedScope: ActivatedScope = {
    requirements: v0.requirements.map((requirement) => ({
      requirement_id: requirement.requirement_id,
      name: requirement.name,
      category: requirement.category,
      type: requirement.type,
      source: "runtime_v0" as const
    })) as ActivatedScope["requirements"],
    controls: v0.controls.map((control) => ({
      control_id: control.control_id,
      name: control.name,
      domain: control.domain,
      control_type: control.control_type,
      source: "runtime_v0" as const,
      confidence: control.confidence
    })),
    slices: activatedSlices.map((slice) => ({
      slice_id: slice.slice_id,
      objective_family: slice.objective_family,
      scope: slice.scope,
      contract_status: slice.contract_status,
      source: "runtime_v1" as const
    })),
    regulatory_obligations: overlayResolution.activatedObligations.map((obligation) => ({
      obligation_id: obligation.obligation_id,
      framework_id: obligation.framework_id,
      title: obligation.title,
      source: "overlay" as const
    }))
  };

  // ----- Citation map ---------------------------------------------------
  const citationMap: Record<string, CitationMapEntry> = {};
  for (const requirement of v0.requirements) {
    citationMap[requirement.requirement_id] = {
      source: "runtime_v0",
      source_data: "data/publish/runtime/requirements.json"
    };
  }
  for (const control of v0.controls) {
    citationMap[control.control_id] = {
      source: "runtime_v0",
      source_data: "data/publish/runtime/controls.json"
    };
  }
  for (const slice of activatedSlices) {
    citationMap[slice.slice_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/slices.json"
    };
  }
  for (const co of activatedCOs) {
    citationMap[co.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/control_objectives.json"
    };
  }
  for (const mechanism of activatedMechanisms) {
    citationMap[mechanism.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/mechanisms.json"
    };
  }
  for (const practice of activatedPractices) {
    citationMap[practice.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/practices.json"
    };
  }
  for (const artifact of activatedArtifacts) {
    citationMap[artifact.entity_id] = {
      source: "runtime_v1",
      source_data: "data/publish/runtime/v1/artifacts.json"
    };
  }
  for (const framework of overlayResolution.activatedFrameworks) {
    citationMap[framework.framework_id] = {
      source: "overlay",
      source_data: "data/publish/overlay/external_frameworks.json"
    };
  }
  for (const obligation of overlayResolution.activatedObligations) {
    citationMap[obligation.obligation_id] = {
      source: "overlay",
      source_data: "data/publish/overlay/external_obligations.json"
    };
  }

  // ----- Completeness report -------------------------------------------
  const expectedCounts = aggregateExpectedFromSlices(activatedSlices);
  const namedV1 = [
    ...activatedCOs,
    ...activatedMechanisms,
    ...activatedPractices,
    ...activatedArtifacts
  ].filter((entity) => Boolean(getV1EntityDisplayName(g2Data, entity.entity_id))).length;
  const totalV1 =
    activatedCOs.length +
    activatedMechanisms.length +
    activatedPractices.length +
    activatedArtifacts.length;
  const completeness: CompletenessReport = {
    expected_objectives: expectedCounts.control_objectives,
    returned_objectives: activatedCOs.length,
    m_recall:
      expectedCounts.control_objectives === 0
        ? 1.0
        : activatedCOs.length / expectedCounts.control_objectives,
    expected_mechanisms: expectedCounts.mechanisms,
    returned_mechanisms: activatedMechanisms.length,
    expected_practices: expectedCounts.practices,
    returned_practices: activatedPractices.length,
    expected_artifacts: expectedCounts.artifacts,
    returned_artifacts: activatedArtifacts.length,
    named_v1_entities: namedV1,
    unnamed_v1_entities: totalV1 - namedV1,
    selection: {
      eligible: selection.eligible_count,
      selected: selection.selected.length,
      narrowed_out_categories: selection.narrowed_out.length,
      narrowed_out_requirements: selection.narrowed_out.reduce((n, g) => n + g.count, 0),
      excluded_by_level_categories: selection.excluded_by_level.length,
      excluded_by_level_requirements: selection.excluded_by_level.reduce((n, g) => n + g.count, 0),
      lexical_share: selection.basis_summary.lexical_share,
      narrowed_out_ref: {
        tool: "select_sbd_toe_requirements",
        note:
          "Categorias elegíveis sem sinal na tarefa foram excluídas pelo narrowing MP1 — " +
          "a lista completa (por categoria, com razão) vem de select_sbd_toe_requirements com o mesmo contexto."
      }
    },
    v1_consistency_mismatches: g2Data.consistency.mismatches,
    v1_manifest_warnings: g2Data.consistency.warnings,
    evidence_patterns_total: scoredEvidencePatterns.length,
    evidence_patterns_returned: keptEvidencePatterns.length,
    evidence_patterns_capped: cappedEvidencePatterns.length,
    evidence_pattern_cap: EVIDENCE_PATTERN_CAP
  };

  // ----- Build LLM instructions + rationale template -------------------
  const citedIds = Object.keys(citationMap);
  const llm_codegen_instructions = buildLlmInstructions({
    mode: input.mode,
    citedIds,
    hasOverlay: overlayResolution.activatedObligations.length > 0,
    riskLevel: input.risk_level
  });

  const security_rationale_template = buildSecurityRationaleTemplate(
    input.taskTrimmed
  );

  const result: PrepareCodegenContextResultReady = {
    status: "ready_for_codegen",
    mode: input.mode,
    input_echo: inputEcho(raw),
    activation_trace: activation.trace,
    activated_scope: activatedScope,
    g2_context: g2Context,
    manual_grounding: manualGrounding,
    regulatory_overlay: overlayResolution.context,
    citation_map: citationMap,
    completeness_report: completeness,
    llm_codegen_instructions,
    security_rationale_template,
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      runtime_v0: PROVENANCE_V0,
      runtime_v1: PROVENANCE_V1,
      overlay:
        overlayResolution.status === "skipped"
          ? "absent"
          : PROVENANCE_OVERLAY
    }
  };
  if (input.debug) {
    const cappedEntries: ActivationTraceEntry[] = cappedEvidencePatterns.map(
      ({ pattern, score }) => ({
        source: "scope_gate",
        produced: pattern.id,
        trigger: pattern.maps_to_control_id ?? pattern.maps_to_requirement_id ?? "<no anchor>",
        score,
        confidence: "deterministic",
        reason: `Evidence pattern dropped by the scope-membership cap (cap=${EVIDENCE_PATTERN_CAP}); within a membership tier the order is by id, not by relevance.`
      })
    );
    result.debug = {
      rejected_candidates: [...activation.rejected, ...cappedEntries],
      notes: [
        ...activation.notes,
        `concerns: ${activation.concerns.join(", ") || "(none)"}`,
        `slice_families: ${activation.sliceFamilies.join(", ") || "(none)"}`,
        `overlay_status: ${overlayResolution.status}`,
        `estimated_v0_requirements: ${estimatedRequirements}`,
        `evidence_patterns: total=${scoredEvidencePatterns.length} returned=${keptEvidencePatterns.length} capped=${cappedEvidencePatterns.length}`
      ]
    };
  }
  return result;
}

function aggregateExpectedFromSlices(slices: AppSecSlice[]): {
  control_objectives: number;
  mechanisms: number;
  practices: number;
  artifacts: number;
} {
  const totals = { control_objectives: 0, mechanisms: 0, practices: 0, artifacts: 0 };
  for (const slice of slices) {
    totals.control_objectives += slice.counts_actual.control_objectives;
    totals.mechanisms += slice.counts_actual.mechanisms;
    totals.practices += slice.counts_actual.practices;
    totals.artifacts += slice.counts_actual.artifacts;
  }
  return totals;
}

// Re-export the lexicon so tests / docs can reference the canonical list.
export const __wp5Lexicon = {
  VALID_CONCERNS,
  CONCERN_TO_SLICE_FAMILY
};
