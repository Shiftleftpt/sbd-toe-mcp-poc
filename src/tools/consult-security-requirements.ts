/**
 * consult_security_requirements
 *
 * Deterministic resolution of security requirements and controls for a given
 * application context, using the SbD-ToE ontology domain_mapping pipeline.
 *
 * Algorithm (from mcp_ontology_integration.md §4 — consult pipeline):
 *   1. Filter requirements by risk_level (applicable_levels[risk_level] === true)
 *   2. If concerns provided: intersect active categories with concern-mapped categories
 *   3. Collect active category set
 *   4. Map categories → domains via domain_mapping
 *   5. Select controls where control.domain ∈ active_domains
 *   6. Tag each control: "direct" if control.domain matches a requirement.domain (when set),
 *      "derived" otherwise (domain_mapping traversal)
 *
 * All data is read from data/publish/ — nothing is invented.
 */

import type { Control, Requirement } from "./ontology-loader.js";
import { getOntologyData } from "./ontology-loader.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(v);
}

export interface ControlWithConfidence extends Control {
  _confidence: "direct" | "derived";
}

export interface ConsultSecurityRequirementsResult {
  risk_level: string;
  activeCategories: string[];
  activeDomains: string[];
  requirements: Requirement[];
  controls: ControlWithConfidence[];
  meta: {
    requirementCount: number;
    controlCount: number;
    concernsApplied: string[] | null;
    note: string;
  };
}

// ---------------------------------------------------------------------------
// Internal (exported for testability)
// ---------------------------------------------------------------------------

export function _resolveConsultResult(
  args: Record<string, unknown>,
  ontologyData: ReturnType<typeof getOntologyData>
): ConsultSecurityRequirementsResult {
  const { domainMapping, concernsMap, requirements: allReqs, controls: allControls } = ontologyData;

  // Validate risk_level
  const riskLevelArg = args["risk_level"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw Object.assign(
      new Error(`Invalid risk_level: "${String(riskLevelArg)}". Allowed values: L1, L2, L3.`),
      { rpcError: { code: -32602, message: `Invalid risk_level: "${String(riskLevelArg)}"` } }
    );
  }
  const riskLevel: RiskLevel = riskLevelArg;

  // Parse optional concerns
  let concernsApplied: string[] | null = null;
  const concernsArg = args["concerns"];
  if (Array.isArray(concernsArg) && concernsArg.length > 0) {
    concernsApplied = concernsArg.filter((c): c is string => typeof c === "string");
  }

  // Step 1: filter requirements by risk level
  let filteredReqs = allReqs.filter(
    (r) => r.applicable_levels?.[riskLevel] === true
  );

  // Step 2: if concerns provided, intersect with concern-mapped categories
  if (concernsApplied && concernsApplied.length > 0) {
    const concernCategories = new Set<string>();
    for (const concern of concernsApplied) {
      const cats = concernsMap[concern] ?? [];
      for (const cat of cats) concernCategories.add(cat);
    }
    filteredReqs = filteredReqs.filter((r) => concernCategories.has(r.category));
  }

  // Step 3: collect active categories
  const activeCategories = [...new Set(filteredReqs.map((r) => r.category))].sort();

  // Step 4: map categories → domains
  const activeDomains = new Set<string>();
  for (const cat of activeCategories) {
    const domains = domainMapping[cat] ?? [];
    for (const d of domains) activeDomains.add(d);
  }

  // Collect categories that have a direct requirement→domain link (requirement.domain is set)
  const directDomains = new Set<string>(
    filteredReqs
      .map((r) => r.domain)
      .filter((d): d is string => typeof d === "string" && d.length > 0)
  );

  // Step 5: select controls by domain
  const controls: ControlWithConfidence[] = allControls
    .filter((c) => activeDomains.has(c.domain))
    .map((c) => ({
      ...c,
      _confidence: directDomains.has(c.domain) ? "direct" : "derived"
    }));

  return {
    risk_level: riskLevel,
    activeCategories,
    activeDomains: [...activeDomains].sort(),
    requirements: filteredReqs,
    controls,
    meta: {
      requirementCount: filteredReqs.length,
      controlCount: controls.length,
      concernsApplied,
      note:
        "Requirements and controls resolved deterministically from the SbD-ToE ontology. " +
        "domain_mapping is the sole traversal key (§10 constraint). " +
        "Control confidence: 'direct' = requirement.domain match; 'derived' = domain_mapping traversal."
    }
  };
}

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

export function handleConsultSecurityRequirements(
  args: Record<string, unknown>
): ConsultSecurityRequirementsResult {
  return _resolveConsultResult(args, getOntologyData());
}
