import type { AppConfig } from "./types.js";

let cachedConfig: AppConfig | undefined;

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
      docsHits: parseInteger("DOCS_HITS", getEnv("DOCS_HITS", "8"), 8),
      entitiesHits: parseInteger("ENTITIES_HITS", getEnv("ENTITIES_HITS", "5"), 5),
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
      indexSettingsFile: getEnv(
        "INDEX_SETTINGS_FILE",
        "./data/publish/algolia_index_settings.json"
      ),
      runManifestFile: getEnv(
        "RUN_MANIFEST_FILE",
        "./data/reports/run_manifest.json"
      )
    },
    prompt: {
      systemPromptFile: getEnv(
        "SYSTEM_PROMPT_FILE",
        "./prompts/sbd-toe-chat-system.md"
      ),
      defaultLanguage: getEnv("DEFAULT_LANGUAGE", "pt-PT"),
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
