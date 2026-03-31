import { readFileSync } from "node:fs";
import type { SnapshotCache } from "../backend/semantic-index-gateway.js";
import { retrievePublishedContext } from "../backend/semantic-index-gateway.js";
import { resolveAppPath } from "../config.js";
import type { LooseRecord } from "../types.js";
import { getOntologyData } from "./ontology-loader.js";

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

const READABLE_TITLES: Record<string, string> = {
  "00-fundamentos":             "Fundamentos SbD-ToE",
  "01-classificacao-aplicacoes": "Classificação de Aplicações",
  "02-requisitos-seguranca":     "Requisitos de Segurança",
  "03-threat-modeling":          "Threat Modeling",
  "04-arquitetura-segura":       "Arquitetura Segura",
  "05-dependencias-sbom-sca":    "Dependências, SBOM e SCA",
  "06-desenvolvimento-seguro":   "Desenvolvimento Seguro",
  "07-cicd-seguro":              "CI/CD Seguro",
  "08-iac-infraestrutura":       "IaC e Infraestrutura",
  "09-containers-imagens":       "Containers e Imagens",
  "10-testes-seguranca":         "Testes de Segurança",
  "11-deploy-seguro":            "Deploy Seguro",
  "12-monitorizacao-operacoes":  "Monitorização e Operações",
  "13-formacao-onboarding":      "Formação e Onboarding",
  "14-governanca-contratacao":   "Governança e Contratação"
};

const ACTIVE_CHAPTERS_BY_RISK: Record<RiskLevel, string[]> = {
  L1: [
    "00-fundamentos",
    "01-classificacao-aplicacoes",
    "02-requisitos-seguranca",
    "03-threat-modeling",
    "04-arquitetura-segura",
    "05-dependencias-sbom-sca",
    "07-cicd-seguro",
    "08-iac-infraestrutura",
    "09-containers-imagens",
    "10-testes-seguranca",
    "12-monitorizacao-operacoes",
    "14-governanca-contratacao"
  ],
  L2: [
    "00-fundamentos",
    "01-classificacao-aplicacoes",
    "02-requisitos-seguranca",
    "03-threat-modeling",
    "04-arquitetura-segura",
    "05-dependencias-sbom-sca",
    "06-desenvolvimento-seguro",
    "07-cicd-seguro",
    "08-iac-infraestrutura",
    "09-containers-imagens",
    "10-testes-seguranca",
    "11-deploy-seguro",
    "12-monitorizacao-operacoes",
    "14-governanca-contratacao"
  ],
  L3: Object.keys(READABLE_TITLES),
};

let cachedBundleCatalog: LooseRecord[] | undefined;
let cachedMcpChunks: LooseRecord[] | undefined;

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

function hasProvidedCache(cache: SnapshotCache | undefined): cache is SnapshotCache {
  return cache !== undefined;
}

function loadJsonLines(relativePath: string): LooseRecord[] {
  const path = resolveAppPath(relativePath);
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .map((line: string) => JSON.parse(line) as LooseRecord);
}

function loadBundleCatalog(): LooseRecord[] {
  if (!cachedBundleCatalog) {
    cachedBundleCatalog = loadJsonLines("data/publish/indexes/bundle_catalog.jsonl");
  }
  return cachedBundleCatalog;
}

function loadMcpChunks(): LooseRecord[] {
  if (!cachedMcpChunks) {
    cachedMcpChunks = loadJsonLines("data/publish/indexes/mcp_chunks.jsonl");
  }
  return cachedMcpChunks;
}

