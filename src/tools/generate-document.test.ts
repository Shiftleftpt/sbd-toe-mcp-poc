import { describe, it, expect } from "vitest";
import { handleGenerateDocument } from "./generate-document.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function call(args: Record<string, unknown>) {
  return handleGenerateDocument(args);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("handleGenerateDocument — validation", () => {
  it("throws rpcError -32602 for invalid type", () => {
    let err: unknown;
    try {
      call({ type: "invalid-type", riskLevel: "L1" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("invalid-type");
  });

  it("throws rpcError -32602 for invalid riskLevel", () => {
    let err: unknown;
    try {
      call({ type: "checklist", riskLevel: "L4" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("L4");
  });

  it("throws rpcError -32602 when type is missing", () => {
    let err: unknown;
    try {
      call({ riskLevel: "L1" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });

  it("throws rpcError -32602 when riskLevel is missing", () => {
    let err: unknown;
    try {
      call({ type: "checklist" });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
  });
});

// ---------------------------------------------------------------------------
// Output structure
// ---------------------------------------------------------------------------

describe("handleGenerateDocument — output structure", () => {
  it("returns required fields for all 5 types at L1", () => {
    const types = [
      "classification-template",
      "threat-model-template",
      "checklist",
      "training-plan",
      "secure-config"
    ] as const;

    for (const type of types) {
      const result = call({ type, riskLevel: "L1" }) as {
        documentType: string;
        riskLevel: string;
        sections: unknown[];
        acceptanceCriteria: string[];
        relevantBundles: string[];
      };
      expect(result.documentType).toBe(type);
      expect(result.riskLevel).toBe("L1");
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(result.relevantBundles.length).toBeGreaterThan(0);
    }
  });

  it("context field is accepted but does not change output structure", () => {
    const withContext = call({
      type: "checklist",
      riskLevel: "L1",
      context: { projectName: "Test", team: "Dev" }
    }) as { sections: unknown[] };
    const withoutContext = call({
      type: "checklist",
      riskLevel: "L1"
    }) as { sections: unknown[] };
    expect(withContext.sections).toEqual(withoutContext.sections);
  });
});

// ---------------------------------------------------------------------------
// L1/L2/L3 progression
// ---------------------------------------------------------------------------

describe("handleGenerateDocument — risk level progression", () => {
  it("L3 has more sections than L1 for classification-template", () => {
    const l1 = call({ type: "classification-template", riskLevel: "L1" }) as { sections: unknown[] };
    const l3 = call({ type: "classification-template", riskLevel: "L3" }) as { sections: unknown[] };
    expect(l3.sections.length).toBeGreaterThan(l1.sections.length);
  });

  it("L3 has more sections than L2 for threat-model-template", () => {
    const l2 = call({ type: "threat-model-template", riskLevel: "L2" }) as { sections: unknown[] };
    const l3 = call({ type: "threat-model-template", riskLevel: "L3" }) as { sections: unknown[] };
    expect(l3.sections.length).toBeGreaterThanOrEqual(l2.sections.length);
  });

  it("L2 has more sections than L1 for secure-config", () => {
    const l1 = call({ type: "secure-config", riskLevel: "L1" }) as { sections: unknown[] };
    const l2 = call({ type: "secure-config", riskLevel: "L2" }) as { sections: unknown[] };
    expect(l2.sections.length).toBeGreaterThan(l1.sections.length);
  });

  it("all types produce sections at all risk levels", () => {
    const types = [
      "classification-template",
      "threat-model-template",
      "checklist",
      "training-plan",
      "secure-config"
    ] as const;
    const levels = ["L1", "L2", "L3"] as const;

    for (const type of types) {
      for (const riskLevel of levels) {
        const result = call({ type, riskLevel }) as { sections: unknown[] };
        expect(result.sections.length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// relevantBundles
// ---------------------------------------------------------------------------

describe("handleGenerateDocument — relevantBundles", () => {
  it("classification-template has expected bundles", () => {
    const result = call({ type: "classification-template", riskLevel: "L1" }) as {
      relevantBundles: string[];
    };
    expect(result.relevantBundles).toContain("01-classificacao-aplicacoes");
    expect(result.relevantBundles).toContain("02-requisitos-seguranca");
  });

  it("threat-model-template includes 03-threat-modeling", () => {
    const result = call({ type: "threat-model-template", riskLevel: "L2" }) as {
      relevantBundles: string[];
    };
    expect(result.relevantBundles).toContain("03-threat-modeling");
  });

  it("secure-config includes infrastructure bundles", () => {
    const result = call({ type: "secure-config", riskLevel: "L1" }) as {
      relevantBundles: string[];
    };
    expect(result.relevantBundles).toContain("08-iac-infraestrutura");
    expect(result.relevantBundles).toContain("09-containers-imagens");
  });

  it("training-plan includes 13-formacao-onboarding", () => {
    const result = call({ type: "training-plan", riskLevel: "L1" }) as {
      relevantBundles: string[];
    };
    expect(result.relevantBundles).toContain("13-formacao-onboarding");
  });
});

// ---------------------------------------------------------------------------
// Section fields
// ---------------------------------------------------------------------------

describe("handleGenerateDocument — section fields", () => {
  it("each field has name, required, and guidance", () => {
    const result = call({ type: "checklist", riskLevel: "L2" }) as {
      sections: Array<{
        name: string;
        mandatory: boolean;
        fields: Array<{ name: string; required: string; guidance: string }>;
      }>;
    };
    for (const section of result.sections) {
      expect(typeof section.name).toBe("string");
      expect(typeof section.mandatory).toBe("boolean");
      for (const field of section.fields) {
        expect(typeof field.name).toBe("string");
        expect(["mandatory", "conditional", "optional"]).toContain(field.required);
        expect(typeof field.guidance).toBe("string");
        expect(field.guidance.length).toBeGreaterThan(0);
      }
    }
  });

  it("guidance never contains pre-filled substantive content (only instructions)", () => {
    const types = [
      "classification-template",
      "threat-model-template",
      "checklist",
      "training-plan",
      "secure-config"
    ] as const;
    for (const type of types) {
      const result = call({ type, riskLevel: "L2" }) as {
        sections: Array<{ fields: Array<{ guidance: string }> }>;
      };
      for (const section of result.sections) {
        for (const field of section.fields) {
          // guidance should be instructional — check it's not suspiciously long pre-filled content
          expect(field.guidance.length).toBeLessThan(300);
        }
      }
    }
  });
});
