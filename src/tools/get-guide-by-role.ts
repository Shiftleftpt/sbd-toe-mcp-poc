/**
 * get_guide_by_role
 *
 * Deterministic GUIDE-mode resolution for a given risk level, optionally
 * filtered by role and/or lifecycle phase.
 *
 * Resolution order:
 *   1. Resolve consult-mode controls for the context
 *   2. Collect practices from control.source_practice_ids
 *   3. Join practice_assignments and lifecycle_user_stories by practice_id
 *   4. Normalize role and phase using canonical runtime entities
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { buildActivationVocabulary } from "../serving/activation-vocabulary.js";
import type { Practice, PracticeAssignment, UserStory } from "./ontology-loader.js";
import { getOntologyData, resolvePhaseId, resolveRoleId } from "./ontology-loader.js";
import { _resolveConsultResult } from "./consult-security-requirements.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { guideByRoleAffordances } from "../serving/affordances.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(v);
}

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[\s/]+/g, "-").replace(/_/g, "-");
}

/**
 * Consumer-side role aliases (serving brief #6): natural names an agent reaches for,
 * mapped to the canonical role_id ONLY where there is a single, unambiguous content
 * home. This is a serving-layer convenience and is intentionally NOT merged into the
 * KG role.aliases (that data is the producer's). Names whose content home is ambiguous
 * or sparse in the substrate are deliberately left out and routed to Codex as
 * data-quality items rather than papered over here:
 *   - devsecops  — cross-cutting (developer + appsec-engineer + devops-sre); not one role
 *   - architect  — substrate split (software_architect→developer vs empty arquitetos-software)
 *   - product-manager — product_owner appears under both `qa` and `product-owner`
 *   - training-manager / pentester / security — no canonical content home
 */
const CONSUMER_ROLE_ALIASES: Record<string, string> = {
  "security-engineer": "appsec-engineer",
  "application-security-engineer": "appsec-engineer",
  "sec-engineer": "appsec-engineer",
  "appsec-eng": "appsec-engineer",
};

function applyConsumerAlias(roleArg: string): string {
  return CONSUMER_ROLE_ALIASES[normalizeToken(roleArg)] ?? roleArg;
}

/**
 * Whether an assignment applies at its (level-tagged) risk level, read from the
 * level-specific `proportionality` string. The substrate replicates every
 * assignment across L1/L2/L3; the proportionality is what sharpens the ladder —
 * obligations like "Não", "Não aplicável", "Não obrigatório", "N/A" mean the US
 * does not apply at that level. Absent proportionality → applicable (don't drop).
 */
const NON_APPLICABLE_OBLIGATION = /^\s*(não\s+aplicável|não\s+obrigatório|não|n\/a)\b/i;
function isApplicableAtLevel(proportionality: string | undefined): boolean {
  if (!proportionality) return true;
  return !NON_APPLICABLE_OBLIGATION.test(proportionality);
}

export interface AssignmentWithStory extends PracticeAssignment {
  practice?: Practice;
  user_story?: UserStory;
  canonical_role: string;
  canonical_phase: string;
}

export interface AssignmentSlim {
  id: string;
  chapter_id: string;
  practice_id: string;
  practice_label?: string;
  role: string;
  canonical_role: string;
  phase: string;
  canonical_phase: string;
  action: string;
  /**
   * 0.20.0-beta.35 — a PROPORCIONALIDADE existe no bundle e não era servida.
   *
   * É prosa autorada que nomeia quem valida/aprova ao nível («…com validação formal por
   * AppSec Engineer»), e é o que o Manual tem de mais próximo de «quem decide o quê». Vem
   * servida COMO ESTÁ: o Manual não publica uma taxonomia decide-vs-delega, e inventar uma
   * seria o oposto de tudo o que esta linha construiu.
   */
  proportionality?: string;
  artifacts: string[];
  user_story?: {
    us_id?: string;
    title: string;
    goal?: string;
    acceptance_criteria?: string;
    // Present only in detail mode (include_detail=true) — the US DoD + join.
    checklist_items?: string[];
    bdd?: string[];
    proportionality?: UserStory["proportionality"];
    /** Level-specific obligation for the requested risk level (from the assignment). */
    proportionality_level?: string;
    sdlc_integration?: UserStory["sdlc_integration"];
  };
}

