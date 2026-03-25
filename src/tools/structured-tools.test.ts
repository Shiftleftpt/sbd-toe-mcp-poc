import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SnapshotCache } from "../backend/semantic-index-gateway.js";

vi.mock("../backend/semantic-index-gateway.js", () => ({
  retrievePublishedContext: vi.fn()
}));

import {
  handleListSbdToeChapters,
  handleQuerySbdToeEntities,
  handleGetSbdToeChapterBrief,
  handleMapSbdToeApplicability
} from "./structured-tools.js";
import { retrievePublishedContext } from "../backend/semantic-index-gateway.js";

// --- Helpers ---

function makeCache(entityItems: unknown[] = []): SnapshotCache {
  return {
    docs: { items: [] },
    entities: { items: entityItems as never },
    docsEnrichedLookup: new Map(),
    entitiesEnrichedLookup: new Map()
  };
}

function makeChapterBundle(chapterId: string, title: string, riskLevels: string[] = []) {
  return {
    objectID: `entity::chapter_bundle::${chapterId}::bundle`,
    entity_type: "chapter_bundle",
    chapter_id: chapterId,
    title,
    risk_levels: riskLevels,
    summary: `Summary of ${title}`,
    related_phases: ["design", "implementation"],
    artifact_ids: [`ART-${chapterId}`]
  };
}

function makePracticeAssignment(chapterId: string, riskLevels: string[]) {
  return {
    objectID: `entity::practice_assignment::${chapterId}::p1`,
    entity_type: "practice_assignment",
    chapter_id: chapterId,
    title: `Practice for ${chapterId}`,
    risk_levels: riskLevels
  };
}

function makeNormalizedRecord(overrides: Record<string, unknown> = {}) {
  return {
    citationId: "E1",
    source: "entities" as const,
    indexName: "test",
    objectID: "test-001",
    title: "Test",
    excerpt: "Test excerpt",
    tags: [],
    algoliaRank: 1,
    localScore: 0,
    raw: {
      objectID: "test-001",
      entity_type: "practice_assignment",
      chapter_id: "01-test",
      risk_levels: ["L1"]
    },
    ...overrides
  };
}

function makeBundle(records: unknown[] = []) {
  return {
    query: "test",
    selected: records,
    retrieved: records,
    promptChapters: [],
    consultedIndices: [],
    backendSnapshot: {
      docsSnapshotFile: "",
      entitiesSnapshotFile: "",
      docsEnrichedSnapshotFile: "",
      entitiesEnrichedSnapshotFile: ""
    }
  };
}

// --- list_sbd_toe_chapters ---

describe("handleListSbdToeChapters", () => {
  it("returns empty chapters when cache is empty", () => {
    const cache = makeCache([]);
    const result = handleListSbdToeChapters({}, cache) as { chapters: unknown[] };
    expect(result.chapters).toEqual([]);
  });

  it("returns chapter_bundle records as chapters", () => {
    const cache = makeCache([
      makeChapterBundle("01-cap", "Cap. 01 Title"),
      makeChapterBundle("02-cap", "Cap. 02 Title"),
      { objectID: "entity::practice_assignment::x", entity_type: "practice_assignment" }
    ]);
    const result = handleListSbdToeChapters({}, cache) as { chapters: Array<{ id: string; title: string }> };
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]?.id).toBe("01-cap");
    expect(result.chapters[1]?.id).toBe("02-cap");
  });

  it("deduplicates by chapter_id", () => {
    const cache = makeCache([
      makeChapterBundle("01-cap", "Cap. 01"),
      makeChapterBundle("01-cap", "Cap. 01 duplicate")
    ]);
    const result = handleListSbdToeChapters({}, cache) as { chapters: unknown[] };
    expect(result.chapters).toHaveLength(1);
  });

  it("filters by riskLevel when provided — returns only matching records", () => {
    const cache = makeCache([
      makeChapterBundle("01-cap", "Cap. 01", ["L1", "L2"]),
      makeChapterBundle("02-cap", "Cap. 02", ["L3"])
    ]);
    const result = handleListSbdToeChapters({ riskLevel: "L1" }, cache) as {
      chapters: Array<{ id: string }>;
    };
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters[0]?.id).toBe("01-cap");
  });

  it("returns empty chapters when riskLevel filter matches nothing", () => {
    const cache = makeCache([makeChapterBundle("01-cap", "Cap. 01")]);
    const result = handleListSbdToeChapters({ riskLevel: "L1" }, cache) as { chapters: unknown[] };
    expect(result.chapters).toEqual([]);
  });

  it("throws on invalid riskLevel", () => {
    const cache = makeCache([]);
    expect(() => handleListSbdToeChapters({ riskLevel: "L9" }, cache)).toThrow(
      "riskLevel inválido"
    );
  });

  it("throws on non-string riskLevel", () => {
    const cache = makeCache([]);
    expect(() => handleListSbdToeChapters({ riskLevel: 42 }, cache)).toThrow(
      "riskLevel inválido"
    );
  });

  it("matches objectID patterns starting with cap- or ch-", () => {
    const cache = makeCache([
      {
        objectID: "cap-01",
        chapter_id: "cap-01",
        title: "Cap 01 by objectID prefix"
      }
    ]);
    const result = handleListSbdToeChapters({}, cache) as { chapters: Array<{ id: string }> };
    expect(result.chapters.some((c) => c.id === "cap-01")).toBe(true);
  });
});

