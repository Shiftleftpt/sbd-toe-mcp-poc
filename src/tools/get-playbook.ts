/**
 * get_sbd_toe_playbook — o caminho NORMATIVO para cross-checks e playbooks.
 *
 * 0.20.0-beta.33. A medição do Eixo I (beta.32) deu ao GR-02 — «somos entidade sujeita ao
 * DORA, como é que o SbD-ToE nos serve?» — **1 de 5 peças**, e sob o critério v1.1 do
 * oráculo (que exige caminho para a PEÇA CENTRAL, e a peça central do GR-02 é o PLAYBOOK)
 * o veredicto é **NÃO SERVIDO**: o playbook só era alcançável por `search_sbd_toe_manual`,
 * declarado NÃO-NORMATIVO. É a leitura que os clientes fazem primeiro e era a que estava
 * pior.
 *
 * Nada havia a construir a montante: o bundle publica 20 playbooks em
 * `overlay/overlay_playbooks.json` e 450 secções nos chunks de `002-cross-check-normativo`.
 * Faltava a PORTA — e é só isso que esta tool é.
 *
 * Duas regras que a forma tem de respeitar:
 *  1. **Autoridade visível.** O Manual distingue cross-check NORMATIVO de EXEMPLO
 *     ilustrativo. Os 5 `illustrative_example` nunca vêm com o mesmo estatuto dos playbooks:
 *     saem numa banda própria, com o aviso de que ilustram e não normalizam.
 *  2. **Delimitação honesta, sempre.** «O SbD-ToE não é uma norma»: implementar cobre grande
 *     parte da base AppSec e operacional, e a conformidade final depende de formalização
 *     regulatória adicional. Sem esta peça, servir um playbook vira claim de conformidade —
 *     que é o que este programa nunca faz.
 */
import { getRegulatoryOverlay, type RegulatoryPlaybook } from "./regulatory-overlay-loader.js";
import { loadChunkIndex, type ManualChunk } from "../serving/chunk-index.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { paginate } from "../serving/response-shaping.js";
import type { Affordance } from "../serving/protocol-envelope.js";

/** Tiers de autoridade: o que NORMALIZA vs o que ILUSTRA. Derivado do `playbook_kind`. */
const ILLUSTRATIVE_KINDS = new Set(["illustrative_example", "illustrative_index"]);

const DELIMITATION =
  "DELIMITAÇÃO (obrigatória em toda a resposta desta superfície): o SbD-ToE **não é uma norma** — foi " +
  "desenhado para dialogar com elas. Implementá-lo cobre grande parte da base AppSec e operacional que " +
  "estes diplomas exigem, mas **a conformidade final depende de formalização regulatória adicional** " +
  "(âmbito, governação documental, evidência aceite pelo regulador), que fica FORA do Manual e vive no " +
  "overlay/compliance da organização. NÃO afirmes conformidade a partir daqui.";

function normalizeFramework(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const raw = value.trim().toUpperCase();
  return raw.startsWith("EXT-") ? raw : `EXT-${raw}`;
}

function sectionsOf(playbook: RegulatoryPlaybook): ManualChunk[] {
  const doc = playbook.source_document_id;
  if (doc === undefined) return [];
  return loadChunkIndex().filter((c) => c.document_id === doc);
}

/** O roadmap de frameworks por cobrir, DERIVADO do próprio Manual (não escrito à mão). */
function roadmapFromManual(): string[] {
  const intro = loadChunkIndex().filter((c) => /Roadmap/i.test(c.text ?? "") && /cross-check/i.test(c.document_id ?? ""));
  const names = new Set<string>();
  for (const chunk of intro)
    for (const m of (chunk.text ?? "").matchAll(/\*\*(ISO 27001|HIPAA|PCI-?DSS|SOC ?2|FedRAMP|CSA STAR)\*\*/gi))
      names.add(String(m[1]));
  return [...names].sort();
}

export interface PlaybookResult {
  provenance: { kg: string; server: string; content_type: string; produced_by: string; source_data: string; note: string };
  delimitation: string;
  [key: string]: unknown;
  next?: Affordance[];
}

