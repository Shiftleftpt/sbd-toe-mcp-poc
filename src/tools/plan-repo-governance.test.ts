import { describe, it, expect } from "vitest";
import { handlePlanRepoGovernance } from "./plan-repo-governance.js";
import { emptySnapshotPayload, mockSnapshotPayload } from "../test-utils.js";
import type { SnapshotCache } from "../backend/semantic-index-gateway.js";

function makeCache(items: unknown[] = []): SnapshotCache {
  return {
    docs: emptySnapshotPayload,
    entities: { items } as typeof mockSnapshotPayload,
    docsEnrichedLookup: new Map(),
    entitiesEnrichedLookup: new Map()
  };
}

describe("handlePlanRepoGovernance", () => {
  it("returns result with byChapter array and note", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
    expect(Array.isArray(result.byChapter)).toBe(true);
    expect(typeof result.note).toBe("string");
    expect(result.riskLevel).toBeNull();
  });

  it("riskLevel null when not provided", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
    expect(result.riskLevel).toBeNull();
  });

  it("riskLevel set when provided", () => {
    const result = handlePlanRepoGovernance({ riskLevel: "L2" }, makeCache());
    expect(result.riskLevel).toBe("L2");
  });

  it("invalid riskLevel throws rpcError -32602", () => {
    let err: unknown;
    try { handlePlanRepoGovernance({ riskLevel: "L9" }, makeCache()); } catch (e) { err = e; }
    expect((err as Error & { rpcError?: { code: number } }).rpcError?.code).toBe(-32602);
    expect((err as Error).message).toContain("L9");
  });

  it("empty cache returns zero artefacts", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
    expect(result.totalArtefacts).toBe(0);
    expect(result.byChapter).toHaveLength(0);
  });

  it("extracts artefacts from entities with artifact_ids", () => {
    const items = [
      {
        entity_type: "proportionality",
        chapter_id: "01-classificacao-aplicacoes",
        artifact_ids: ["ART-threat-model-abc123", "ART-checklist-def456"],
        risk_levels: ["L1", "L2", "L3"]
      }
    ];
    const result = handlePlanRepoGovernance({}, makeCache(items));
    expect(result.totalArtefacts).toBe(2);
    expect(result.byChapter[0]?.chapterId).toBe("01-classificacao-aplicacoes");
  });

  it("filters artefacts by riskLevel", () => {
    const items = [
      {
        chapter_id: "01-classificacao-aplicacoes",
        artifact_ids: ["ART-doc-l1only"],
        risk_levels: ["L1"]
      },
      {
        chapter_id: "06-desenvolvimento-seguro",
        artifact_ids: ["ART-doc-l2plus"],
        risk_levels: ["L2", "L3"]
      }
    ];
    const l1 = handlePlanRepoGovernance({ riskLevel: "L1" }, makeCache(items));
    expect(l1.totalArtefacts).toBe(1);
    expect(l1.byChapter[0]?.chapterId).toBe("01-classificacao-aplicacoes");

    const l2 = handlePlanRepoGovernance({ riskLevel: "L2" }, makeCache(items));
    expect(l2.totalArtefacts).toBe(1);
    expect(l2.byChapter[0]?.chapterId).toBe("06-desenvolvimento-seguro");
  });

  it("note mentions manual indices and no templates", () => {
    const result = handlePlanRepoGovernance({}, makeCache());
    expect(result.note).toContain("manual");
    expect(result.note).toContain("template");
  });
});
