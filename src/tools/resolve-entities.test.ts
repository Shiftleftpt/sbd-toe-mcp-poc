import { describe, it, expect } from "vitest";
import { _resolveEntities } from "./resolve-entities.js";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const ITEMS: unknown[] = [
  { record_type: "requirement", requirement_id: "AUT-001", category: "AUT", applicable_levels: { L1: false, L2: true, L3: true }, source_chapter: 2, cvss_score: null },
  { record_type: "requirement", requirement_id: "LOG-001", category: "LOG", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 2 },
  { record_type: "requirement", requirement_id: "VAL-001", category: "VAL", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 6 },
  { record_type: "control",     control_id: "CTRL-001", domain: "identity",      chapter_ids: ["02-requisitos"] },
  { record_type: "control",     control_id: "CTRL-002", domain: "monitoring",    chapter_ids: ["12-monit"] },
  { record_type: "threat",      mitigated_threat_id: "MT-001", chapter_id: "02", cvss_score: 8.5 },
  { record_type: "threat",      mitigated_threat_id: "MT-002", chapter_id: "06", cvss_score: 3.0 },
  { record_type: "role",        entity_id: "developer", aliases: ["dev", "Dev"] },
  { record_type: "role",        entity_id: "appsec",    aliases: ["AppSec"] },
  { record_type: "assignment",  id: "asgn-001", role: "developer", phase: "design", risk_level: "L1" },
  { record_type: "assignment",  id: "asgn-002", role: "appsec",    phase: "test",   risk_level: "L2" },
  { record_type: "user_story",  id: "us-001", practice_id: "01:prac-a", roles_normalized: ["developer"] },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("_resolveEntities", () => {
  it("throws when record_type is missing", () => {
    let err: unknown;
    try { _resolveEntities({}, ITEMS); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("record_type");
  });

  it("returns all items of given record_type when no filters", () => {
    const r = _resolveEntities({ record_type: "requirement" }, ITEMS);
    expect(r.record_type).toBe("requirement");
    expect(r.total).toBe(3);
    expect(r.entities).toHaveLength(3);
  });

  it("exact field filter", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { category: "AUT" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["requirement_id"]).toBe("AUT-001");
  });

  it("dot-notation filter on nested field", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { "applicable_levels.L2": true } }, ITEMS);
    expect(r.total).toBe(3); // all have L2: true
  });

  it("dot-notation filter — L1 false excludes AUT-001", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { "applicable_levels.L1": true } }, ITEMS);
    expect(r.total).toBe(2);
    const ids = r.entities.map((e) => (e as Record<string, unknown>)["requirement_id"]);
    expect(ids).not.toContain("AUT-001");
  });

  it("gte comparison operator on numeric field", () => {
    const r = _resolveEntities({ record_type: "threat", filters: { cvss_score: { gte: 7 } } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["mitigated_threat_id"]).toBe("MT-001");
  });

  it("lte comparison operator", () => {
    const r = _resolveEntities({ record_type: "threat", filters: { cvss_score: { lte: 5 } } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["mitigated_threat_id"]).toBe("MT-002");
  });

  it("in operator for set membership", () => {
    const r = _resolveEntities({ record_type: "requirement", filters: { category: { in: ["AUT", "VAL"] } } }, ITEMS);
    expect(r.total).toBe(2);
  });

  it("array field membership check", () => {
    // chapter_ids is an array — filter where value is in the array
    const r = _resolveEntities({ record_type: "control", filters: { chapter_ids: "12-monit" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["control_id"]).toBe("CTRL-002");
  });

  it("roles_normalized array membership", () => {
    const r = _resolveEntities({ record_type: "user_story", filters: { roles_normalized: "developer" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["id"]).toBe("us-001");
  });

  it("combined filters (AND logic)", () => {
    const r = _resolveEntities({ record_type: "assignment", filters: { role: "developer", phase: "design" } }, ITEMS);
    expect(r.total).toBe(1);
    expect((r.entities[0] as Record<string, unknown>)["id"]).toBe("asgn-001");
  });

  it("limit is respected", () => {
    const r = _resolveEntities({ record_type: "requirement", limit: 2 }, ITEMS);
    expect(r.entities).toHaveLength(2);
    expect(r.total).toBe(3); // total is untruncated
    expect(r.limit).toBe(2);
  });

  it("limit capped at MAX_LIMIT (200)", () => {
    const r = _resolveEntities({ record_type: "requirement", limit: 9999 }, ITEMS);
    expect(r.limit).toBe(200);
  });

  it("returns empty when record_type has no items", () => {
    const r = _resolveEntities({ record_type: "nonexistent" }, ITEMS);
    expect(r.total).toBe(0);
    expect(r.entities).toHaveLength(0);
  });

  it("empty filters object returns all of record_type", () => {
    const r = _resolveEntities({ record_type: "role", filters: {} }, ITEMS);
    expect(r.total).toBe(2);
  });

  it("meta.filtersApplied reflects the filters argument", () => {
    const filters = { category: "LOG" };
    const r = _resolveEntities({ record_type: "requirement", filters }, ITEMS);
    expect(r.meta.filtersApplied).toEqual(filters);
  });

  it("meta.note is a non-empty string", () => {
    const r = _resolveEntities({ record_type: "role" }, ITEMS);
    expect(typeof r.meta.note).toBe("string");
    expect(r.meta.note.length).toBeGreaterThan(0);
  });
});
