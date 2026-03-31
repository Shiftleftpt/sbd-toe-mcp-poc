import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

import { getConfig, resolveAppPath } from "../config.js";
import type {
  LooseRecord,
  NormalizedRecord,
  RetrievalBundle,
  RetrievalSource,
  SnapshotPayload
} from "../types.js";
import { tryLoadBackendCheckout } from "../upstream/backend-contract.js";

const TITLE_KEYS = [
  "title",
  "heading",
  "section_title",
  "practice_title",
  "chapter_title",
  "label",
  "name",
  "entity",
  "entity_label"
] as const;

const EXCERPT_KEYS = [
  "content",
  "content_text",
  "text",
  "summary",
  "body",
  "description",
  "chunk_text",
  "record_text",
  "plain_text",
  "searchable_text"
] as const;

const CHAPTER_KEYS = ["chapter_title", "chapter_name", "chapter", "chapter_id"] as const;
const SECTION_KEYS = ["section_title", "section_name", "section", "section_id"] as const;
const ROLE_KEYS = ["role", "roles", "persona", "owner_role", "related_roles"] as const;
const PHASE_KEYS = ["phase", "lifecycle_phase", "stage", "go_live_phase", "related_phases"] as const;
const ACTION_KEYS = ["action", "recommended_action", "requirement", "control"] as const;
const ARTEFACT_KEYS = ["artefact", "artifact", "evidence", "deliverable"] as const;
const URL_KEYS = ["url", "source_url", "page_url", "record_url", "manual_url"] as const;
const PAGE_KEYS = ["page", "page_label", "page_number", "location"] as const;
const TAG_KEYS = [
  "tags",
  "keywords",
  "labels",
  "topics",
  "related_frameworks",
  "related_risk_levels"
] as const;
const DOCUMENT_PATH_KEYS = ["document_path"] as const;
const CHAPTER_PATH_KEYS = ["chapter_path"] as const;
const DOCUMENT_TITLE_KEYS = ["document_title"] as const;

const SOURCE_PRIORITY: Record<RetrievalSource, number> = {
  mcp: 0,
  docs: 1,
  entities: 2
};

const SOURCE_PREFIX: Record<RetrievalSource, string> = {
  mcp: "M",
  docs: "D",
  entities: "E"
};

export interface EnrichedFields {
  readonly aliases_pt_en?: readonly string[] | undefined;
  readonly intent_topics?: readonly string[] | undefined;
  readonly canonical_control_ids?: readonly string[] | undefined;
  readonly artifact_ids?: readonly string[] | undefined;
  readonly authority_level?: string | undefined;
}

export type EnrichedLookup = ReadonlyMap<string, EnrichedFields>;

export interface SnapshotCache {
  docs: SnapshotPayload;
  entities: SnapshotPayload;
  docsEnrichedLookup: EnrichedLookup;
  entitiesEnrichedLookup: EnrichedLookup;
}

interface PublicationManifestPayload {
  primary_artifact?: string;
  substrate_version?: string;
  counts?: Record<string, number>;
}

type SupportProfile = "consult" | "guide" | "review" | "threats";

interface PublishedSubstrateCache {
  ontology: Record<string, unknown>;
  publicationManifest: PublicationManifestPayload;
  mcpChunks: LooseRecord[];
  entityMentionTokensByChunk: ReadonlyMap<string, readonly string[]>;
  relationHintTokensByChunk: ReadonlyMap<string, readonly string[]>;
}

let cachedPublishedSubstrate: PublishedSubstrateCache | undefined;

function extractStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const result = value.filter((item): item is string => typeof item === "string");
  return result.length > 0 ? result : undefined;
}

export function buildEnrichedLookup(payload: SnapshotPayload): EnrichedLookup {
  const map = new Map<string, EnrichedFields>();
  for (const item of payload.items ?? []) {
    const id = typeof item.objectID === "string" ? item.objectID : undefined;
    if (!id) {
      continue;
    }
    map.set(id, {
      aliases_pt_en: extractStringArray(item.aliases_pt_en),
      intent_topics: extractStringArray(item.intent_topics),
      canonical_control_ids: extractStringArray(item.canonical_control_ids),
      artifact_ids: extractStringArray(item.artifact_ids),
      authority_level:
        typeof item.authority_level === "string" ? item.authority_level : undefined
    });
  }
  return map;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function flattenUnknown(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const normalized = normalizeWhitespace(value);
    return normalized.length > 0 ? normalized : undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const flattened = value
      .map((item) => flattenUnknown(item))
      .filter((item): item is string => Boolean(item));

    return flattened.length > 0 ? normalizeWhitespace(flattened.join(" | ")) : undefined;
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const directText = ["value", "text", "label", "name"]
      .map((key) => flattenUnknown(object[key]))
      .find(Boolean);

    if (directText) {
      return directText;
    }
  }

  return undefined;
}

