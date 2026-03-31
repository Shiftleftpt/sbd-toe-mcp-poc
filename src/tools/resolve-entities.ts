/**
 * resolve_entities
 *
 * Low-level entity resolver over the published SbD-ToE deterministic runtime
 * bundle. This is the generic structural fallback when the higher-level
 * consult/guide/threats tools are too opinionated for the query.
 */

import { getOntologyData } from "./ontology-loader.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface ComparisonOp {
  gte?: number;
  lte?: number;
  in?: unknown[];
}

function isComparisonOp(v: unknown): v is ComparisonOp {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.some((k) => k === "gte" || k === "lte" || k === "in");
}

export interface McpProvenance {
  content_type: "canonical" | "derived" | "inferred";
  produced_by: string;
  source_data: string;
  note: string;
}

export interface ResolveEntitiesResult {
  provenance: McpProvenance;
  record_type: string;
  entities: unknown[];
  total: number;
  limit: number;
  meta: {
    filtersApplied: Record<string, unknown>;
    note: string;
  };
}

type RuntimeRecordType =
  | "requirement"
  | "control"
  | "practice"
  | "assignment"
  | "user_story"
  | "role"
  | "phase"
  | "artifact"
  | "threat"
  | "evidence_pattern"
  | "signal"
  | "antipattern"
  | "requirement_control_link"
  | "signal_evidence_link"
  | "antipattern_requirement_link"
  | "antipattern_threat_link";

let _runtimeCache: unknown[] | undefined;

function withRecordType(record_type: RuntimeRecordType, items: unknown[]): unknown[] {
  return items.map((item) =>
    typeof item === "object" && item !== null
      ? { record_type, ...(item as Record<string, unknown>) }
      : item
  );
}

function loadRuntimeItems(): unknown[] {
  if (_runtimeCache) return _runtimeCache;

  const ontology = getOntologyData();
  const collections: Array<[RuntimeRecordType, unknown[]]> = [
    ["requirement", ontology.requirements],
    ["control", ontology.controls],
    ["practice", ontology.practices ?? []],
    ["assignment", ontology.assignments],
    ["user_story", ontology.userStories],
    ["role", ontology.roles],
    ["phase", ontology.phases ?? []],
    ["artifact", ontology.artifacts ?? []],
    ["threat", ontology.threats],
    ["evidence_pattern", ontology.evidencePatterns ?? []],
    ["signal", ontology.signals ?? []],
    ["antipattern", ontology.antipatterns ?? []],
    ["requirement_control_link", ontology.requirementControlLinks ?? []],
    ["signal_evidence_link", ontology.signalEvidenceLinks ?? []],
    ["antipattern_requirement_link", ontology.antipatternRequirementLinks ?? []],
    ["antipattern_threat_link", ontology.antipatternThreatLinks ?? []],
  ];

  _runtimeCache = collections.flatMap(([record_type, items]) =>
    withRecordType(record_type, items)
  );
  return _runtimeCache;
}

function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function matchesFilter(item: unknown, key: string, filterValue: unknown): boolean {
  const fieldVal = resolvePath(item, key);

  if (isComparisonOp(filterValue)) {
    if ("gte" in filterValue && filterValue.gte !== undefined) {
      const n = typeof fieldVal === "number" ? fieldVal : Number.NaN;
      if (Number.isNaN(n) || n < filterValue.gte) return false;
    }
    if ("lte" in filterValue && filterValue.lte !== undefined) {
      const n = typeof fieldVal === "number" ? fieldVal : Number.NaN;
      if (Number.isNaN(n) || n > filterValue.lte) return false;
    }
    if ("in" in filterValue && Array.isArray(filterValue.in)) {
      if (!filterValue.in.includes(fieldVal)) return false;
    }
    return true;
  }

  if (Array.isArray(fieldVal)) {
    return fieldVal.includes(filterValue);
  }

  return fieldVal === filterValue;
}

function matchesAllFilters(item: unknown, filters: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (!matchesFilter(item, key, value)) return false;
  }
  return true;
}

export function _resolveEntities(
  args: Record<string, unknown>,
  items: unknown[]
): Omit<ResolveEntitiesResult, "provenance"> {
  const recordType = args["record_type"];
  if (typeof recordType !== "string" || recordType.trim().length === 0) {
    throw Object.assign(
      new Error('Missing required parameter: "record_type".'),
      { rpcError: { code: -32602, message: 'Missing required parameter: "record_type".' } }
    );
  }

  const rawLimit = args["limit"];
  const limit =
    typeof rawLimit === "number" && rawLimit > 0
      ? Math.min(Math.round(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

  const rawFilters = args["filters"];
  const filters: Record<string, unknown> =
    typeof rawFilters === "object" && rawFilters !== null && !Array.isArray(rawFilters)
      ? (rawFilters as Record<string, unknown>)
      : {};

  const matched = items.filter((item) => {
    if (typeof item !== "object" || item === null) return false;
    const rt = (item as Record<string, unknown>)["record_type"];
    if (rt !== recordType) return false;
    return matchesAllFilters(item, filters);
  });

  const STRIP_FIELDS = new Set([
    "confidence",
    "warnings",
    "evidence",
    "record_type",
  ]);
  const ARRAY_CAP = 8;
  const entities = matched.slice(0, limit).map((item) => {
    if (typeof item !== "object" || item === null) return item;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      if (STRIP_FIELDS.has(key)) continue;
      if (value === null || (Array.isArray(value) && value.length === 0)) continue;
      out[key] = Array.isArray(value) && value.length > ARRAY_CAP ? value.slice(0, ARRAY_CAP) : value;
    }
    return out;
  });

  return {
    record_type: recordType,
    entities,
    total: matched.length,
    limit,
    meta: {
      filtersApplied: filters,
      note:
        "Entities resolved from the published deterministic runtime bundle. Filters support dot-notation for nested fields, {gte,lte} for numeric comparisons, {in:[...]} for membership and direct array membership checks.",
    },
  };
}

export function handleResolveEntities(
  args: Record<string, unknown>
): ResolveEntitiesResult {
  const result = _resolveEntities(args, loadRuntimeItems());
  return {
    provenance: {
      content_type: "canonical",
      produced_by: "direct_runtime_lookup",
      source_data: "data/publish/runtime/*.json",
      note: "Entities are canonical deterministic runtime records, projected only for response compactness.",
    },
    ...result,
  };
}
