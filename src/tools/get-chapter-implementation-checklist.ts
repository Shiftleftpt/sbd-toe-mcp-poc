/**
 * get_sbd_toe_chapter_implementation_checklist
 *
 * The canon/20 "how to implement chapter NN" checklist — retrieval-grounded prose
 * from the manual's chunk layer (`chunk_kind: checklist_section`, the
 * 'aplicacao-lifecycle' canon), the artefact the demotion masked and amendment 0005
 * re-promoted. Implementation-view family; serves NOW via profile/chunks (v1.4).
 *
 * Grounding: every item is a published chunk (chunk_id + source path); nothing
 * invented. The structured, level-sharp Definition-of-Done lives in
 * get_guide_by_role(include_detail) — surfaced as a `next` affordance.
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import {
  filterChunks,
  resolveChapterBundle,
  chapterBundleIds,
  type ManualChunk
} from "../serving/chunk-index.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";

const VALID_RISK = ["L1", "L2", "L3"];

export interface ChecklistItem {
  chunk_id: string;
  title: string;
  section_path: string;
  source_path?: string;
  text: string;
}

export interface ChapterChecklistData {
  chapter: string;
  risk_level?: string;
  items: ChecklistItem[];
  totals: { items: number };
}

function toItem(c: ManualChunk): ChecklistItem {
  return {
    chunk_id: c.chunk_id,
    title: c.title,
    section_path: c.section_path,
    ...(c.traceability?.source_path ? { source_path: c.traceability.source_path } : {}),
    text: c.text
  };
}

export function handleGetChapterImplementationChecklist(
  args: Record<string, unknown>
): ProtocolEnvelope<ChapterChecklistData> {
  const chapterArg = typeof args["chapter"] === "string" ? args["chapter"] : "";
  if (!chapterArg.trim()) {
    throw Object.assign(new Error('The "chapter" argument is required.'), {
      rpcError: { code: -32602, message: 'Missing "chapter"' }
    });
  }
  const bundle = resolveChapterBundle(chapterArg);
  if (!bundle) {
    throw Object.assign(
      new Error(`Unknown chapter: "${chapterArg}". Known chapters: ${chapterBundleIds().join(", ")}.`),
      { rpcError: { code: -32602, message: `Unknown chapter: "${chapterArg}"` } }
    );
  }

  const riskArg = typeof args["risk_level"] === "string" ? args["risk_level"] : undefined;
  if (riskArg !== undefined && !VALID_RISK.includes(riskArg)) {
    throw new Error(`Invalid risk_level: "${riskArg}". Allowed: L1, L2, L3.`);
  }

  // Primary: the canon/20 checklist sections; fall back to the chapter's
  // implementation-profile narrative if the chapter has no checklist section.
  let chunks = filterChunks({ bundle_id: bundle, chunk_kinds: ["checklist_section"] });
  let kind: "checklist_section" | "implementation_narrative" = "checklist_section";
  if (chunks.length === 0) {
    chunks = filterChunks({ bundle_id: bundle, profile: "implementation" });
    kind = "implementation_narrative";
  }

  const offsetArg = args["offset"];
  const limitArg = args["limit"];
  const page = paginate(
    chunks,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: typeof limitArg === "number" ? limitArg : 20
    },
    chunks.length || 1
  );

  const coverage: PageCoverage & { items: number; source: string } = {
    ...page.coverage,
    items: chunks.length,
    source: kind
  };

  const roleHint = riskArg ? `risk_level="${riskArg}", ` : "";
  return {
    data: {
      chapter: bundle,
      ...(riskArg ? { risk_level: riskArg } : {}),
      items: page.items.map(toItem),
      /**
       * 0.20.0-beta.31 — capítulo publicado SEM itens de checklist: declarado.
       * `00-fundamentos` é um capítulo canónico e devolvia `items: []` sem uma palavra —
       * apanhado pela invariante alargada das superfícies de vocabulário, não por um
       * avaliador. Zero itens não é «nada a implementar»: é um capítulo cujo conteúdo
       * publicado não tem forma de checklist.
       */
      ...(chunks.length === 0
        ? {
            unsupported_chapter: {
              value: bundle,
              note:
                `O capítulo \`${bundle}\` é CANÓNICO e publicado, mas o bundle servido não traz chunks de ` +
                `tipo \`${kind}\` para ele — não há checklist de implementação a projectar. NÃO concluas que o ` +
                "capítulo não exige nada: usa `get_sbd_toe_chapter_brief` para o que ele cobre, e " +
                '`select_sbd_toe_requirements(chapters=["' + "${bundle}" + '"])` para os requisitos, se os tiver.',
            },
          }
        : {}),
      /**
       * 0.20.0-beta.36 (emenda v1.2, 2ª regra) — O ESCASSO DECLARA-SE.
       * O cap. 07 devolve 2 blocos e nada dizia que era pouco. Mesma regra do «zero
       * declarado»: a resposta diz que é magro e porquê (é o que o Manual publica ali).
       * A magreza sobe como achado de CONTEÚDO ao Author — não se enriquece aqui.
       */
      ...(chunks.length > 0 && chunks.length <= 3
        ? {
            scarcity: {
              items: chunks.length,
              note:
                `MAGRO e declarado: o Manual publica ${chunks.length} bloco(s) de checklist para \`${bundle}\` — ` +
                "não é um checklist de capacidade organizacional, são as secções de prosa que existem. " +
                "NÃO concluas que implementar este capítulo tem 2 passos. Para a capacidade e a medida usa " +
                `\`get_sbd_toe_chapter_capability(chapter="${bundle}")\`; para o que o capítulo cobre, ` +
                `\`get_sbd_toe_chapter_brief(chapterId="${bundle}")\`.`
            }
          }
        : {}),
      totals: { items: chunks.length }
    },
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "canonical",
      produced_by: "implementation_checklist_projection",
      source_data: `data/publish/indexes/mcp_chunks.jsonl (chunk_kind=${kind}, bundle=${bundle})`,
      note:
        "Retrieval-grounded canon/20 implementation checklist (prose). Each item is a " +
        "published chunk; nothing invented. The level-sharp structured DoD is in get_guide_by_role."
    },
    coverage,
    next: boundAffordances([
      {
        intent: "get the level-sharp structured Definition-of-Done for this chapter's role",
        tool: "get_guide_by_role",
        with: `${roleHint}role=<chapter role>, include_detail=true`,
        kind: "structural"
      },
      {
        intent: "get the security requirements behind these implementation steps",
        tool: "consult_security_requirements",
        with: "risk_level + concerns (os do capítulo acima)",
        kind: "semantic"
      }
    ])
  };
}