function firstString(record: LooseRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = flattenUnknown(record[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function stringList(record: LooseRecord, keys: readonly string[]): string[] {
  const values: string[] = [];

  for (const key of keys) {
    const rawValue = record[key];
    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        const text = flattenUnknown(item);
        if (text) {
          values.push(text);
        }
      }
      continue;
    }

    const text = flattenUnknown(rawValue);
    if (text) {
      values.push(text);
    }
  }

  return Array.from(new Set(values));
}

function numericValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function truncate(text: string, maxLength = 900): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function tokenize(value: string): string[] {
  return normalizeForSearch(value)
    .split(/[^\p{L}\p{N}]+/gu)
    .filter((token) => token.length > 2);
}

function uniqueStrings(values: Iterable<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function flattenTokenArray(values: Iterable<unknown>, maxItems = 8): string[] {
  const flattened: string[] = [];

  for (const value of values) {
    const text = flattenUnknown(value);
    if (text) {
      flattened.push(text);
    }
    if (flattened.length >= maxItems) {
      break;
    }
  }

  return uniqueStrings(flattened);
}

function readJsonFileRequired<T>(filePath: string): T {
  const absolutePath = resolveAppPath(filePath);

  let raw: string;
  try {
    raw = readFileSync(absolutePath, "utf8");
  } catch {
    throw new Error(
      `Falta o artefacto publish obrigatório em "${absolutePath}". Corre "npm run checkout:backend" primeiro.`
    );
  }

  return JSON.parse(raw) as T;
}

function readYamlFileRequired<T>(filePath: string): T {
  const absolutePath = resolveAppPath(filePath);

  let raw: string;
  try {
    raw = readFileSync(absolutePath, "utf8");
  } catch {
    throw new Error(
      `Falta o artefacto publish obrigatório em "${absolutePath}". Corre "npm run checkout:backend" primeiro.`
    );
  }

  return parseYaml(raw) as T;
}

function readJsonLinesFileRequired(filePath: string): LooseRecord[] {
  const absolutePath = resolveAppPath(filePath);

  let raw: string;
  try {
    raw = readFileSync(absolutePath, "utf8");
  } catch {
    throw new Error(
      `Falta o artefacto publish obrigatório em "${absolutePath}". Corre "npm run checkout:backend" primeiro.`
    );
  }

  return raw
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LooseRecord);
}

function parseSupportProfiles(value: unknown): SupportProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is SupportProfile =>
      item === "consult" || item === "guide" || item === "review" || item === "threats"
  );
}

export function resolveSupportProfiles(query: string): SupportProfile[] {
  const normalized = normalizeForSearch(query);
  const matches: SupportProfile[] = [];

  if (
    /(?:ameac|threat|stride|attack|ataque|causal|kill chain|abuse|abuso)/u.test(normalized)
  ) {
    matches.push("threats");
  }

  if (
    /(?:review|rever|auditar|audit|evidenc|evidence|checklist|gap|conform|compliance|verify|verificar)/u.test(
      normalized
    )
  ) {
    matches.push("review");
  }

  if (
    /(?:como|how|implement|design|arquitet|configure|configurar|document|estrutura|pattern|playbook|guia)/u.test(
      normalized
    )
  ) {
    matches.push("guide");
  }

  if (
    matches.length === 0 ||
    /(?:applic|aplica|requisit|requirement|control|controlo|consulta|consult)/u.test(normalized)
  ) {
    matches.push("consult");
  }

  return uniqueStrings(matches) as SupportProfile[];
}

type QueryIntent =
  | "repo_bootstrap"
  | "dependency_governance"
  | "ci_cd_gates"
  | "review_scope"
  | "canonical_guidance"
  | "generic";

