import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

interface PackageReleaseLib {
  REQUIRED_PUBLISH_FILES: string[];
  ensureRequiredBundleInputs(repoRoot: string): Promise<void>;
  generateArtifactManifest(bundleRoot: string, version: string): Promise<string>;
  writeChecksumFile(
    outputDir: string,
    archivePaths: string[],
    archiveBaseName: string
  ): Promise<string>;
  createZipArchive(
    parentDir: string,
    bundleDirName: string,
    zipPath: string,
    options?: {
      execFileImpl?: (
        file: string,
        args: string[],
        options?: { cwd?: string }
      ) => Promise<unknown>;
      stderr?: {
        write: (chunk: string) => boolean;
      };
    }
  ): Promise<boolean>;
}

async function loadPackageReleaseLib(): Promise<PackageReleaseLib> {
  const modulePath = path.resolve(process.cwd(), "scripts/package-release-lib.mjs");
  const loaded = await import(modulePath);
  return loaded as PackageReleaseLib;
}

async function writeJson(filePath: string, payload: object): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeText(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

async function createFixtureRepo(requiredPublishFiles: string[]): Promise<string> {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), "sbd-package-release-"));

  await writeJson(path.join(repoRoot, "package.json"), {
    name: "fixture-package",
    version: "0.1.0",
    type: "module"
  });

  await writeText(path.join(repoRoot, "dist", "index.js"), "console.log('fixture');\n");
  await writeJson(path.join(repoRoot, ".vscode", "mcp.json"), { servers: [] });
  await writeText(path.join(repoRoot, ".env.example"), "EXAMPLE=value\n");
  await writeText(path.join(repoRoot, "README.md"), "# Fixture\n");
  await writeText(path.join(repoRoot, "CONTRIBUTING.md"), "Contributing\n");
  await writeText(path.join(repoRoot, "CODE_OF_CONDUCT.md"), "Code of conduct\n");
  await writeText(path.join(repoRoot, "SECURITY.md"), "Security\n");
  await writeText(path.join(repoRoot, "SUPPORT.md"), "Support\n");
  await writeText(path.join(repoRoot, "LICENSE"), "License\n");
  await writeText(path.join(repoRoot, "LICENSE-DATA"), "License data\n");
  await writeText(path.join(repoRoot, "LICENSE-NOTE.md"), "License note\n");
  await writeText(path.join(repoRoot, "prompts", "sbd-toe-chat-system.md"), "Prompt\n");
  await writeText(path.join(repoRoot, "docs", "guide.md"), "Guide\n");
  await writeText(path.join(repoRoot, "examples", "vscode.mcp.json"), "{}\n");

  for (const publishFile of requiredPublishFiles) {
    await writeJson(path.join(repoRoot, publishFile), { ok: true, file: publishFile });
  }

  return repoRoot;
}

async function removeFile(repoRoot: string, relativePath: string): Promise<void> {
  await rm(path.join(repoRoot, relativePath), { force: true });
}

function hasZipCommand(): boolean {
  const result = spawnSync("zip", ["-v"], {
    stdio: "ignore"
  });

  return result.status === 0;
}

