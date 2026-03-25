import type { SnapshotPayload } from "./types.js";

/**
 * Mock de um snapshot com items vazios.
 */
export const emptySnapshotPayload: SnapshotPayload = {
  run_id: "test-run-001",
  items: []
};

/**
 * Mock de um snapshot con items comuns para testes.
 */
export const mockSnapshotPayload: SnapshotPayload = {
  run_id: "test-run-001",
  items: [
    {
      objectID: "doc-001",
      title: "Como fazer bootstrap do repositório",
      content: "Instruções para bootstrap inicial",
      chapter_title: "Cap. 01",
      section_title: "Bootstrap",
      tags: ["bootstrap", "setup"],
      aliases_pt_en: ["repository initialization", "initial setup"],
      intent_topics: ["bootstrap"],
      canonical_control_ids: ["REQ-001"],
      artifact_ids: ["ART-001"],
      authority_level: "canonical"
    },
    {
      objectID: "doc-002",
      title: "Dependências de segurança",
      content: "Gestão de dependências com SBOM e SCA",
      chapter_title: "Cap. 05",
      section_title: "Dependências",
      tags: ["dependencies", "sbom", "sca"],
      aliases_pt_en: ["dependency management", "package security"],
      intent_topics: ["dependency_governance"],
      canonical_control_ids: ["REQ-002"],
      artifact_ids: ["ART-002"],
      authority_level: "guidance"
    },
    {
      objectID: "doc-003",
      title: "CI/CD Gates e Aprovações",
      content: "Configurar gates no pipeline e aprovações de release",
      chapter_title: "Cap. 07",
      section_title: "CI/CD Seguro",
      tags: ["ci/cd", "pipeline", "approval"],
      aliases_pt_en: ["continuous integration", "release gates"],
      intent_topics: ["ci_cd_gates"],
      canonical_control_ids: ["REQ-003"],
      artifact_ids: [],
      authority_level: "canonical"
    },
    {
      // Record sem objectID - deve ser ignorado em enrichment
      title: "Record sem ID",
      content: "Não tem objectID",
      chapter_title: "Cap. 00"
    },
    {
      objectID: "doc-004",
      // Sem campos de enrichment
      title: "Record simples",
      content: "Sem enrichment fields"
    }
  ]
};

/**
 * Mock com campos vazios/undefined para testes de edge cases.
 */
export const edgeCaseSnapshotPayload: SnapshotPayload = {
  items: [
    {
      objectID: "edge-001",
      title: "  título com espaços  ",
      content: undefined,
      aliases_pt_en: [] // Array vazio
    },
    {
      objectID: "edge-002",
      title: "Record com tags inválidas",
      tags: ["", null, 123] // Valores inválidos
    }
  ]
};

/**
 * Mock do backend checkout de testes.
 */
export const mockBackendCheckout = {
  schemaVersion: "0.1.0",
  checkedOutAt: new Date().toISOString(),
  upstreamRepoPath: "/upstream/repo",
  contractFiles: {
    docsSnapshot: "data/publish/docs.json",
    entitiesSnapshot: "data/publish/entities.json",
    docsEnrichedSnapshot: "data/publish/docs_enriched.json",
    entitiesEnrichedSnapshot: "data/publish/entities_enriched.json",
    indexSettings: "data/publish/index_settings.json",
    runManifest: "data/reports/run_manifest.json"
  },
  runManifest: {
    runId: "test-run-001",
    generatedAt: "2026-03-24T10:00:00Z",
    branch: "main",
    commitSha: "abc123def456",
    repoUrl: "https://github.com/test/repo"
  },
  indices: {
    docs: {
      indexName: "sbd_toe_docs_test",
      recordFamily: "documents",
      settings: {}
    },
    entities: {
      indexName: "sbd_toe_entities_test",
      recordFamily: "entities",
      settings: {}
    }
  }
};

/**
 * Helper para criar um record normalizado mock para testes de score e intent.
 */
export function createMockNormalizedRecord(overrides: Record<string, unknown> = {}) {
  return {
    citationId: "D1",
    source: "docs" as const,
    indexName: "test_index",
    objectID: "test-001",
    title: "Test Record",
    excerpt: "This is a test excerpt",
    chapter: "Cap. 01",
    section: "Section 1",
    role: "Developer",
    phase: "Development",
    action: "Implementation",
    artefact: "Code",
    url: "https://example.com/test",
    pageLabel: "page-1",
    documentPath: "docs/chapter-01",
    chapterPath: "chapter-01",
    documentTitle: "Test Document",
    tags: ["test", "mock"],
    aliases_pt_en: undefined,
    intent_topics: undefined,
    canonical_control_ids: undefined,
    artifact_ids: undefined,
    authority_level: undefined,
    algoliaRank: 1,
    localScore: 0,
    raw: {
      objectID: "test-001",
      title: "Test Record",
      content: "Test content"
    },
    ...overrides
  };
}

/**
 * Helper para criar um record com intent topics específicos.
 */
export function createMockRecordWithIntentTopics(
  intent: string,
  overrides: Record<string, unknown> = {}
) {
  return createMockNormalizedRecord({
    intent_topics: [intent, "secondary_topic"],
    ...overrides
  });
}

/**
 * Helper para criar um record com aliases.
 */
export function createMockRecordWithAliases(
  aliases: string[],
  overrides: Record<string, unknown> = {}
) {
  return createMockNormalizedRecord({
    aliases_pt_en: aliases,
    ...overrides
  });
}
