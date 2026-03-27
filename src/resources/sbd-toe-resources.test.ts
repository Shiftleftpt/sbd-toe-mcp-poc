import { describe, it, expect } from "vitest";
import {
  buildChapterApplicabilityJson,
  buildSetupAgentPrompt
} from "./sbd-toe-resources.js";

describe("buildChapterApplicabilityJson", () => {
  it("L1 returns object with riskLevel, active and excluded arrays", () => {
    const result = buildChapterApplicabilityJson("L1") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L1");
    expect(Array.isArray(result["active"])).toBe(true);
    expect(Array.isArray(result["excluded"])).toBe(true);
    expect((result["active"] as string[]).length).toBeGreaterThan(0);
  });

  it("L1 does not include conditional field", () => {
    const result = buildChapterApplicabilityJson("L1") as Record<string, unknown>;
    expect(result["conditional"]).toBeUndefined();
  });

  it("L2 returns object with riskLevel and arrays", () => {
    const result = buildChapterApplicabilityJson("L2") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L2");
    expect(Array.isArray(result["active"])).toBe(true);
    expect(Array.isArray(result["excluded"])).toBe(true);
    expect((result["active"] as string[]).length).toBeGreaterThan(0);
  });

  it("L3 returns object with all chapters active and excluded empty", () => {
    const result = buildChapterApplicabilityJson("L3") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L3");
    expect((result["excluded"] as string[]).length).toBe(0);
    // All 15 chapters (Cap. 00–14) should be active
    expect((result["active"] as string[]).length).toBe(15);
  });

  it("invalid riskLevel X throws Error mentioning X", () => {
    expect(() => buildChapterApplicabilityJson("X")).toThrow(Error);
    expect(() => buildChapterApplicabilityJson("X")).toThrow("X");
  });

  it("L1 active list contains chapters with minLevel L1", () => {
    const result = buildChapterApplicabilityJson("L1") as { active: string[] };
    expect(result.active).toContain("Cap. 00");
    expect(result.active).toContain("Cap. 01");
    expect(result.active).toContain("Cap. 02");
    expect(result.active).toContain("Cap. 05");
    expect(result.active).toContain("Cap. 07");
    expect(result.active).toContain("Cap. 10");
  });

  it("L1 excludes Cap. 06, Cap. 11, Cap. 13 (minLevel L2/L3)", () => {
    const result = buildChapterApplicabilityJson("L1") as { excluded: string[] };
    expect(result.excluded).toContain("Cap. 06");
    expect(result.excluded).toContain("Cap. 11");
    expect(result.excluded).toContain("Cap. 13");
  });

  it("L2 active list includes Cap. 06 and Cap. 11 (unlocked at L2)", () => {
    const result = buildChapterApplicabilityJson("L2") as { active: string[] };
    expect(result.active).toContain("Cap. 06");
    expect(result.active).toContain("Cap. 11");
  });

  it("L2 still excludes Cap. 13 (minLevel L3)", () => {
    const result = buildChapterApplicabilityJson("L2") as { excluded: string[] };
    expect(result.excluded).toContain("Cap. 13");
  });
});

describe("buildSetupAgentPrompt", () => {
  it("L1 returns non-empty string containing L1 and Cap. 01", () => {
    const result = buildSetupAgentPrompt("L1");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("L1");
    expect(result).toContain("Cap. 01");
  });

  it("L1 with projectRole includes projectRole in text", () => {
    const result = buildSetupAgentPrompt("L1", "mcp-wrapper");
    expect(result).toContain("mcp-wrapper");
  });

  it("L1 without projectRole contains mandatory rules", () => {
    const result = buildSetupAgentPrompt("L1");
    expect(result).toContain("Cap. 01");
    expect(result).toContain("Cap. 02");
    expect(result).toContain("search_sbd_toe_manual");
  });

  it("L2 includes Cap. 06 and Cap. 11 in active chapters", () => {
    const result = buildSetupAgentPrompt("L2");
    expect(result).toContain("L2");
    expect(result).toContain("Cap. 06");
    expect(result).toContain("Cap. 11");
  });

  it("L3 has no excluded chapters", () => {
    const result = buildSetupAgentPrompt("L3");
    expect(result).toContain("L3");
    expect(result).toContain("none");
  });

  it("invalid L4 riskLevel throws Error mentioning L4", () => {
    expect(() => buildSetupAgentPrompt("L4")).toThrow(Error);
    expect(() => buildSetupAgentPrompt("L4")).toThrow("L4");
  });

  it("invalid empty string riskLevel throws Error", () => {
    expect(() => buildSetupAgentPrompt("")).toThrow(Error);
  });
});
