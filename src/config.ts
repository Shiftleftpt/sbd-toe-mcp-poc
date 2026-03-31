import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AppConfig } from "./types.js";

let cachedConfig: AppConfig | undefined;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultAppRoot = path.resolve(moduleDir, "..");

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value !== undefined && value.trim().length > 0) {
    return value.trim();
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Falta definir a variável de ambiente ${name}.`);
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value !== undefined && value.trim().length > 0 ? value.trim() : undefined;
}

function parseBoolean(value: string): boolean {
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseInteger(name: string, value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Configuração inválida para ${name}: "${value}".`);
  }
  return parsed || fallback;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export function getAppRoot(): string {
  const override = process.env.SBD_TOE_APP_ROOT;
  if (override !== undefined && override.trim().length > 0) {
    return path.resolve(override.trim());
  }

  return defaultAppRoot;
}

export function resolveAppPath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(getAppRoot(), filePath);
}

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    backend: {
      docsIndex: getEnv("SEMANTIC_BACKEND_DOCS_INDEX", "SbD-ToE-ASKAI-Docs"),
      entitiesIndex: getEnv(
        "SEMANTIC_BACKEND_ENTITIES_INDEX",
        "SbD-ToE-ASKAI-Entities"
      ),
      maxContextRecords: parseInteger(
        "MAX_CONTEXT_RECORDS",
        getEnv("MAX_CONTEXT_RECORDS", "8"),
        8
      ),
      upstreamRepoDir: getEnv(
        "UPSTREAM_KNOWLEDGE_GRAPH_DIR",
        "../sbd-toe-knowledge-graph"
      ),
      localCheckoutLockFile: getEnv(
        "LOCAL_CHECKOUT_LOCK_FILE",
        "./data/upstream/graph-runtime-lock.json"
      ),
      checkoutFile: getEnv(
        "BACKEND_CHECKOUT_FILE",
        "./data/upstream/backend-checkout.json"
      ),
      publishedIndexesDir: getEnv(
        "PUBLISHED_INDEXES_DIR",
        "./data/publish/indexes"
      ),
      publishedRuntimeDir: getEnv(
        "PUBLISHED_RUNTIME_DIR",
        "./data/publish/runtime"
      ),
      publicationManifestFile: getEnv(
        "PUBLICATION_MANIFEST_FILE",
        "./data/publish/indexes/publication_manifest.json"
      ),
      deterministicManifestFile: getEnv(
        "DETERMINISTIC_MANIFEST_FILE",
        "./data/publish/runtime/deterministic_manifest.json"
      ),
      mcpChunksFile: getEnv(
        "MCP_CHUNKS_FILE",
        "./data/publish/indexes/mcp_chunks.jsonl"
      ),
      canonicalChunksFile: getEnv(
        "CANONICAL_CHUNKS_FILE",
        "./data/publish/indexes/canonical_chunks.jsonl"
      ),
      chunkEntityMentionsFile: getEnv(
        "CHUNK_ENTITY_MENTIONS_FILE",
        "./data/publish/indexes/chunk_entity_mentions.jsonl"
      ),
      chunkRelationHintsFile: getEnv(
        "CHUNK_RELATION_HINTS_FILE",
        "./data/publish/indexes/chunk_relation_hints.jsonl"
      ),
      ontologyFile: getEnv(
        "ONTOLOGY_FILE",
        "./data/publish/sbdtoe-ontology.yaml"
      ),
      runManifestFile: getEnv(
        "RUN_MANIFEST_FILE",
        "./data/reports/run_manifest.json"
      ),
      upstreamSource: ((): "local" | "release" => {
        const v = getEnv("UPSTREAM_SOURCE", "local");
        if (v !== "local" && v !== "release") {
          throw new Error(`UPSTREAM_SOURCE deve ser 'local' ou 'release', recebido: '${v}'`);
        }
        return v;
      })(),
      upstreamReleaseTag: getOptionalEnv("UPSTREAM_RELEASE_TAG") ?? "",
      upstreamReleaseMaxBytes: 100 * 1024 * 1024,
      upstreamReleaseTimeoutMs: 60_000
    },
    prompt: {
      systemPromptFile: getEnv(
        "SYSTEM_PROMPT_FILE",
        "./prompts/sbd-toe-chat-system.md"
      ),
      siteBaseUrl: normalizeBaseUrl(
        getEnv("SITE_BASE_URL", "https://www.securitybydesign.dev/")
      ),
      manualBaseUrl: normalizeBaseUrl(
        getEnv(
          "MANUAL_BASE_URL",
          "https://www.securitybydesign.dev/sbd-toe/sbd-manual/"
        )
      ),
      crossCheckBaseUrl: normalizeBaseUrl(
        getEnv(
          "CROSS_CHECK_BASE_URL",
          "https://www.securitybydesign.dev/sbd-toe/cross-check-normativo/"
        )
      ),
      samplingMaxTokens: parseInteger(
        "SAMPLING_MAX_TOKENS",
        getEnv("SAMPLING_MAX_TOKENS", "1200"),
        1200
      )
    },
    debugMode: parseBoolean(getEnv("DEBUG_MODE", "false"))
  };

  return cachedConfig;
}
