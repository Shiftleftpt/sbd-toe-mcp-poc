import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function getAppRoot() {
  const override = process.env.SBD_TOE_APP_ROOT;
  return override && override.trim().length > 0
    ? path.resolve(override.trim())
    : process.cwd();
}

function resolveFromAppRoot(relativePath) {
  return path.resolve(getAppRoot(), relativePath);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readGitValue(repoPath, args) {
  return execFileSync("git", ["-C", repoPath, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

const appRoot = getAppRoot();
const upstreamRepoPath = process.env.UPSTREAM_KNOWLEDGE_GRAPH_DIR
  ? path.resolve(appRoot, process.env.UPSTREAM_KNOWLEDGE_GRAPH_DIR)
  : path.resolve(appRoot, "../sbd-toe-knowledge-graph");
const lockFilePath = process.env.LOCAL_CHECKOUT_LOCK_FILE
  ? path.resolve(appRoot, process.env.LOCAL_CHECKOUT_LOCK_FILE)
  : resolveFromAppRoot("./data/upstream/graph-runtime-lock.json");

const upstreamRunManifest = readJson(
  path.join(upstreamRepoPath, "data", "reports", "run_manifest.json")
);
const upstreamPublicationManifest = readJson(
  path.join(upstreamRepoPath, "data", "publish", "indexes", "publication_manifest.json")
);

const payload = {
  schemaVersion: "0.1.0",
  strategy: "local_graph_checkout",
  upstreamRepoPath,
  expectedGraphBranch: readGitValue(upstreamRepoPath, ["rev-parse", "--abbrev-ref", "HEAD"]),
  expectedGraphCommitSha: readGitValue(upstreamRepoPath, ["rev-parse", "HEAD"]),
  expectedRunId: upstreamRunManifest.run_id,
  expectedSubstrateVersion: upstreamPublicationManifest.substrate_version,
  expectedPrimaryArtifact: upstreamPublicationManifest.primary_artifact,
};

mkdirSync(path.dirname(lockFilePath), { recursive: true });
writeFileSync(lockFilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

process.stdout.write(
  [
    `graph_runtime_lock=${lockFilePath}`,
    `upstream_repo=${payload.upstreamRepoPath}`,
    `graph_branch=${payload.expectedGraphBranch}`,
    `graph_commit_sha=${payload.expectedGraphCommitSha}`,
    `run_id=${payload.expectedRunId ?? "n/d"}`,
    `substrate_version=${payload.expectedSubstrateVersion ?? "n/d"}`,
    `primary_artifact=${payload.expectedPrimaryArtifact ?? "n/d"}`,
  ].join("\n") + "\n"
);