const CANONICAL_ALIASES_PT_EN: Record<string, readonly string[]> = {
  "repositório de código": ["code repository", "codebase", "repository"],
  "dependências": ["dependencies", "dependency", "package"],
  "dependência": ["dependency", "dependencies", "package"],
  sbom: ["software bill of materials", "bill of materials"],
  "bill of materials": ["sbom", "bills"],
  sca: ["software composition analysis", "composition analysis"],
  "composition analysis": ["sca", "software composition"],
  "ci/cd": ["continuous integration", "continuous delivery", "pipeline", "ci", "cd"],
  "continuous integration": ["ci/cd", "ci", "pipeline"],
  "continuous delivery": ["ci/cd", "cd", "pipeline"],
  pipeline: ["ci/cd", "workflow", "workflow github actions"],
  "github actions": ["pipeline", "workflow", "action", "github"],
  "workflow github": ["github actions", "workflow github actions"],
  aprovação: ["approval", "review", "approve"],
  "aprovação de publicação": ["release approval", "publish approval"],
  aprovações: ["approvals", "reviews"],
  exceção: ["exception", "exemption", "waiver"],
  exceções: ["exceptions", "exemptions", "waivers"],
  capítulo: ["chapter", "section", "guide"],
  controlo: ["control", "requirement", "verificação"],
  "sast": ["static analysis", "security analysis", "code scanning"],
  "static analysis": ["sast", "security analysis"],
  "git": ["version control", "vcs", "scm"],
  "configuration management": ["version control", "git"],
  "upstream": ["backend", "source"],
  "snapshot": ["snapshot", "snapshot enriched", "enriched"],
  publicação: ["publication", "publishing", "release"],
  publicar: ["publish", "publishing", "release"]
};

const INTENT_KEYWORDS: Record<QueryIntent, readonly string[]> = {
  repo_bootstrap: ["bootstrap", "criar", "create", "new", "setup", "inicializar", "init", "repository"],
  dependency_governance: [
    "dependência",
    "dependency",
    "sbom",
    "sca",
    "package",
    "lock",
    "upgrade",
    "atualizar",
    "vendor"
  ],
  ci_cd_gates: [
    "ci/cd",
    "pipeline",
    "workflow",
    "github actions",
    "gate",
    "approval",
    "validação",
    "check",
    "teste"
  ],
  review_scope: ["rever", "review", "auditar", "verificar", "check", "scope", "escopo", "o que", "what"],
  canonical_guidance: ["como", "how", "quando", "when", "onde", "where", "guidance", "melhor", "best"],
  generic: []
};

export function expandQueryWithAliases(query: string): string {
  let expanded = query;

  for (const [canonical, aliases] of Object.entries(CANONICAL_ALIASES_PT_EN)) {
    const pattern = new RegExp(`\\b${canonical}\\b`, "gi");
    if (pattern.test(expanded)) {
      const expansion = aliases.join(" ");
      expanded = expanded.replace(pattern, (match) => `${match} ${expansion}`);
    }
  }

  return expanded;
}

export function classifyQueryIntent(query: string): QueryIntent {
  const normalized = normalizeForSearch(query);
  const tokens = tokenize(query);

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as Array<[QueryIntent, readonly string[]]>) {
    if (intent === "generic") continue;

    for (const keyword of keywords) {
      const keywordNormalized = normalizeForSearch(keyword);
      if (normalized.includes(keywordNormalized) || tokens.some((t) => keywordNormalized.includes(t) || t.includes(keywordNormalized))) {
        return intent;
      }
    }
  }

  return "generic";
}

export function computeIntentScore(
  record: Omit<NormalizedRecord, "localScore">,
  intent: QueryIntent,
  expandedTokens: string[]
): number {
  let boost = 0;

  if (record.intent_topics && record.intent_topics.length > 0) {
    for (const topic of record.intent_topics) {
      const topicNormalized = normalizeForSearch(topic);
      if (intent === "repo_bootstrap" && topicNormalized.includes("bootstrap")) {
        boost += 3;
      }
      if (intent === "dependency_governance" && (topicNormalized.includes("depend") || topicNormalized.includes("sbom") || topicNormalized.includes("sca"))) {
        boost += 3;
      }
      if (intent === "ci_cd_gates" && (topicNormalized.includes("pipeline") || topicNormalized.includes("ci") || topicNormalized.includes("gate"))) {
        boost += 3;
      }
      if (intent === "review_scope" && topicNormalized.includes("review")) {
        boost += 2;
      }
    }
  }

  if (record.aliases_pt_en && record.aliases_pt_en.length > 0) {
    for (const alias of record.aliases_pt_en) {
      const aliasNormalized = normalizeForSearch(alias);
      const aliasTokenized = tokenize(alias);
      if (expandedTokens.some((t) => aliasNormalized.includes(t) || aliasTokenized.includes(t))) {
        boost += 2;
      }
    }
  }

  if (record.authority_level) {
    const levelNormalized = normalizeForSearch(record.authority_level);
    if (levelNormalized === "canonical" && intent !== "generic") {
      boost += 1;
    }
    if ((levelNormalized === "demo" || levelNormalized === "example" || levelNormalized === "training") && intent !== "generic") {
      boost -= 1;
    }
  }

  return boost;
}