// --- query_sbd_toe_entities ---

describe("handleQuerySbdToeEntities", () => {
  beforeEach(() => {
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([]) as never);
  });

  it("throws when query is empty string", async () => {
    const cache = makeCache([]);
    await expect(handleQuerySbdToeEntities({ query: "" }, cache)).rejects.toThrow(
      '"query" é obrigatório'
    );
  });

  it("throws when query exceeds 200 chars", async () => {
    const cache = makeCache([]);
    const longQuery = "a".repeat(201);
    await expect(handleQuerySbdToeEntities({ query: longQuery }, cache)).rejects.toThrow(
      '"query" é obrigatório'
    );
  });

  it("throws when query is not a string", async () => {
    const cache = makeCache([]);
    await expect(handleQuerySbdToeEntities({ query: 42 }, cache)).rejects.toThrow('"query"');
  });

  it("throws when topK is out of range", async () => {
    const cache = makeCache([]);
    await expect(handleQuerySbdToeEntities({ query: "test", topK: 0 }, cache)).rejects.toThrow(
      '"topK"'
    );
    await expect(handleQuerySbdToeEntities({ query: "test", topK: 16 }, cache)).rejects.toThrow(
      '"topK"'
    );
  });

  it("throws when topK is not an integer", async () => {
    const cache = makeCache([]);
    await expect(
      handleQuerySbdToeEntities({ query: "test", topK: 1.5 }, cache)
    ).rejects.toThrow('"topK"');
  });

  it("throws on invalid riskLevel", async () => {
    const cache = makeCache([]);
    await expect(
      handleQuerySbdToeEntities({ query: "test", riskLevel: "L9" }, cache)
    ).rejects.toThrow("riskLevel inválido");
  });

  it("returns entities and total from retrieved bundle", async () => {
    const record = makeNormalizedRecord();
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([record]) as never);
    const cache = makeCache([]);
    const result = (await handleQuerySbdToeEntities({ query: "test" }, cache)) as {
      entities: unknown[];
      total: number;
    };
    expect(result.entities).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("filters by entityType when provided", async () => {
    const r1 = makeNormalizedRecord({ raw: { entity_type: "practice_assignment" } });
    const r2 = makeNormalizedRecord({
      objectID: "e-002",
      raw: { entity_type: "chapter_bundle" }
    });
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([r1, r2]) as never);
    const cache = makeCache([]);
    const result = (await handleQuerySbdToeEntities(
      { query: "test", entityType: "practice_assignment" },
      cache
    )) as { entities: unknown[]; total: number };
    expect(result.total).toBe(1);
  });

  it("filters by chapterId when provided", async () => {
    const r1 = makeNormalizedRecord({
      chapter: "Cap. 01",
      raw: { chapter_id: "01-cap", entity_type: "practice" }
    });
    const r2 = makeNormalizedRecord({
      objectID: "e-002",
      chapter: "Cap. 02",
      raw: { chapter_id: "02-cap", entity_type: "practice" }
    });
    vi.mocked(retrievePublishedContext).mockResolvedValue(makeBundle([r1, r2]) as never);
    const cache = makeCache([]);
    const result = (await handleQuerySbdToeEntities(
      { query: "test", chapterId: "01-cap" },
      cache
    )) as { entities: unknown[]; total: number };
    expect(result.total).toBe(1);
  });

  it("uses default topK=5 when topK not provided", async () => {
    const cache = makeCache([]);
    await handleQuerySbdToeEntities({ query: "test" }, cache);
    expect(vi.mocked(retrievePublishedContext)).toHaveBeenCalledWith("test", 5);
  });

  it("passes provided topK to retrievePublishedContext", async () => {
    const cache = makeCache([]);
    await handleQuerySbdToeEntities({ query: "test", topK: 10 }, cache);
    expect(vi.mocked(retrievePublishedContext)).toHaveBeenCalledWith("test", 10);
  });
});

