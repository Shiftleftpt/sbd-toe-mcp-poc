/**
 * ontology-loader
 *
 * Loads and caches the SbD-ToE ontology and entity data from data/publish/.
 * Single source of truth for ontology-driven tools.
 *
 * As of kg v1.4.0, all entity types (including requirement and control) are
 * present in algolia_entities_records_enriched.json with normalised record_type.
 * The individual entity files (canonical_requirements_s7.json, etc.) are no
 * longer required.
 *
 * Files consumed:
 *   data/publish/sbdtoe-ontology.yaml              — domain_mapping, rules, pipelines
 *   data/publish/algolia_entities_records_enriched.json — all entity types by record_type
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
  domain: string;
  control_type: string;
  abstraction_level: string;
  applicable_lifecycle_phases: string[];
  /** Chapter slugs this control covers (e.g. ["06-desenvolvimento-seguro"]) */
  chapter_ids?: string[];
  description?: string;
}

export interface CanonicalRole {
  role_id: string;
  aliases: string[];
  canonical: boolean;
  source: string;
}

export interface Threat {
  id?: string;              // mitigated_threat_id (e.g. "MT-001")
  title?: string;           // human-readable threat name
  essence?: string;
  chapter_id?: string;
  mitigation_summary?: string;
  how_it_arises?: string;
  methodology?: string;     // e.g. "STRIDE"
  canonical_control_ids?: string[];  // direct control ID references (enriched index)
  // kept for backward compat with internal chapter matching
  mitigated_threat_id?: string;
  threat_label_raw?: string;
  associated_controls: string[];
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

function loadOntologyYaml(): { domain_mapping: Record<string, string[]> } {
  const path = resolveAppPath("data/publish/sbdtoe-ontology.yaml");
  return parseYaml(readFileSync(path, "utf-8")) as { domain_mapping: Record<string, string[]> };
}

function loadEnrichedEntities(): unknown[] {
  const path = resolveAppPath("data/publish/algolia_entities_records_enriched.json");
  const raw = JSON.parse(readFileSync(path, "utf-8")) as { items?: unknown[] };
  return Array.isArray(raw.items) ? raw.items : [];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strOf(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === "string" ? v : "";
}

function numOf(rec: Record<string, unknown>, key: string): number {
  const v = rec[key];
  return typeof v === "number" ? v : NaN;
}

function arrStr(rec: Record<string, unknown>, key: string): string[] {
  const v = rec[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function getOntologyData(): OntologyData {
  if (_cache) return _cache;

  // Ontology YAML — domain_mapping is the primary join key
  const ontology = loadOntologyYaml();
  const domainMapping: Record<string, string[]> = {};
  for (const [cat, domains] of Object.entries(ontology.domain_mapping ?? {})) {
    if (Array.isArray(domains)) domainMapping[cat] = domains.map(String);
  }

  // Concerns → categories (static, matches ontology spec §3.3)
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

  // Load all entities from the enriched index (kg v1.4.0+)
  const allItems = loadEnrichedEntities();

  const requirements: Requirement[] = [];
  const controls: Control[] = [];
  const roles: CanonicalRole[] = [];
  const threats: Threat[] = [];
  const assignments: PracticeAssignment[] = [];
  const userStories: UserStory[] = [];

  for (const item of allItems) {
    if (!isRecord(item)) continue;
    const rt = strOf(item, "record_type");

    if (rt === "requirement") {
      const levels = item["applicable_levels"];
      const rSrcFile = strOf(item, "source_file");
      requirements.push({
        requirement_id: strOf(item, "requirement_id"),
        type:           strOf(item, "type"),
        category:       strOf(item, "category"),
        name:           strOf(item, "name"),
        applicable_levels: isRecord(levels)
          ? { L1: levels["L1"] === true, L2: levels["L2"] === true, L3: levels["L3"] === true }
          : { L1: false, L2: false, L3: false },
        source_chapter: numOf(item, "source_chapter"),
        ...(rSrcFile ? { source_file: rSrcFile } : {}),
        domain:         typeof item["domain"] === "string" ? item["domain"] : null,
      });
      continue;
    }

    if (rt === "control") {
      const cDesc = strOf(item, "description");
      controls.push({
        control_id:                  strOf(item, "control_id"),
        name:                        strOf(item, "name"),
        domain:                      strOf(item, "domain"),
        control_type:                strOf(item, "control_type"),
        abstraction_level:           strOf(item, "abstraction_level"),
        applicable_lifecycle_phases: arrStr(item, "applicable_lifecycle_phases"),
        chapter_ids:                 arrStr(item, "chapter_ids"),
        ...(cDesc ? { description: cDesc } : {}),
      });
      continue;
    }

    if (rt === "role") {
      // entity_id is the canonical role identifier in the enriched index
      const entityId = strOf(item, "entity_id");
      if (!entityId) continue;
      roles.push({
        role_id:   entityId,
        aliases:   arrStr(item, "aliases"),
        canonical: true,
        source:    strOf(item, "source_document_id"),
      });
      continue;
    }

    if (rt === "threat") {
      // Canonical ID: prefer "id" (MT-001), fall back to mitigated_threat_id
      const tId     = strOf(item, "id") || strOf(item, "mitigated_threat_id");
      // Title: use "title" field (enriched index), no threat_label_raw in v1.4.0+
      const tTitle  = strOf(item, "title") || strOf(item, "threat_label_raw");
      const tEss    = strOf(item, "essence");
      const tChId   = strOf(item, "chapter_id");
      const tMitSum = strOf(item, "mitigation_summary");
      const tHow    = strOf(item, "how_it_arises");
      const tMeth   = strOf(item, "methodology");
      threats.push({
        ...(tId     ? { id: tId, mitigated_threat_id: tId } : {}),
        ...(tTitle  ? { title: tTitle, threat_label_raw: tTitle } : {}),
        ...(tEss    ? { essence: tEss }          : {}),
        ...(tChId   ? { chapter_id: tChId }      : {}),
        ...(tMitSum ? { mitigation_summary: tMitSum } : {}),
        ...(tHow    ? { how_it_arises: tHow }    : {}),
        ...(tMeth   ? { methodology: tMeth }     : {}),
        canonical_control_ids: arrStr(item, "canonical_control_ids"),
        associated_controls:   arrStr(item, "associated_controls"),
      });
      continue;
    }

    if (rt === "assignment") {
      assignments.push({
        id:           strOf(item, "id"),
        chapter_id:   strOf(item, "chapter_id"),
        practice_id:  strOf(item, "practice_id"),
        role:         strOf(item, "role"),
        phase:        strOf(item, "phase"),
        risk_level:   strOf(item, "risk_level"),
        action:       strOf(item, "action"),
        artifacts:    arrStr(item, "artifacts"),
        ...(strOf(item, "user_story_id") ? { user_story_id: strOf(item, "user_story_id") } : {}),
      });
      continue;
    }

    if (rt === "user_story") {
      const usId    = strOf(item, "id");
      const usUsId  = strOf(item, "us_id");
      const usChId  = strOf(item, "chapter_id");
      const usPrId  = strOf(item, "practice_id");
      const usAc    = strOf(item, "acceptance_criteria");
      const usGoal  = strOf(item, "goal");
      const usSumm  = strOf(item, "summary");
      userStories.push({
        ...(usId   ? { id: usId }                         : {}),
        ...(usUsId ? { us_id: usUsId }                    : {}),
        title:               strOf(item, "title"),
        ...(usChId ? { chapter_id: usChId }               : {}),
        ...(usPrId ? { practice_id: usPrId }              : {}),
        roles_normalized:    arrStr(item, "roles_normalized"),
        risk_levels:         arrStr(item, "risk_levels"),
        ...(usAc   ? { acceptance_criteria: usAc }        : {}),
        bdd:                 arrStr(item, "bdd"),
        ...(usGoal ? { goal: usGoal }                     : {}),
        ...(usSumm ? { summary: usSumm }                  : {}),
      });
      continue;
    }
  }

  _cache = { domainMapping, concernsMap, requirements, controls, roles, threats, assignments, userStories };
  return _cache;
}

/** Resolve a role input string to a canonical role_id, using aliases. */
export function resolveRoleId(input: string, roles: CanonicalRole[]): string | undefined {
  const normalized = input.toLowerCase().replace(/[\s/]+/g, "-");
  return roles.find(
    (r) =>
      r.role_id === normalized ||
      r.role_id.replace(/_/g, "-") === normalized ||
      r.aliases.some((a) => a.toLowerCase().replace(/[\s/]+/g, "-") === normalized)
  )?.role_id;
}
