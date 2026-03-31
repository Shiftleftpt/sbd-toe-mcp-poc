import { getConfig } from "../config.js";
import { retrievePublishedContext } from "../backend/semantic-index-gateway.js";
import { buildAnswerPrompt } from "../prompt/build-answer-prompt.js";
import type {
  ManualToolResult,
  PromptBundle,
  RetrievalBundle,
  VectorRecallMode
} from "../types.js";

function formatRecordDebug(retrieval: RetrievalBundle): string {
  if (retrieval.retrieved.length === 0) {
    return "Nenhum record recuperado.";
  }

  return retrieval.retrieved
    .map((record, index) => {
      const header = `${index + 1}. [${record.citationId}] source=${record.source} index=${record.indexName} objectID=${record.objectID} rank=${record.algoliaRank} localScore=${record.localScore}`;
      const details = [
        `Título: ${record.title}`,
        `Capítulo: ${record.chapter ?? "n/d"}`,
        `Secção: ${record.section ?? "n/d"}`,
        `Papel: ${record.role ?? "n/d"}`,
        `Fase: ${record.phase ?? "n/d"}`,
        `Ação: ${record.action ?? "n/d"}`,
        `Artefacto: ${record.artefact ?? "n/d"}`,
        `Documento: ${record.documentTitle ?? "n/d"}`,
        `Document path: ${record.documentPath ?? "n/d"}`,
        `Chapter path: ${record.chapterPath ?? "n/d"}`,
        `Traceability: ${
          record.traceability
            ? [
                record.traceability.sourcePath,
                record.traceability.lineStart !== undefined
                  ? `L${record.traceability.lineStart}${
                      record.traceability.lineEnd !== undefined &&
                      record.traceability.lineEnd !== record.traceability.lineStart
                        ? `-L${record.traceability.lineEnd}`
                        : ""
                    }`
                  : undefined,
                record.traceability.unitId
              ]
                .filter(Boolean)
                .join(" | ")
            : "n/d"
        }`,
        `Localização: ${[record.pageLabel, record.url].filter(Boolean).join(" | ") || "n/d"}`,
        `Excerto: ${record.excerpt}`
      ].join("\n");

      return `${header}\n${details}`;
    })
    .join("\n\n");
}

function formatContextForChat(retrieval: RetrievalBundle): string {
  if (retrieval.selected.length === 0) {
    return [
      "Nenhum contexto relevante foi recuperado.",
      "",
      "O chat deve responder que a informação não está disponível no snapshot atual."
    ].join("\n");
  }

  return [
    "Contexto recuperado para resposta grounded:",
    "",
    retrieval.selected
      .map((record) =>
        [
          `[${record.citationId}] ${record.title}`,
          `Fonte: ${record.indexName}`,
          `Capítulo: ${record.chapter ?? "n/d"}`,
          `Secção: ${record.section ?? "n/d"}`,
          `URL: ${record.url ?? "n/d"}`,
          `Excerto: ${record.excerpt}`
        ].join("\n")
      )
      .join("\n\n")
  ].join("\n");
}

function formatDebugAppendix(
  query: string,
  retrieval: RetrievalBundle,
  prompt: string,
  answer?: string,
  samplingModel?: string
): string {
  const chapters =
    retrieval.promptChapters.length > 0 ? retrieval.promptChapters.join(", ") : "n/d";

  return [
    "## Debug",
    `- Query: ${query}`,
    `- Artefactos consultados: ${retrieval.consultedIndices.join(", ") || "n/d"}`,
    `- Snapshot upstream: run_id=${retrieval.backendSnapshot.runId ?? "n/d"} commit_sha=${retrieval.backendSnapshot.commitSha ?? "n/d"}`,
    `- Clone upstream: ${retrieval.backendSnapshot.upstreamRepoPath ?? "n/d"}`,
    `- Publication manifest: ${retrieval.backendSnapshot.publicationManifestFile ?? "n/d"}`,
    `- Deterministic manifest: ${retrieval.backendSnapshot.deterministicManifestFile ?? "n/d"}`,
    `- Ontology: ${retrieval.backendSnapshot.ontologyFile ?? "n/d"}`,
    `- MCP chunks: ${retrieval.backendSnapshot.mcpChunksFile ?? "n/d"}`,
    `- Vector chunks: ${retrieval.backendSnapshot.vectorChunksFile ?? "n/d"}`,
    `- Canonical chunks: ${retrieval.backendSnapshot.canonicalChunksFile ?? "n/d"}`,
    `- Chunk entity mentions: ${retrieval.backendSnapshot.chunkEntityMentionsFile ?? "n/d"}`,
    `- Chunk relation hints: ${retrieval.backendSnapshot.chunkRelationHintsFile ?? "n/d"}`,
    `- Substrate version: ${retrieval.backendSnapshot.substrateVersion ?? "n/d"}`,
    `- Sampling model: ${samplingModel ?? "n/d"}`,
    `- Capítulos envolvidos: ${chapters}`,
    `- Contexto selecionado: ${retrieval.selected.map((record) => `[${record.citationId}]`).join(", ") || "nenhum"}`,
    "",
    "### Records recuperados",
    formatRecordDebug(retrieval),
    "",
    "### Prompt final",
    "```text",
    prompt,
    "```",
    ...(answer
      ? ["", "### Resposta final", "```markdown", answer, "```"]
      : [])
  ].join("\n");
}

