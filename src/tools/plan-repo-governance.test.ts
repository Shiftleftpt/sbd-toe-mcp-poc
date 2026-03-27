import { describe, it, expect } from "vitest";
import { handlePlanRepoGovernance } from "./plan-repo-governance.js";

function call(args: Record<string, unknown>) {
  return handlePlanRepoGovernance(args);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("handlePlanRepoGovernance — validation", () => {
  it("throws rpcError -32602 for invalid repoType", () => {
    let err: unknown;
    try { call({ repoType: "invalid", platform: "github", riskLevel: "L1" }); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("invalid");
  });

  it("throws rpcError -32602 for invalid platform (bitbucket)", () => {
    let err: unknown;
    try { call({ repoType: "service", platform: "bitbucket", riskLevel: "L1" }); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("bitbucket");
  });

  it("throws rpcError -32602 for invalid riskLevel L4", () => {
    let err: unknown;
    try { call({ repoType: "service", platform: "github", riskLevel: "L4" }); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("throws rpcError -32602 for teamSize 0", () => {
    let err: unknown;
    try {
      call({ repoType: "service", platform: "github", riskLevel: "L1", organizationContext: { teamSize: 0 } });
    } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("throws rpcError -32602 for invalid enforcementLevel", () => {
    let err: unknown;
    try {
      call({ repoType: "service", platform: "github", riskLevel: "L1", organizationContext: { enforcementLevel: "brutal" } });
    } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("accepts valid organizationContext without error", () => {
    expect(() => call({
      repoType: "service",
      platform: "github",
      riskLevel: "L2",
      organizationContext: { scale: "mid-size", teamSize: 10, enforcementLevel: "enforced" }
    })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// applicableControls
// ---------------------------------------------------------------------------

describe("handlePlanRepoGovernance — applicableControls", () => {
  it("any valid combination returns ≥4 controls", () => {
    const combos: Array<{ repoType: string; platform: string; riskLevel: string }> = [
      { repoType: "library",        platform: "github",  riskLevel: "L1" },
      { repoType: "service",        platform: "gitlab",  riskLevel: "L2" },
      { repoType: "webapp",         platform: "github",  riskLevel: "L3" },
      { repoType: "infrastructure", platform: "gitlab",  riskLevel: "L1" },
      { repoType: "pipeline",       platform: "github",  riskLevel: "L2" },
      { repoType: "monorepo",       platform: "gitlab",  riskLevel: "L3" }
    ];
    for (const combo of combos) {
      const result = call(combo);
      expect(result.applicableControls.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("each control has controlId, description, category, rationale", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L2" });
    const validCategories = ["access", "code-quality", "supply-chain", "secrets", "ci-cd", "audit"];
    for (const ctrl of result.applicableControls) {
      expect(typeof ctrl.controlId).toBe("string");
      expect(ctrl.controlId.startsWith("CTRL-")).toBe(true);
      expect(typeof ctrl.description).toBe("string");
      expect(validCategories).toContain(ctrl.category);
      expect(typeof ctrl.rationale).toBe("string");
    }
  });

  it("L1 mandatory controls are present for service/github/L1", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L1" });
    const ids = result.applicableControls.map((c) => c.controlId);
    expect(ids).toContain("CTRL-ACCESS-001");
    expect(ids).toContain("CTRL-QUALITY-001");
    expect(ids).toContain("CTRL-SECRETS-001");
    expect(ids).toContain("CTRL-CICD-001");
  });
});

// ---------------------------------------------------------------------------
// mandatoryControls
// ---------------------------------------------------------------------------

describe("handlePlanRepoGovernance — mandatoryControls", () => {
  it("L2 has ≥5 mandatory controls", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L2" });
    expect(result.mandatoryControls.length).toBeGreaterThanOrEqual(5);
  });

  it("L3 has ≥10 mandatory controls", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L3" });
    expect(result.mandatoryControls.length).toBeGreaterThanOrEqual(10);
  });

  it("mandatoryControls is subset of applicableControls IDs", () => {
    const result = call({ repoType: "webapp", platform: "github", riskLevel: "L3" });
    const applicableIds = new Set(result.applicableControls.map((c) => c.controlId));
    for (const id of result.mandatoryControls) {
      expect(applicableIds.has(id)).toBe(true);
    }
  });

  it("L3 has more mandatory controls than L1", () => {
    const l1 = call({ repoType: "service", platform: "github", riskLevel: "L1" });
    const l3 = call({ repoType: "service", platform: "github", riskLevel: "L3" });
    expect(l3.mandatoryControls.length).toBeGreaterThan(l1.mandatoryControls.length);
  });
});

// ---------------------------------------------------------------------------
// baselineCheckpoints
// ---------------------------------------------------------------------------

describe("handlePlanRepoGovernance — baselineCheckpoints", () => {
  it("always returns ≥4 checkpoints", () => {
    const combos = [
      { repoType: "service", platform: "github",  riskLevel: "L1" },
      { repoType: "service", platform: "github",  riskLevel: "L2" },
      { repoType: "service", platform: "github",  riskLevel: "L3" }
    ];
    for (const combo of combos) {
      const result = call(combo);
      expect(result.baselineCheckpoints.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("each checkpoint has non-empty phase and ≥1 action", () => {
    const result = call({ repoType: "service", platform: "gitlab", riskLevel: "L2" });
    for (const cp of result.baselineCheckpoints) {
      expect(cp.phase.length).toBeGreaterThan(0);
      expect(cp.actions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("L2+ includes incident-response checkpoint", () => {
    const l2 = call({ repoType: "service", platform: "github", riskLevel: "L2" });
    const l3 = call({ repoType: "service", platform: "github", riskLevel: "L3" });
    const phases = (r: typeof l2) => r.baselineCheckpoints.map((c) => c.phase);
    expect(phases(l2)).toContain("incident-response");
    expect(phases(l3)).toContain("incident-response");
  });

  it("L1 does NOT include incident-response checkpoint", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L1" });
    const phases = result.baselineCheckpoints.map((c) => c.phase);
    expect(phases).not.toContain("incident-response");
  });
});

// ---------------------------------------------------------------------------
// evidenceChecklist
// ---------------------------------------------------------------------------

describe("handlePlanRepoGovernance — evidenceChecklist", () => {
  it("L1 returns ≥4 items", () => {
    const result = call({ repoType: "library", platform: "github", riskLevel: "L1" });
    expect(result.evidenceChecklist.length).toBeGreaterThanOrEqual(4);
  });

  it("L2 returns ≥8 items", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L2" });
    expect(result.evidenceChecklist.length).toBeGreaterThanOrEqual(8);
  });

  it("L3 returns ≥12 items", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L3" });
    expect(result.evidenceChecklist.length).toBeGreaterThanOrEqual(12);
  });

  it("each item has item, category, and non-empty requiredFor", () => {
    const result = call({ repoType: "webapp", platform: "gitlab", riskLevel: "L3" });
    for (const ev of result.evidenceChecklist) {
      expect(typeof ev.item).toBe("string");
      expect(typeof ev.category).toBe("string");
      expect(ev.requiredFor.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// platformSpecific YAML
// ---------------------------------------------------------------------------

describe("handlePlanRepoGovernance — platformSpecific", () => {
  it("github returns YAML with branch_protection", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L1" });
    expect(result.platformSpecific.recommendations).toContain("branch_protection");
  });

  it("gitlab returns YAML with protected_branches", () => {
    const result = call({ repoType: "service", platform: "gitlab", riskLevel: "L1" });
    expect(result.platformSpecific.recommendations).toContain("protected_branches");
  });

  it("github L3 YAML includes require_signed_commits: true", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L3" });
    expect(result.platformSpecific.recommendations).toContain("require_signed_commits: true");
  });

  it("github L2 YAML includes security-scan in required_status_checks", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L2" });
    expect(result.platformSpecific.recommendations).toContain("security-scan");
  });

  it("platformSpecific.recommendations is a non-empty string", () => {
    const result = call({ repoType: "pipeline", platform: "gitlab", riskLevel: "L2" });
    expect(typeof result.platformSpecific.recommendations).toBe("string");
    expect(result.platformSpecific.recommendations.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// gaps
// ---------------------------------------------------------------------------

describe("handlePlanRepoGovernance — gaps", () => {
  it("always returns at least one gap", () => {
    const result = call({ repoType: "service", platform: "github", riskLevel: "L1" });
    expect(result.gaps.length).toBeGreaterThan(0);
  });

  it("each gap has area, risk, mitigation", () => {
    const result = call({ repoType: "webapp", platform: "github", riskLevel: "L2" });
    for (const gap of result.gaps) {
      expect(typeof gap.area).toBe("string");
      expect(typeof gap.risk).toBe("string");
      expect(typeof gap.mitigation).toBe("string");
    }
  });
});
