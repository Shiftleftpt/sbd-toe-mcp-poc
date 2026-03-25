import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getAppRoot, getConfig, resolveAppPath } from "../config.js";
import { checkoutFromRelease } from "./release-checkout.js";
import type { BackendCheckout, PublishedIndexContract } from "../types.js";

interface UpstreamIndexSettingsPayload {
  items?: Array<{
    index_name?: string;
    record_family?: string;
    settings?: Record<string, unknown>;
  }>;
}

interface UpstreamRunManifestPayload {
  run_id?: string;
  generated_at?: string;
  branch?: string;
  commit_sha?: string;
  corpus_root?: string;
  repo_url?: string;
  sync_mode?: string;
  version?: string;
}

interface PublicRunManifestPayload {
  run_id?: string;
  generated_at?: string;
  branch?: string;
  commit_sha?: string;
  corpus_root?: string;
  repo_url?: string;
  sync_mode?: string;
  version?: string;
}

export function ensurePublishedIndex(
  items: UpstreamIndexSettingsPayload["items"],
  recordFamily: string,
  fallbackIndexName: string
): PublishedIndexContract {
  const match =
    items?.find((item) => item.record_family === recordFamily) ??
    items?.find((item) => item.index_name === fallbackIndexName);

  if (!match?.index_name) {
    throw new Error(
      `O upstream não publicou um índice utilizável para "${recordFamily}" em data/publish/algolia_index_settings.json.`
    );
  }

  return {
    indexName: match.index_name,
    recordFamily,
    settings: match.settings ?? {}
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

function normalizePublicRepoUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const sshMatch = /^git@github\.com:(.+?)(?:\.git)?$/i.exec(trimmed);
  if (sshMatch?.[1]) {
    return `https://github.com/${sshMatch[1]}`;
  }

  return trimmed;
}

export function sanitizeRunManifest(
  upstream: UpstreamRunManifestPayload
): PublicRunManifestPayload {
  const normalizedRepoUrl = normalizePublicRepoUrl(upstream.repo_url);

  return {
    ...(upstream.run_id === undefined ? {} : { run_id: upstream.run_id }),
    ...(upstream.generated_at === undefined
      ? {}
      : { generated_at: upstream.generated_at }),
    ...(upstream.branch === undefined ? {} : { branch: upstream.branch }),
    ...(upstream.commit_sha === undefined ? {} : { commit_sha: upstream.commit_sha }),
    ...(upstream.corpus_root === undefined ? {} : { corpus_root: upstream.corpus_root }),
    ...(normalizedRepoUrl === undefined ? {} : { repo_url: normalizedRepoUrl }),
    ...(upstream.sync_mode === undefined ? {} : { sync_mode: upstream.sync_mode }),
    ...(upstream.version === undefined ? {} : { version: upstream.version })
  };
}

async function main(): Promise<void> {
  const config = getConfig();
  const source = config.backend.upstreamSource;
  if (source === "release") {
    await checkoutFromRelease(config, getAppRoot());
    return;
  }
  // source === "local" → fluxo existente continua inalterado
  const upstreamRepoPath = resolveAppPath(config.backend.upstreamRepoDir);
  const checkoutFilePath = resolveAppPath(config.backend.checkoutFile);
  const localDocsSnapshot = resolveAppPath(config.backend.docsSnapshotFile);
  const localEntitiesSnapshot = resolveAppPath(config.backend.entitiesSnapshotFile);
  const localDocsEnrichedSnapshot = resolveAppPath(config.backend.docsEnrichedSnapshotFile);
  const localEntitiesEnrichedSnapshot = resolveAppPath(config.backend.entitiesEnrichedSnapshotFile);
  const localIndexSettings = resolveAppPath(config.backend.indexSettingsFile);
  const localRunManifest = resolveAppPath(config.backend.runManifestFile);

  const upstreamDocsSnapshot = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "algolia_docs_records.json"
  );
  const upstreamEntitiesSnapshot = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "algolia_entities_records.json"
  );
  const upstreamDocsEnrichedSnapshot = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "algolia_docs_records_enriched.json"
  );
  const upstreamEntitiesEnrichedSnapshot = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "algolia_entities_records_enriched.json"
  );
  const upstreamIndexSettings = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "algolia_index_settings.json"
  );
  const upstreamRunManifest = path.join(
    upstreamRepoPath,
    "data",
    "reports",
    "run_manifest.json"
  );

  const [indexSettings, runManifest] = await Promise.all([
    readJsonFile<UpstreamIndexSettingsPayload>(upstreamIndexSettings),
    readJsonFile<UpstreamRunManifestPayload>(upstreamRunManifest)
  ]);

  await Promise.all([
    ensureParent(localDocsSnapshot),
    ensureParent(localEntitiesSnapshot),
    ensureParent(localDocsEnrichedSnapshot),
    ensureParent(localEntitiesEnrichedSnapshot),
    ensureParent(localIndexSettings),
    ensureParent(localRunManifest),
    ensureParent(checkoutFilePath)
  ]);

  const publicRunManifest = sanitizeRunManifest(runManifest);

  await Promise.all([
    copyFile(upstreamDocsSnapshot, localDocsSnapshot),
    copyFile(upstreamEntitiesSnapshot, localEntitiesSnapshot),
    copyFile(upstreamDocsEnrichedSnapshot, localDocsEnrichedSnapshot),
    copyFile(upstreamEntitiesEnrichedSnapshot, localEntitiesEnrichedSnapshot),
    copyFile(upstreamIndexSettings, localIndexSettings),
    writeFile(localRunManifest, `${JSON.stringify(publicRunManifest, null, 2)}\n`, "utf8")
  ]);

  const checkout: BackendCheckout = {
    schemaVersion: "0.1.0",
    checkedOutAt: new Date().toISOString(),
    upstreamRepoPath,
    contractFiles: {
      docsSnapshot: localDocsSnapshot,
      entitiesSnapshot: localEntitiesSnapshot,
      docsEnrichedSnapshot: localDocsEnrichedSnapshot,
      entitiesEnrichedSnapshot: localEntitiesEnrichedSnapshot,
      indexSettings: localIndexSettings,
      runManifest: localRunManifest
    },
    runManifest: {
      runId: runManifest.run_id,
      generatedAt: runManifest.generated_at,
      branch: runManifest.branch,
      commitSha: runManifest.commit_sha,
      repoUrl: runManifest.repo_url
    },
    indices: {
      docs: ensurePublishedIndex(
        indexSettings.items,
        "documents",
        config.backend.docsIndex
      ),
      entities: ensurePublishedIndex(
        indexSettings.items,
        "entities",
        config.backend.entitiesIndex
      )
    }
  };

  await writeFile(checkoutFilePath, `${JSON.stringify(checkout, null, 2)}\n`, "utf8");

  process.stdout.write(
    [
      `Backend checkout criado em ${checkoutFilePath}`,
      `docs_snapshot=${localDocsSnapshot}`,
      `entities_snapshot=${localEntitiesSnapshot}`,
      `docs_enriched_snapshot=${localDocsEnrichedSnapshot}`,
      `entities_enriched_snapshot=${localEntitiesEnrichedSnapshot}`,
      `run_id=${checkout.runManifest.runId ?? "n/d"}`,
      `commit_sha=${checkout.runManifest.commitSha ?? "n/d"}`,
      `docs_index=${checkout.indices.docs.indexName}`,
      `entities_index=${checkout.indices.entities.indexName}`
    ].join("\n") + "\n"
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