function deriveExcerpt(record: LooseRecord): string {
  const excerpt = firstString(record, EXCERPT_KEYS);
  if (excerpt) {
    return truncate(excerpt);
  }

  const fallback = Object.entries(record)
    .filter(([key]) => !key.startsWith("_"))
    .slice(0, 10)
    .map(([key, value]) => {
      const flattened = flattenUnknown(value);
      return flattened ? `${key}: ${flattened}` : undefined;
    })
    .filter((item): item is string => Boolean(item))
    .join(" | ");

  return truncate(fallback || "Sem excerto textual disponível no record recuperado.");
}

function buildObjectId(record: LooseRecord, indexName: string, rank: number): string {
  const candidates = [record.objectID, record.id, record.record_id]
    .map((value) => flattenUnknown(value))
    .filter((value): value is string => Boolean(value));

  return candidates[0] ?? `${indexName}#${rank + 1}`;
}

function trimLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, "");
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function derivePageUrl(record: LooseRecord): string | undefined {
  const config = getConfig();
  const explicitUrl = firstString(record, URL_KEYS);
  if (explicitUrl) {
    return explicitUrl;
  }

  const rawPath =
    firstString(record, DOCUMENT_PATH_KEYS) ?? firstString(record, CHAPTER_PATH_KEYS);
  if (!rawPath) {
    return undefined;
  }

  const normalizedPath = trimLeadingSlashes(rawPath.replace(/\\/g, "/"));
  if (normalizedPath.startsWith("010-sbd-manual/")) {
    const relativePath = normalizedPath
      .slice("010-sbd-manual/".length)
      .replace(/\.md$/i, "")
      .replace(/\/index$/i, "");
    return `${trimTrailingSlashes(config.prompt.manualBaseUrl)}/${trimLeadingSlashes(relativePath)}`;
  }

  if (normalizedPath.startsWith("002-cross-check-normativo/")) {
    const relativePath = normalizedPath
      .slice("002-cross-check-normativo/".length)
      .replace(/\.md$/i, "")
      .replace(/\/index$/i, "");
    return `${trimTrailingSlashes(config.prompt.crossCheckBaseUrl)}/${trimLeadingSlashes(relativePath)}`;
  }

  return undefined;
}

function buildLocalScore(query: string, record: Omit<NormalizedRecord, "localScore">): number {
  const expandedQuery = expandQueryWithAliases(query);
  const queryText = normalizeForSearch(expandedQuery);
  const tokens = Array.from(new Set(tokenize(expandedQuery)));
  const intent = classifyQueryIntent(query);

  const title = normalizeForSearch(record.title);
  const metadata = normalizeForSearch(
    [
      record.chapter,
      record.section,
      record.role,
      record.phase,
      record.action,
      record.artefact,
      record.tags.join(" "),
      record.documentTitle
    ]
      .filter(Boolean)
      .join(" ")
  );
  const excerpt = normalizeForSearch(record.excerpt);
  let score = record.source === "docs" ? 6 : 4;

  if (queryText.length > 0 && title.includes(queryText)) {
    score += 10;
  }
  if (queryText.length > 0 && metadata.includes(queryText)) {
    score += 6;
  }
  if (queryText.length > 0 && excerpt.includes(queryText)) {
    score += 4;
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 3;
      continue;
    }
    if (metadata.includes(token)) {
      score += 2;
      continue;
    }
    if (excerpt.includes(token)) {
      score += 1;
    }
  }

  const askAiPriority = numericValue(record.raw.ask_ai_priority_rank);
  if (askAiPriority !== undefined) {
    score += Math.max(0, 6 - askAiPriority);
  }

  const confidence = numericValue(record.raw.confidence);
  if (confidence !== undefined) {
    score += confidence * 2;
  }

  if (booleanValue(record.raw.is_primary_source)) {
    score += 2;
  }

  const intentBoost = computeIntentScore(record, intent, tokens);
  score += intentBoost;

  return Number(score.toFixed(2));
}

