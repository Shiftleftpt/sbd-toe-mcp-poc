import { describe, it, expect } from "vitest";
import { handleGenerateSbdToeSkill } from "./generate-sbd-toe-skill.js";

describe("handleGenerateSbdToeSkill", () => {
  it("returns an object with a non-empty content string", () => {
    const result = handleGenerateSbdToeSkill();
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(100);
  });

  it("content includes SbD-ToE identity", () => {
    const { content } = handleGenerateSbdToeSkill();
    expect(content).toContain("SbD-ToE");
    expect(content).toContain("Theory of Everything");
  });

  it("content includes source comment pointing to MCP resource", () => {
    const { content } = handleGenerateSbdToeSkill();
    expect(content).toContain("sbd://toe/agent-guide");
  });

  it("content includes agent-guide sections", () => {
    const { content } = handleGenerateSbdToeSkill();
    expect(content).toContain("CONSULT");
    expect(content).toContain("GUIDE");
  });
});
