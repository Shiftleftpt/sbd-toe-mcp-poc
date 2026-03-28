/**
 * resolve_entities
 *
 * Low-level entity resolver over the SbD-ToE enriched entities index.
 * Allows agents to formulate arbitrary queries not covered by the high-level
 * pipeline tools (consult_security_requirements, get_threat_landscape,
 * get_guide_by_role).
 *
 * Source: data/publish/algolia_entities_records_enriched.json (kg v1.4.0+)
 * Filter syntax: dot-notation for nested fields, comparison operators for
 * numeric ranges, array membership checks for array fields.
 *
 * All data is read from the published artefacts — nothing is invented.
 */

import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Comparison operator object for numeric or set filters */
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

export interface ResolveEntitiesResult {
  record_type: string;
  entities: unknown[];
  total: number;
  limit: number;
  meta: {
    filtersApplied: Record<string, unknown>;
    note: string;
  };
}

// ---------------------------------------------------------------------------
// Enriched index cache (independent of getOntologyData — raw records)
// ---------------------------------------------------------------------------

let _enrichedCache: unknown[] | undefined;

function loadEnrichedItems(): unknown[] {
  if (_enrichedCache) return _enrichedCache;
  const path = resolveAppPath("data/publish/algolia_entities_records_enriched.json");
  const raw = JSON.parse(readFileSync(path, "utf-8")) as { items?: unknown[] };
  _enrichedCache = Array.isArray(raw.items) ? raw.items : [];
  return _enrichedCache;
}

// ---------------------------------------------------------------------------
// Filter engine
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-notation path against an object.
 * E.g. "applicable_levels.L2" → obj.applicable_levels.L2
 */
function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/**
 * Match a single filter entry against a field value.
 * Supports:
 *   - Comparison ops: { gte, lte } for numbers; { in: [...] } for set membership
 *   - Array fields: checks if value is IN the array
 *   - Direct equality
 */
function matchesFilter(item: unknown, key: string, filterValue: unknown): boolean {
  const fieldVal = resolvePath(item, key);

  if (isComparisonOp(filterValue)) {
    if ("gte" in filterValue && filterValue.gte !== undefined) {
      const n = typeof fieldVal === "number" ? fieldVal : NaN;
      if (isNaN(n) || n < filterValue.gte) return false;
    }
    if ("lte" in filterValue && filterValue.lte !== undefined) {
      const n = typeof fieldVal === "number" ? fieldVal : NaN;
      if (isNaN(n) || n > filterValue.lte) return false;
    }
    if ("in" in filterValue && Array.isArray(filterValue.in)) {
      if (!filterValue.in.includes(fieldVal)) return false;
    }
    return true;
  }

  // Array field: check if filterValue is a member of the array
  if (Array.isArray(fieldVal)) {
    return fieldVal.includes(filterValue);
  }

  // Direct equality
  return fieldVal === filterValue;
}

function matchesAllFilters(item: unknown, filters: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (!matchesFilter(item, key, value)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Internal (exported for testability)
// ---------------------------------------------------------------------------

export function _resolveEntities(
  args: Record<string, unknown>,
  items: unknown[]
): ResolveEntitiesResult {
  const recordType = args["record_type"];
  if (typeof recordType !== "string" || recordType.trim().length === 0) {
    throw Object.assign(
      new Error('Missing required parameter: "record_type".'),
      { rpcError: { code: -32602, message: 'Missing required parameter: "record_type".' } }
    );
  }

  const rawLimit = args["limit"];
  const limit = typeof rawLimit === "number" && rawLimit > 0
    ? Math.min(Math.round(rawLimit), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const rawFilters = args["filters"];
  const filters: Record<string, unknown> =
    typeof rawFilters === "object" && rawFilters !== null && !Array.isArray(rawFilters)
      ? (rawFilters as Record<string, unknown>)
      : {};

  // Filter by record_type first, then apply additional filters
  const matched = items.filter((item) => {
    if (typeof item !== "object" || item === null) return false;
    const rt = (item as Record<string, unknown>)["record_type"];
    if (rt !== recordType) return false;
    return matchesAllFilters(item, filters);
  });

  return {
    record_type: recordType,
    entities: matched.slice(0, limit),
    total: matched.length,
    limit,
    meta: {
      filtersApplied: filters,
      note:
        "Entities resolved from algolia_entities_records_enriched.json (kg v1.4.0+). " +
        "Filters: dot-notation for nested fields (e.g. applicable_levels.L2), " +
        "comparison ops: {gte, lte} for numbers, {in: [...]} for set membership, " +
        "array fields: checks if value is a member of the array. " +
        "Excluded record_types: ImplementationRule, EvidencePattern (source_file: null — §10 constraint)."
    }
  };
}

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

export function handleResolveEntities(
  args: Record<string, unknown>
): ResolveEntitiesResult {
  return _resolveEntities(args, loadEnrichedItems());
}
