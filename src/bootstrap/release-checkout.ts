import { createWriteStream } from "node:fs";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import type { AppConfig } from "../types.js";

// SECURITY: URL base e owner/repo são HARDCODED. Nunca aceitar de env ou input externo.
const HARDCODED_API_BASE =
  "https://api.github.com/repos/SbD-ToE/sbd-toe-knowledge-graph";

const ALLOWED_ASSET_URL_PREFIXES = [
  "https://github.com/SbD-ToE/sbd-toe-knowledge-graph/",
  "https://objects.githubusercontent.com/",
];

const PINNED_RELEASE_TAG_RE =
  /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// Fixed list of files to copy from the extracted bundle to destDir.
// SECURITY: Only known paths are copied; no dynamic traversal of extracted content.
const KNOWN_ENTRIES: Array<{ kind: "file" | "dir"; src: string; dest: string }> = [
  {
    kind: "file",
    src: path.join("data", "publish", "indexes", "publication_manifest.json"),
    dest: path.join("data", "publish", "indexes", "publication_manifest.json"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "indexes", "bundle_catalog.jsonl"),
    dest: path.join("data", "publish", "indexes", "bundle_catalog.jsonl"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "indexes", "mcp_chunks.jsonl"),
    dest: path.join("data", "publish", "indexes", "mcp_chunks.jsonl"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "indexes", "canonical_chunks.jsonl"),
    dest: path.join("data", "publish", "indexes", "canonical_chunks.jsonl"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "indexes", "chunk_entity_mentions.jsonl"),
    dest: path.join("data", "publish", "indexes", "chunk_entity_mentions.jsonl"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "indexes", "chunk_relation_hints.jsonl"),
    dest: path.join("data", "publish", "indexes", "chunk_relation_hints.jsonl"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "sbd-toe-index-compact.json"),
    dest: path.join("data", "publish", "sbd-toe-index-compact.json"),
  },
  {
    kind: "dir",
    src: path.join("data", "publish", "runtime"),
    dest: path.join("data", "publish", "runtime"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "ontology", "appsec-core-ontology.yaml"),
    dest: path.join("data", "publish", "ontology", "appsec-core-ontology.yaml"),
  },
  {
    kind: "file",
    src: path.join("data", "publish", "ontology", "sbdtoe-ontology.yaml"),
    dest: path.join("data", "publish", "ontology", "sbdtoe-ontology.yaml"),
  },
  {
    kind: "file",
    src: path.join("data", "reports", "run_manifest.json"),
    dest: path.join("data", "reports", "run_manifest.json"),
  },
];

export function assertSafeAssetUrl(url: string): void {
  const allowed = ALLOWED_ASSET_URL_PREFIXES.some((prefix) =>
    url.startsWith(prefix)
  );
  if (!allowed) {
    throw new Error(`URL de asset não autorizada: ${url}`);
  }
}

