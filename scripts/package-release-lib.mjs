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

export const PROJECT_NAME = "sbd-toe-mcp";

export const REQUIRED_PUBLISH_FILES = [
  "data/publish/algolia_docs_records.json",
  "data/publish/algolia_entities_records.json",
  "data/publish/algolia_docs_records_enriched.json",
  "data/publish/algolia_entities_records_enriched.json",
  "data/publish/algolia_index_settings.json",
  "data/reports/run_manifest.json"
];

export const REQUIRED_BUNDLE_ENTRIES = [
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
  { kind: "file", src: "package.json", dest: "package.json" },
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

export function parseArguments(argv) {
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

export async function readPackageVersion(repoRoot) {
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

export async function ensureEntry(repoRoot, entry, missingMessage) {
  const sourcePath = path.join(repoRoot, entry.src);
  let sourceStats;

  try {
    sourceStats = await stat(sourcePath);
  } catch {
    throw new Error(missingMessage ?? `Falta a entrada obrigatória para o bundle: ${entry.src}`);
  }

  if (entry.kind === "dir" && !sourceStats.isDirectory()) {
    throw new Error(`Esperava um diretório em ${entry.src}.`);
  }

  if (entry.kind === "file" && !sourceStats.isFile()) {
    throw new Error(`Esperava um ficheiro em ${entry.src}.`);
  }
}

export async function ensureRequiredBundleInputs(repoRoot) {
  for (const publishFile of REQUIRED_PUBLISH_FILES) {
    await ensureEntry(
      repoRoot,
      { kind: "file", src: publishFile, dest: publishFile },
      `Falta o artefacto publish obrigatório: ${publishFile}`
    );
  }

  for (const entry of REQUIRED_BUNDLE_ENTRIES) {
    await ensureEntry(repoRoot, entry);
  }
}

export async function copyEntry(repoRoot, bundleRoot, entry) {
  const sourcePath = path.join(repoRoot, entry.src);
  const destinationPath = path.join(bundleRoot, entry.dest);

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { recursive: entry.kind === "dir" });
}

export async function createTarball(parentDir, bundleDirName, tarPath, execFileImpl = execFileAsync) {
  await execFileImpl("tar", ["-czf", tarPath, "-C", parentDir, bundleDirName]);
}

export async function createZipArchive(
  parentDir,
  bundleDirName,
  zipPath,
  options = {}
) {
  const execFileImpl = options.execFileImpl ?? execFileAsync;
  const stderr = options.stderr ?? process.stderr;

  try {
    await execFileImpl("zip", ["-rq", zipPath, bundleDirName], {
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
      stderr.write("Aviso: comando 'zip' não disponível; bundle .zip não foi gerado.\n");
      return false;
    }

    throw error;
  }
}

export async function computeSha256(filePath) {
  const fileContents = await readFile(filePath);
  return createHash("sha256").update(fileContents).digest("hex");
}

export async function writeChecksumFile(outputDir, archivePaths, archiveBaseName) {
  const lines = [];

  for (const archivePath of archivePaths) {
    const hash = await computeSha256(archivePath);
    lines.push(`${hash}  ${path.basename(archivePath)}`);
  }

  const checksumPath = path.join(outputDir, `${archiveBaseName}.sha256`);
  await writeFile(checksumPath, `${lines.join("\n")}\n`, "utf8");
  return checksumPath;
}

export async function buildReleaseBundle(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const outputDir = path.resolve(repoRoot, options.outputDir ?? "release");
  const version = options.version ?? (await readPackageVersion(repoRoot));
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const execFileImpl = options.execFileImpl ?? execFileAsync;
  const bundleDirName = `${PROJECT_NAME}-${version}`;
  const archiveBaseName = `${PROJECT_NAME}-${version}-bundle`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), `${PROJECT_NAME}-`));
  const bundleRoot = path.join(tempDir, bundleDirName);

  try {
    await ensureRequiredBundleInputs(repoRoot);

    await mkdir(bundleRoot, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    for (const entry of REQUIRED_BUNDLE_ENTRIES) {
      await copyEntry(repoRoot, bundleRoot, entry);
    }

    const tarPath = path.join(outputDir, `${archiveBaseName}.tar.gz`);
    const zipPath = path.join(outputDir, `${archiveBaseName}.zip`);
    const checksumPath = path.join(outputDir, `${archiveBaseName}.sha256`);

    await rm(tarPath, { force: true });
    await rm(zipPath, { force: true });
    await rm(checksumPath, { force: true });

    await createTarball(tempDir, bundleDirName, tarPath, execFileImpl);

    const archivePaths = [tarPath];
    const zipCreated = await createZipArchive(tempDir, bundleDirName, zipPath, {
      execFileImpl,
      stderr
    });
    if (zipCreated) {
      archivePaths.push(zipPath);
    }

    const generatedChecksumPath = await writeChecksumFile(
      outputDir,
      archivePaths,
      archiveBaseName
    );

    stdout.write(
      [
        `Bundle preparado para ${version}`,
        ...archivePaths.map((archivePath) => `asset=${archivePath}`),
        `checksum=${generatedChecksumPath}`
      ].join("\n") + "\n"
    );

    return {
      version,
      archivePaths,
      checksumPath: generatedChecksumPath
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}