export type RetrievalSource = "docs" | "entities" | "mcp";

export type LooseRecord = Record<string, unknown> & {
  objectID?: string;
  _rankingInfo?: Record<string, unknown>;
};

export interface AppConfig {
  backend: {
    docsIndex: string;
    entitiesIndex: string;
    maxContextRecords: number;
    upstreamRepoDir: string;
    localCheckoutLockFile: string;
    checkoutFile: string;
    publishedIndexesDir: string;
    publishedRuntimeDir: string;
    publicationManifestFile: string;
    deterministicManifestFile: string;
    mcpChunksFile: string;
    canonicalChunksFile: string;
    chunkEntityMentionsFile: string;
    chunkRelationHintsFile: string;
    ontologyFile: string;
    runManifestFile: string;
    readonly upstreamSource: "local" | "release";
    readonly upstreamReleaseTag: string;
    readonly upstreamReleaseMaxBytes: number;
    readonly upstreamReleaseTimeoutMs: number;
  };
  prompt: {
    systemPromptFile: string;
    siteBaseUrl: string;
    manualBaseUrl: string;
    crossCheckBaseUrl: string;
    samplingMaxTokens: number;
  };
  debugMode: boolean;
}

export interface NormalizedRecord {
  citationId: string;
  source: RetrievalSource;
  indexName: string;
  objectID: string;
  title: string;
  excerpt: string;
  chapter?: string | undefined;
  section?: string | undefined;
  role?: string | undefined;
  phase?: string | undefined;
  action?: string | undefined;
  artefact?: string | undefined;
  url?: string | undefined;
  pageLabel?: string | undefined;
  documentPath?: string | undefined;
  chapterPath?: string | undefined;
  documentTitle?: string | undefined;
  tags: string[];
  aliases_pt_en?: readonly string[] | undefined;
  intent_topics?: readonly string[] | undefined;
  canonical_control_ids?: readonly string[] | undefined;
  artifact_ids?: readonly string[] | undefined;
  authority_level?: string | undefined;
  algoliaRank: number;
  localScore: number;
  traceability?: {
    sourcePath?: string | undefined;
    lineStart?: number | undefined;
    lineEnd?: number | undefined;
    unitId?: string | undefined;
  } | undefined;
  raw: LooseRecord;
}

export interface BackendCheckout {
  schemaVersion: string;
  checkedOutAt: string;
  upstreamRepoPath: string;
  upstreamGraph?: {
    headCommitSha?: string | undefined;
    branch?: string | undefined;
  } | undefined;
  contractFiles: {
    runManifest: string;
    publishedIndexesDir?: string | undefined;
    publishedRuntimeDir?: string | undefined;
    publicationManifest?: string | undefined;
    deterministicManifest?: string | undefined;
    bundleCatalog?: string | undefined;
    mcpChunks?: string | undefined;
    canonicalChunks?: string | undefined;
    chunkEntityMentions?: string | undefined;
    chunkRelationHints?: string | undefined;
    ontologyFile?: string | undefined;
  };
  runManifest: {
    runId?: string | undefined;
    generatedAt?: string | undefined;
    branch?: string | undefined;
    commitSha?: string | undefined;
    repoUrl?: string | undefined;
  };
  substrate?: {
    primaryArtifact?: string | undefined;
    substrateVersion?: string | undefined;
  } | undefined;
}

export interface SnapshotPayload {
  run_id?: string;
  generated_at?: string;
  items?: LooseRecord[];
}

export interface RetrievalBundle {
  query: string;
  selected: NormalizedRecord[];
  retrieved: NormalizedRecord[];
  promptChapters: string[];
  consultedIndices: string[];
  backendSnapshot: {
    runId?: string | undefined;
    commitSha?: string | undefined;
    upstreamRepoPath?: string | undefined;
    publicationManifestFile?: string | undefined;
    deterministicManifestFile?: string | undefined;
    ontologyFile?: string | undefined;
    mcpChunksFile?: string | undefined;
    canonicalChunksFile?: string | undefined;
    chunkEntityMentionsFile?: string | undefined;
    chunkRelationHintsFile?: string | undefined;
    substrateVersion?: string | undefined;
  };
}

export interface PromptBundle {
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string;
}

export interface ManualToolResult {
  text: string;
  debugText: string;
  debug: {
    query: string;
    samplingModel?: string | undefined;
    chapters: string[];
    consultedIndices: string[];
    backendSnapshot: {
      runId?: string | undefined;
      commitSha?: string | undefined;
      upstreamRepoPath?: string | undefined;
      publicationManifestFile?: string | undefined;
      deterministicManifestFile?: string | undefined;
      ontologyFile?: string | undefined;
      mcpChunksFile?: string | undefined;
      canonicalChunksFile?: string | undefined;
      chunkEntityMentionsFile?: string | undefined;
      chunkRelationHintsFile?: string | undefined;
      substrateVersion?: string | undefined;
    };
    prompt: string;
    selectedCitationIds: string[];
    retrieved: Array<{
      citationId: string;
      source: RetrievalSource;
      indexName: string;
      objectID: string;
      algoliaRank: number;
      localScore: number;
      title: string;
      chapter?: string | undefined;
      section?: string | undefined;
      role?: string | undefined;
      phase?: string | undefined;
      action?: string | undefined;
      artefact?: string | undefined;
      url?: string | undefined;
      pageLabel?: string | undefined;
      documentPath?: string | undefined;
      chapterPath?: string | undefined;
      excerpt: string;
      traceability?: {
        sourcePath?: string | undefined;
        lineStart?: number | undefined;
        lineEnd?: number | undefined;
        unitId?: string | undefined;
      } | undefined;
    }>;
    finalAnswer?: string | undefined;
  };
}
