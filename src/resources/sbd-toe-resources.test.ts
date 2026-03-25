import { describe, it, expect } from "vitest";
import {
  buildSkillTemplateMarkdown,
  buildChapterApplicabilityJson,
  buildSetupAgentPrompt
} from "./sbd-toe-resources.js";

describe("buildSkillTemplateMarkdown", () => {
  it("L1 with projectRole returns non-empty string containing L1 and Cap.", () => {
    const result = buildSkillTemplateMarkdown("L1", "mcp-wrapper");
    expect(result).toBeTruthy();
    expect(result).toContain("L1");
    expect(result).toContain("Cap.");
    expect(result).toContain("mcp-wrapper");
  });

  it("L2 with projectRole returns non-empty string containing L2", () => {
    const result = buildSkillTemplateMarkdown("L2", "api-service");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("L2");
    expect(result).toContain("api-service");
  });

  it("L3 with projectRole returns non-empty string containing L3", () => {
    const result = buildSkillTemplateMarkdown("L3", "platform-service");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("L3");
  });

  it("invalid riskLevel L9 throws Error mentioning L9", () => {
    expect(() => buildSkillTemplateMarkdown("L9", "x")).toThrow(Error);
    expect(() => buildSkillTemplateMarkdown("L9", "x")).toThrow("L9");
  });

  it("output contains all required sections", () => {
    const result = buildSkillTemplateMarkdown("L1", "mcp-wrapper");
    expect(result).toContain("# SbD-ToE Skill Template");
    expect(result).toContain("## Classificação de Risco");
    expect(result).toContain("## Capítulos Activos");
    expect(result).toContain("## Capítulos Condicionais");
    expect(result).toContain("## Triggers de Consulta");
    expect(result).toContain("## Requisitos Base");
  });

  it("L1 active chapters are all present in output", () => {
    const result = buildSkillTemplateMarkdown("L1", "x");
    expect(result).toContain("Cap. 01");
    expect(result).toContain("Cap. 02");
    expect(result).toContain("Cap. 06");
    expect(result).toContain("Cap. 10");
  });

  it("L2 has wider active list than L1", () => {
    const r1 = buildSkillTemplateMarkdown("L1", "x");
    const r2 = buildSkillTemplateMarkdown("L2", "x");
    // L2 has Cap. 03 and Cap. 04 active; they are only conditional in L1
    expect(r2).toContain("Cap. 03");
    expect(r2).toContain("Cap. 04");
    // L1 lists Cap. 03 as conditional
    expect(r1).toContain("Cap. 03");
  });
});

describe("buildChapterApplicabilityJson", () => {
  it("L1 returns object with riskLevel and active/conditional/excluded as arrays", () => {
    const result = buildChapterApplicabilityJson("L1") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L1");
    expect(Array.isArray(result["active"])).toBe(true);
    expect(Array.isArray(result["conditional"])).toBe(true);
    expect(Array.isArray(result["excluded"])).toBe(true);
    expect((result["active"] as string[]).length).toBeGreaterThan(0);
  });

  it("L2 returns object with riskLevel and all arrays", () => {
    const result = buildChapterApplicabilityJson("L2") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L2");
    expect(Array.isArray(result["active"])).toBe(true);
    expect(Array.isArray(result["conditional"])).toBe(true);
    expect(Array.isArray(result["excluded"])).toBe(true);
    expect((result["active"] as string[]).length).toBeGreaterThan(0);
  });

  it("L3 returns object with riskLevel and all arrays; excluded is empty", () => {
    const result = buildChapterApplicabilityJson("L3") as Record<string, unknown>;
    expect(result["riskLevel"]).toBe("L3");
    expect(Array.isArray(result["active"])).toBe(true);
    expect(Array.isArray(result["conditional"])).toBe(true);
    expect(Array.isArray(result["excluded"])).toBe(true);
    expect((result["excluded"] as string[]).length).toBe(0);
  });

  it("invalid riskLevel X throws Error mentioning X", () => {
    expect(() => buildChapterApplicabilityJson("X")).toThrow(Error);
    expect(() => buildChapterApplicabilityJson("X")).toThrow("X");
  });

  it("L1 active list contains expected chapters from docs/sbd-toe-applicability.md", () => {
    const result = buildChapterApplicabilityJson("L1") as { active: string[] };
    expect(result.active).toContain("Cap. 01");
    expect(result.active).toContain("Cap. 02");
    expect(result.active).toContain("Cap. 05");
    expect(result.active).toContain("Cap. 06");
    expect(result.active).toContain("Cap. 07");
    expect(result.active).toContain("Cap. 10");
  });

  it("L1 conditional list contains Cap. 03, Cap. 04, Cap. 11, Cap. 12, Cap. 14", () => {
    const result = buildChapterApplicabilityJson("L1") as { conditional: string[] };
    expect(result.conditional).toContain("Cap. 03");
    expect(result.conditional).toContain("Cap. 04");
    expect(result.conditional).toContain("Cap. 11");
    expect(result.conditional).toContain("Cap. 12");
    expect(result.conditional).toContain("Cap. 14");
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

  it("L1 without projectRole still contains mandatory rules", () => {
    const result = buildSetupAgentPrompt("L1");
    expect(result).toContain("Cap. 01 → Cap. 02");
    expect(result).toContain("search_sbd_toe_manual");
  });

  it("L2 includes L2 active chapters", () => {
    const result = buildSetupAgentPrompt("L2");
    expect(result).toContain("L2");
    expect(result).toContain("Cap. 03");
    expect(result).toContain("Cap. 04");
  });

  it("L3 has no conditional chapters", () => {
    const result = buildSetupAgentPrompt("L3");
    expect(result).toContain("L3");
    expect(result).toContain("nenhum");
  });

  it("invalid L4 riskLevel throws Error mentioning L4", () => {
    expect(() => buildSetupAgentPrompt("L4")).toThrow(Error);
    expect(() => buildSetupAgentPrompt("L4")).toThrow("L4");
  });

  it("invalid empty string riskLevel throws Error", () => {
    expect(() => buildSetupAgentPrompt("")).toThrow(Error);
  });
});
