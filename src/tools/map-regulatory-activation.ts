/**
 * map_sbd_toe_regulatory_activation
 *
 * Regulatory lens (Implementation-view family) — the REVERSE of provenance:
 * "framework X → which manual areas to activate". Given a regulatory framework
 * (DORA / NIS2 / CRA / RGPD), groups the published overlay mappings by manual
 * chapter so an agent sees, coverage-preserving, exactly which areas the framework
 * touches and how to act on them.
 *
 * Data = the published overlay mappings (data/publish/overlay/overlay_mappings.jsonl);
 * nothing is invented. Reference implementation of the protocol envelope
 * ({ data, provenance, coverage?, next }).
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { chapterNumber } from "./ontology-loader.js";
import { loadRegulatoryOverlay, type RegulatoryMapping } from "./regulatory-overlay-loader.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import {
  boundAffordances,
  type Affordance,
  type ProtocolEnvelope
} from "../serving/protocol-envelope.js";

export interface ActivatedArea {
  /** Manual chapter id (e.g. "08-iac-infraestrutura"), or "(cross-cutting)". */
  chapter: string;
  /** Number of overlay mappings the framework projects onto this area. */
  mapping_count: number;
  /** Distinct obligations of the framework that touch this area. */
  obligation_count: number;
  /** 0.20.0-beta.26: os ids das obrigações desta área — poupa a viagem ao resolve_entities. */
  obligation_ids: string[];
  /** Mapping counts broken down by target type (Practice/Requirement/Control/…). */
  by_target_type: Record<string, number>;
  /** 0.20.0-beta.26: diz o que a citação É (artigo do diploma), para "30"/"25" não passarem por contagens. */
  example_citation_note?: string;
  /** A representative citation from the framework for this area (first non-empty). */
  example_citation?: string;
}

export interface RegulatoryActivationData {
  framework: { id: string; short_code: string; name: string };
  activated: ActivatedArea[];
  totals: {
    mappings: number;
    obligations: number;
    chapters: number;
  };
}

const CHAPTER_FROM_TARGET = /^(\d{2}-[a-z0-9-]+)/i;

/** Extracts the manual chapter id from a mapping target_id, or null if cross-cutting. */
function chapterOfTarget(targetId: string): string | null {
  const match = CHAPTER_FROM_TARGET.exec(targetId);
  return match?.[1] ?? null;
}

const CROSS_CUTTING = "(cross-cutting)";

function buildAffordances(frameworkShort: string): Affordance[] {
  return boundAffordances([
    {
      // 0.20.0-beta.33 — ligação nos DOIS sentidos: quem pede as áreas activadas passa a
      // saber que o Manual publica um CROSS-CHECK/PLAYBOOK para o mesmo diploma. As duas
      // coisas viviam separadas e a mais rica era a invisível.
      intent: "o CROSS-CHECK/PLAYBOOK do Manual para este framework (mapa artigo→capítulo, fases, checklist)",
      tool: "get_sbd_toe_playbook",
      with: `framework="${frameworkShort}"`,
      kind: "structural"
    },
    {
      intent: "scope the activated areas to a risk level + see active chapters/controls",
      tool: "map_sbd_toe_applicability",
      with: 'riskLevel="<L1|L2|L3>"; cruza com os capítulos acima',
      kind: "semantic"
    },
    {
      intent: "turn an activated chapter into the per-role work to do",
      tool: "get_guide_by_role",
      with: "risk_level + role (opcional: phase)",
      kind: "semantic"
    },
    {
      intent: "get the security requirements for an activated area",
      tool: "consult_security_requirements",
      with: `risk_level + concerns (recomendado <=3) das áreas activadas (${frameworkShort})`,
      kind: "structural"
    }
  ]);
}

