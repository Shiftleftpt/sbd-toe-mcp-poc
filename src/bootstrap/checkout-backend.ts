import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getAppRoot, getConfig, resolveAppPath } from "../config.js";
import { checkoutFromRelease } from "./release-checkout.js";
import type { BackendCheckout } from "../types.js";

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

interface PublicationManifestPayload {
  primary_artifact?: string;
  substrate_version?: string;
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
  const localPublishedIndexesDir = resolveAppPath(config.backend.publishedIndexesDir);
  const localPublishedRuntimeDir = resolveAppPath(config.backend.publishedRuntimeDir);
  const localPublicationManifest = resolveAppPath(config.backend.publicationManifestFile);
  const localDeterministicManifest = resolveAppPath(config.backend.deterministicManifestFile);
  const localBundleCatalog = resolveAppPath("data/publish/indexes/bundle_catalog.jsonl");
  const localMcpChunks = resolveAppPath(config.backend.mcpChunksFile);
  const localCanonicalChunks = resolveAppPath(config.backend.canonicalChunksFile);
  const localChunkEntityMentions = resolveAppPath(config.backend.chunkEntityMentionsFile);
  const localChunkRelationHints = resolveAppPath(config.backend.chunkRelationHintsFile);
  const localCompactIndex = resolveAppPath("data/publish/sbd-toe-index-compact.json");
  const localOntologyFile = resolveAppPath(config.backend.ontologyFile);
  const localRunManifest = resolveAppPath(config.backend.runManifestFile);
  const upstreamPublishedIndexesDir = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "indexes"
  );
  const upstreamPublishedRuntimeDir = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "runtime"
  );
  const upstreamPublicationManifest = path.join(
    upstreamPublishedIndexesDir,
    "publication_manifest.json"
  );
  const upstreamDeterministicManifest = path.join(
    upstreamPublishedRuntimeDir,
    "deterministic_manifest.json"
  );
  const upstreamBundleCatalog = path.join(
    upstreamPublishedIndexesDir,
    "bundle_catalog.jsonl"
  );
  const upstreamMcpChunks = path.join(
    upstreamPublishedIndexesDir,
    "mcp_chunks.jsonl"
  );
  const upstreamCanonicalChunks = path.join(
    upstreamPublishedIndexesDir,
    "canonical_chunks.jsonl"
  );
  const upstreamChunkEntityMentions = path.join(
    upstreamPublishedIndexesDir,
    "chunk_entity_mentions.jsonl"
  );
  const upstreamChunkRelationHints = path.join(
    upstreamPublishedIndexesDir,
    "chunk_relation_hints.jsonl"
  );
  const upstreamCompactIndex = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "sbd-toe-index-compact.json"
  );
  const upstreamOntologyFile = path.join(
    upstreamRepoPath,
    "data",
    "publish",
    "sbdtoe-ontology.yaml"
  );
  const upstreamRunManifest = path.join(
    upstreamRepoPath,
    "data",
    "reports",
    "run_manifest.json"
  );

  const [runManifest, publicationManifest] = await Promise.all([
    readJsonFile<UpstreamRunManifestPayload>(upstreamRunManifest),
    readJsonFile<PublicationManifestPayload>(upstreamPublicationManifest)
  ]);

  await Promise.all([
    ensureParent(localPublicationManifest),
    ensureParent(localDeterministicManifest),
    ensureParent(localBundleCatalog),
    ensureParent(localMcpChunks),
    ensureParent(localCanonicalChunks),
    ensureParent(localChunkEntityMentions),
    ensureParent(localChunkRelationHints),
    ensureParent(localCompactIndex),
    ensureParent(localOntologyFile),
    ensureParent(localRunManifest),
    ensureParent(checkoutFilePath)
  ]);

  const publicRunManifest = sanitizeRunManifest(runManifest);

  await Promise.all([
    copyFile(upstreamPublicationManifest, localPublicationManifest),
    copyFile(upstreamBundleCatalog, localBundleCatalog),
    copyFile(upstreamMcpChunks, localMcpChunks),
    copyFile(upstreamCanonicalChunks, localCanonicalChunks),
    copyFile(upstreamChunkEntityMentions, localChunkEntityMentions),
    copyFile(upstreamChunkRelationHints, localChunkRelationHints),
    cp(path.join(upstreamPublishedRuntimeDir, "."), localPublishedRuntimeDir, {
      recursive: true
    }),
    copyFile(upstreamCompactIndex, localCompactIndex),
    copyFile(upstreamOntologyFile, localOntologyFile),
    writeFile(localRunManifest, `${JSON.stringify(publicRunManifest, null, 2)}\n`, "utf8")
  ]);

  const checkout: BackendCheckout = {
    schemaVersion: "0.1.0",
    checkedOutAt: new Date().toISOString(),
    upstreamRepoPath,
    contractFiles: {
      runManifest: localRunManifest,
      publishedIndexesDir: localPublishedIndexesDir,
      publishedRuntimeDir: localPublishedRuntimeDir,
      publicationManifest: localPublicationManifest,
      deterministicManifest: localDeterministicManifest,
      bundleCatalog: localBundleCatalog,
      mcpChunks: localMcpChunks,
      canonicalChunks: localCanonicalChunks,
      chunkEntityMentions: localChunkEntityMentions,
      chunkRelationHints: localChunkRelationHints,
      ontologyFile: localOntologyFile
    },
    runManifest: {
      runId: runManifest.run_id,
      generatedAt: runManifest.generated_at,
      branch: runManifest.branch,
      commitSha: runManifest.commit_sha,
      repoUrl: runManifest.repo_url
    },
    substrate: {
      primaryArtifact: publicationManifest.primary_artifact,
      substrateVersion: publicationManifest.substrate_version
    }
  };

  await writeFile(checkoutFilePath, `${JSON.stringify(checkout, null, 2)}\n`, "utf8");

  process.stdout.write(
    [
      `Backend checkout criado em ${checkoutFilePath}`,
      `published_indexes_dir=${localPublishedIndexesDir}`,
      `published_runtime_dir=${localPublishedRuntimeDir}`,
      `publication_manifest=${localPublicationManifest}`,
      `deterministic_manifest=${localDeterministicManifest}`,
      `bundle_catalog=${localBundleCatalog}`,
      `mcp_chunks=${localMcpChunks}`,
      `canonical_chunks=${localCanonicalChunks}`,
      `chunk_entity_mentions=${localChunkEntityMentions}`,
      `chunk_relation_hints=${localChunkRelationHints}`,
      `compact_index=${localCompactIndex}`,
      `ontology_file=${localOntologyFile}`,
      `substrate_version=${checkout.substrate?.substrateVersion ?? "n/d"}`,
      `run_id=${checkout.runManifest.runId ?? "n/d"}`,
      `commit_sha=${checkout.runManifest.commitSha ?? "n/d"}`
    ].join("\n") + "\n"
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
