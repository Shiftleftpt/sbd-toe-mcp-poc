import { describe, it, expect } from "vitest";
import { _resolveConsultResult } from "./consult-security-requirements.js";
import type { OntologyData } from "./ontology-loader.js";

// ---------------------------------------------------------------------------
// Minimal fixture
// ---------------------------------------------------------------------------

function makeOntologyData(overrides: Partial<OntologyData> = {}): OntologyData {
  return {
    domainMapping: {
      AUT: ["identity", "governance"],
      LOG: ["monitoring"],
      VAL: ["code_integrity"],
    },
    concernsMap: {
      auth:    ["AUT"],
      logging: ["LOG"],
      validation: ["VAL"],
    },
    requirements: [
      { requirement_id: "AUT-001", type: "base", category: "AUT", name: "MFA", applicable_levels: { L1: false, L2: true, L3: true }, source_chapter: 2 },
      { requirement_id: "LOG-001", type: "base", category: "LOG", name: "Audit log", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 2 },
      { requirement_id: "VAL-001", type: "base", category: "VAL", name: "Input validation", applicable_levels: { L1: true, L2: true, L3: true }, source_chapter: 2 },
    ],
    controls: [
      { control_id: "CTRL-001", name: "Identity Control", domain: "identity", control_type: "preventive", abstraction_level: "technical", applicable_lifecycle_phases: ["design"], source_practice_ids: [] },
      { control_id: "CTRL-002", name: "Monitoring Control", domain: "monitoring", control_type: "detective", abstraction_level: "operational", applicable_lifecycle_phases: ["operate"], source_practice_ids: [] },
      { control_id: "CTRL-003", name: "Code Integrity Control", domain: "code_integrity", control_type: "preventive", abstraction_level: "technical", applicable_lifecycle_phases: ["develop"], source_practice_ids: [] },
      { control_id: "CTRL-004", name: "Governance Control", domain: "governance", control_type: "preventive", abstraction_level: "strategic", applicable_lifecycle_phases: ["design"], source_practice_ids: [] },
    ],
    roles: [],
    threats: [],
    assignments: [],
    userStories: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("_resolveConsultResult", () => {
  it("throws on invalid risk_level with rpcError code -32602", () => {
    let err: unknown;
    try { _resolveConsultResult({ risk_level: "L9" }, makeOntologyData()); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("L9");
  });

  it("L1 returns only L1-applicable requirements", () => {
    const result = _resolveConsultResult({ risk_level: "L1" }, makeOntologyData());
    expect(result.risk_level).toBe("L1");
    // AUT-001 is L2+, should not appear
    expect(result.requirements.map((r) => r.requirement_id)).not.toContain("AUT-001");
    // LOG-001 and VAL-001 are L1
    expect(result.requirements.map((r) => r.requirement_id)).toContain("LOG-001");
    expect(result.requirements.map((r) => r.requirement_id)).toContain("VAL-001");
  });

  it("L2 includes both L1 and L2 requirements", () => {
    const result = _resolveConsultResult({ risk_level: "L2" }, makeOntologyData());
    const ids = result.requirements.map((r) => r.requirement_id);
    expect(ids).toContain("AUT-001");
    expect(ids).toContain("LOG-001");
    expect(ids).toContain("VAL-001");
  });

  it("derives active domains from requirement categories", () => {
    const result = _resolveConsultResult({ risk_level: "L1" }, makeOntologyData());
    // L1 has LOG → monitoring and VAL → code_integrity
    expect(result.activeDomains).toContain("monitoring");
    expect(result.activeDomains).toContain("code_integrity");
    // AUT not in L1 → identity not derived from AUT
    // (governance could come from AUT if L2, but not L1)
    expect(result.activeDomains).not.toContain("identity");
  });

  it("selects controls matching active domains", () => {
    const result = _resolveConsultResult({ risk_level: "L1" }, makeOntologyData());
    const ctrlIds = result.controls.map((c) => c.control_id);
    expect(ctrlIds).toContain("CTRL-002"); // monitoring
    expect(ctrlIds).toContain("CTRL-003"); // code_integrity
    expect(ctrlIds).not.toContain("CTRL-001"); // identity — only active at L2 via AUT
  });

  it("concerns filter narrows requirements (intersect, not replace)", () => {
    const result = _resolveConsultResult(
      { risk_level: "L2", concerns: ["auth"] },
      makeOntologyData()
    );
    // Only AUT-001 matches "auth" concern at L2
    const ids = result.requirements.map((r) => r.requirement_id);
    expect(ids).toContain("AUT-001");
    expect(ids).not.toContain("LOG-001");
    expect(result.meta.concernsApplied).toEqual(["auth"]);
  });

  it("concerns filter returns empty if no requirement matches at this level", () => {
    const result = _resolveConsultResult(
      { risk_level: "L1", concerns: ["auth"] },
      makeOntologyData()
    );
    // AUT-001 is L2+ only — intersect with L1 = empty
    expect(result.requirements).toHaveLength(0);
    expect(result.controls).toHaveLength(0);
  });

  it("no concerns → meta.concernsApplied is null", () => {
    const result = _resolveConsultResult({ risk_level: "L1" }, makeOntologyData());
    expect(result.meta.concernsApplied).toBeNull();
  });

  it("all controls tagged with _confidence", () => {
    const result = _resolveConsultResult({ risk_level: "L2" }, makeOntologyData());
    for (const ctrl of result.controls) {
      expect(["direct", "derived"]).toContain(ctrl._confidence);
    }
  });

  it("meta note is a non-empty string", () => {
    const result = _resolveConsultResult({ risk_level: "L1" }, makeOntologyData());
    expect(typeof result.meta.note).toBe("string");
    expect(result.meta.note.length).toBeGreaterThan(0);
  });

  it("activeCategories sorted and unique", () => {
    const result = _resolveConsultResult({ risk_level: "L1" }, makeOntologyData());
    const sorted = [...result.activeCategories].sort();
    expect(result.activeCategories).toEqual(sorted);
  });
});
