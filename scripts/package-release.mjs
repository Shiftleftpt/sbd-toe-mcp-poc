#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PROJECT_NAME = "sbd-toe-mcp-poc";

const REQUIRED_ENTRIES = [
  { kind: "dir", src: "dist", dest: "dist" },
  { kind: "dir", src: "data/publish", dest: "data/publish" },
  {
    kind: "file",
    src: "data/reports/run_manifest.json",
    dest: "data/reports/run_manifest.json"
  },
  { kind: "dir", src: "prompts", dest: "prompts" },
  { kind: "dir", src: "examples", dest: "examples" },
  { kind: "dir", src: "docs", dest: "docs" },
  { kind: "file", src: ".vscode/mcp.json", dest: ".vscode/mcp.json" },
  { kind: "file", src: ".env.example", dest: ".env.example" },
  { kind: "file", src: "README.md", dest: "README.md" },
  { kind: "file", src: "CONTRIBUTING.md", dest: "CONTRIBUTING.md" },
  { kind: "file", src: "CODE_OF_CONDUCT.md", dest: "CODE_OF_CONDUCT.md" },
  { kind: "file", src: "SECURITY.md", dest: "SECURITY.md" },
  { kind: "file", src: "SUPPORT.md", dest: "SUPPORT.md" },
  { kind: "file", src: "LICENSE", dest: "LICENSE" },
  { kind: "file", src: "LICENSE-DATA", dest: "LICENSE-DATA" },
  { kind: "file", src: "LICENSE-NOTE.md", dest: "LICENSE-NOTE.md" }
];

function parseArguments(argv) {
  const args = {
    outputDir: "release",
    version: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--output-dir") {
      args.outputDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === "--version") {
      args.version = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Argumento não suportado: ${token}`);
  }

  return args;
}

async function readPackageVersion(repoRoot) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJsonRaw = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonRaw);

  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error("Não foi possível determinar a versão a partir de package.json.");
  }

  return packageJson.version.startsWith("v")
    ? packageJson.version
    : `v${packageJson.version}`;
}

async function ensureEntry(repoRoot, entry) {
  const sourcePath = path.join(repoRoot, entry.src);
  let sourceStats;

  try {
    sourceStats = await stat(sourcePath);
  } catch {
    throw new Error(`Falta a entrada obrigatória para o bundle: ${entry.src}`);
  }

  if (entry.kind === "dir" && !sourceStats.isDirectory()) {
    throw new Error(`Esperava um diretório em ${entry.src}.`);
  }

  if (entry.kind === "file" && !sourceStats.isFile()) {
    throw new Error(`Esperava um ficheiro em ${entry.src}.`);
  }
}

async function copyEntry(repoRoot, bundleRoot, entry) {
  const sourcePath = path.join(repoRoot, entry.src);
  const destinationPath = path.join(bundleRoot, entry.dest);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { recursive: entry.kind === "dir" });
}

async function createTarball(parentDir, bundleDirName, tarPath) {
  await execFileAsync("tar", ["-czf", tarPath, "-C", parentDir, bundleDirName]);
}

async function createZipArchive(parentDir, bundleDirName, zipPath) {
  try {
    await execFileAsync("zip", ["-rq", zipPath, bundleDirName], {
      cwd: parentDir
    });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      process.stderr.write(
        "Aviso: comando 'zip' não disponível; bundle .zip não foi gerado.\n"
      );
      return false;
    }

    throw error;
  }
}

async function computeSha256(filePath) {
  const fileContents = await readFile(filePath);
  return createHash("sha256").update(fileContents).digest("hex");
}

async function writeChecksumFile(outputDir, archivePaths, archiveBaseName) {
  const lines = [];

  for (const archivePath of archivePaths) {
    const hash = await computeSha256(archivePath);
    lines.push(`${hash}  ${path.basename(archivePath)}`);
  }

  const checksumPath = path.join(outputDir, `${archiveBaseName}.sha256`);
  await writeFile(checksumPath, `${lines.join("\n")}\n`, "utf8");
  return checksumPath;
}

async function main() {
  const repoRoot = process.cwd();
  const args = parseArguments(process.argv.slice(2));
  const version = args.version ?? (await readPackageVersion(repoRoot));
  const outputDir = path.resolve(repoRoot, args.outputDir);
  const bundleDirName = `${PROJECT_NAME}-${version}`;
  const archiveBaseName = `${PROJECT_NAME}-${version}-bundle`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `${PROJECT_NAME}-`));
  const bundleRoot = path.join(tempDir, bundleDirName);

  try {
    for (const entry of REQUIRED_ENTRIES) {
      await ensureEntry(repoRoot, entry);
    }

    await mkdir(bundleRoot, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    for (const entry of REQUIRED_ENTRIES) {
      await copyEntry(repoRoot, bundleRoot, entry);
    }

    const tarPath = path.join(outputDir, `${archiveBaseName}.tar.gz`);
    const zipPath = path.join(outputDir, `${archiveBaseName}.zip`);
    const checksumPath = path.join(outputDir, `${archiveBaseName}.sha256`);

    await rm(tarPath, { force: true });
    await rm(zipPath, { force: true });
    await rm(checksumPath, { force: true });

    await createTarball(tempDir, bundleDirName, tarPath);

    const archivePaths = [tarPath];
    const zipCreated = await createZipArchive(tempDir, bundleDirName, zipPath);
    if (zipCreated) {
      archivePaths.push(zipPath);
    }

    const generatedChecksumPath = await writeChecksumFile(
      outputDir,
      archivePaths,
      archiveBaseName
    );

    process.stdout.write(
      [
        `Bundle preparado para ${version}`,
        ...archivePaths.map((archivePath) => `asset=${archivePath}`),
        `checksum=${generatedChecksumPath}`
      ].join("\n") + "\n"
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
