import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REQUIRED_PATHS = [
  "dist/index.js",
  "data/publish/indexes/publication_manifest.json",
  "data/publish/indexes/canonical_chunks.jsonl",
  "data/publish/indexes/mcp_chunks.jsonl",
  "data/publish/indexes/vector_chunks.jsonl",
  "data/publish/indexes/bundle_catalog.jsonl",
  "data/publish/runtime/deterministic_manifest.json",
  "data/publish/sbd-toe-index-compact.json",
  "data/publish/sbdtoe-ontology.yaml"
];

const BANNED_PREFIXES = [
  "data/entities/",
  "data/publish/algolia_",
  "data/publish/semantic/",
  "release/"
];

const BANNED_PATHS = [
  "dist/tools/generate-document.js",
  "dist/tools/generate-document.d.ts",
  "dist/tools/generate-document.js.map",
  "data/publish/indexes/bundle_documents.jsonl",
  "data/publish/indexes/bundle_policy_links.jsonl",
  "data/publish/indexes/metric_catalog.jsonl",
  "data/publish/indexes/metric_rollups.jsonl",
  "data/publish/indexes/ontology_discovery_units.jsonl"
];

async function main() {
  const tempCacheDir = await mkdtemp(path.join(os.tmpdir(), "sbd-toe-npm-cache-"));

  try {
    const { stdout } = await execFileAsync(
      "npm",
      ["pack", "--dry-run", "--json"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          npm_config_cache: tempCacheDir
        }
      }
    );

    const parsed = JSON.parse(stdout);
    const packResult = Array.isArray(parsed) ? parsed[0] : parsed;
    const files = Array.isArray(packResult?.files)
      ? packResult.files
          .map((entry) => (typeof entry?.path === "string" ? entry.path : undefined))
          .filter((entry) => typeof entry === "string")
      : [];

    const missing = REQUIRED_PATHS.filter((requiredPath) => !files.includes(requiredPath));
    if (missing.length > 0) {
      throw new Error(`npm package missing required paths: ${missing.join(", ")}`);
    }

    const bannedMatches = files.filter(
      (filePath) =>
        BANNED_PATHS.includes(filePath) ||
        BANNED_PREFIXES.some((prefix) => filePath.startsWith(prefix))
    );
    if (bannedMatches.length > 0) {
      throw new Error(`npm package contains banned paths: ${bannedMatches.join(", ")}`);
    }

    process.stdout.write(
      `npm package check OK: ${files.length} files, ${packResult?.size ?? "unknown"} bytes tarball\n`
    );
  } finally {
    await rm(tempCacheDir, { recursive: true, force: true });
  }
}

await main();