describe("package-release", () => {
  it("accepts a complete set of required publish files", async () => {
    const packageReleaseLib = await loadPackageReleaseLib();
    const repoRoot = await createFixtureRepo(packageReleaseLib.REQUIRED_PUBLISH_FILES);

    try {
      await expect(packageReleaseLib.ensureRequiredBundleInputs(repoRoot)).resolves.toBeUndefined();
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("fails clearly when algolia_docs_records_enriched.json is missing", async () => {
    const packageReleaseLib = await loadPackageReleaseLib();
    const repoRoot = await createFixtureRepo(packageReleaseLib.REQUIRED_PUBLISH_FILES);

    try {
      await removeFile(repoRoot, "data/publish/algolia_docs_records_enriched.json");

      await expect(packageReleaseLib.ensureRequiredBundleInputs(repoRoot)).rejects.toThrow(
        "Falta o artefacto publish obrigatório: data/publish/algolia_docs_records_enriched.json"
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("fails clearly when algolia_entities_records_enriched.json is missing", async () => {
    const packageReleaseLib = await loadPackageReleaseLib();
    const repoRoot = await createFixtureRepo(packageReleaseLib.REQUIRED_PUBLISH_FILES);

    try {
      await removeFile(repoRoot, "data/publish/algolia_entities_records_enriched.json");

      await expect(packageReleaseLib.ensureRequiredBundleInputs(repoRoot)).rejects.toThrow(
        "Falta o artefacto publish obrigatório: data/publish/algolia_entities_records_enriched.json"
      );
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it("writes checksum entries for both tar and zip assets", async () => {
    const packageReleaseLib = await loadPackageReleaseLib();
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "sbd-package-checksum-"));
    const tarPath = path.join(outputDir, "bundle.tar.gz");
    const zipPath = path.join(outputDir, "bundle.zip");

    try {
      await writeFile(tarPath, "tar-asset\n", "utf8");
      await writeFile(zipPath, "zip-asset\n", "utf8");

      const checksumPath = await packageReleaseLib.writeChecksumFile(
        outputDir,
        [tarPath, zipPath],
        "fixture"
      );
      const checksumContents = await readFile(checksumPath, "utf8");

      expect(checksumContents).toContain("bundle.tar.gz");
      expect(checksumContents).toContain("bundle.zip");
      expect(checksumContents.trim().split("\n")).toHaveLength(2);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it("returns a controlled warning when zip is unavailable", async () => {
    const packageReleaseLib = await loadPackageReleaseLib();
    let stderr = "";

    const zipCreated = await packageReleaseLib.createZipArchive("/tmp", "bundle", "/tmp/bundle.zip", {
      execFileImpl: async () => {
        const missing = new Error("zip missing") as NodeJS.ErrnoException;
        missing.code = "ENOENT";
        throw missing;
      },
      stderr: {
        write(chunk: string) {
          stderr += chunk;
          return true;
        }
      }
    });

    expect(zipCreated).toBe(false);
    expect(stderr).toContain("Aviso: comando 'zip' não disponível");
  });

  it("generates artifact-manifest.json with sha256 hashes for all data/publish files", async () => {
    const packageReleaseLib = await loadPackageReleaseLib();
    const bundleRoot = await mkdtemp(path.join(os.tmpdir(), "sbd-manifest-test-"));

    try {
      await writeJson(path.join(bundleRoot, "data", "publish", "alpha.json"), { a: 1 });
      await writeJson(path.join(bundleRoot, "data", "publish", "beta.json"), { b: 2 });

      const manifestPath = await packageReleaseLib.generateArtifactManifest(bundleRoot, "v9.9.9");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

      expect(manifest.artifact_version).toBe("v9.9.9");
      expect(manifest.generated_at).toBeDefined();
      expect(Object.keys(manifest.files)).toEqual(["alpha.json", "beta.json"]);
      expect(manifest.files["alpha.json"]).toMatch(/^[0-9a-f]{64}$/);
      expect(manifest.files["beta.json"]).toMatch(/^[0-9a-f]{64}$/);
      expect(manifest.files["alpha.json"]).not.toBe(manifest.files["beta.json"]);
      // manifest itself is excluded from its own entries
      expect(manifest.files["artifact-manifest.json"]).toBeUndefined();
    } finally {
      await rm(bundleRoot, { recursive: true, force: true });
    }
  });

  it("smoke-tests the release script and keeps tar plus sha256 valid", async () => {
    const packageReleaseLib = await loadPackageReleaseLib();
    const repoRoot = await createFixtureRepo(packageReleaseLib.REQUIRED_PUBLISH_FILES);
    const outputDir = path.join(repoRoot, "release-out");
    const scriptPath = path.resolve(process.cwd(), "scripts/package-release.mjs");
    const zipAvailable = hasZipCommand();

    try {
      const result = spawnSync(
        process.execPath,
        [scriptPath, "--version", "v9.9.9", "--output-dir", "release-out"],
        {
          cwd: repoRoot,
          encoding: "utf8"
        }
      );

      expect(result.status).toBe(0);

      const tarPath = path.join(outputDir, "sbd-toe-mcp-v9.9.9-bundle.tar.gz");
      const zipPath = path.join(outputDir, "sbd-toe-mcp-v9.9.9-bundle.zip");
      const checksumPath = path.join(outputDir, "sbd-toe-mcp-v9.9.9-bundle.sha256");

      await expect(stat(tarPath)).resolves.toBeDefined();
      await expect(stat(checksumPath)).resolves.toBeDefined();

      const checksumContents = await readFile(checksumPath, "utf8");
      expect(checksumContents).toContain("sbd-toe-mcp-v9.9.9-bundle.tar.gz");
      expect(result.stdout).toContain("Bundle preparado para v9.9.9");

      // artifact-manifest.json should be embedded inside the tarball
      const tarListResult = spawnSync("tar", ["-tzf", tarPath], { encoding: "utf8" });
      expect(tarListResult.stdout).toContain("data/publish/artifact-manifest.json");

      if (zipAvailable) {
        await expect(stat(zipPath)).resolves.toBeDefined();
        expect(checksumContents).toContain("sbd-toe-mcp-v9.9.9-bundle.zip");
      } else {
        await expect(stat(zipPath)).rejects.toThrow();
        expect(result.stderr).toContain("Aviso: comando 'zip' não disponível");
      }
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});