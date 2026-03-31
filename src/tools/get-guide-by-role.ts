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

import type { Practice, PracticeAssignment, UserStory } from "./ontology-loader.js";
import { getOntologyData, resolvePhaseId, resolveRoleId } from "./ontology-loader.js";
import { _resolveConsultResult } from "./consult-security-requirements.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(v);
}

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/[\s/]+/g, "-").replace(/_/g, "-");
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
  artifacts: string[];
  user_story?: {
    us_id?: string;
    title: string;
    goal?: string;
    acceptance_criteria?: string;
  };
}

export interface GetGuideByRoleResult {
  risk_level: string;
  roleFilter: string | null;
  canonicalRole: string | null;
  phaseFilter: string | null;
  canonicalPhase: string | null;
  assignments: AssignmentWithStory[];
  by_role: Record<string, AssignmentWithStory[]>;
  by_phase: Record<string, AssignmentWithStory[]>;
  meta: {
    assignmentCount: number;
    userStoryCount: number;
    activePracticeCount: number;
    knownRoles: string[];
    knownPhases: string[];
    note: string;
  };
}

export interface McpProvenance {
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

export interface GetGuideByRoleOutput {
  provenance: McpProvenance;
  risk_level: string;
  roleFilter: string | null;
  canonicalRole: string | null;
  phaseFilter: string | null;
  canonicalPhase: string | null;
  assignments: AssignmentSlim[];
  role_summary: Record<string, number>;
  phase_summary: Record<string, number>;
  meta: {
    assignmentCount: number;
    userStoryCount: number;
    activePracticeCount: number;
    knownRoles: string[];
    knownPhases: string[];
    note: string;
  };
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
    ? resolveRoleId(roleArg, roles) ?? normalizeToken(roleArg)
    : null;

  const phaseArg = typeof args["phase"] === "string" ? args["phase"].trim() : null;
  const canonicalPhase = phaseArg
    ? resolvePhaseId(phaseArg, phases) ?? normalizeToken(phaseArg)
    : null;

  const activePracticeIds = new Set(
    consult.controls.flatMap((control) => control.source_practice_ids ?? [])
  );
  const practiceById = new Map(practices.map((practice) => [practice.id, practice]));

  let scopedAssignments = allAssignments.filter((assignment) => assignment.risk_level === riskLevel);
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

  const knownRoles = [...new Set(enrichedAssignments.map((assignment) => assignment.canonical_role))].sort();
  const knownPhases = [...new Set(enrichedAssignments.map((assignment) => assignment.canonical_phase))].sort();
  const userStoryCount = filteredAssignments.filter((assignment) => assignment.user_story !== undefined).length;

  return {
    risk_level: riskLevel,
    roleFilter: roleArg,
    canonicalRole,
    phaseFilter: phaseArg,
    canonicalPhase,
    assignments: filteredAssignments,
    by_role,
    by_phase,
    meta: {
      assignmentCount: filteredAssignments.length,
      userStoryCount,
      activePracticeCount: activePracticeIds.size,
      knownRoles,
      knownPhases,
      note:
        "Guide mode is grounded on consult-mode controls, then expanded via source_practice_ids, " +
        "practice_assignments and lifecycle_user_stories. Role and phase filters use canonical runtime entities.",
    },
  };
}

function slimAssignment(assignment: AssignmentWithStory): AssignmentSlim {
  const slim: AssignmentSlim = {
    id: assignment.id,
    chapter_id: assignment.chapter_id,
    practice_id: assignment.practice_id,
    ...(assignment.practice?.label ? { practice_label: assignment.practice.label } : {}),
    role: assignment.role,
    canonical_role: assignment.canonical_role,
    phase: assignment.phase,
    canonical_phase: assignment.canonical_phase,
    action: assignment.action,
    artifacts: assignment.artifacts,
  };

  if (assignment.user_story) {
    slim.user_story = {
      ...(assignment.user_story.us_id ? { us_id: assignment.user_story.us_id } : {}),
      title: assignment.user_story.title,
      ...(assignment.user_story.goal ? { goal: assignment.user_story.goal } : {}),
      ...(assignment.user_story.acceptance_criteria
        ? { acceptance_criteria: assignment.user_story.acceptance_criteria }
        : {}),
    };
  }

  return slim;
}

export function handleGetGuideByRole(
  args: Record<string, unknown>
): GetGuideByRoleOutput {
  const full = _resolveGuideByRole(args, getOntologyData());
  const hasFilter = full.roleFilter !== null || full.phaseFilter !== null;

  const role_summary: Record<string, number> = {};
  const phase_summary: Record<string, number> = {};

  for (const [role, items] of Object.entries(full.by_role)) {
    role_summary[role] = items.length;
  }
  for (const [phase, items] of Object.entries(full.by_phase)) {
    phase_summary[phase] = items.length;
  }

  return {
    provenance: {
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
    assignments: hasFilter ? full.assignments.map(slimAssignment) : [],
    role_summary,
    phase_summary,
    meta: {
      ...full.meta,
      note: hasFilter
        ? full.meta.note
        : `${full.meta.note} No role/phase filter — assignments omitted. Specify role= or phase= for details.`,
    },
  };
}