export function normalizeHit(
  hit: LooseRecord,
  source: RetrievalSource,
  indexName: string,
  rank: number,
  citationId: string,
  query: string,
  enrichedLookup?: EnrichedLookup
): NormalizedRecord {
  const enrichedId = typeof hit.objectID === "string" ? hit.objectID : undefined;
  const enriched = enrichedId ? enrichedLookup?.get(enrichedId) : undefined;
  const documentPath = firstString(hit, DOCUMENT_PATH_KEYS);
  const chapterPath = firstString(hit, CHAPTER_PATH_KEYS);
  const baseRecord: Omit<NormalizedRecord, "localScore"> = {
    citationId,
    source,
    indexName,
    objectID: buildObjectId(hit, indexName, rank),
    title:
      firstString(hit, TITLE_KEYS) ??
      firstString(hit, SECTION_KEYS) ??
      firstString(hit, CHAPTER_KEYS) ??
      `Record ${rank + 1}`,
    excerpt: deriveExcerpt(hit),
    chapter: firstString(hit, CHAPTER_KEYS),
    section: firstString(hit, SECTION_KEYS),
    role: firstString(hit, ROLE_KEYS),
    phase: firstString(hit, PHASE_KEYS),
    action: firstString(hit, ACTION_KEYS),
    artefact: firstString(hit, ARTEFACT_KEYS),
    url: derivePageUrl(hit),
    pageLabel: firstString(hit, PAGE_KEYS) ?? documentPath ?? chapterPath,
    documentPath,
    chapterPath,
    documentTitle: firstString(hit, DOCUMENT_TITLE_KEYS),
    tags: stringList(hit, TAG_KEYS),
    aliases_pt_en: enriched?.aliases_pt_en,
    intent_topics: enriched?.intent_topics,
    canonical_control_ids: enriched?.canonical_control_ids,
    artifact_ids: enriched?.artifact_ids,
    authority_level: enriched?.authority_level,
    algoliaRank: rank + 1,
    raw: hit
  };

  return {
    ...baseRecord,
    localScore: buildLocalScore(query, baseRecord)
  };
}

function sortByPriority(records: NormalizedRecord[]): NormalizedRecord[] {
  return [...records].sort((left, right) => {
    const sourceDifference = SOURCE_PRIORITY[left.source] - SOURCE_PRIORITY[right.source];
    if (sourceDifference !== 0) {
      return sourceDifference;
    }
    if (right.localScore !== left.localScore) {
      return right.localScore - left.localScore;
    }
    return left.algoliaRank - right.algoliaRank;
  });
}

function dedupeRecords(records: NormalizedRecord[]): NormalizedRecord[] {
  const seen = new Set<string>();
  const deduped: NormalizedRecord[] = [];

  for (const record of records) {
    const fingerprint = normalizeForSearch(
      `${record.objectID}|${record.title}|${record.chapter ?? ""}|${record.excerpt}`
    );
    if (seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);
    deduped.push(record);
  }

  return deduped;
}

function extractTraceability(record: LooseRecord): NormalizedRecord["traceability"] {
  const traceability =
    typeof record.traceability === "object" && record.traceability !== null
      ? (record.traceability as Record<string, unknown>)
      : undefined;

  if (!traceability) {
    return undefined;
  }

  const sourcePath = flattenUnknown(traceability.source_path);
  const lineStart = numericValue(traceability.line_start);
  const lineEnd = numericValue(traceability.line_end);
  const unitId = flattenUnknown(traceability.unit_id);

  if (
    sourcePath === undefined &&
    lineStart === undefined &&
    lineEnd === undefined &&
    unitId === undefined
  ) {
    return undefined;
  }

  return {
    ...(sourcePath === undefined ? {} : { sourcePath }),
    ...(lineStart === undefined ? {} : { lineStart }),
    ...(lineEnd === undefined ? {} : { lineEnd }),
    ...(unitId === undefined ? {} : { unitId })
  };
}

function buildLineLabel(traceability: NormalizedRecord["traceability"]): string | undefined {
  if (!traceability?.lineStart) {
    return undefined;
  }

  return traceability.lineEnd && traceability.lineEnd !== traceability.lineStart
    ? `L${traceability.lineStart}-L${traceability.lineEnd}`
    : `L${traceability.lineStart}`;
}