function summarizeChunkText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const compact = text
    .replace(/^#+\s.*$/gmu, "")
    .replace(/^---$/gmu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return compact.length > 0 ? compact : undefined;
}

export function handleListSbdToeChapters(
  args: Record<string, unknown>,
  cache?: SnapshotCache
): unknown {
  const riskLevelArg = args["riskLevel"];
  if (riskLevelArg !== undefined && !isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`
    );
  }
  const riskLevel = isValidRiskLevel(riskLevelArg) ? riskLevelArg : undefined;

  if (hasProvidedCache(cache)) {
    const items = getEntityItems(cache);
    const seen = new Set<string>();
    const chapters: Array<{ id: string; title: string; readableTitle: string }> = [];

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
      const title = getStr(item, "title") ?? id;
      chapters.push({ id, title, readableTitle: READABLE_TITLES[id] ?? title });
    }

    return { chapters };
  }

  const titleByChapter = new Map(
    loadBundleCatalog()
      .map((item) => [getStr(item, "bundle_id"), getStr(item, "title")] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1]))
  );

  const chapterIds = Object.keys(READABLE_TITLES).filter((chapterId) =>
    riskLevel === undefined ? true : ACTIVE_CHAPTERS_BY_RISK[riskLevel].includes(chapterId)
  );

  const chapters = chapterIds.map((id) => {
    const title = titleByChapter.get(id) ?? READABLE_TITLES[id] ?? id;
    return { id, title, readableTitle: READABLE_TITLES[id] ?? title };
  });

  return { chapters };
}

export async function handleQuerySbdToeEntities(
  args: Record<string, unknown>,
  cache?: SnapshotCache
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

  // Strip internal fields (raw Algolia record, scoring) — not useful to the agent.
  const entities = results.slice(0, topK).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ raw, algoliaRank, localScore, indexName, ...rest }) => rest
  );
  return { entities, total: results.length };
}

export function handleGetSbdToeChapterBrief(
  args: Record<string, unknown>,
  cache?: SnapshotCache
): unknown {
  const chapterId = args["chapterId"];
  if (typeof chapterId !== "string" || chapterId.trim().length === 0) {
    throw new Error('O argumento "chapterId" é obrigatório e não pode ser vazio.');
  }

  if (hasProvidedCache(cache)) {
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

  const bundle = loadBundleCatalog().find((item) => getStr(item, "bundle_id") === chapterId);
  if (!bundle && READABLE_TITLES[chapterId] === undefined) {
    return { id: chapterId, found: false };
  }

  const ontology = getOntologyData();
  const phases = Array.from(
    new Set(
      ontology.assignments
        .filter((assignment) => assignment.chapter_id === chapterId && assignment.phase.length > 0)
        .map((assignment) => assignment.phase)
    )
  ).sort();
  const artifacts = Array.from(
    new Set(
      (ontology.artifactRequirements ?? [])
        .filter((artifactRequirement) => (artifactRequirement.chapter_ids ?? []).includes(chapterId))
        .map((artifactRequirement) => artifactRequirement.artifact_type_id)
    )
  ).sort();
  const introChunk = loadMcpChunks().find((item) => {
    const bundleId = getStr(item, "bundle_id");
    const documentRole = getStr(item, "document_role");
    const documentId = getStr(item, "document_id");
    const summaryDocumentId = bundle ? getStr(bundle, "summary_document_id") : undefined;
    return (
      bundleId === chapterId &&
      (documentRole === "intro" || documentId === summaryDocumentId)
    );
  });

  const objective = summarizeChunkText(
    (introChunk ? getStr(introChunk, "text") : undefined) ??
      (introChunk ? getStr(introChunk, "vector_text") : undefined)
  );

  return {
    id: chapterId,
    found: true,
    title: (bundle ? getStr(bundle, "title") : undefined) ?? READABLE_TITLES[chapterId] ?? chapterId,
    ...(objective !== undefined ? { objective } : {}),
    ...(phases.length > 0 ? { phases } : {}),
    ...(artifacts.length > 0 ? { artifacts } : {})
  };
}

const VALID_TECHNOLOGIES = [
  "containers", "serverless", "kubernetes", "ci-cd", "iac", "api-gateway",
  "mobile", "spa", "microservices", "legacy-integration", "ml-ai", "data-pipeline",
  "sca-sbom", "sast", "dast", "secrets-management", "monitoring", "iam",
  "network-segmentation", "cryptography"
] as const;

type Technology = (typeof VALID_TECHNOLOGIES)[number];

const VALID_PROJECT_ROLES = [
  "developer", "architect", "security", "devops", "manager"
] as const;

type ProjectRole = (typeof VALID_PROJECT_ROLES)[number];

function isValidTechnology(value: unknown): value is Technology {
  return typeof value === "string" && (VALID_TECHNOLOGIES as readonly string[]).includes(value);
}

function isValidProjectRole(value: unknown): value is ProjectRole {
  return typeof value === "string" && (VALID_PROJECT_ROLES as readonly string[]).includes(value);
}

interface ActivatedBundle {
  chapterId: string;
  status: "active" | "conditional";
  reason: string;
}

interface ActivatedBundles {
  foundationBundles: ActivatedBundle[];
  domainBundles: ActivatedBundle[];
  operationalBundles: ActivatedBundle[];
}

function buildActivatedBundles(
  riskLevel: RiskLevel,
  technologies: Technology[]
): ActivatedBundles {
  const techSet = new Set(technologies);

  const foundationBundles: ActivatedBundle[] = [
    { chapterId: "01-classificacao-aplicacoes", status: "active", reason: "Obrigatório L1+" },
    { chapterId: "02-requisitos-seguranca",      status: "active", reason: "Obrigatório L1+" },
    { chapterId: "03-threat-modeling",           status: "active", reason: "Obrigatório L1+" }
  ];

  const domainBundles: ActivatedBundle[] = [];
  if (techSet.has("sca-sbom") || techSet.has("sast") || techSet.has("dast")) {
    domainBundles.push({
      chapterId: "05-dependencias-sbom-sca",
      status: "active",
      reason: `technologies inclui ${(["sca-sbom", "sast", "dast"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }
  if (riskLevel === "L2" || riskLevel === "L3") {
    domainBundles.push({
      chapterId: "06-desenvolvimento-seguro",
      status: "active",
      reason: `Sempre para ${riskLevel}+`
    });
  }
  if (techSet.has("iac") || techSet.has("containers") || techSet.has("kubernetes")) {
    domainBundles.push({
      chapterId: "08-iac-infraestrutura",
      status: "active",
      reason: `technologies inclui ${(["iac", "containers", "kubernetes"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }
  if (techSet.has("containers") || techSet.has("kubernetes")) {
    domainBundles.push({
      chapterId: "09-containers-imagens",
      status: "active",
      reason: `technologies inclui ${(["containers", "kubernetes"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }
  if (techSet.has("sast") || techSet.has("dast")) {
    domainBundles.push({
      chapterId: "10-testes-seguranca",
      status: "active",
      reason: `technologies inclui ${(["sast", "dast"] as const).filter((t) => techSet.has(t)).join(", ")}`
    });
  }

  const operationalBundles: ActivatedBundle[] = [];
  if (techSet.has("ci-cd")) {
    operationalBundles.push({
      chapterId: "07-cicd-seguro",
      status: "active",
      reason: "technologies inclui ci-cd"
    });
  }
  if (riskLevel === "L2" || riskLevel === "L3") {
    operationalBundles.push({
      chapterId: "11-deploy-seguro",
      status: "active",
      reason: "L2+"
    });
  }
  if (techSet.has("monitoring")) {
    operationalBundles.push({
      chapterId: "12-monitorizacao-operacoes",
      status: "active",
      reason: "technologies inclui monitoring"
    });
  }

  return { foundationBundles, domainBundles, operationalBundles };
}

export function handleMapSbdToeApplicability(
  args: Record<string, unknown>,
  cache?: SnapshotCache
): unknown {
  const riskLevelArg = args["riskLevel"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw new Error(
      `riskLevel é obrigatório e deve ser L1, L2 ou L3. Recebido: "${String(riskLevelArg)}".`
    );
  }
  const riskLevel = riskLevelArg;

  // Validate optional technologies allowlist
  const technologiesArg = args["technologies"];
  let technologies: Technology[] = [];
  if (technologiesArg !== undefined) {
    if (!Array.isArray(technologiesArg)) {
      const err: { code: number; message: string; data: unknown } = {
        code: -32602,
        message: 'O argumento "technologies" deve ser um array.',
        data: null
      };
      throw Object.assign(new Error(err.message), { rpcError: err });
    }
    const invalidTechs = (technologiesArg as unknown[]).filter((t) => !isValidTechnology(t));
    if (invalidTechs.length > 0) {
      const err = {
        code: -32602,
        message: `Valores inválidos em "technologies": ${invalidTechs.map(String).join(", ")}. Valores permitidos: ${VALID_TECHNOLOGIES.join(", ")}.`,
        data: { invalidValues: invalidTechs }
      };
      throw Object.assign(new Error(err.message), { rpcError: err });
    }
    technologies = (technologiesArg as unknown[]).filter(isValidTechnology);
  }

  // Validate optional projectRole allowlist
  const projectRoleArg = args["projectRole"];
  if (projectRoleArg !== undefined && !isValidProjectRole(projectRoleArg)) {
    const err = {
      code: -32602,
      message: `Valor inválido em "projectRole": "${String(projectRoleArg)}". Valores permitidos: ${VALID_PROJECT_ROLES.join(", ")}.`,
      data: { invalidValue: projectRoleArg }
    };
    throw Object.assign(new Error(err.message), { rpcError: err });
  }

  let active: string[];
  let excluded: string[];

  if (hasProvidedCache(cache)) {
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

    active = [...activeChapterIds].sort();
    excluded = [...allChapterIds].filter((id) => !activeChapterIds.has(id)).sort();
  } else {
    active = [...ACTIVE_CHAPTERS_BY_RISK[riskLevel]].sort();
    excluded = Object.keys(READABLE_TITLES)
      .filter((id) => !ACTIVE_CHAPTERS_BY_RISK[riskLevel].includes(id))
      .sort();
  }

  const activatedBundles = buildActivatedBundles(riskLevel, technologies);

  // 13-formacao-onboarding: apenas L3
  if (riskLevel === "L3") {
    activatedBundles.operationalBundles.push({
      chapterId: "13-formacao-onboarding",
      status: "active",
      reason: "L3"
    });
  }

  return {
    riskLevel,
    active,
    conditional: [],
    excluded,
    activatedBundles
  };
}