/** Aggregated DoD view of a role's user stories — the "what must role X fulfil" answer. */
export interface RoleChecklistEntry {
  id?: string;
  us_id?: string;
  title: string;
  chapter_id?: string;
  checklist_items: string[];
  proportionality?: UserStory["proportionality"];
  /** Level-specific obligation for the requested risk level (from the assignment). */
  proportionality_level?: string;
}

export interface GetGuideByRoleResult {
  phase_warning?: { requested: string; resolved: null; note: string; knownPhases: string[] };
  risk_level: string;
  roleFilter: string | null;
  canonicalRole: string | null;
  phaseFilter: string | null;
  canonicalPhase: string | null;
  assignments: AssignmentWithStory[];
  by_role: Record<string, AssignmentWithStory[]>;
  by_phase: Record<string, AssignmentWithStory[]>;
  /** 0.20.0-beta.31: papel canónico sem mapeamento nesta superfície. */
  unsupported_role?: { value: string; supported_values: string[]; note: string };
  meta: {
    assignmentCount: number;
    userStoryCount: number;
    /** 0.20.0-beta.31: histórias DISTINTAS — `assignmentCount` conta atribuições, não histórias. */
    distinctUserStoryCount?: number;
    activePracticeCount: number;
    knownRoles: string[];
    knownPhases: string[];
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

export interface GetGuideByRoleOutput {
  phase_warning?: { requested: string; resolved: null; note: string; knownPhases: string[] };
  provenance: McpProvenance;
  risk_level: string;
  roleFilter: string | null;
  canonicalRole: string | null;
  phaseFilter: string | null;
  canonicalPhase: string | null;
  assignments: AssignmentSlim[];
  /** Aggregated DoD checklist of the role's user stories — present only with include_detail + a role filter. */
  role_checklist?: RoleChecklistEntry[];
  /** 0.20.0-beta.31: papel canónico que esta superfície não mapeia — declarado, nunca vazio mudo. */
  unsupported_role?: { value: string; supported_values: string[]; note: string };
  role_summary: Record<string, number>;
  phase_summary: Record<string, number>;
  meta: {
    assignmentCount: number;
    userStoryCount: number;
    /** 0.20.0-beta.31: histórias DISTINTAS — `assignmentCount` conta atribuições, não histórias. */
    distinctUserStoryCount?: number;
    activePracticeCount: number;
    knownRoles: string[];
    knownPhases: string[];
    note: string;
  };
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next: Affordance[];
}

export function _resolveGuideByRole(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): GetGuideByRoleResult {
  const {
    roles,
    phases = [],
    practices = [],
    assignments: allAssignments,
    userStories: allStories,
  } = ontologyData;

  const riskLevelArg = args["risk_level"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw Object.assign(
      new Error(`Invalid risk_level: "${String(riskLevelArg)}". Allowed values: L1, L2, L3.`),
      { rpcError: { code: -32602, message: `Invalid risk_level: "${String(riskLevelArg)}"` } }
    );
  }
  const riskLevel: RiskLevel = riskLevelArg;

  const consult = _resolveConsultResult(args, ontologyData);

  const roleArg = typeof args["role"] === "string" ? args["role"].trim() : null;
  const canonicalRole = roleArg
    ? resolveRoleId(applyConsumerAlias(roleArg), roles) ?? normalizeToken(roleArg)
    : null;

  const phaseArg = typeof args["phase"] === "string" ? args["phase"].trim() : null;
  // 0.15.0 (P0-5): alias implement→develop; fase desconhecida ⇒ aviso DECLARADO.
  const PHASE_ALIASES: Record<string, string> = { implement: "develop", implementation: "develop", implementacao: "develop" };
  // canon-first: se o vocabulário canónico já tiver a fase, o alias NÃO se aplica.
  const resolvedDirect = phaseArg ? resolvePhaseId(phaseArg, phases) : null;
  const aliasCandidate = phaseArg ? PHASE_ALIASES[phaseArg.toLowerCase()] : undefined;
  const resolvedPhase = resolvedDirect ?? (aliasCandidate ? resolvePhaseId(aliasCandidate, phases) : null);
  const canonicalPhase = phaseArg ? resolvedPhase ?? normalizeToken(phaseArg) : null;
  const phaseWarning =
    phaseArg && resolvedPhase === null
      ? {
          requested: phaseArg,
          resolved: null,
          note: "Fase desconhecida — o filtro devolve 0 assignments; usa uma das knownPhases (alias: implement→develop).",
          knownPhases: phases.map((p) => p.phase_id).filter((x): x is string => typeof x === "string"),
        }
      : null;

  const activePracticeIds = new Set(
    consult.controls.flatMap((control) => control.source_practice_ids ?? [])
  );
  const practiceById = new Map(practices.map((practice) => [practice.id, practice]));

  // Filter by level (substrate replicates assignments across L1/L2/L3) AND drop
  // the ones the level-specific proportionality marks non-applicable — this is the
  // ladder sharpening: L1 omits what only applies higher up (serving fix, brief #3a).
  let scopedAssignments = allAssignments.filter(
    (assignment) => assignment.risk_level === riskLevel && isApplicableAtLevel(assignment.proportionality)
  );
  if (activePracticeIds.size > 0) {
    scopedAssignments = scopedAssignments.filter((assignment) =>
      activePracticeIds.has(assignment.practice_id)
    );
  }

  const storyByPractice = new Map<string, UserStory>();
  const storyById = new Map<string, UserStory>();
  for (const story of allStories) {
    if (story.practice_id) storyByPractice.set(story.practice_id, story);
    if (story.id) storyById.set(story.id, story);
  }

  const enrichedAssignments: AssignmentWithStory[] = scopedAssignments.map((assignment) => {
    const practice = practiceById.get(assignment.practice_id);
    const story =
      storyByPractice.get(assignment.practice_id) ??
      (assignment.user_story_id ? storyById.get(assignment.user_story_id) : undefined);

    return {
      ...assignment,
      ...(practice ? { practice } : {}),
      ...(story ? { user_story: story } : {}),
      canonical_role: resolveRoleId(assignment.role, roles) ?? normalizeToken(assignment.role),
      canonical_phase:
        resolvePhaseId(assignment.phase, phases) ?? normalizeToken(assignment.phase),
    };
  });

  let filteredAssignments = enrichedAssignments;
  if (canonicalRole) {
    filteredAssignments = filteredAssignments.filter(
      (assignment) => assignment.canonical_role === canonicalRole
    );
  }
  if (canonicalPhase) {
    filteredAssignments = filteredAssignments.filter(
      (assignment) => assignment.canonical_phase === canonicalPhase
    );
  }

  const by_role: Record<string, AssignmentWithStory[]> = {};
  const by_phase: Record<string, AssignmentWithStory[]> = {};
  for (const assignment of filteredAssignments) {
    (by_role[assignment.canonical_role] ??= []).push(assignment);
    (by_phase[assignment.canonical_phase] ??= []).push(assignment);
  }

  /**
   * 0.20.0-beta.31 — `knownRoles` é o que ESTA superfície resolve, e tem de o dizer.
   *
   * Vinha das atribuições presentes: para `role="fornecedores-terceiros"` (canónico,
   * publicado no guia e no vocabulário) a resposta trazia `assignments: []` e um
   * `knownRoles` de 13 entradas que **omitia o próprio papel que ela resolveu como
   * canónico** — a resposta continha a prova de que o papel não existia ali e nunca fazia a
   * ligação. Agora o conjunto é o do VOCABULÁRIO publicado, e o que esta superfície não tem
   * é DECLARADO em `unsupported_role`, com os que ela cobre de facto.
   */
  const rolesWithAssignments = [...new Set(enrichedAssignments.map((assignment) => assignment.canonical_role))].sort();
  const publishedRoles = buildActivationVocabulary().roles.values.map((r) => String(r.value)).sort();
  const knownRoles = [...new Set([...publishedRoles, ...rolesWithAssignments])].sort();
  const knownPhases = [...new Set(enrichedAssignments.map((assignment) => assignment.canonical_phase))].sort();
  const userStoryCount = filteredAssignments.filter((assignment) => assignment.user_story !== undefined).length;
  /**
   * 0.20.0-beta.31 — a mesma história pode estar em várias atribuições (uma por prática).
   * O avaliador leu «US-21 ×4» como duplicação; não é — são 4 atribuições distintas que
   * partilham uma história. Desduplicar perderia as atribuições; o que faltava era o
   * DENOMINADOR ao lado, para o número não poder ser mal lido.
   */
  const distinctUserStoryCount = new Set(
    filteredAssignments.map((assignment) => assignment.user_story?.id).filter((x): x is string => typeof x === "string")
  ).size;

  return {
    risk_level: riskLevel,
    roleFilter: roleArg,
    canonicalRole,
    phaseFilter: phaseArg,
    canonicalPhase,
    ...(phaseWarning ? { phase_warning: phaseWarning } : {}),
    assignments: filteredAssignments,
    by_role,
    by_phase,
    ...(typeof canonicalRole === "string" && filteredAssignments.length === 0 && !rolesWithAssignments.includes(canonicalRole)
      ? {
          unsupported_role: {
            value: canonicalRole,
            supported_values: rolesWithAssignments,
            note:
              `O papel \`${canonicalRole}\` é CANÓNICO e publicado (vocabulário e guia), mas esta superfície não ` +
              `tem atribuições de prática para ele: o bundle publica assignments para ${rolesWithAssignments.length} papéis. ` +
              "NÃO é ausência de responsabilidades — é ausência de MAPEAMENTO nesta superfície. Não digas que o papel " +
              "não tem nada a fazer, nem geres um subagente com base neste vazio: para o que o Manual exige nesta " +
              "área usa `select_sbd_toe_requirements` (por concern ou por estrutura, ex.: " +
              '`chapters=["14-governanca-contratacao"]`), e `get_sbd_toe_chapter_brief` para o capítulo.',
          },
        }
      : {}),
    meta: {
      assignmentCount: filteredAssignments.length,
      userStoryCount,
      distinctUserStoryCount,
      activePracticeCount: activePracticeIds.size,
      knownRoles,
      knownPhases,
      note:
        "Guide mode is grounded on consult-mode controls, then expanded via source_practice_ids, " +
        "practice_assignments and lifecycle_user_stories. Role and phase filters use canonical runtime entities. " +
        "`assignmentCount` conta ATRIBUIÇÕES (prática × papel × fase); `distinctUserStoryCount` conta as histórias " +
        "distintas — a mesma história aparece em várias atribuições e isso não é duplicação.",
    },
  };
}

function slimAssignment(assignment: AssignmentWithStory, includeDetail: boolean): AssignmentSlim {
  const slim: AssignmentSlim = {
    id: assignment.id,
    chapter_id: assignment.chapter_id,
    practice_id: assignment.practice_id,
    ...(assignment.practice?.label ? { practice_label: assignment.practice.label } : {}),
    role: assignment.role,
    canonical_role: assignment.canonical_role,
    ...(assignment.proportionality ? { proportionality: assignment.proportionality } : {}),
    phase: assignment.phase,
    canonical_phase: assignment.canonical_phase,
    action: assignment.action,
    artifacts: assignment.artifacts,
  };

  if (assignment.user_story) {
    const us = assignment.user_story;
    slim.user_story = {
      ...(us.us_id ? { us_id: us.us_id } : {}),
      title: us.title,
      ...(us.goal ? { goal: us.goal } : {}),
      ...(us.acceptance_criteria ? { acceptance_criteria: us.acceptance_criteria } : {}),
      // Level-specific obligation (always — it is the cheap, sharp ladder signal).
      ...(assignment.proportionality ? { proportionality_level: assignment.proportionality } : {}),
      // Detail mode: surface the DoD + join so the agent gets the full story in one pass.
      ...(includeDetail && us.checklist_items && us.checklist_items.length > 0
        ? { checklist_items: us.checklist_items }
        : {}),
      ...(includeDetail && us.bdd && us.bdd.length > 0 ? { bdd: us.bdd } : {}),
      ...(includeDetail && us.proportionality ? { proportionality: us.proportionality } : {}),
      ...(includeDetail && us.sdlc_integration ? { sdlc_integration: us.sdlc_integration } : {}),
    };
  }

  return slim;
}

export function handleGetGuideByRole(
  args: Record<string, unknown>
): GetGuideByRoleOutput {
  const full = _resolveGuideByRole(args, getOntologyData());
  const hasFilter = full.roleFilter !== null || full.phaseFilter !== null;
  const includeDetail = args["include_detail"] === true;

  const role_summary: Record<string, number> = {};
  const phase_summary: Record<string, number> = {};

  for (const [role, items] of Object.entries(full.by_role)) {
    role_summary[role] = items.length;
  }
  for (const [phase, items] of Object.entries(full.by_phase)) {
    phase_summary[phase] = items.length;
  }

  // Role aggregation (consumer brief #2): the role's distinct user stories with their
  // DoD checklist — the "what must role X fulfil, in one request" answer. Only when a
  // role is filtered and detail is requested (it carries the heavy per-US content).
  let role_checklist: RoleChecklistEntry[] | undefined;
  if (includeDetail && full.roleFilter !== null) {
    const seen = new Set<string>();
    role_checklist = [];
    for (const assignment of full.assignments) {
      const us = assignment.user_story;
      const key = us?.id ?? us?.us_id;
      if (!us || !key || seen.has(key)) continue;
      seen.add(key);
      role_checklist.push({
        ...(us.id ? { id: us.id } : {}),
        ...(us.us_id ? { us_id: us.us_id } : {}),
        title: us.title,
        ...(us.chapter_id ? { chapter_id: us.chapter_id } : {}),
        checklist_items: us.checklist_items ?? [],
        ...(us.proportionality ? { proportionality: us.proportionality } : {}),
        ...(assignment.proportionality ? { proportionality_level: assignment.proportionality } : {}),
      });
    }
  }

  return {
    ...(full.phase_warning ? { phase_warning: full.phase_warning } : {}),
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "guide_resolution_pipeline",
      source_data:
        "runtime/controls.json + runtime/practices.json + runtime/assignments.json + runtime/user_stories.json + runtime/roles.json + runtime/phases.json",
      note:
        "Guide mode uses the deterministic runtime bundle: controls activate practices, then assignments and user stories are joined structurally by practice_id.",
    },
    risk_level: full.risk_level,
    roleFilter: full.roleFilter,
    canonicalRole: full.canonicalRole,
    phaseFilter: full.phaseFilter,
    canonicalPhase: full.canonicalPhase,
    assignments: hasFilter ? full.assignments.map((a) => slimAssignment(a, includeDetail)) : [],
    ...(role_checklist ? { role_checklist } : {}),
    ...(full.unsupported_role ? { unsupported_role: full.unsupported_role } : {}),
    role_summary,
    phase_summary,
    meta: {
      ...full.meta,
      note: hasFilter
        ? full.meta.note
        : `${full.meta.note} No role/phase filter — assignments omitted. Specify role= or phase= for details.`,
    },
    next: guideByRoleAffordances(full.risk_level, full.canonicalRole),
  };
}
