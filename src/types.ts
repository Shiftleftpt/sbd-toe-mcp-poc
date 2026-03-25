export type RetrievalSource = "docs" | "entities";

export type LooseRecord = Record<string, unknown> & {
  objectID?: string;
  _rankingInfo?: Record<string, unknown>;
};

export interface AppConfig {
  backend: {
    docsIndex: string;
    entitiesIndex: string;
    docsHits: number;
    entitiesHits: number;
    maxContextRecords: number;
    upstreamRepoDir: string;
    checkoutFile: string;
    docsSnapshotFile: string;
    entitiesSnapshotFile: string;
    docsEnrichedSnapshotFile: string;
    entitiesEnrichedSnapshotFile: string;
    indexSettingsFile: string;
    runManifestFile: string;
    readonly upstreamSource: "local" | "release";
    readonly upstreamReleaseTag: string;
    readonly upstreamReleaseMaxBytes: number;
    readonly upstreamReleaseTimeoutMs: number;
  };
  prompt: {
    systemPromptFile: string;
    defaultLanguage: string;
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
  raw: LooseRecord;
}

export interface PublishedIndexContract {
  indexName: string;
  recordFamily: string;
  settings: Record<string, unknown>;
}

export interface BackendCheckout {
  schemaVersion: string;
  checkedOutAt: string;
  upstreamRepoPath: string;
  contractFiles: {
    docsSnapshot: string;
    entitiesSnapshot: string;
    docsEnrichedSnapshot: string;
    entitiesEnrichedSnapshot: string;
    indexSettings: string;
    runManifest: string;
  };
  runManifest: {
    runId?: string | undefined;
    generatedAt?: string | undefined;
    branch?: string | undefined;
    commitSha?: string | undefined;
    repoUrl?: string | undefined;
  };
  indices: {
    docs: PublishedIndexContract;
    entities: PublishedIndexContract;
  };
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
    docsSnapshotFile: string;
    entitiesSnapshotFile: string;
    docsEnrichedSnapshotFile: string;
    entitiesEnrichedSnapshotFile: string;
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
      docsSnapshotFile: string;
      entitiesSnapshotFile: string;
      docsEnrichedSnapshotFile: string;
      entitiesEnrichedSnapshotFile: string;
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
    }>;
    finalAnswer?: string | undefined;
  };
}
