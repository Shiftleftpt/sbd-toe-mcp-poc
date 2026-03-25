import type { SnapshotCache } from "../backend/semantic-index-gateway.js";
import { retrievePublishedContext } from "../backend/semantic-index-gateway.js";
import type { LooseRecord } from "../types.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(value);
}

function getStr(record: LooseRecord, key: string): string | undefined {
  const val = record[key];
  return typeof val === "string" ? val : undefined;
}

function getStrArr(record: LooseRecord, key: string): string[] {
  const val = record[key];
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string");
}

function getEntityItems(cache: SnapshotCache): LooseRecord[] {
  return cache.entities.items ?? [];
}

export function handleListSbdToeChapters(
  args: Record<string, unknown>,
  cache: SnapshotCache
): unknown {
  const riskLevelArg = args["riskLevel"];
  if (riskLevelArg !== undefined && !isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`
    );
  }
  const riskLevel = isValidRiskLevel(riskLevelArg) ? riskLevelArg : undefined;

  const items = getEntityItems(cache);
  const seen = new Set<string>();
  const chapters: Array<{ id: string; title: string }> = [];

  for (const item of items) {
    const oid = getStr(item, "objectID") ?? "";
    const entityType = getStr(item, "entity_type");
    const chapterId = getStr(item, "chapter_id");

    const isChapterRecord =
      entityType === "chapter_bundle" ||
      oid.startsWith("cap-") ||
      oid.startsWith("ch-") ||
      oid.toLowerCase().includes("chapter");

    if (!isChapterRecord) continue;

    const id = chapterId ?? oid;
    if (!id || seen.has(id)) continue;

    if (riskLevel !== undefined) {
      const riskLevels = getStrArr(item, "risk_levels");
      if (!riskLevels.includes(riskLevel)) continue;
    }

    seen.add(id);
    chapters.push({ id, title: getStr(item, "title") ?? id });
  }

  return { chapters };
}

export async function handleQuerySbdToeEntities(
  args: Record<string, unknown>,
  cache: SnapshotCache
): Promise<unknown> {
  void cache;

  const query = args["query"];
  if (typeof query !== "string" || query.length < 1 || query.length > 200) {
    throw new Error(
      'O argumento "query" é obrigatório e deve ter entre 1 e 200 caracteres.'
    );
  }

  const topKArg = args["topK"];
  if (topKArg !== undefined) {
    if (
      typeof topKArg !== "number" ||
      !Number.isInteger(topKArg) ||
      topKArg < 1 ||
      topKArg > 15
    ) {
      throw new Error('O argumento "topK" deve ser um inteiro entre 1 e 15.');
    }
  }
  const topK = typeof topKArg === "number" ? topKArg : 5;

  const riskLevelArg = args["riskLevel"];
  if (riskLevelArg !== undefined && !isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`
    );
  }
  const riskLevel = isValidRiskLevel(riskLevelArg) ? riskLevelArg : undefined;

  const entityType =
    typeof args["entityType"] === "string" ? args["entityType"] : undefined;
  const chapterId =
    typeof args["chapterId"] === "string" ? args["chapterId"] : undefined;

  const bundle = await retrievePublishedContext(query, topK);
  let results = bundle.retrieved;

  if (entityType !== undefined) {
    results = results.filter(
      (r) =>
        typeof r.raw["entity_type"] === "string" && r.raw["entity_type"] === entityType
    );
  }

  if (chapterId !== undefined) {
    results = results.filter((r) => {
      const rawChapterId = r.raw["chapter_id"];
      return (
        (typeof r.chapter === "string" && r.chapter.includes(chapterId)) ||
        (typeof rawChapterId === "string" && rawChapterId === chapterId)
      );
    });
  }

  if (riskLevel !== undefined) {
    results = results.filter((r) => {
      const rls = r.raw["risk_levels"];
      return Array.isArray(rls) && rls.includes(riskLevel);
    });
  }

  return { entities: results.slice(0, topK), total: results.length };
}

export function handleGetSbdToeChapterBrief(
  args: Record<string, unknown>,
  cache: SnapshotCache
): unknown {
  const chapterId = args["chapterId"];
  if (typeof chapterId !== "string" || chapterId.trim().length === 0) {
    throw new Error('O argumento "chapterId" é obrigatório e não pode ser vazio.');
  }

  const items = getEntityItems(cache);
  const enrichedLookup = cache.entitiesEnrichedLookup;

  let found: LooseRecord | undefined;
  for (const item of items) {
    const oid = getStr(item, "objectID") ?? "";
    const cid = getStr(item, "chapter_id") ?? "";
    if (oid === chapterId || cid === chapterId) {
      found = item;
      break;
    }
  }

  if (found === undefined) {
    return { id: chapterId, found: false };
  }

  const oid = getStr(found, "objectID");
  const enriched = oid !== undefined ? enrichedLookup.get(oid) : undefined;

  const phases = getStrArr(found, "related_phases");
  const intentTopics = enriched?.intent_topics
    ? [...enriched.intent_topics]
    : getStrArr(found, "intent_topics");
  const artifacts = enriched?.artifact_ids
    ? [...enriched.artifact_ids]
    : getStrArr(found, "artifact_ids");
  const objective =
    getStr(found, "summary") ?? getStr(found, "searchable_text");

  return {
    id: chapterId,
    found: true,
    title: getStr(found, "title") ?? chapterId,
    ...(objective !== undefined ? { objective } : {}),
    ...(phases.length > 0 ? { phases } : {}),
    ...(artifacts.length > 0 ? { artifacts } : {}),
    ...(intentTopics.length > 0 ? { intent_topics: intentTopics } : {})
  };
}

export function handleMapSbdToeApplicability(
  args: Record<string, unknown>,
  cache: SnapshotCache
): unknown {
  const riskLevelArg = args["riskLevel"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel é obrigatório e deve ser L1, L2 ou L3. Recebido: "${String(riskLevelArg)}".`
    );
  }
  const riskLevel = riskLevelArg;

  const items = getEntityItems(cache);

  const allChapterIds = new Set<string>();
  for (const item of items) {
    if (getStr(item, "entity_type") === "chapter_bundle") {
      const cid = getStr(item, "chapter_id");
      if (cid !== undefined) allChapterIds.add(cid);
    }
  }

  const activeChapterIds = new Set<string>();
  for (const item of items) {
    const rls = getStrArr(item, "risk_levels");
    if (rls.includes(riskLevel)) {
      const cid = getStr(item, "chapter_id");
      if (cid !== undefined) activeChapterIds.add(cid);
    }
  }

  const active = [...activeChapterIds].sort();
  const excluded = [...allChapterIds].filter((id) => !activeChapterIds.has(id)).sort();

  return {
    riskLevel,
    active,
    conditional: [],
    excluded
  };
}
