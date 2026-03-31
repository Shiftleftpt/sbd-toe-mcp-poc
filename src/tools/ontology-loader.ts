/**
 * ontology-loader
 *
 * Loads and caches the published SbD-ToE deterministic runtime bundle.
 *
 * Runtime contract:
 *   data/publish/sbdtoe-ontology.yaml
 *   data/publish/runtime/deterministic_manifest.json
 *   data/publish/runtime/*.json
 *
 * Structured tools must resolve normative data from this bundle, not from
 * retrieval artefacts such as mcp_chunks or vector_chunks.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { resolveAppPath } from "../config.js";

export interface Requirement {
  requirement_id: string;
  type: string;
  category: string;
  name: string;
  description?: string;
  applicable_levels: { L1: boolean; L2: boolean; L3: boolean };
  source_chapter: number;
  source_file?: string;
  source_bundle?: string;
  domain?: string | null;
  evidence_types?: string[];
}

export interface Control {
  control_id: string;
  name: string;
  domain: string;
  control_type: string;
  abstraction_level: string;
  applicable_lifecycle_phases: string[];
  chapter_ids?: string[];
  description?: string;
  source_practice_ids?: string[];
  artifact_types?: string[];
}

export interface CanonicalRole {
  role_id: string;
  aliases: string[];
  canonical: boolean;
  source: string;
}

export interface CanonicalPhase {
  phase_id: string;
  label: string;
  aliases: string[];
  canonical: boolean;
  source: string;
}

export interface Threat {
  id?: string;
  title?: string;
  essence?: string;
  chapter_id?: string;
  mitigation_summary?: string;
  how_it_arises?: string;
  methodology?: string;
  canonical_control_ids?: string[];
  mitigated_threat_id?: string;
  threat_label_raw?: string;
  associated_controls: string[];
}

export interface Practice {
  id: string;
  chapter_id: string;
  label: string;
  normalized_label?: string;
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
  roles_normalized?: string[];
  related_roles?: string[];
  risk_levels?: string[];
  acceptance_criteria?: string;
  bdd?: string[];
  goal?: string;
  summary?: string;
  document_path?: string;
}

export interface Artifact {
  artifact_type_id: string;
  name: string;
  canonical_aliases?: string[];
  category?: string;
  lifecycle_phases: string[];
  produced_by_controls: string[];
  validated_by_controls: string[];
}

export interface ArtifactRequirement {
  artifact_type_id: string;
  requirement_id: string;
  source_control_ids: string[];
  source_practice_ids: string[];
  mandatory: boolean;
  chapter_ids?: string[];
  description?: string;
}

export interface EvidencePattern {
  id: string;
  maps_to_control_id: string;
  maps_to_requirement_id: string;
  evidence_expectation?: string;
  verification_logic?: string;
  expected_artifact_type_ids: string[];
}

export interface RequirementControlLink {
  source_id: string;
  target_id: string;
  link_type: string;
  confidence?: number;
}

export interface Signal {
  signal_id: string;
  label: string;
  bundle_ids: string[];
}

export interface SignalEvidenceLink {
  source_id: string;
  target_id: string;
  target_source_basis?: string;
}

export interface AntiPattern {
  antipattern_id: string;
  label: string;
  bundle_ids: string[];
  risk?: string;
}

export interface AntiPatternRequirementLink {
  source_id: string;
  target_id: string;
}

export interface AntiPatternThreatLink {
  source_id: string;
  target_id: string;
  target_chapter_id?: string;
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
  practices?: Practice[];
  phases?: CanonicalPhase[];
  artifacts?: Artifact[];
  artifactRequirements?: ArtifactRequirement[];
  evidencePatterns?: EvidencePattern[];
  requirementControlLinks?: RequirementControlLink[];
  signals?: Signal[];
  signalEvidenceLinks?: SignalEvidenceLink[];
  antipatterns?: AntiPattern[];
  antipatternRequirementLinks?: AntiPatternRequirementLink[];
  antipatternThreatLinks?: AntiPatternThreatLink[];
}

interface RuntimeArtifactEnvelope {
  items?: unknown[];
}

let _cache: OntologyData | undefined;

function loadOntologyYaml(): { domain_mapping?: Record<string, unknown> } {
  const path = resolveAppPath("data/publish/sbdtoe-ontology.yaml");
  return parseYaml(readFileSync(path, "utf-8")) as { domain_mapping?: Record<string, unknown> };
}

function loadRuntimeItems(relativePath: string): unknown[] {
  const path = resolveAppPath(relativePath);
  const envelope = JSON.parse(readFileSync(path, "utf-8")) as RuntimeArtifactEnvelope;
  return Array.isArray(envelope.items) ? envelope.items : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strOf(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function numOf(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" ? value : NaN;
}

function boolOf(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function arrStr(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeKey(value: string): string {
  return value.toLowerCase().trim().replace(/[\s/]+/g, "-").replace(/_/g, "-");
}

function chapterNumber(chapterId: string): number {
  const match = /^(\d+)/.exec(chapterId);
  return match?.[1] !== undefined ? Number.parseInt(match[1], 10) : NaN;
}

export function resolveRoleId(input: string, roles: CanonicalRole[]): string | undefined {
  const normalized = normalizeKey(input);
  return roles.find(
    (role) =>
      normalizeKey(role.role_id) === normalized ||
      role.aliases.some((alias) => normalizeKey(alias) === normalized)
  )?.role_id;
}

export function resolvePhaseId(input: string, phases: CanonicalPhase[]): string | undefined {
  const normalized = normalizeKey(input);
  return phases.find(
    (phase) =>
      normalizeKey(phase.phase_id) === normalized ||
      normalizeKey(phase.label) === normalized ||
      phase.aliases.some((alias) => normalizeKey(alias) === normalized)
  )?.phase_id;
}

export function getOntologyData(): OntologyData {
  if (_cache) return _cache;

  const ontology = loadOntologyYaml();
  const domainMapping: Record<string, string[]> = {};
  for (const [category, domains] of Object.entries(ontology.domain_mapping ?? {})) {
    if (Array.isArray(domains)) {
      domainMapping[category] = domains.filter((item): item is string => typeof item === "string");
    }
  }

  const concernsMap: Record<string, string[]> = {
    auth: ["AUT", "ACC", "SES"],
    logging: ["LOG"],
    validation: ["VAL", "ERR"],
    api: ["API"],
    config: ["CFG"],
    integrity: ["INT"],
    distribution: ["DST"],
    ide: ["IDE"],
    requirements: ["REQ"],
    architecture: ["ARC"],
    iac: ["IAC"],
    encryption: ["ENC"],
  };

  const requirements: Requirement[] = loadRuntimeItems("data/publish/runtime/requirements.json")
    .filter(isRecord)
    .map((item) => {
      const levels = isRecord(item.applicable_levels) ? item.applicable_levels : {};
      return {
        requirement_id: strOf(item, "requirement_id"),
        type: strOf(item, "type"),
        category: strOf(item, "category"),
        name: strOf(item, "name"),
        ...(strOf(item, "description") ? { description: strOf(item, "description") } : {}),
        applicable_levels: {
          L1: boolOf(levels, "L1"),
          L2: boolOf(levels, "L2"),
          L3: boolOf(levels, "L3"),
        },
        source_chapter: numOf(item, "source_chapter"),
        ...(strOf(item, "source_file") ? { source_file: strOf(item, "source_file") } : {}),
        ...(strOf(item, "source_bundle") ? { source_bundle: strOf(item, "source_bundle") } : {}),
        domain: typeof item.domain === "string" ? item.domain : null,
        evidence_types: arrStr(item, "evidence_types"),
      };
    })
    .filter((item) => item.requirement_id.length > 0);

  const controls: Control[] = loadRuntimeItems("data/publish/runtime/controls.json")
    .filter(isRecord)
    .map((item) => ({
      control_id: strOf(item, "control_id"),
      name: strOf(item, "name"),
      domain: strOf(item, "domain"),
      control_type: strOf(item, "control_type"),
      abstraction_level: strOf(item, "abstraction_level"),
      applicable_lifecycle_phases: arrStr(item, "applicable_lifecycle_phases"),
      chapter_ids: arrStr(item, "chapter_ids"),
      ...(strOf(item, "description") ? { description: strOf(item, "description") } : {}),
      source_practice_ids: arrStr(item, "source_practice_ids"),
      artifact_types: arrStr(item, "artifact_types"),
    }))
    .filter((item) => item.control_id.length > 0);

  const practices: Practice[] = loadRuntimeItems("data/publish/runtime/practices.json")
    .filter(isRecord)
    .map((item) => ({
      id: strOf(item, "id"),
      chapter_id: strOf(item, "chapter_id"),
      label: strOf(item, "label"),
      ...(strOf(item, "normalized_label")
        ? { normalized_label: strOf(item, "normalized_label") }
        : {}),
    }))
    .filter((item) => item.id.length > 0);

  const assignments: PracticeAssignment[] = loadRuntimeItems("data/publish/runtime/assignments.json")
    .filter(isRecord)
    .map((item) => ({
      id: strOf(item, "id"),
      chapter_id: strOf(item, "chapter_id"),
      practice_id: strOf(item, "practice_id"),
      role: strOf(item, "role"),
      phase: strOf(item, "phase"),
      risk_level: strOf(item, "risk_level"),
      action: strOf(item, "action"),
      artifacts: arrStr(item, "artifacts"),
      ...(strOf(item, "user_story_id") ? { user_story_id: strOf(item, "user_story_id") } : {}),
    }))
    .filter((item) => item.id.length > 0);

  const userStories: UserStory[] = loadRuntimeItems("data/publish/runtime/user_stories.json")
    .filter(isRecord)
    .map((item) => ({
      ...(strOf(item, "id") ? { id: strOf(item, "id") } : {}),
      ...(strOf(item, "us_id") ? { us_id: strOf(item, "us_id") } : {}),
      title: strOf(item, "title"),
      ...(strOf(item, "chapter_id") ? { chapter_id: strOf(item, "chapter_id") } : {}),
      ...(strOf(item, "practice_id") ? { practice_id: strOf(item, "practice_id") } : {}),
      roles_normalized: arrStr(item, "roles_normalized"),
      related_roles: arrStr(item, "related_roles"),
      risk_levels: arrStr(item, "risk_levels"),
      ...(strOf(item, "acceptance_criteria")
        ? { acceptance_criteria: strOf(item, "acceptance_criteria") }
        : {}),
      bdd: arrStr(item, "bdd"),
      ...(strOf(item, "goal") ? { goal: strOf(item, "goal") } : {}),
      ...(strOf(item, "summary") ? { summary: strOf(item, "summary") } : {}),
      ...(strOf(item, "document_path") ? { document_path: strOf(item, "document_path") } : {}),
    }))
    .filter((item) => item.title.length > 0);

  const roles: CanonicalRole[] = loadRuntimeItems("data/publish/runtime/roles.json")
    .filter(isRecord)
    .map((item) => ({
      role_id: strOf(item, "role_id"),
      aliases: arrStr(item, "aliases"),
      canonical: item.canonical !== false,
      source: strOf(item, "source"),
    }))
    .filter((item) => item.role_id.length > 0);

  const phases: CanonicalPhase[] = loadRuntimeItems("data/publish/runtime/phases.json")
    .filter(isRecord)
    .map((item) => ({
      phase_id: strOf(item, "phase_id"),
      label: strOf(item, "label"),
      aliases: arrStr(item, "aliases"),
      canonical: item.canonical !== false,
      source: strOf(item, "source"),
    }))
    .filter((item) => item.phase_id.length > 0);

  const artifacts: Artifact[] = loadRuntimeItems("data/publish/runtime/artifacts.json")
    .filter(isRecord)
    .map((item) => ({
      artifact_type_id: strOf(item, "artifact_type_id"),
      name: strOf(item, "name"),
      canonical_aliases: arrStr(item, "canonical_aliases"),
      ...(strOf(item, "category") ? { category: strOf(item, "category") } : {}),
      lifecycle_phases: arrStr(item, "lifecycle_phases"),
      produced_by_controls: arrStr(item, "produced_by_controls"),
      validated_by_controls: arrStr(item, "validated_by_controls"),
    }))
    .filter((item) => item.artifact_type_id.length > 0);

  const artifactRequirements: ArtifactRequirement[] = loadRuntimeItems("data/publish/runtime/artifact_requirements.json")
    .filter(isRecord)
    .map((item) => ({
      artifact_type_id: strOf(item, "artifact_type_id"),
      requirement_id: strOf(item, "requirement_id"),
      source_control_ids: arrStr(item, "source_control_ids"),
      source_practice_ids: arrStr(item, "source_practice_ids"),
      mandatory: item.mandatory === true,
      chapter_ids: arrStr(item, "chapter_ids"),
      ...(strOf(item, "description") ? { description: strOf(item, "description") } : {}),
    }))
    .filter((item) => item.artifact_type_id.length > 0 && item.requirement_id.length > 0);

  const threats: Threat[] = loadRuntimeItems("data/publish/runtime/threats.json")
    .filter(isRecord)
    .map((item) => {
      const id = strOf(item, "mitigated_threat_id");
      const title = strOf(item, "threat_label_raw");
      return {
        ...(id ? { id, mitigated_threat_id: id } : {}),
        ...(title ? { title, threat_label_raw: title } : {}),
        ...(strOf(item, "essence") ? { essence: strOf(item, "essence") } : {}),
        ...(strOf(item, "chapter_id") ? { chapter_id: strOf(item, "chapter_id") } : {}),
        ...(strOf(item, "mitigation_summary")
          ? { mitigation_summary: strOf(item, "mitigation_summary") }
          : {}),
        ...(strOf(item, "how_it_arises") ? { how_it_arises: strOf(item, "how_it_arises") } : {}),
        ...(strOf(item, "methodology") ? { methodology: strOf(item, "methodology") } : {}),
        canonical_control_ids: arrStr(item, "canonical_control_ids"),
        associated_controls: arrStr(item, "associated_controls"),
      };
    })
    .filter((item) => item.id || item.mitigated_threat_id);

  const evidencePatterns: EvidencePattern[] = loadRuntimeItems("data/publish/runtime/evidence_patterns.json")
    .filter(isRecord)
    .map((item) => ({
      id: strOf(item, "id"),
      maps_to_control_id: strOf(item, "maps_to_control_id"),
      maps_to_requirement_id: strOf(item, "maps_to_requirement_id"),
      ...(strOf(item, "evidence_expectation")
        ? { evidence_expectation: strOf(item, "evidence_expectation") }
        : {}),
      ...(strOf(item, "verification_logic")
        ? { verification_logic: strOf(item, "verification_logic") }
        : {}),
      expected_artifact_type_ids: arrStr(item, "expected_artifact_type_ids"),
    }))
    .filter((item) => item.id.length > 0);

  const requirementControlLinks: RequirementControlLink[] = loadRuntimeItems("data/publish/runtime/requirement_control_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
      link_type: strOf(item, "link_type"),
      ...(typeof item.confidence === "number" ? { confidence: item.confidence } : {}),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  const signals: Signal[] = loadRuntimeItems("data/publish/runtime/signals.json")
    .filter(isRecord)
    .map((item) => ({
      signal_id: strOf(item, "signal_id") || strOf(item, "entity_id"),
      label: strOf(item, "label"),
      bundle_ids: arrStr(item, "bundle_ids"),
    }))
    .filter((item) => item.signal_id.length > 0);

  const signalEvidenceLinks: SignalEvidenceLink[] = loadRuntimeItems("data/publish/runtime/signal_evidence_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
      ...(strOf(item, "target_source_basis")
        ? { target_source_basis: strOf(item, "target_source_basis") }
        : {}),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  const antipatterns: AntiPattern[] = loadRuntimeItems("data/publish/runtime/antipatterns.json")
    .filter(isRecord)
    .map((item) => ({
      antipattern_id: strOf(item, "antipattern_id") || strOf(item, "entity_id"),
      label: strOf(item, "label"),
      bundle_ids: arrStr(item, "bundle_ids"),
      ...(strOf(item, "risk") ? { risk: strOf(item, "risk") } : {}),
    }))
    .filter((item) => item.antipattern_id.length > 0);

  const antipatternRequirementLinks: AntiPatternRequirementLink[] = loadRuntimeItems("data/publish/runtime/antipattern_requirement_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  const antipatternThreatLinks: AntiPatternThreatLink[] = loadRuntimeItems("data/publish/runtime/antipattern_threat_links.json")
    .filter(isRecord)
    .map((item) => ({
      source_id: strOf(item, "source_id"),
      target_id: strOf(item, "target_id"),
      ...(strOf(item, "target_chapter_id")
        ? { target_chapter_id: strOf(item, "target_chapter_id") }
        : {}),
    }))
    .filter((item) => item.source_id.length > 0 && item.target_id.length > 0);

  _cache = {
    domainMapping,
    concernsMap,
    requirements,
    controls,
    roles,
    threats,
    assignments,
    userStories,
    practices,
    phases,
    artifacts,
    artifactRequirements,
    evidencePatterns,
    requirementControlLinks,
    signals,
    signalEvidenceLinks,
    antipatterns,
    antipatternRequirementLinks,
    antipatternThreatLinks,
  };

  return _cache;
}

export function resolveRequirementBundle(requirement: Requirement): string | undefined {
  if (requirement.source_bundle && requirement.source_bundle.length > 0) {
    return requirement.source_bundle;
  }

  if (requirement.source_file) {
    const [bundle] = requirement.source_file.split("/", 1);
    if (bundle) return bundle;
  }

  if (!Number.isNaN(requirement.source_chapter)) {
    const padded = String(requirement.source_chapter).padStart(2, "0");
    return `${padded}-unknown`;
  }

  return undefined;
}

export function resolveThreatChapterNumber(threat: Threat): number {
  return typeof threat.chapter_id === "string" ? chapterNumber(threat.chapter_id) : NaN;
}