// --- get_sbd_toe_chapter_brief ---

describe("handleGetSbdToeChapterBrief", () => {
  it("throws when chapterId is empty", () => {
    const cache = makeCache([]);
    expect(() => handleGetSbdToeChapterBrief({ chapterId: "" }, cache)).toThrow(
      '"chapterId" é obrigatório'
    );
  });

  it("throws when chapterId is whitespace only", () => {
    const cache = makeCache([]);
    expect(() => handleGetSbdToeChapterBrief({ chapterId: "   " }, cache)).toThrow(
      '"chapterId" é obrigatório'
    );
  });

  it("throws when chapterId is not provided", () => {
    const cache = makeCache([]);
    expect(() => handleGetSbdToeChapterBrief({}, cache)).toThrow('"chapterId" é obrigatório');
  });

  it("returns found:false when chapter does not exist", () => {
    const cache = makeCache([]);
    const result = handleGetSbdToeChapterBrief({ chapterId: "unknown-id" }, cache) as {
      found: boolean;
      id: string;
    };
    expect(result.found).toBe(false);
    expect(result.id).toBe("unknown-id");
  });

  it("finds chapter by chapter_id field", () => {
    const item = makeChapterBundle("01-classificacao-aplicacoes", "Cap. 01");
    const cache = makeCache([item]);
    const result = handleGetSbdToeChapterBrief(
      { chapterId: "01-classificacao-aplicacoes" },
      cache
    ) as { found: boolean; id: string; title: string };
    expect(result.found).toBe(true);
    expect(result.id).toBe("01-classificacao-aplicacoes");
    expect(result.title).toBe("Cap. 01");
  });

  it("finds chapter by objectID field", () => {
    const item = makeChapterBundle("07-cicd", "Cap. 07");
    const cache = makeCache([item]);
    const objectID = `entity::chapter_bundle::07-cicd::bundle`;
    const result = handleGetSbdToeChapterBrief({ chapterId: objectID }, cache) as {
      found: boolean;
    };
    expect(result.found).toBe(true);
  });

  it("includes phases from related_phases field", () => {
    const item = makeChapterBundle("01-cap", "Cap. 01");
    const cache = makeCache([item]);
    const result = handleGetSbdToeChapterBrief({ chapterId: "01-cap" }, cache) as {
      phases?: string[];
    };
    expect(result.phases).toEqual(["design", "implementation"]);
  });

  it("includes objective from summary when present", () => {
    const item = makeChapterBundle("01-cap", "Cap. 01");
    const cache = makeCache([item]);
    const result = handleGetSbdToeChapterBrief({ chapterId: "01-cap" }, cache) as {
      objective?: string;
    };
    expect(result.objective).toBe("Summary of Cap. 01");
  });

  it("uses enriched lookup for intent_topics when available", () => {
    const objectID = "entity::chapter_bundle::01-cap::bundle";
    const item = {
      objectID,
      entity_type: "chapter_bundle",
      chapter_id: "01-cap",
      title: "Cap. 01",
      risk_levels: [],
      summary: "Test summary",
      related_phases: [],
      artifact_ids: []
    };
    const enrichedLookup = new Map([
      [objectID, { intent_topics: ["bootstrap", "classification"] as readonly string[] }]
    ]);
    const cache: SnapshotCache = {
      docs: { items: [] },
      entities: { items: [item as never] },
      docsEnrichedLookup: new Map(),
      entitiesEnrichedLookup: enrichedLookup
    };
    const result = handleGetSbdToeChapterBrief({ chapterId: "01-cap" }, cache) as {
      intent_topics?: string[];
    };
    expect(result.intent_topics).toEqual(["bootstrap", "classification"]);
  });
});

