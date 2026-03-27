import { describe, it, expect } from "vitest";
import { handleMapSbdToeReviewScope } from "./map-review-scope.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function call(args: Record<string, unknown>) {
  return handleMapSbdToeReviewScope(args);
}

function bundleIds(result: ReturnType<typeof call>): string[] {
  return result.bundlesToReview.map((b) => b.chapterId);
}

// ---------------------------------------------------------------------------
// Validation — path traversal & input errors
// ---------------------------------------------------------------------------

describe("handleMapSbdToeReviewScope — validation", () => {
  it("throws rpcError -32602 for path with '..'", () => {
    let err: unknown;
    try {
      call({ changedFiles: ["../etc/passwd"], riskLevel: "L1" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("..");
  });

  it("throws rpcError -32602 for path with embedded '..'", () => {
    let err: unknown;
    try {
      call({ changedFiles: ["src/../config.ts"], riskLevel: "L1" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("throws rpcError -32602 for empty changedFiles array", () => {
    let err: unknown;
    try {
      call({ changedFiles: [], riskLevel: "L1" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("throws rpcError -32602 for invalid riskLevel", () => {
    let err: unknown;
    try {
      call({ changedFiles: ["src/index.ts"], riskLevel: "L9" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("throws rpcError -32602 when changedFiles is missing", () => {
    let err: unknown;
    try {
      call({ riskLevel: "L1" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });
});

// ---------------------------------------------------------------------------
// Path mapping
// ---------------------------------------------------------------------------

describe("handleMapSbdToeReviewScope — path mapping", () => {
  it("src/index.ts + .github/workflows/ci.yml (L2) → 06-desenvolvimento-seguro and 07-cicd-seguro", () => {
    const result = call({
      changedFiles: ["src/index.ts", ".github/workflows/ci.yml"],
      riskLevel: "L2"
    });
    const ids = bundleIds(result);
    expect(ids).toContain("06-desenvolvimento-seguro");
    expect(ids).toContain("07-cicd-seguro");
  });

  it("package.json (L1) → 05-dependencias-sbom-sca", () => {
    const result = call({ changedFiles: ["package.json"], riskLevel: "L1" });
    expect(bundleIds(result)).toContain("05-dependencias-sbom-sca");
  });

  it("src/config.ts → includes 08-iac-infraestrutura (specific rule)", () => {
    const result = call({ changedFiles: ["src/config.ts"], riskLevel: "L1" });
    expect(bundleIds(result)).toContain("08-iac-infraestrutura");
  });

  it("docs/readme.md → 14-governanca-contratacao", () => {
    const result = call({ changedFiles: ["docs/readme.md"], riskLevel: "L1" });
    expect(bundleIds(result)).toContain("14-governanca-contratacao");
  });

  it("yarn.lock → 05-dependencias-sbom-sca", () => {
    const result = call({ changedFiles: ["yarn.lock"], riskLevel: "L1" });
    expect(bundleIds(result)).toContain("05-dependencias-sbom-sca");
  });

  it("release/v1.0.tar.gz → 11-deploy-seguro", () => {
    const result = call({ changedFiles: ["release/v1.0.tar.gz"], riskLevel: "L1" });
    expect(bundleIds(result)).toContain("11-deploy-seguro");
  });

  it(".github/skills/sbd-toe-skill/SKILL.md → 13-formacao-onboarding and 14-governanca-contratacao", () => {
    const result = call({ changedFiles: [".github/skills/sbd-toe-skill/SKILL.md"], riskLevel: "L1" });
    const ids = bundleIds(result);
    expect(ids).toContain("13-formacao-onboarding");
    expect(ids).toContain("14-governanca-contratacao");
  });

  it("unmapped path triggers guardrail bundles", () => {
    const result = call({ changedFiles: ["random/unknown/file.txt"], riskLevel: "L1" });
    const ids = bundleIds(result);
    expect(ids).toContain("01-classificacao-aplicacoes");
    expect(ids).toContain("02-requisitos-seguranca");
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe("handleMapSbdToeReviewScope — deduplication", () => {
  it("bundle activated by multiple paths appears only once", () => {
    const result = call({
      changedFiles: ["src/index.ts", "src/config.ts", "src/tools/structured-tools.ts"],
      riskLevel: "L1"
    });
    const ids = bundleIds(result);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("reason mentions multiple files when applicable", () => {
    const result = call({
      changedFiles: ["src/index.ts", "src/tools/structured-tools.ts"],
      riskLevel: "L1"
    });
    const devBundle = result.bundlesToReview.find(
      (b) => b.chapterId === "06-desenvolvimento-seguro"
    );
    expect(devBundle).toBeDefined();
    // reason should mention both files
    expect(devBundle?.reason).toContain("src/index.ts");
    expect(devBundle?.reason).toContain("src/tools/structured-tools.ts");
  });
});

// ---------------------------------------------------------------------------
// Output structure
// ---------------------------------------------------------------------------

describe("handleMapSbdToeReviewScope — output structure", () => {
  it("each bundle entry has required fields", () => {
    const result = call({
      changedFiles: ["src/index.ts", "package.json"],
      riskLevel: "L2"
    });
    for (const bundle of result.bundlesToReview) {
      expect(typeof bundle.chapterId).toBe("string");
      expect(typeof bundle.readableTitle).toBe("string");
      expect(["foundation", "domain", "operational"]).toContain(bundle.category);
      expect(typeof bundle.reason).toBe("string");
      expect(bundle.expectedEvidence.length).toBeGreaterThan(0);
    }
  });

  it("pathMapping covers matched patterns", () => {
    const result = call({
      changedFiles: ["src/index.ts", ".github/workflows/ci.yml", "package.json"],
      riskLevel: "L1"
    });
    expect(result.pathMapping.length).toBeGreaterThanOrEqual(3);
  });

  it("nextSteps is non-empty", () => {
    const result = call({ changedFiles: ["src/index.ts"], riskLevel: "L1" });
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });

  it("nextSteps mentions L2+ security tests for L2", () => {
    const result = call({ changedFiles: ["src/index.ts"], riskLevel: "L2" });
    const hasL2Step = result.nextSteps.some((s) => s.includes("L2") && s.includes("SAST"));
    expect(hasL2Step).toBe(true);
  });

  it("nextSteps mentions L3 approval for L3", () => {
    const result = call({ changedFiles: ["src/index.ts"], riskLevel: "L3" });
    const hasL3Step = result.nextSteps.some((s) => s.includes("L3") && s.includes("aprovação"));
    expect(hasL3Step).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-platform paths
// ---------------------------------------------------------------------------

describe("handleMapSbdToeReviewScope — cross-platform paths", () => {
  it("normalizes Windows-style backslashes before matching", () => {
    const result = call({
      changedFiles: ["src\\index.ts"],
      riskLevel: "L1"
    });
    expect(bundleIds(result)).toContain("06-desenvolvimento-seguro");
  });
});

// ---------------------------------------------------------------------------
// diffSummary truncation
// ---------------------------------------------------------------------------

describe("handleMapSbdToeReviewScope — diffSummary", () => {
  it("accepts diffSummary without error, truncated silently", () => {
    const longSummary = "x".repeat(1000);
    expect(() =>
      call({ changedFiles: ["src/index.ts"], riskLevel: "L1", diffSummary: longSummary })
    ).not.toThrow();
  });
});