function buildChunkTokenLookup(
  records: LooseRecord[],
  selectValues: (record: LooseRecord) => Iterable<unknown>
): ReadonlyMap<string, readonly string[]> {
  const grouped = new Map<string, string[]>();

  for (const record of records) {
    const chunkId = flattenUnknown(record.chunk_id);
    if (!chunkId) {
      continue;
    }

    const tokens = flattenTokenArray(selectValues(record), 12);
    if (tokens.length === 0) {
      continue;
    }

    const existing = grouped.get(chunkId) ?? [];
    existing.push(...tokens);
    grouped.set(chunkId, existing);
  }

  const deduped = new Map<string, readonly string[]>();
  for (const [chunkId, values] of grouped.entries()) {
    deduped.set(chunkId, uniqueStrings(values));
  }

  return deduped;
}

function loadPublishedSubstrate(): PublishedSubstrateCache {
  if (cachedPublishedSubstrate) {
    return cachedPublishedSubstrate;
  }

  const config = getConfig();
  const ontology = readYamlFileRequired<Record<string, unknown>>(
    "data/publish/sbdtoe-ontology.yaml"
  );
  const publicationManifest = readJsonFileRequired<PublicationManifestPayload>(
    config.backend.publicationManifestFile
  );
  const mcpChunks = readJsonLinesFileRequired(config.backend.mcpChunksFile);
  const chunkEntityMentions = readJsonLinesFileRequired(config.backend.chunkEntityMentionsFile);
  const chunkRelationHints = readJsonLinesFileRequired(config.backend.chunkRelationHintsFile);

  cachedPublishedSubstrate = {
    ontology,
    publicationManifest,
    mcpChunks,
    entityMentionTokensByChunk: buildChunkTokenLookup(chunkEntityMentions, (record) => [
      record.entity_id,
      record.entity_type,
      record.mention_text
    ]),
    relationHintTokensByChunk: buildChunkTokenLookup(chunkRelationHints, (record) => [
      record.relation_type,
      record.target_id,
      record.target_type
    ])
  };

  return cachedPublishedSubstrate;
}

function computeAssociationBoost(
  query: string,
  supportProfiles: readonly SupportProfile[],
  preferredProfiles: readonly SupportProfile[],
  entityTokens: readonly string[],
  relationTokens: readonly string[]
): number {
  const expandedQuery = expandQueryWithAliases(query);
  const queryText = normalizeForSearch(expandedQuery);
  const queryTokens = tokenize(expandedQuery);

  let boost = 0;

  if (
    preferredProfiles.length > 0 &&
    supportProfiles.some((profile) => preferredProfiles.includes(profile))
  ) {
    boost += 4;
  }

  const entityBlob = normalizeForSearch(entityTokens.join(" "));
  const relationBlob = normalizeForSearch(relationTokens.join(" "));

  if (queryText.length > 0 && entityBlob.includes(queryText)) {
    boost += 2;
  }
  if (queryText.length > 0 && relationBlob.includes(queryText)) {
    boost += 1;
  }

  for (const token of queryTokens) {
    if (entityBlob.includes(token)) {
      boost += 1.25;
    }
    if (relationBlob.includes(token)) {
      boost += 0.75;
    }
  }

  return Number(boost.toFixed(2));
}

