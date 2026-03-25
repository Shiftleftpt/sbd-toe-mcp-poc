import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import {
  assertSafeAssetUrl,
  assertSafeDestPath,
  fetchReleaseAssetUrl,
} from "./release-checkout.js";

// ---------------------------------------------------------------------------
// assertSafeAssetUrl
// ---------------------------------------------------------------------------

describe("assertSafeAssetUrl", () => {
  it("accepts an authorised github.com URL", () => {
    expect(() =>
      assertSafeAssetUrl(
        "https://github.com/Shiftleftpt/sbd-toe-knowledge-graph/releases/download/v1.0.0/bundle.tar.gz"
      )
    ).not.toThrow();
  });

  it("accepts an authorised objects.githubusercontent.com URL", () => {
    expect(() =>
      assertSafeAssetUrl(
        "https://objects.githubusercontent.com/github-production-release-asset-2e65be/123/bundle.tar.gz"
      )
    ).not.toThrow();
  });

  it("rejects an unauthorised external URL", () => {
    expect(() =>
      assertSafeAssetUrl("https://evil.example.com/malicious.tar.gz")
    ).toThrow("URL de asset não autorizada");
  });

  it("rejects a URL that starts with an allowed prefix but has wrong host", () => {
    expect(() =>
      assertSafeAssetUrl("https://evil.github.com/Shiftleftpt/anything")
    ).toThrow("URL de asset não autorizada");
  });
});

// ---------------------------------------------------------------------------
// assertSafeDestPath
// ---------------------------------------------------------------------------

describe("assertSafeDestPath", () => {
  const baseDir = "/tmp/sbd-base";

  it("accepts a path inside baseDir", () => {
    expect(() =>
      assertSafeDestPath(path.join(baseDir, "data", "publish", "file.json"), baseDir)
    ).not.toThrow();
  });

  it("accepts a path equal to baseDir", () => {
    expect(() => assertSafeDestPath(baseDir, baseDir)).not.toThrow();
  });

  it("rejects a path-traversal attempt with ../", () => {
    expect(() =>
      assertSafeDestPath(path.join(baseDir, "..", "..", "etc", "passwd"), baseDir)
    ).toThrow("Path traversal detectado");
  });

  it("rejects an absolute path outside baseDir", () => {
    expect(() =>
      assertSafeDestPath("/usr/local/bin/evil", baseDir)
    ).toThrow("Path traversal detectado");
  });
});

// ---------------------------------------------------------------------------
// fetchReleaseAssetUrl  (mocked fetch)
// ---------------------------------------------------------------------------

describe("fetchReleaseAssetUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when GitHub API returns 404", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404 })
    );

    await expect(fetchReleaseAssetUrl("latest", 5000)).rejects.toThrow(
      "GitHub API respondeu 404"
    );
  });

  it("throws when release has no assets", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ assets: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchReleaseAssetUrl("latest", 5000)).rejects.toThrow(
      "Nenhum asset de bundle encontrado"
    );
  });

  it("throws when release has no assets property at all", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(fetchReleaseAssetUrl("latest", 5000)).rejects.toThrow(
      "Nenhum asset de bundle encontrado"
    );
  });

  it("throws when asset URL is not in allowed prefixes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          assets: [
            {
              name: "bundle.tar.gz",
              browser_download_url:
                "https://evil.example.com/bundle.tar.gz",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await expect(fetchReleaseAssetUrl("latest", 5000)).rejects.toThrow(
      "URL de asset não autorizada"
    );
  });

  it("returns assetUrl and assetName for a valid release with bundle asset", async () => {
    const downloadUrl =
      "https://github.com/Shiftleftpt/sbd-toe-knowledge-graph/releases/download/v1.0.0/bundle.tar.gz";

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          assets: [
            {
              name: "bundle.tar.gz",
              browser_download_url: downloadUrl,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await fetchReleaseAssetUrl("latest", 5000);
    expect(result.assetUrl).toBe(downloadUrl);
    expect(result.assetName).toBe("bundle.tar.gz");
  });

  it("uses tag-specific URL when tag is not 'latest'", async () => {
    const downloadUrl =
      "https://github.com/Shiftleftpt/sbd-toe-knowledge-graph/releases/download/v2.0.0/bundle.tar.gz";

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          assets: [
            {
              name: "bundle.tar.gz",
              browser_download_url: downloadUrl,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await fetchReleaseAssetUrl("v2.0.0", 5000);

    const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/releases/tags/v2.0.0");
  });
});

// ---------------------------------------------------------------------------
// UPSTREAM_SOURCE config validation
// ---------------------------------------------------------------------------

describe("getConfig UPSTREAM_SOURCE validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // Reset module to clear cached config
    vi.resetModules();
  });

  it("throws when UPSTREAM_SOURCE has an invalid value", async () => {
    process.env["UPSTREAM_SOURCE"] = "INVALID";
    try {
      const { getConfig } = await import("../config.js");
      // Reset cache by re-importing a fresh module (resetModules above)
      expect(() => getConfig()).toThrow(
        "UPSTREAM_SOURCE deve ser 'local' ou 'release'"
      );
    } finally {
      delete process.env["UPSTREAM_SOURCE"];
    }
  });
});
