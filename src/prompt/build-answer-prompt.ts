import type { NormalizedRecord, PromptBundle } from "../types.js";
import { loadSystemPromptTemplate } from "./system-prompt.js";

function renderOptional(label: string, value?: string): string {
  return value ? `${label}: ${value}` : `${label}: n/d`;
}

function renderLocation(record: NormalizedRecord): string {
  const parts = [record.pageLabel, record.url].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "n/d";
}

function renderRecord(record: NormalizedRecord): string {
  return [
    `[${record.citationId}]`,
    `Fonte: ${record.indexName}`,
    `Título: ${record.title}`,
    renderOptional("Capítulo", record.chapter),
    renderOptional("Secção", record.section),
    renderOptional("Papel", record.role),
    renderOptional("Fase", record.phase),
    renderOptional("Ação", record.action),
    renderOptional("Artefacto", record.artefact),
    renderOptional("Documento", record.documentTitle),
    renderOptional("Document path", record.documentPath),
    renderOptional("Chapter path", record.chapterPath),
    `Localização: ${renderLocation(record)}`,
    `Excerto: ${record.excerpt}`
  ].join("\n");
}

export function buildAnswerPrompt(
  query: string,
  records: NormalizedRecord[]
): PromptBundle {
  const contextBlock =
    records.length === 0
      ? "Nenhum record relevante foi recuperado."
      : records.map((record) => renderRecord(record)).join("\n\n");

  const systemPrompt = loadSystemPromptTemplate();
  const userPrompt = [
    `Question: ${query}`,
    "",
    "Retrieved SbD-ToE context:",
    contextBlock,
    "",
    "Output requirements:",
    "1. Answer only from this retrieved context.",
    "2. Cite factual claims with [D1], [E1], etc.",
    "3. If the answer is not in the retrieved context, say the information is not available.",
    "4. When a documentation URL exists in the retrieved context, include it without inventing anchors.",
    "5. Prefer the structure Role, Phase, Action, Artifact."
  ].join("\n");

  return {
    systemPrompt,
    userPrompt,
    fullPrompt: `### System\n${systemPrompt}\n\n### User\n${userPrompt}`
  };
}