export function handleMapRegulatoryActivation(
  args: Record<string, unknown>
): ProtocolEnvelope<RegulatoryActivationData> {
  const frameworkArg = typeof args["framework"] === "string" ? args["framework"].trim() : "";
  if (!frameworkArg) {
    throw Object.assign(new Error('The "framework" argument is required.'), {
      rpcError: { code: -32602, message: 'Missing "framework"' }
    });
  }

  const overlay = loadRegulatoryOverlay();
  const knownShort = [...overlay.frameworksByShortCode.keys()].sort();

  if (overlay.status !== "published" || overlay.frameworks.length === 0) {
    throw Object.assign(new Error("Regulatory overlay is not available in this bundle."), {
      rpcError: { code: -32603, message: "overlay unavailable" }
    });
  }

  // Resolve framework: accept short code (DORA), full id (EXT-DORA), case-insensitive.
  const token = frameworkArg.toUpperCase();
  const framework =
    overlay.frameworksByShortCode.get(token) ??
    overlay.frameworksByShortCode.get(token.replace(/^EXT-/, "")) ??
    overlay.frameworksById.get(token) ??
    overlay.frameworksById.get(`EXT-${token}`);
  if (!framework) {
    throw Object.assign(
      new Error(`Unknown framework: "${frameworkArg}". Known frameworks: ${knownShort.join(", ")}.`),
      { rpcError: { code: -32602, message: `Unknown framework: "${frameworkArg}"` } }
    );
  }

  const mappings: RegulatoryMapping[] = overlay.mappings.filter(
    (m) => m.framework_id === framework.framework_id
  );

  // Group by manual chapter (the "which areas to activate" answer).
  const byChapter = new Map<
    string,
    { count: number; obligations: Set<string>; byType: Record<string, number>; citation?: string }
  >();
  for (const m of mappings) {
    const chapter = chapterOfTarget(m.target_id) ?? CROSS_CUTTING;
    const group = byChapter.get(chapter) ?? { count: 0, obligations: new Set<string>(), byType: {} };
    group.count += 1;
    if (m.obligation_id) group.obligations.add(m.obligation_id);
    group.byType[m.target_type] = (group.byType[m.target_type] ?? 0) + 1;
    if (!group.citation && m.citation) group.citation = m.citation;
    byChapter.set(chapter, group);
  }

  // Sort: real chapters by number ascending, cross-cutting last.
  const activated: ActivatedArea[] = [...byChapter.entries()]
    .sort(([a], [b]) => {
      if (a === CROSS_CUTTING) return 1;
      if (b === CROSS_CUTTING) return -1;
      return chapterNumber(a) - chapterNumber(b);
    })
    .map(([chapter, g]) => ({
      chapter,
      mapping_count: g.count,
      obligation_count: g.obligations.size,
      /**
       * 0.20.0-beta.26 (§17-D): os IDs, não só a contagem. Antes o consumidor via
       * `obligation_count: 7` e tinha de ir ao `resolve_entities` adivinhar quais —
       * uma viagem inteira para obter o que já estava calculado aqui.
       */
      obligation_ids: [...g.obligations].sort(),
      by_target_type: g.byType,
      ...(g.citation
        ? {
            example_citation: g.citation,
            example_citation_note:
              `Citação do texto do framework (ex.: "${g.citation}" é o ARTIGO/secção do diploma, não um id do manual nem uma contagem). ` +
              "Os ids das obrigações estão em `obligation_ids`."
          }
        : {})
    }));

  const distinctObligations = new Set(mappings.map((m) => m.obligation_id).filter(Boolean)).size;
  /**
   * 0.20.0-beta.31 — framework PUBLICADO sem mapeamentos: declarado, nunca vazio mudo.
   *
   * `ENISA-CSA` é aceite como valor canónico e devolvia `activated: []` sem uma palavra —
   * a mesma classe do `unsupported_concerns` (beta.23), numa superfície que nunca tinha
   * sido varrida. O modelo já existia escrito; faltava aplicá-lo aqui. Pedido quatro vezes
   * pelo avaliador.
   */
  const unsupportedObligations =
    mappings.length === 0
      ? {
          framework: framework.short_code,
          note:
            `O framework \`${framework.short_code}\` é RECONHECIDO (está no conjunto publicado), mas o ` +
            "bundle servido não traz mapeamentos obrigação→manual para ele: zero áreas activadas não significa que o " +
            "framework não se aplique, significa que esta camada de mapeamento ainda não o cobre. É lacuna DECLARADA, " +
            "não ausência de obrigação. Não afirmes conformidade nem isenção a partir desta resposta.",
        }
      : undefined;

  // Coverage-preserving pagination over the activated areas.
  const offsetArg = args["offset"];
  const limitArg = args["limit"];
  const page = paginate(
    activated,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: typeof limitArg === "number" ? limitArg : undefined
    },
    activated.length || 1
  );

  const coverage: PageCoverage & { mappings: number; obligations: number; chapters: number } = {
    ...page.coverage,
    mappings: mappings.length,
    obligations: distinctObligations,
    chapters: activated.length
  };

  return {
    data: {
      framework: {
        id: framework.framework_id,
        short_code: framework.short_code,
        name: framework.name
      },
      activated: page.items,
      ...(unsupportedObligations ? { unsupported_obligations: unsupportedObligations } : {}),
      totals: {
        mappings: mappings.length,
        obligations: distinctObligations,
        chapters: activated.length
      }
    },
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "canonical",
      produced_by: "regulatory_overlay_projection",
      source_data: "data/publish/overlay/overlay_mappings.jsonl + external_frameworks.json",
      note:
        "Reverse-of-provenance lens: the framework's published overlay mappings grouped " +
        "by manual chapter. Counts are the full set (coverage-preserving) — nothing invented."
    },
    coverage,
    /**
     * 0.20.0-beta.33 — ligação nos DOIS sentidos. As áreas activadas e o PLAYBOOK viviam
     * separados, e a peça mais rica era a invisível: quem pedia o overlay não sabia que o
     * Manual publica um cross-check para o mesmo diploma.
     */
    next: buildAffordances(framework.short_code)
  };
}
