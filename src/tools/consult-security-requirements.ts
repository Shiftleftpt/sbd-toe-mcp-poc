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

import type { Requirement } from "./ontology-loader.js";
import { getOntologyData } from "./ontology-loader.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(v: unknown): v is RiskLevel {
  return typeof v === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(v);
}

/** Slim requirement — only fields needed by the agent in output */
export interface RequirementSlim {
  requirement_id: string;
  name: string;
  category: string;
  type: string;
}

/** Slim control — only fields needed by the agent in output */
export interface ControlSlim {
  control_id: string;
  name: string;
  domain: string;
  control_type: string;
  applicable_lifecycle_phases: string[];
  chapter_ids?: string[];
  _confidence: "direct" | "derived";
}

/** Internal full type — keeps source_chapter for threat pipeline */
export interface ControlWithConfidence {
  control_id: string;
  name: string;
  domain: string;
  control_type: string;
  abstraction_level: string;
  applicable_lifecycle_phases: string[];
  chapter_ids?: string[];
  description?: string;
  _confidence: "direct" | "derived";
}

export interface ConsultSecurityRequirementsResult {
  risk_level: string;
  active_categories: string[];
  active_domains: string[];
  requirements: Requirement[];
  controls: ControlWithConfidence[];
  rule_trace: string[];
  meta: {
    requirementCount: number;
    controlCount: number;
    concernsApplied: string[] | null;
    note: string;
  };
}

/** Lean public result — safe for agent context windows */
export interface ConsultSecurityRequirementsOutput {
  risk_level: string;
  active_categories: string[];
  active_domains: string[];
  requirements: RequirementSlim[];
  controls: ControlSlim[];
  rule_trace: string[];
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
  const active_categories = [...new Set(filteredReqs.map((r) => r.category))].sort();

  // Step 4: map categories → domains
  const activeDomainsSet = new Set<string>();
  for (const cat of active_categories) {
    const domains = domainMapping[cat] ?? [];
    for (const d of domains) activeDomainsSet.add(d);
  }
  const active_domains = [...activeDomainsSet].sort();

  // Collect categories that have a direct requirement→domain link (requirement.domain is set)
  const directDomains = new Set<string>(
    filteredReqs
      .map((r) => r.domain)
      .filter((d): d is string => typeof d === "string" && d.length > 0)
  );

  // Step 5: select controls by domain
  const controls: ControlWithConfidence[] = allControls
    .filter((c) => activeDomainsSet.has(c.domain))
    .map((c) => ({
      ...c,
      _confidence: directDomains.has(c.domain) ? "direct" : "derived"
    }));

  // Build rule_trace — which inference rules fired (§5, mcp_ontology_integration.md)
  const rule_trace: string[] = [];
  // Priority 100 — always fires when risk_level is provided
  rule_trace.push(`REQUIREMENT_APPLIES_BY_RISK(risk_level=${riskLevel}): ${filteredReqs.length} requirements active`);
  // Priority 95 — fires when any requirement has a direct domain link
  if (directDomains.size > 0) {
    rule_trace.push(`CONTROL_ACTIVE_DIRECT_LINK: ${directDomains.size} direct domain(s) found → confidence=direct`);
  }
  // Priority 90 — fires when there are active categories to derive domains from
  if (active_categories.length > 0) {
    rule_trace.push(`CONTROL_ACTIVE_BY_DOMAIN: ${active_categories.length} categories → ${activeDomainsSet.size} domains → ${controls.length} controls`);
  }
  // Priority 60, restrictive — fires when concerns narrowing was applied
  if (concernsApplied && concernsApplied.length > 0) {
    rule_trace.push(`CONCERNS_FILTER_REQUIREMENTS(concerns=[${concernsApplied.join(",")}]): intersected with risk-level filter`);
  }

  return {
    risk_level: riskLevel,
    active_categories,
    active_domains,
    requirements: filteredReqs,
    controls,
    rule_trace,
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
// Public handler — returns slim projection to stay within agent context limits
// ---------------------------------------------------------------------------

export function handleConsultSecurityRequirements(
  args: Record<string, unknown>
): ConsultSecurityRequirementsOutput {
  const full = _resolveConsultResult(args, getOntologyData());
  return {
    risk_level: full.risk_level,
    active_categories: full.active_categories,
    active_domains: full.active_domains,
    requirements: full.requirements.map((r) => ({
      requirement_id: r.requirement_id,
      name: r.name,
      category: r.category,
      type: r.type,
    })),
    controls: full.controls.map((c) => ({
      control_id: c.control_id,
      name: c.name,
      domain: c.domain,
      control_type: c.control_type,
      applicable_lifecycle_phases: c.applicable_lifecycle_phases,
      ...(c.chapter_ids ? { chapter_ids: c.chapter_ids } : {}),
      _confidence: c._confidence,
    })),
    rule_trace: full.rule_trace,
    meta: full.meta,
  };
}