export function assertSafeDestPath(destPath: string, baseDir: string): void {
  const resolved = path.resolve(destPath);
  const base = path.resolve(baseDir);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal detectado: ${destPath}`);
  }
}

export function assertPinnedReleaseTag(tag: string): void {
  if (tag === "latest") {
    throw new Error(
      "UPSTREAM_RELEASE_TAG='latest' não é permitido. Usa sempre uma tag exata."
    );
  }

  if (!PINNED_RELEASE_TAG_RE.test(tag)) {
    throw new Error(
      `UPSTREAM_RELEASE_TAG inválida: '${tag}'. Usa uma tag exata do tipo vX.Y.Z ou vX.Y.Z-rc.1.`
    );
  }
}

export async function fetchReleaseAssetUrl(
  tag: string,
  timeoutMs: number
): Promise<{ assetUrl: string; assetName: string }> {
  assertPinnedReleaseTag(tag);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const releaseUrl = `${HARDCODED_API_BASE}/releases/tags/${encodeURIComponent(tag)}`;

    const resp = await fetch(releaseUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!resp.ok) {
      throw new Error(`GitHub API respondeu ${resp.status} para ${releaseUrl}`);
    }

    const release = (await resp.json()) as {
      assets?: Array<{ name: string; browser_download_url: string }>;
    };
    const asset = release.assets?.find(
      (a) =>
        a.name.endsWith(".tar.gz") ||
        a.name.endsWith(".zip") ||
        a.name.includes("bundle")
    );

    if (!asset) {
      throw new Error(`Nenhum asset de bundle encontrado na release '${tag}'.`);
    }

    assertSafeAssetUrl(asset.browser_download_url);
    return { assetUrl: asset.browser_download_url, assetName: asset.name };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkoutFromRelease(
  config: AppConfig,
  destDir: string
): Promise<void> {
  const { upstreamReleaseTag, upstreamReleaseMaxBytes, upstreamReleaseTimeoutMs } =
    config.backend;

  const { assetUrl, assetName } = await fetchReleaseAssetUrl(
    upstreamReleaseTag,
    upstreamReleaseTimeoutMs
  );

  process.stderr.write(
    `[release-checkout] Downloading asset '${assetName}' from release '${upstreamReleaseTag}'.\n`
  );

  // Download with timeout and size limit
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), upstreamReleaseTimeoutMs);

  let tmpDir: string | undefined;
  let tmpFile: string | undefined;

  try {
    const resp = await fetch(assetUrl, { signal: controller.signal });
    if (!resp.ok || !resp.body) {
      throw new Error(`Download falhou com status ${resp.status} para ${assetUrl}`);
    }

    tmpDir = await mkdtemp(path.join(os.tmpdir(), "sbd-release-"));
    tmpFile = path.join(tmpDir, assetName);

    let bytesReceived = 0;
    const fileStream = createWriteStream(tmpFile);

    await pipeline(
      Readable.fromWeb(resp.body as import("node:stream/web").ReadableStream<Uint8Array>),
      async function* (source: AsyncIterable<Uint8Array>) {
        for await (const chunk of source) {
          bytesReceived += chunk.length;
          if (bytesReceived > upstreamReleaseMaxBytes) {
            throw new Error(
              `Asset excede o limite de tamanho (${upstreamReleaseMaxBytes} bytes): ${assetName}`
            );
          }
          yield chunk;
        }
      },
      fileStream
    );

    // Extract
    const extractDir = path.join(tmpDir, "extracted");
    await mkdir(extractDir, { recursive: true });

    if (assetName.endsWith(".tar.gz") || assetName.endsWith(".tgz")) {
      // SECURITY: argv fixos, sem shell, sem interpolação de env
      const result = spawnSync("tar", ["-xzf", tmpFile, "-C", extractDir], {
        stdio: ["ignore", "ignore", "pipe"],
        timeout: upstreamReleaseTimeoutMs,
        shell: false,
      });
      if (result.status !== 0) {
        const stderr = result.stderr instanceof Buffer ? result.stderr.toString() : "";
        throw new Error(`Extracção tar falhou (status ${result.status ?? "?"}): ${stderr.trim()}`);
      }
    } else if (assetName.endsWith(".zip")) {
      // SECURITY: argv fixos, sem shell, sem interpolação de env
      const result = spawnSync("unzip", ["-q", tmpFile, "-d", extractDir], {
        stdio: ["ignore", "ignore", "pipe"],
        timeout: upstreamReleaseTimeoutMs,
        shell: false,
      });
      if (result.status !== 0) {
        const stderr = result.stderr instanceof Buffer ? result.stderr.toString() : "";
        throw new Error(`Extracção zip falhou (status ${result.status ?? "?"}): ${stderr.trim()}`);
      }
    } else {
      throw new Error(`Formato de asset não suportado: ${assetName}`);
    }

    // Copy known files from extracted bundle to destDir
    for (const { kind, src, dest } of KNOWN_ENTRIES) {
      const srcPath = path.join(extractDir, src);
      const destPath = path.join(destDir, dest);

      // SECURITY: validate that the destination stays within destDir
      assertSafeDestPath(destPath, destDir);

      await mkdir(path.dirname(destPath), { recursive: true });

      try {
        await cp(srcPath, destPath, { recursive: kind === "dir" });
        process.stderr.write(`[release-checkout] Copiado: ${dest}\n`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `[release-checkout] AVISO: ficheiro não encontrado no bundle: ${src} (${message})\n`
        );
      }
    }

    process.stderr.write(
      `[release-checkout] Checkout via release '${upstreamReleaseTag}' concluído.\n`
    );
  } finally {
    clearTimeout(timer);
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