export function handleGetPlaybook(args: Record<string, unknown>): PlaybookResult {
  const overlay = getRegulatoryOverlay();
  const provenance = {
    kg: servedKgReleaseTag(),
    server: servingServerVersion(),
    content_type: "canonical",
    produced_by: "overlay_playbook_projection",
    source_data: "data/publish/overlay/overlay_playbooks.json + data/publish/indexes/mcp_chunks.jsonl (002-cross-check-normativo)",
    note:
      "Cross-checks e playbooks publicados pelo Manual, servidos com a sua AUTORIDADE declarada. " +
      "Superfície NORMATIVA — ao contrário do `search_sbd_toe_manual`, que é leitura e não decide âmbito."
  };
  if (overlay.status === "absent") {
    return {
      provenance,
      delimitation: DELIMITATION,
      status: "absent",
      note: `Overlay regulatório ausente nesta build: ${overlay.absentReason ?? "not published"}. Nenhum playbook a servir — declarado, não silencioso.`
    };
  }

  const playbooks = overlay.playbooks ?? [];
  const frameworkArg = typeof args["framework"] === "string" ? (args["framework"] as string) : undefined;
  const framework = normalizeFramework(frameworkArg);
  const playbookId = typeof args["playbook_id"] === "string" ? (args["playbook_id"] as string) : undefined;
  const kind = typeof args["kind"] === "string" ? (args["kind"] as string) : undefined;

  // ── detalhe: as SECÇÕES de um playbook (o mapa artigo→capítulo, as fases, a checklist)
  if (playbookId !== undefined) {
    const playbook = playbooks.find((p) => p.playbook_id === playbookId);
    if (playbook === undefined) {
      return {
        provenance,
        delimitation: DELIMITATION,
        status: "unknown_playbook",
        requested: playbookId,
        known_playbook_ids: playbooks.map((p) => p.playbook_id).sort(),
        note: `\`${playbookId}\` não é um playbook publicado. Os ids válidos vêm acima — pede o índice sem argumentos para os ver com o framework e a autoridade.`
      };
    }
    const sections = sectionsOf(playbook);
    const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
    const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : 10;
    const page = paginate(sections, { offset: offsetArg, limit: limitArg }, sections.length || 1);
    const illustrative = ILLUSTRATIVE_KINDS.has(playbook.playbook_kind);
    return {
      provenance,
      delimitation: DELIMITATION,
      playbook: {
        playbook_id: playbook.playbook_id,
        title: playbook.title,
        playbook_kind: playbook.playbook_kind,
        framework_ids: playbook.framework_ids,
        authority: {
          tier: illustrative ? "illustrative" : "normative",
          authority_class: playbook.authority_class,
          curation_status: playbook.curation_status,
          adoption_status: playbook.adoption_status,
          note: illustrative
            ? "EXEMPLO ILUSTRATIVO: mostra UMA forma de fazer, não normaliza nem substitui o cross-check. Não o cites como exigência."
            : "Cross-check/playbook do Manual, com a autoridade que o bundle lhe atribui. É orientação estruturada, não conformidade."
        },
        source_path: playbook.source_path
      },
      sections: page.items.map((c) => ({
        section_id: c.chunk_id,
        title: c.title,
        section_path: c.section_path,
        text: c.text
      })),
      coverage: { ...page.coverage, total: sections.length },
      next: [
        {
          intent: "As obrigações e áreas do manual que este framework activa",
          tool: "map_sbd_toe_regulatory_activation",
          with: `framework="${(playbook.framework_ids[0] ?? "").replace(/^EXT-/, "")}"`,
          kind: "structural" as const
        },
        {
          intent: "Os requisitos do capítulo que o playbook manda trabalhar",
          tool: "select_sbd_toe_requirements",
          with: 'risk_level="L2", chapters=["14-governanca-contratacao"]',
          kind: "structural" as const
        }
      ]
    };
  }

  // ── índice: por framework, ou o mapa completo
  const scoped = playbooks.filter(
    (p) => (framework === undefined || p.framework_ids.includes(framework)) && (kind === undefined || p.playbook_kind === kind)
  );
  const project = (p: RegulatoryPlaybook) => ({
    playbook_id: p.playbook_id,
    title: p.title,
    playbook_kind: p.playbook_kind,
    framework_ids: p.framework_ids,
    authority_class: p.authority_class,
    curation_status: p.curation_status,
    adoption_status: p.adoption_status,
    read_with: `get_sbd_toe_playbook(playbook_id="${p.playbook_id}")`
  });
  const normative = scoped.filter((p) => !ILLUSTRATIVE_KINDS.has(p.playbook_kind)).map(project);
  const illustrative = scoped.filter((p) => ILLUSTRATIVE_KINDS.has(p.playbook_kind)).map(project);

  // framework pedido e sem cross-check publicado: DECLARADO, com o roadmap do próprio Manual
  if (framework !== undefined && scoped.length === 0) {
    const covered = [...new Set(playbooks.flatMap((p) => p.framework_ids))].map((f) => f.replace(/^EXT-/, "")).sort();
    return {
      provenance,
      delimitation: DELIMITATION,
      status: "no_cross_check",
      requested: frameworkArg,
      covered_frameworks: covered,
      roadmap_declared_by_manual: roadmapFromManual(),
      note:
        `O cross-check para \`${frameworkArg}\` **ainda não existe**: o Manual publica-o como ROADMAP, não como conteúdo. ` +
        "Isto não é uma lacuna silenciosa nem um convite a improvisar — o que EXISTE é o grounding no AppSec Core " +
        "(requisitos, controlos e provas do Manual), que podes pedir por `select_sbd_toe_requirements`. " +
        "NÃO construas um cross-check a partir de requisitos genéricos e não o apresentes como se o Manual o publicasse.",
      next: [
        {
          intent: "O que o Manual EXIGE (grounding), já que o cross-check não existe",
          tool: "select_sbd_toe_requirements",
          with: 'risk_level="L2", concerns=["architecture"]',
          kind: "structural" as const
        }
      ]
    };
  }

  return {
    provenance,
    delimitation: DELIMITATION,
    scope: framework === undefined ? "todos os frameworks" : frameworkArg,
    normative_playbooks: normative,
    illustrative_examples: {
      note:
        "EXEMPLOS ILUSTRATIVOS — banda separada de propósito. Mostram UMA forma de fazer (toolchain, KPIs, RACI…) " +
        "e NÃO têm o estatuto dos cross-checks: não os cites como exigência do Manual.",
      values: illustrative
    },
    covered_frameworks: [...new Set(playbooks.flatMap((p) => p.framework_ids))].map((f) => f.replace(/^EXT-/, "")).sort(),
    roadmap_declared_by_manual: roadmapFromManual(),
    coverage: { total: scoped.length, normative: normative.length, illustrative: illustrative.length },
    next: [
      {
        intent: "Ler um playbook (secções paginadas)",
        tool: "get_sbd_toe_playbook",
        with: `playbook_id="${(normative[0] ?? illustrative[0])?.playbook_id ?? "OVR-DORA-playbook"}"`,
        kind: "structural" as const
      },
      {
        intent: "As obrigações que o framework activa no Manual",
        tool: "map_sbd_toe_regulatory_activation",
        with: `framework="${(frameworkArg ?? "DORA").replace(/^EXT-/, "")}"`,
        kind: "structural" as const
      }
    ]
  };
}
