import { describe, it, expect } from "vitest";
import { sanitizeRunManifest, ensurePublishedIndex } from "../bootstrap/checkout-backend.js";

/**
 * Tests for sanitizeRunManifest and ensurePublishedIndex from checkout-backend.ts
 */

// Local interfaces for test input annotations.
// Structurally compatible with the private interfaces in checkout-backend.ts.
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

interface UpstreamIndexSettingsPayload {
  items?: Array<{
    index_name?: string;
    record_family?: string;
    settings?: Record<string, unknown>;
  }>;
}

// --- Tests ---

describe("checkout-backend.ts", () => {
  describe("sanitizeRunManifest", () => {
    it("preserves run_id when present", () => {
      const upstream: UpstreamRunManifestPayload = {
        run_id: "test-run-123"
      };

      const result = sanitizeRunManifest(upstream);

      expect(result.run_id).toBe("test-run-123");
    });

    it("omits run_id when undefined", () => {
      const upstream: UpstreamRunManifestPayload = {
        generated_at: "2026-03-24T10:00:00Z"
      };

      const result = sanitizeRunManifest(upstream);

      expect(result).not.toHaveProperty("run_id");
      expect(result.generated_at).toBe("2026-03-24T10:00:00Z");
    });

    it("converts SSH repo_url to HTTPS", () => {
      const upstream: UpstreamRunManifestPayload = {
        repo_url: "git@github.com:test/repo.git"
      };

      const result = sanitizeRunManifest(upstream);

      expect(result.repo_url).toBe("https://github.com/test/repo");
    });

    it("converts SSH repo_url without .git suffix", () => {
      const upstream: UpstreamRunManifestPayload = {
        repo_url: "git@github.com:test/repo"
      };

      const result = sanitizeRunManifest(upstream);

      expect(result.repo_url).toBe("https://github.com/test/repo");
    });

    it("preserves HTTPS repo_url unchanged", () => {
      const upstream: UpstreamRunManifestPayload = {
        repo_url: "https://github.com/test/repo.git"
      };

      const result = sanitizeRunManifest(upstream);

      expect(result.repo_url).toBe("https://github.com/test/repo.git");
    });

    it("handles whitespace in repo_url", () => {
      const upstream: UpstreamRunManifestPayload = {
        repo_url: "  https://github.com/test/repo  "
      };

      const result = sanitizeRunManifest(upstream);

      expect(result.repo_url).toBe("https://github.com/test/repo");
    });

    it("omits repo_url when undefined", () => {
      const upstream: UpstreamRunManifestPayload = {
        run_id: "123"
      };

      const result = sanitizeRunManifest(upstream);

      expect(result).not.toHaveProperty("repo_url");
    });

    it("omits repo_url when empty string", () => {
      const upstream: UpstreamRunManifestPayload = {
        repo_url: ""
      };

      const result = sanitizeRunManifest(upstream);

      expect(result).not.toHaveProperty("repo_url");
    });

    it("preserves all fields when all present", () => {
      const upstream: UpstreamRunManifestPayload = {
        run_id: "run-001",
        generated_at: "2026-03-24T10:00:00Z",
        branch: "main",
        commit_sha: "abc123",
        corpus_root: "/corpus",
        repo_url: "https://github.com/test/repo",
        sync_mode: "full",
        version: "1.0.0"
      };

      const result = sanitizeRunManifest(upstream);

      expect(result.run_id).toBe("run-001");
      expect(result.generated_at).toBe("2026-03-24T10:00:00Z");
      expect(result.branch).toBe("main");
      expect(result.commit_sha).toBe("abc123");
      expect(result.corpus_root).toBe("/corpus");
      expect(result.repo_url).toBe("https://github.com/test/repo");
      expect(result.sync_mode).toBe("full");
      expect(result.version).toBe("1.0.0");
    });
  });

  describe("ensurePublishedIndex", () => {
    it("finds index by record_family", () => {
      const items: UpstreamIndexSettingsPayload["items"] = [
        {
          index_name: "test_docs",
          record_family: "documents",
          settings: { ranking: ["asc(popularity)"] }
        }
      ];

      const result = ensurePublishedIndex(items, "documents", "default_docs");

      expect(result.indexName).toBe("test_docs");
      expect(result.recordFamily).toBe("documents");
      expect(result.settings).toEqual({ ranking: ["asc(popularity)"] });
    });

    it("uses index_name as fallback when record_family not found", () => {
      const items: UpstreamIndexSettingsPayload["items"] = [
        {
          index_name: "fallback_index",
          record_family: "other_family"
        }
      ];

      const result = ensurePublishedIndex(items, "entities", "fallback_index");

      expect(result.indexName).toBe("fallback_index");
      expect(result.recordFamily).toBe("entities");
    });

    it("throws when index not found by family or fallback", () => {
      const items: UpstreamIndexSettingsPayload["items"] = [
        {
          index_name: "some_index",
          record_family: "other_family"
        }
      ];

      expect(() => {
        ensurePublishedIndex(items, "documents", "missing_fallback");
      }).toThrow(/O upstream não publicou um índice utilizável para "documents"/);
    });

    it("throws when items array is empty", () => {
      expect(() => {
        ensurePublishedIndex([], "documents", "fallback");
      }).toThrow(/O upstream não publicou um índice utilizável/);
    });

    it("throws when items is undefined", () => {
      expect(() => {
        ensurePublishedIndex(undefined, "documents", "fallback");
      }).toThrow(/O upstream não publicou um índice utilizável/);
    });

    it("defaults settings to empty object when not provided", () => {
      const items: UpstreamIndexSettingsPayload["items"] = [
        {
          index_name: "test_index",
          record_family: "documents"
          // settings omitted
        }
      ];

      const result = ensurePublishedIndex(items, "documents", "fallback");

      expect(result.settings).toEqual({});
    });

    it("prefers exact family match over fallback", () => {
      const items: UpstreamIndexSettingsPayload["items"] = [
        {
          index_name: "fallback_index",
          record_family: "other_family"
        },
        {
          index_name: "exact_docs_index",
          record_family: "documents"
        }
      ];

      const result = ensurePublishedIndex(items, "documents", "fallback_index");

      expect(result.indexName).toBe("exact_docs_index");
    });
  });
});
