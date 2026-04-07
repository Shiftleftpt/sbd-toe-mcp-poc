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
import { getOntologyData } from "./ontology-loader.js";

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

export interface ConsultSecurityRequirementsResult {
  risk_level: string;
  active_categories: string[];
  active_domains: string[];
  requirements: Requirement[];
  controls: ControlWithConfidence[];
  artifacts: ArtifactWithCoverage[];
  rule_trace: string[];
  meta: {
    requirementCount: number;
    controlCount: number;
    artifactCount: number;
    concernsApplied: string[] | null;
    note: string;
  };
}

export interface McpProvenance {
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

export interface ConsultSecurityRequirementsOutput {
  provenance: McpProvenance;
  risk_level: string;
  active_categories: string[];
  active_domains: string[];
  requirements: RequirementSlim[];
  controls: ControlSlim[];
  artifacts: ArtifactSlim[];
  rule_trace: string[];
  meta: {
    requirementCount: number;
    controlCount: number;
    artifactCount: number;
    concernsApplied: string[] | null;
    note: string;
  };
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

  if (concernsApplied && concernsApplied.length > 0) {
    const concernCategories = new Set<string>();
    for (const concern of concernsApplied) {
      const categories = concernsMap[concern] ?? [];
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

  const rule_trace: string[] = [];
  rule_trace.push(
    `REQUIREMENT_APPLIES_BY_RISK(risk_level=${riskLevel}): ${filteredRequirements.length} requirements active`
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
      `CONCERNS_FILTER_REQUIREMENTS(concerns=[${concernsApplied.join(",")}]): intersected with risk-level filter`
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
    meta: {
      requirementCount: filteredRequirements.length,
      controlCount: controls.length,
      artifactCount: artifacts.length,
      concernsApplied,
      note:
        "Requirements are canonical SbD-ToE entities. Controls resolve primarily via requirement_control_links " +
        "and secondarily via ontology domain_mapping. Artifacts resolve from artifact_requirements and control artifact types.",
    },
  };
}

export function handleConsultSecurityRequirements(
  args: Record<string, unknown>
): ConsultSecurityRequirementsOutput {
  const full = _resolveConsultResult(args, getOntologyData());
  return {
    provenance: {
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
    meta: full.meta,
  };
}
