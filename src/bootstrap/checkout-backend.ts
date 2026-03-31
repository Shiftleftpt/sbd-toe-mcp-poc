import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
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

interface LocalCheckoutLockPayload {
  schemaVersion?: string;
  strategy?: string;
  upstreamRepoPath?: string;
  expectedGraphBranch?: string;
  expectedGraphCommitSha?: string;
  expectedRunId?: string;
  expectedSubstrateVersion?: string;
  expectedPrimaryArtifact?: string;
}

interface LocalCheckoutObservation {
  upstreamRepoPath: string;
  graphBranch?: string;
  graphCommitSha?: string;
  runId?: string;
  substrateVersion?: string;
  primaryArtifact?: string;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function tryReadJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function copyFileIfExists(
  sourcePath: string,
  destinationPath: string
): Promise<boolean> {
  try {
    await copyFile(sourcePath, destinationPath);
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
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

function tryReadGitValue(repoPath: string, args: string[]): string | undefined {
  try {
    const output = execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return output.length > 0 ? output : undefined;
  } catch {
    return undefined;
  }
}

function resolveUpstreamGraphState(upstreamRepoPath: string): {
  branch?: string;
  headCommitSha?: string;
} {
  const branch = tryReadGitValue(upstreamRepoPath, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const headCommitSha = tryReadGitValue(upstreamRepoPath, ["rev-parse", "HEAD"]);
  return {
    ...(branch ? { branch } : {}),
    ...(headCommitSha ? { headCommitSha } : {})
  };
}

export function validateLocalCheckoutLock(
  lock: LocalCheckoutLockPayload,
  observed: LocalCheckoutObservation
): void {
  const mismatches: string[] = [];

  const expectedRepoPath = lock.upstreamRepoPath?.trim();
  if (expectedRepoPath) {
    const expectedResolved = path.resolve(expectedRepoPath);
    const observedResolved = path.resolve(observed.upstreamRepoPath);
    if (expectedResolved !== observedResolved) {
      mismatches.push(
        `upstreamRepoPath esperado=${expectedResolved} observado=${observedResolved}`
      );
    }
  }

  if (lock.expectedGraphBranch && lock.expectedGraphBranch !== observed.graphBranch) {
    mismatches.push(
      `graph branch esperado=${lock.expectedGraphBranch} observado=${observed.graphBranch ?? "n/d"}`
    );
  }

  if (lock.expectedGraphCommitSha && lock.expectedGraphCommitSha !== observed.graphCommitSha) {
    mismatches.push(
      `graph commit esperado=${lock.expectedGraphCommitSha} observado=${observed.graphCommitSha ?? "n/d"}`
    );
  }

  if (lock.expectedRunId && lock.expectedRunId !== observed.runId) {
    mismatches.push(`run_id esperado=${lock.expectedRunId} observado=${observed.runId ?? "n/d"}`);
  }

  if (
    lock.expectedSubstrateVersion &&
    lock.expectedSubstrateVersion !== observed.substrateVersion
  ) {
    mismatches.push(
      `substrate_version esperado=${lock.expectedSubstrateVersion} observado=${observed.substrateVersion ?? "n/d"}`
    );
  }

  if (lock.expectedPrimaryArtifact && lock.expectedPrimaryArtifact !== observed.primaryArtifact) {
    mismatches.push(
      `primary_artifact esperado=${lock.expectedPrimaryArtifact} observado=${observed.primaryArtifact ?? "n/d"}`
    );
  }

  if (mismatches.length > 0) {
    throw new Error(
      [
        "O runtime local do graph não coincide com o lock file configurado.",
        "Atualiza o clone local do graph para o estado esperado ou regenera o lock file desta branch.",
        ...mismatches.map((item) => `- ${item}`)
      ].join("\n")
    );
  }
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
  const localCheckoutLockFile = resolveAppPath(config.backend.localCheckoutLockFile);
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
  const localCheckoutLock = await tryReadJsonFile<LocalCheckoutLockPayload>(localCheckoutLockFile);
  const upstreamGraphState = resolveUpstreamGraphState(upstreamRepoPath);

  if (localCheckoutLock) {
    validateLocalCheckoutLock(localCheckoutLock, {
      upstreamRepoPath,
      ...(upstreamGraphState.branch ? { graphBranch: upstreamGraphState.branch } : {}),
      ...(upstreamGraphState.headCommitSha
        ? { graphCommitSha: upstreamGraphState.headCommitSha }
        : {}),
      ...(runManifest.run_id ? { runId: runManifest.run_id } : {}),
      ...(publicationManifest.substrate_version
        ? { substrateVersion: publicationManifest.substrate_version }
        : {}),
      ...(publicationManifest.primary_artifact
        ? { primaryArtifact: publicationManifest.primary_artifact }
        : {})
    });
  }

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

  const copyResults = await Promise.all([
    copyFile(upstreamPublicationManifest, localPublicationManifest),
    copyFile(upstreamBundleCatalog, localBundleCatalog),
    copyFile(upstreamMcpChunks, localMcpChunks),
    copyFile(upstreamCanonicalChunks, localCanonicalChunks),
    copyFile(upstreamChunkEntityMentions, localChunkEntityMentions),
    copyFile(upstreamChunkRelationHints, localChunkRelationHints),
    cp(path.join(upstreamPublishedRuntimeDir, "."), localPublishedRuntimeDir, {
      recursive: true
    }),
    copyFileIfExists(upstreamCompactIndex, localCompactIndex),
    copyFile(upstreamOntologyFile, localOntologyFile),
    writeFile(localRunManifest, `${JSON.stringify(publicRunManifest, null, 2)}\n`, "utf8")
  ]);
  const compactIndexCopied = copyResults[7] === true;

  const checkout: BackendCheckout = {
    schemaVersion: "0.1.0",
    checkedOutAt: new Date().toISOString(),
    upstreamRepoPath,
    upstreamGraph: {
      ...(upstreamGraphState.headCommitSha
        ? { headCommitSha: upstreamGraphState.headCommitSha }
        : {}),
      ...(upstreamGraphState.branch ? { branch: upstreamGraphState.branch } : {})
    },
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
      compactIndexCopied
        ? `compact_index=${localCompactIndex}`
        : `compact_index=${localCompactIndex} (mantido localmente; upstream não publicou uma versão nova)`,
      `ontology_file=${localOntologyFile}`,
      `graph_branch=${checkout.upstreamGraph?.branch ?? "n/d"}`,
      `graph_commit_sha=${checkout.upstreamGraph?.headCommitSha ?? "n/d"}`,
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