function normalizeMcpChunk(
  chunk: LooseRecord,
  rank: number,
  citationId: string,
  query: string,
  substrate: PublishedSubstrateCache,
  preferredProfiles: readonly SupportProfile[]
): NormalizedRecord {
  const chunkId = flattenUnknown(chunk.chunk_id);
  const traceability = extractTraceability(chunk);
  const entityTokens = chunkId ? substrate.entityMentionTokensByChunk.get(chunkId) ?? [] : [];
  const relationTokens = chunkId ? substrate.relationHintTokensByChunk.get(chunkId) ?? [] : [];
  const supportProfiles = parseSupportProfiles(chunk.support_profiles);
  const sectionPath = Array.isArray(chunk.section_path)
    ? flattenTokenArray(chunk.section_path, 6)
    : [];
  const filterTags =
    typeof chunk.filter_tags === "object" && chunk.filter_tags !== null
      ? flattenTokenArray(Object.values(chunk.filter_tags as Record<string, unknown>), 10)
      : [];
  const lineLabel = buildLineLabel(traceability);
  const documentPath = traceability?.sourcePath;
  const objectId = flattenUnknown(chunk.record_id) ?? flattenUnknown(chunk.chunk_id);

  const pseudoHit: LooseRecord = {
    ...chunk,
    ...(objectId === undefined ? {} : { objectID: objectId }),
    content: firstString(chunk, ["text"]) ?? firstString(chunk, ["vector_text"]),
    summary: flattenUnknown(chunk.title),
    chapter_title:
      flattenUnknown(chunk.bundle_id),
    section_title: sectionPath.at(-1),
    document_title: flattenUnknown(chunk.document_id),
    document_path: documentPath,
    page_label: lineLabel ?? documentPath,
    tags: uniqueStrings([
      ...filterTags,
      ...supportProfiles,
      ...entityTokens.slice(0, 6),
      ...relationTokens.slice(0, 6)
    ]),
    authority_level: flattenUnknown(chunk.authority_class),
    is_primary_source: true
  };

  const normalized = normalizeHit(
    pseudoHit,
    "mcp",
    "mcp_chunks",
    rank,
    citationId,
    query
  );

  const associationBoost = computeAssociationBoost(
    query,
    supportProfiles,
    preferredProfiles,
    entityTokens,
    relationTokens
  );

  return {
    ...normalized,
    pageLabel: lineLabel ?? normalized.pageLabel,
    traceability,
    raw: {
      ...pseudoHit,
      traceability: chunk.traceability,
      support_profiles: supportProfiles,
      entity_mentions_flat: entityTokens,
      relation_hints_flat: relationTokens
    },
    localScore: Number((normalized.localScore + associationBoost).toFixed(2))
  };
}

export function tryReadSnapshotFile(filePath: string): SnapshotPayload | undefined {
  const absolutePath = resolveAppPath(filePath);
  try {
    const raw = readFileSync(absolutePath, "utf8");
    return JSON.parse(raw) as SnapshotPayload;
  } catch {
    return undefined;
  }
}

function createCitationIds(source: RetrievalSource, total: number): string[] {
  return Array.from({ length: total }, (_, index) => `${SOURCE_PREFIX[source]}${index + 1}`);
}

export async function retrievePublishedContext(
  query: string,
  topK?: number
): Promise<RetrievalBundle> {
  const config = getConfig();
  const checkout = await tryLoadBackendCheckout();
  const substrate = loadPublishedSubstrate();
  const preferredProfiles = resolveSupportProfiles(query);
  const preferredChunks = substrate.mcpChunks.filter((chunk) => {
    const supportProfiles = parseSupportProfiles(chunk.support_profiles);
    return supportProfiles.some((profile) => preferredProfiles.includes(profile));
  });
  const candidateChunks =
    preferredChunks.length > 0 ? preferredChunks : substrate.mcpChunks;
  const citationIds = createCitationIds("mcp", candidateChunks.length);

  const retrieved = dedupeRecords(
    sortByPriority(
      candidateChunks.map((chunk, index) =>
        normalizeMcpChunk(
          chunk,
          index,
          citationIds[index]!,
          query,
          substrate,
          preferredProfiles
        )
      )
    )
  );
  const selected = retrieved.slice(
    0,
    Math.min(topK ?? config.backend.maxContextRecords, config.backend.maxContextRecords)
  );
  const promptChapters = Array.from(
    new Set(selected.map((record) => record.chapter).filter((value): value is string => Boolean(value)))
  );

  return {
    query,
    selected,
    retrieved,
    promptChapters,
    consultedIndices: [
      "sbdtoe-ontology.yaml",
      "publication_manifest.json",
      "mcp_chunks.jsonl",
      "chunk_entity_mentions.jsonl",
      "chunk_relation_hints.jsonl"
    ],
    backendSnapshot: {
      runId: checkout?.runManifest.runId,
      commitSha: checkout?.runManifest.commitSha,
      upstreamRepoPath: checkout?.upstreamRepoPath,
      publicationManifestFile: config.backend.publicationManifestFile,
      deterministicManifestFile: config.backend.deterministicManifestFile,
      ontologyFile: config.backend.ontologyFile,
      mcpChunksFile: config.backend.mcpChunksFile,
      canonicalChunksFile: config.backend.canonicalChunksFile,
      chunkEntityMentionsFile: config.backend.chunkEntityMentionsFile,
      chunkRelationHintsFile: config.backend.chunkRelationHintsFile,
      substrateVersion: substrate.publicationManifest.substrate_version
    }
  };
}
