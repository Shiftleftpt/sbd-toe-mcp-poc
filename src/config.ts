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
      checkoutFile: getEnv(
        "BACKEND_CHECKOUT_FILE",
        "./data/upstream/backend-checkout.json"
      ),
      docsSnapshotFile: getEnv(
        "DOCS_SNAPSHOT_FILE",
        "./data/publish/algolia_docs_records.json"
      ),
      entitiesSnapshotFile: getEnv(
        "ENTITIES_SNAPSHOT_FILE",
        "./data/publish/algolia_entities_records.json"
      ),
      docsEnrichedSnapshotFile: getEnv(
        "DOCS_ENRICHED_SNAPSHOT_FILE",
        "./data/publish/algolia_docs_records_enriched.json"
      ),
      entitiesEnrichedSnapshotFile: getEnv(
        "ENTITIES_ENRICHED_SNAPSHOT_FILE",
        "./data/publish/algolia_entities_records_enriched.json"
      ),
      indexSettingsFile: getEnv(
        "INDEX_SETTINGS_FILE",
        "./data/publish/algolia_index_settings.json"
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
      upstreamReleaseTag: getEnv("UPSTREAM_RELEASE_TAG", "latest"),
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