export async function prepareManualAnsweringContext(
  question: string,
  topK?: number,
  options: { vectorMode?: VectorRecallMode } = {}
): Promise<{
  retrieval: RetrievalBundle;
  prompt: PromptBundle;
  retrievalText: string;
  debugText: string;
}> {
  const retrieval = await retrievePublishedContext(question, topK, options);
  const prompt = buildAnswerPrompt(question, retrieval.selected);
  const retrievalText = formatContextForChat(retrieval);
  const debugText = formatDebugAppendix(question, retrieval, prompt.fullPrompt);

  return {
    retrieval,
    prompt,
    retrievalText,
    debugText
  };
}

export async function searchManualQuestion(
  question: string,
  debugOverride?: boolean,
  topK?: number,
  options: { vectorMode?: VectorRecallMode } = {}
): Promise<ManualToolResult> {
  const config = getConfig();
  const prepared = await prepareManualAnsweringContext(question, topK, options);
  const text =
    debugOverride ?? config.debugMode
      ? `${prepared.retrievalText}\n\n---\n\n${prepared.debugText}`
      : prepared.retrievalText;

  return {
    text,
    debugText: prepared.debugText,
    debug: {
      query: question,
      chapters: prepared.retrieval.promptChapters,
      consultedIndices: prepared.retrieval.consultedIndices,
      backendSnapshot: prepared.retrieval.backendSnapshot,
      prompt: prepared.prompt.fullPrompt,
      selectedCitationIds: prepared.retrieval.selected.map((record) => record.citationId),
      retrieved: prepared.retrieval.retrieved.map((record) => ({
        citationId: record.citationId,
        source: record.source,
        indexName: record.indexName,
        objectID: record.objectID,
        algoliaRank: record.algoliaRank,
        localScore: record.localScore,
        title: record.title,
        chapter: record.chapter,
        section: record.section,
        role: record.role,
        phase: record.phase,
        action: record.action,
        artefact: record.artefact,
        url: record.url,
        pageLabel: record.pageLabel,
        documentPath: record.documentPath,
        chapterPath: record.chapterPath,
        excerpt: record.excerpt,
        traceability: record.traceability
      }))
    }
  };
}

export async function inspectManualRetrieval(
  question: string,
  topK?: number,
  options: { vectorMode?: VectorRecallMode } = {}
): Promise<ManualToolResult> {
  const prepared = await prepareManualAnsweringContext(question, topK, options);

  return {
    text: prepared.debugText,
    debugText: prepared.debugText,
    debug: {
      query: question,
      chapters: prepared.retrieval.promptChapters,
      consultedIndices: prepared.retrieval.consultedIndices,
      backendSnapshot: prepared.retrieval.backendSnapshot,
      prompt: prepared.prompt.fullPrompt,
      selectedCitationIds: prepared.retrieval.selected.map((record) => record.citationId),
      retrieved: prepared.retrieval.retrieved.map((record) => ({
        citationId: record.citationId,
        source: record.source,
        indexName: record.indexName,
        objectID: record.objectID,
        algoliaRank: record.algoliaRank,
        localScore: record.localScore,
        title: record.title,
        chapter: record.chapter,
        section: record.section,
        role: record.role,
        phase: record.phase,
        action: record.action,
        artefact: record.artefact,
        url: record.url,
        pageLabel: record.pageLabel,
        documentPath: record.documentPath,
        chapterPath: record.chapterPath,
        excerpt: record.excerpt,
        traceability: record.traceability
      }))
    }
  };
}

export function formatSampledAnswerResult(
  question: string,
  prepared: {
    retrieval: RetrievalBundle;
    prompt: PromptBundle;
  },
  answer: string,
  samplingModel?: string,
  debugOverride?: boolean
): ManualToolResult {
  const config = getConfig();
  const debugText = formatDebugAppendix(
    question,
    prepared.retrieval,
    prepared.prompt.fullPrompt,
    answer,
    samplingModel
  );

  return {
    text:
      debugOverride ?? config.debugMode ? `${answer}\n\n---\n\n${debugText}` : answer,
    debugText,
    debug: {
      query: question,
      samplingModel,
      chapters: prepared.retrieval.promptChapters,
      consultedIndices: prepared.retrieval.consultedIndices,
      backendSnapshot: prepared.retrieval.backendSnapshot,
      prompt: prepared.prompt.fullPrompt,
      selectedCitationIds: prepared.retrieval.selected.map((record) => record.citationId),
      retrieved: prepared.retrieval.retrieved.map((record) => ({
        citationId: record.citationId,
        source: record.source,
        indexName: record.indexName,
        objectID: record.objectID,
        algoliaRank: record.algoliaRank,
        localScore: record.localScore,
        title: record.title,
        chapter: record.chapter,
        section: record.section,
        role: record.role,
        phase: record.phase,
        action: record.action,
        artefact: record.artefact,
        url: record.url,
        pageLabel: record.pageLabel,
        documentPath: record.documentPath,
        chapterPath: record.chapterPath,
        excerpt: record.excerpt,
        traceability: record.traceability
      })),
      finalAnswer: answer
    }
  };
}
