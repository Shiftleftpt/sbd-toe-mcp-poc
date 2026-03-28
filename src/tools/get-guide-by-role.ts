/**
 * get_guide_by_role
 *
 * Returns practice assignments and user stories for a given risk level,
 * optionally filtered by role and/or lifecycle phase.
 *
 * Algorithm (from mcp_ontology_integration.md §4 — guide pipeline):
 *   1. Filter assignments by risk_level
 *   2. If role provided: resolve to canonical role_id (via aliases), filter by role
 *   3. If phase provided: filter by phase
 *   4. Group assignments by role and by phase
 *   5. Join user stories via practice_id
 *
 * All data is read from data/publish/ — nothing is invented.
 */

import type { PracticeAssignment, UserStory } from "./ontology-loader.js";
import { getOntologyData, resolveRoleId } from "./ontology-loader.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(v);
}

export interface AssignmentWithStory extends PracticeAssignment {
  user_story?: UserStory;
}

export interface GetGuideByRoleResult {
  risk_level: string;
  roleFilter: string | null;
  canonicalRole: string | null;
  phaseFilter: string | null;
  assignments: AssignmentWithStory[];
  byRole: Record<string, AssignmentWithStory[]>;
  byPhase: Record<string, AssignmentWithStory[]>;
  meta: {
    assignmentCount: number;
    userStoryCount: number;
    knownRoles: string[];
    knownPhases: string[];
    note: string;
  };
}

// ---------------------------------------------------------------------------
// Internal (exported for testability)
// ---------------------------------------------------------------------------

export function _resolveGuideByRole(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): GetGuideByRoleResult {
  const { roles, assignments: allAssignments, userStories: allStories } = ontologyData;

  // Validate risk_level
  const riskLevelArg = args["risk_level"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw Object.assign(
      new Error(`Invalid risk_level: "${String(riskLevelArg)}". Allowed values: L1, L2, L3.`),
      { rpcError: { code: -32602, message: `Invalid risk_level: "${String(riskLevelArg)}"` } }
    );
  }
  const riskLevel: RiskLevel = riskLevelArg;

  // Optional role filter
  const roleArg = typeof args["role"] === "string" ? args["role"].trim() : null;
  let canonicalRole: string | null = null;
  if (roleArg) {
    const resolved = resolveRoleId(roleArg, roles);
    // Keep the input as-is if unresolved (still filter by raw string)
    canonicalRole = resolved ?? roleArg.toLowerCase().replace(/[\s/]+/g, "-");
  }

  // Optional phase filter
  const phaseArg = typeof args["phase"] === "string" ? args["phase"].trim().toLowerCase() : null;

  // Step 1: filter assignments by risk_level
  let filtered = allAssignments.filter((a) => a.risk_level === riskLevel);

  // Step 2: filter by role if provided
  if (canonicalRole) {
    filtered = filtered.filter(
      (a) => a.role.toLowerCase().replace(/[\s/]+/g, "-") === canonicalRole
    );
  }

  // Step 3: filter by phase if provided
  if (phaseArg) {
    filtered = filtered.filter((a) => a.phase.toLowerCase() === phaseArg);
  }

  // Build user story lookup by practice_id
  const storyByPractice = new Map<string, UserStory>();
  for (const story of allStories) {
    if (story.practice_id) {
      storyByPractice.set(story.practice_id, story);
    }
    // Also index by id for direct lookup
    if (story.id) {
      storyByPractice.set(story.id, story);
    }
  }

  // Step 5: join user stories
  const assignments: AssignmentWithStory[] = filtered.map((a) => {
    const story =
      (a.practice_id ? storyByPractice.get(a.practice_id) : undefined) ??
      (a.user_story_id ? storyByPractice.get(a.user_story_id) : undefined);
    return story ? { ...a, user_story: story } : { ...a };
  });

  // Step 6: group by role and by phase
  const byRole: Record<string, AssignmentWithStory[]> = {};
  const byPhase: Record<string, AssignmentWithStory[]> = {};
  for (const a of assignments) {
    (byRole[a.role] ??= []).push(a);
    (byPhase[a.phase] ??= []).push(a);
  }

  // Compute known roles and phases from the full assignment set at this risk level
  const allAtLevel = allAssignments.filter((a) => a.risk_level === riskLevel);
  const knownRoles = [...new Set(allAtLevel.map((a) => a.role))].sort();
  const knownPhases = [...new Set(allAtLevel.map((a) => a.phase))].sort();

  const userStoryCount = assignments.filter((a) => a.user_story !== undefined).length;

  return {
    risk_level: riskLevel,
    roleFilter: roleArg,
    canonicalRole,
    phaseFilter: phaseArg,
    assignments,
    byRole,
    byPhase,
    meta: {
      assignmentCount: assignments.length,
      userStoryCount,
      knownRoles,
      knownPhases,
      note:
        "Assignments sourced from the SbD-ToE ontology practice_assignments file. " +
        "Roles resolved via canonical_roles aliases. " +
        "User stories joined via practice_id from lifecycle_user_stories."
    }
  };
}

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

export function handleGetGuideByRole(
  args: Record<string, unknown>
): GetGuideByRoleResult {
  return _resolveGuideByRole(args, getOntologyData());
}
