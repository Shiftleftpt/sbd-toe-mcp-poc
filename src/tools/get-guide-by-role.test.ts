import { describe, it, expect } from "vitest";
import { _resolveGuideByRole } from "./get-guide-by-role.js";
import type { OntologyData } from "./ontology-loader.js";

// ---------------------------------------------------------------------------
// Minimal fixture
// ---------------------------------------------------------------------------

function makeOntologyData(overrides: Partial<OntologyData> = {}): OntologyData {
  return {
    domainMapping: {},
    concernsMap: {},
    requirements: [],
    controls: [],
    roles: [
      { role_id: "developer", aliases: ["dev", "software_developer"], canonical: true, source: "00" },
      { role_id: "security-champion", aliases: ["security-champions", "appsec"], canonical: true, source: "00" },
    ],
    threats: [],
    assignments: [
      { id: "01-chap-developer-l1-us01", chapter_id: "01", practice_id: "01:practice-a", role: "developer", phase: "design", risk_level: "L1", action: "Do A", artifacts: [] },
      { id: "01-chap-developer-l2-us01", chapter_id: "01", practice_id: "01:practice-a", role: "developer", phase: "design", risk_level: "L2", action: "Do A L2", artifacts: [] },
      { id: "01-chap-security-champion-l1-us02", chapter_id: "01", practice_id: "01:practice-b", role: "security-champion", phase: "test", risk_level: "L1", action: "Review B", artifacts: [] },
      { id: "02-chap-developer-l1-us03", chapter_id: "02", practice_id: "02:practice-c", role: "developer", phase: "implement", risk_level: "L1", action: "Implement C", artifacts: [] },
    ],
    userStories: [
      { id: "01-us-01", practice_id: "01:practice-a", title: "Practice A Story", chapter_id: "01" },
      { id: "01-us-02", practice_id: "01:practice-b", title: "Practice B Story", chapter_id: "01" },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("_resolveGuideByRole", () => {
  it("throws on invalid risk_level", () => {
    let err: unknown;
    try { _resolveGuideByRole({ risk_level: "L0" }, makeOntologyData()); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("returns all L1 assignments when no role or phase filter", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.assignments).toHaveLength(3);
    expect(result.risk_level).toBe("L1");
  });

  it("filters by role (exact match)", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "developer" }, makeOntologyData());
    expect(result.assignments.every((a) => a.role === "developer")).toBe(true);
    expect(result.assignments).toHaveLength(2);
  });

  it("resolves role aliases", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "dev" }, makeOntologyData());
    // "dev" is alias for "developer" — but our fixture aliases don't include "dev" for developer
    // canonical role resolution: resolveRoleId("dev", roles) should match alias "dev" of developer
    expect(result.canonicalRole).toBe("developer");
    expect(result.assignments.every((a) => a.role === "developer")).toBe(true);
  });

  it("filters by phase", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", phase: "design" }, makeOntologyData());
    expect(result.assignments.every((a) => a.phase === "design")).toBe(true);
    expect(result.assignments).toHaveLength(1);
  });

  it("role + phase combined filter", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "developer", phase: "implement" }, makeOntologyData());
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.action).toBe("Implement C");
  });

  it("groups assignments byRole and byPhase", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.byRole["developer"]).toBeDefined();
    expect(result.byRole["security-champion"]).toBeDefined();
    expect(result.byPhase["design"]).toBeDefined();
    expect(result.byPhase["test"]).toBeDefined();
  });

  it("joins user stories via practice_id", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "developer" }, makeOntologyData());
    const withStory = result.assignments.filter((a) => a.user_story !== undefined);
    // practice-a has a user story
    expect(withStory.length).toBeGreaterThan(0);
    expect(withStory[0]?.user_story?.title).toBe("Practice A Story");
  });

  it("meta.knownRoles lists all roles at this risk level", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.meta.knownRoles).toContain("developer");
    expect(result.meta.knownRoles).toContain("security-champion");
  });

  it("meta.knownPhases lists all phases at this risk level", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(result.meta.knownPhases).toContain("design");
    expect(result.meta.knownPhases).toContain("test");
    expect(result.meta.knownPhases).toContain("implement");
  });

  it("L2-only assignment not returned at L1", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    const ids = result.assignments.map((a) => a.id);
    expect(ids).not.toContain("01-chap-developer-l2-us01");
  });

  it("returns empty assignments for a role with no matches", () => {
    const result = _resolveGuideByRole({ risk_level: "L1", role: "gestao-executiva" }, makeOntologyData());
    expect(result.assignments).toHaveLength(0);
    expect(result.byRole).toEqual({});
  });

  it("meta.note is non-empty string", () => {
    const result = _resolveGuideByRole({ risk_level: "L1" }, makeOntologyData());
    expect(typeof result.meta.note).toBe("string");
    expect(result.meta.note.length).toBeGreaterThan(0);
  });
});
