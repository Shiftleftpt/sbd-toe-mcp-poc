/**
 * ontology-loader
 *
 * Loads and caches the SbD-ToE ontology YAML and canonical entity files
 * from data/publish/. Single source of truth for ontology-driven tools.
 *
 * All data is read from the published artefacts — nothing is invented.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { resolveAppPath } from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Requirement {
  requirement_id: string;
  type: string;
  category: string;
  name: string;
  applicable_levels: { L1: boolean; L2: boolean; L3: boolean };
  source_chapter: number;
  source_file?: string;
  domain?: string | null;
}

export interface Control {
  control_id: string;
  name: string;
  name_en?: string;
  domain: string;
  control_type: string;
  abstraction_level: string;
  applicable_lifecycle_phases: string[];
  source_practice_ids: string[];
  /** Chapter slugs this control covers (e.g. ["06-desenvolvimento-seguro"]) */
  chapter_ids?: string[];
  description?: string;
  aliases?: string[];
}

export interface CanonicalRole {
  role_id: string;
  aliases: string[];
  canonical: boolean;
  source: string;
}

export interface Threat {
  mitigated_threat_id?: string;
  object_id?: string;
  threat_label_raw?: string;
  essence?: string;
  chapter_id?: string;
  category?: string | null;
  cwe?: string | null;
  cvss_score?: number | null;
  associated_controls: string[];
  mitigation_summary?: string;
  confidence?: number;
}

export interface PracticeAssignment {
  id: string;
  chapter_id: string;
  practice_id: string;
  role: string;
  phase: string;
  risk_level: string;
  action: string;
  artifacts: string[];
  user_story_id?: string;
}

export interface UserStory {
  id?: string;
  us_id?: string;
  title: string;
  chapter_id?: string;
  practice_id?: string;
  /** Canonical role IDs (from kg enrichment) */
  roles_normalized?: string[];
  /** Legacy alias kept for compatibility */
  related_roles?: string[];
  risk_levels?: string[];
  acceptance_criteria?: string;
  bdd?: string[];
  goal?: string;
  summary?: string;
}

export interface OntologyData {
  domainMapping: Record<string, string[]>;
  concernsMap: Record<string, string[]>;
  requirements: Requirement[];
  controls: Control[];
  roles: CanonicalRole[];
  threats: Threat[];
  assignments: PracticeAssignment[];
  userStories: UserStory[];
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _cache: OntologyData | undefined;

function loadJson<T>(filename: string): T {
  const path = resolveAppPath(`data/publish/${filename}`);
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

function loadOntologyYaml(): { domain_mapping: Record<string, string[]> } {
  const path = resolveAppPath("data/publish/sbdtoe-ontology.yaml");
  return parseYaml(readFileSync(path, "utf-8")) as { domain_mapping: Record<string, string[]> };
}

export function getOntologyData(): OntologyData {
  if (_cache) return _cache;

  // Ontology YAML — domain_mapping is the primary join key
  const ontology = loadOntologyYaml();
  const domainMapping: Record<string, string[]> = {};
  for (const [cat, domains] of Object.entries(ontology.domain_mapping ?? {})) {
    if (Array.isArray(domains)) domainMapping[cat] = domains.map(String);
  }

  // Concerns → categories (static, matches ontology spec)
  const concernsMap: Record<string, string[]> = {
    auth:         ["AUT", "ACC", "SES"],
    logging:      ["LOG"],
    validation:   ["VAL", "ERR"],
    api:          ["API"],
    config:       ["CFG"],
    integrity:    ["INT"],
    distribution: ["DST"],
    ide:          ["IDE"],
    requirements: ["REQ"],
    architecture: ["ARC"],
    iac:          ["IAC"],
    encryption:   ["ENC"],
  };

  // Requirements
  const reqRaw = loadJson<{ requirements: Requirement[] }>("canonical_requirements_s7.json");
  const requirements = reqRaw.requirements ?? [];

  // Controls
  const ctrlRaw = loadJson<{ items: Control[] }>("canonical_controls.json");
  const controls = ctrlRaw.items ?? [];

  // Canonical roles
  const rolesRaw = loadJson<{ items: CanonicalRole[] }>("canonical_roles_s5.json");
  const roles = rolesRaw.items ?? [];

  // Threats
  const threatsRaw = loadJson<{ items: Threat[] }>("mitigated_threats.json");
  const threats = threatsRaw.items ?? [];

  // Practice assignments
  const paRaw = loadJson<{ items: PracticeAssignment[] }>("practice_assignments.json");
  const assignments = paRaw.items ?? [];

  // User stories (enriched — has bdd + acceptance_criteria)
  const usRaw = loadJson<{ items: UserStory[] }>("lifecycle_user_stories.json");
  const userStories = usRaw.items ?? [];

  _cache = { domainMapping, concernsMap, requirements, controls, roles, threats, assignments, userStories };
  return _cache;
}

/** Resolve a role input string to a canonical role_id, using aliases. */
export function resolveRoleId(input: string, roles: CanonicalRole[]): string | undefined {
  const normalized = input.toLowerCase().replace(/[\s/]+/g, "-");
  return roles.find(
    (r) =>
      r.role_id === normalized ||
      r.aliases.some((a) => a.toLowerCase().replace(/[\s/]+/g, "-") === normalized)
  )?.role_id;
}
