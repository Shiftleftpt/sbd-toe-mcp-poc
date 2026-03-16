import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getConfig } from "../config.js";
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
  repo_url?: string;
}

function ensurePublishedIndex(
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

async function main(): Promise<void> {
  const config = getConfig();
  const upstreamRepoPath = path.resolve(process.cwd(), config.backend.upstreamRepoDir);
  const checkoutFilePath = path.resolve(process.cwd(), config.backend.checkoutFile);
  const localDocsSnapshot = path.resolve(process.cwd(), config.backend.docsSnapshotFile);
  const localEntitiesSnapshot = path.resolve(process.cwd(), config.backend.entitiesSnapshotFile);
  const localIndexSettings = path.resolve(process.cwd(), config.backend.indexSettingsFile);
  const localRunManifest = path.resolve(process.cwd(), config.backend.runManifestFile);

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
    ensureParent(localIndexSettings),
    ensureParent(localRunManifest),
    ensureParent(checkoutFilePath)
  ]);

  await Promise.all([
    copyFile(upstreamDocsSnapshot, localDocsSnapshot),
    copyFile(upstreamEntitiesSnapshot, localEntitiesSnapshot),
    copyFile(upstreamIndexSettings, localIndexSettings),
    copyFile(upstreamRunManifest, localRunManifest)
  ]);

  const checkout: BackendCheckout = {
    schemaVersion: "0.1.0",
    checkedOutAt: new Date().toISOString(),
    upstreamRepoPath,
    contractFiles: {
      docsSnapshot: localDocsSnapshot,
      entitiesSnapshot: localEntitiesSnapshot,
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