// --- map_sbd_toe_applicability ---

describe("handleMapSbdToeApplicability", () => {
  it("throws on undefined riskLevel", () => {
    const cache = makeCache([]);
    expect(() => handleMapSbdToeApplicability({}, cache)).toThrow("riskLevel é obrigatório");
  });

  it("throws on invalid riskLevel L4", () => {
    const cache = makeCache([]);
    expect(() => handleMapSbdToeApplicability({ riskLevel: "L4" }, cache)).toThrow(
      "riskLevel é obrigatório"
    );
  });

  it("throws on non-string riskLevel", () => {
    const cache = makeCache([]);
    expect(() => handleMapSbdToeApplicability({ riskLevel: 1 }, cache)).toThrow(
      "riskLevel é obrigatório"
    );
  });

  it("returns empty active/excluded when cache is empty", () => {
    const cache = makeCache([]);
    const result = handleMapSbdToeApplicability({ riskLevel: "L1" }, cache) as {
      riskLevel: string;
      active: string[];
      conditional: string[];
      excluded: string[];
    };
    expect(result.riskLevel).toBe("L1");
    expect(result.active).toEqual([]);
    expect(result.conditional).toEqual([]);
    expect(result.excluded).toEqual([]);
  });

  it("returns correct structure for L1 with chapter_bundle and practice_assignment", () => {
    const cache = makeCache([
      makeChapterBundle("01-cap", "Cap. 01"),
      makeChapterBundle("02-cap", "Cap. 02"),
      makePracticeAssignment("01-cap", ["L1", "L2"]),
      makePracticeAssignment("02-cap", ["L3"])
    ]);
    const result = handleMapSbdToeApplicability({ riskLevel: "L1" }, cache) as {
      active: string[];
      excluded: string[];
      conditional: string[];
    };
    expect(result.active).toContain("01-cap");
    expect(result.active).not.toContain("02-cap");
    expect(result.excluded).toContain("02-cap");
    expect(result.conditional).toEqual([]);
  });

  it("activates chapter that has any entity with matching riskLevel", () => {
    const cache = makeCache([
      makeChapterBundle("01-cap", "Cap. 01"),
      makePracticeAssignment("01-cap", ["L1", "L2", "L3"])
    ]);
    const resultL1 = handleMapSbdToeApplicability({ riskLevel: "L1" }, cache) as {
      active: string[];
    };
    const resultL2 = handleMapSbdToeApplicability({ riskLevel: "L2" }, cache) as {
      active: string[];
    };
    const resultL3 = handleMapSbdToeApplicability({ riskLevel: "L3" }, cache) as {
      active: string[];
    };
    expect(resultL1.active).toContain("01-cap");
    expect(resultL2.active).toContain("01-cap");
    expect(resultL3.active).toContain("01-cap");
  });

  it("excluded contains chapter_bundle chapters not active for the given level", () => {
    const cache = makeCache([
      makeChapterBundle("01-cap", "Cap. 01"),
      makeChapterBundle("02-cap", "Cap. 02"),
      makePracticeAssignment("01-cap", ["L1"])
    ]);
    const result = handleMapSbdToeApplicability({ riskLevel: "L1" }, cache) as {
      excluded: string[];
    };
    expect(result.excluded).toContain("02-cap");
    expect(result.excluded).not.toContain("01-cap");
  });
});
