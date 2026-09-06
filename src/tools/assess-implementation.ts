/**
 * assess_sbd_toe_implementation
 *
 * Progress / "how implemented am I" — measures an org's submitted KPI values against
 * the published per-level thresholds (metrics.json, thresholds_by_level_parsed) and
 * returns posture + gaps. The V3 audit over the KPIs.
 *
 * Tier: OSS, STATELESS self-report — values in, posture out, NOTHING persisted. The
 * tracked/observed mode (progress over time) is the Premium state layer (V3) and is
 * deliberately not implemented here.
 *
 * Grounding: thresholds come from the published bundle; never invented. A KPI with a
 * threshold at the level but no submitted value is `not_reported` (never assumed pass).
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { resolveChapterBundle } from "../serving/chunk-index.js";
import { paginate } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";

const VALID_RISK = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK)[number];

export interface ParsedThreshold {
  comparable: boolean;
  operator: "gte" | "lte" | "eq" | string;
  value: number;
  unit?: string;
  raw?: string;
}

export interface MetricRecord {
  metric_id: string;
  label: string;
  chapter_id?: string;
  source_document_id?: string;
  source_file?: string;
  thresholds_by_level_parsed?: Record<string, ParsedThreshold | null>;
  /** 0.20.0-beta.34: campos que a vista IMPL publica — já vinham no bundle, faltava o tipo. */
  metric_type?: string;
  metric_scope?: string;
  period?: string;
  dimension_ids?: string[];
  related_documents?: Array<{ document_ref?: string; relationship?: string }>;
}

let cachedMetrics: MetricRecord[] | undefined;
/** 0.20.0-beta.34: exportado — a vista IMPL serve os MESMOS KPIs que esta tool avalia. */
export function loadMetrics(): MetricRecord[] {
  if (cachedMetrics !== undefined) return cachedMetrics;
  try {
    const parsed = JSON.parse(readFileSync(resolveAppPath("data/publish/runtime/metrics.json"), "utf-8")) as {
      items?: MetricRecord[];
    };
    cachedMetrics = Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    cachedMetrics = [];
  }
  return cachedMetrics;
}

function evaluate(value: number, t: ParsedThreshold): boolean {
  switch (t.operator) {
    case "gte":
      return value >= t.value;
    case "lte":
      return value <= t.value;
    case "eq":
      return value === t.value;
    default:
      return false;
  }
}

type KpiStatus = "meets" | "below" | "not_reported" | "not_comparable";

export interface KpiResult {
  metric_id: string;
  label: string;
  chapter?: string;
  threshold_raw?: string;
  threshold_value?: number;
  operator?: string;
  value?: number;
  status: KpiStatus;
  /** Source citation — the published KPI catalog document the threshold is grounded in. */
  source?: { document_id?: string; source_file?: string };
}

export interface AssessData {
  risk_level: string;
  posture: "above" | "at" | "below" | "not_assessed";
  per_kpi: KpiResult[];
  gaps: KpiResult[];
  totals: { applicable: number; meets: number; gaps: number; not_reported: number };
  /** 0.20.0-beta.36 — âmbito da avaliação e o DENOMINADOR explicado. */
  scope: {
    chapter?: string;
    published_total: number;
    applicable_at_level: number;
    note: string;
  };
  /** Count of gaps actually returned in `gaps` (≤ totals.gaps — page per_kpi for the rest). */
  gaps_returned: number;
  gaps_coverage: { total: number; returned: number; offset: number; nextOffset: number | null; hasMore: boolean };
  unknown_metrics: string[];
  mode: "self_report_stateless";
}

// Gaps shown first by actionability: failing thresholds, then non-comparable, then unreported.
const GAP_SEVERITY: Record<KpiStatus, number> = { below: 0, not_comparable: 1, not_reported: 2, meets: 3 };

export function handleAssessImplementation(args: Record<string, unknown>): ProtocolEnvelope<AssessData> {
  const riskArg = args["risk_level"];
  if (typeof riskArg !== "string" || !(VALID_RISK as readonly string[]).includes(riskArg)) {
    throw Object.assign(new Error(`Invalid risk_level: "${String(riskArg)}". Allowed: L1, L2, L3.`), {
      rpcError: { code: -32602, message: "Invalid risk_level" }
    });
  }
  const riskLevel = riskArg as RiskLevel;

  const kpiValuesArg = args["kpi_values"];
  if (typeof kpiValuesArg !== "object" || kpiValuesArg === null || Array.isArray(kpiValuesArg)) {
    throw Object.assign(new Error('"kpi_values" must be an object mapping metric_id → numeric value.'), {
      rpcError: { code: -32602, message: "Invalid kpi_values" }
    });
  }
  const submitted = new Map<string, number>();
  for (const [k, v] of Object.entries(kpiValuesArg as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) submitted.set(k, v);
  }

  /**
   * 0.20.0-beta.36 — ÂMBITO. Quatro KPIs do cap. 07 faziam avaliar 95 do Manual inteiro e
   * fechar com `posture: below` e 91 not_reported — um veredicto que não é o da pergunta.
   * `chapter` restringe o universo; sem ele, o global mantém-se como estava.
   */
  const chapterScope = typeof args["chapter"] === "string" ? (args["chapter"] as string) : undefined;
  const metrics = loadMetrics().filter((m) => chapterScope === undefined || m.chapter_id === chapterScope);
  // 0.15.1 (item 5): auto-relato VAZIO é rejeitado com erro instrutivo — um objecto {}
  // não é uma avaliação; a lista de metric_ids válidos é derivada do catálogo.
  if (kpiValuesArg && typeof kpiValuesArg === "object" && Object.keys(kpiValuesArg as object).length === 0) {
    const sampleIds = metrics.slice(0, 5).map((mt) => mt.metric_id);
    throw Object.assign(
      new Error(
        `kpi_values vazio — fornece pelo menos uma métrica (ex.: {"${sampleIds[0] ?? "ARC-K01"}": 85}). metric_ids válidos (amostra derivada do catálogo): ${sampleIds.join(", ")}…`
      ),
      { rpcError: { code: -32602, message: "kpi_values vazio (auto-relato sem valores não é uma avaliação)", data: { sample_metric_ids: sampleIds } } }
    );
  }
  const knownIds = new Set(metrics.map((m) => m.metric_id));
  const perKpi: KpiResult[] = [];

  for (const m of metrics) {
    const t = m.thresholds_by_level_parsed?.[riskLevel];
    if (!t) continue; // threshold null / "-" → not applicable at this level (out of scope)

    const chapter = m.chapter_id ? resolveChapterBundle(m.chapter_id) ?? m.chapter_id : undefined;
    const source =
      m.source_document_id || m.source_file
        ? {
            ...(m.source_document_id ? { document_id: m.source_document_id } : {}),
            ...(m.source_file ? { source_file: m.source_file } : {})
          }
        : undefined;
    const base: KpiResult = {
      metric_id: m.metric_id,
      label: m.label,
      ...(chapter ? { chapter } : {}),
      ...(t.raw ? { threshold_raw: t.raw } : {}),
      threshold_value: t.value,
      operator: t.operator,
      status: "not_reported",
      ...(source ? { source } : {})
    };

    if (!submitted.has(m.metric_id)) {
      perKpi.push(base);
      continue;
    }
    const value = submitted.get(m.metric_id) as number;
    if (!t.comparable) {
      perKpi.push({ ...base, value, status: "not_comparable" });
      continue;
    }
    perKpi.push({ ...base, value, status: evaluate(value, t) ? "meets" : "below" });
  }

  const applicable = perKpi.length;
  const meets = perKpi.filter((k) => k.status === "meets").length;
  const notReported = perKpi.filter((k) => k.status === "not_reported").length;
  const gaps = perKpi.filter((k) => k.status !== "meets");

  // posture: below if any applicable KPI is unmet/unreported; above if all met AND
  // at least one strictly exceeds its threshold; otherwise at.
  // 0.15.1 (item 5): o agregado distingue AVALIADO-abaixo de NÃO-avaliado.
  const belowCount = perKpi.filter((k) => k.status === "below").length;
  let posture: AssessData["posture"];
  if (belowCount > 0) {
    posture = "below";
  } else if (meets === 0 || applicable === 0) {
    posture = "not_assessed";
  } else if (notReported > 0) {
    posture = "at"; // met everything evaluated; extent declared em totals.not_reported
  } else {
    const exceeds = perKpi.some(
      (k) => k.operator === "gte" && k.value !== undefined && k.threshold_value !== undefined && k.value > k.threshold_value
    );
    posture = exceeds ? "above" : "at";
  }

  const unknownMetrics = [...submitted.keys()].filter((id) => !knownIds.has(id));

  // Coverage-preserving pagination: posture + totals are computed over the FULL set
  // (the extent is always declared); only the per_kpi body is a bounded page. gaps is a
  // bounded, severity-first highlight — totals.gaps is the true count; walk per_kpi
  // (coverage.nextOffset, filter status!==meets) for the rest. (default page = agentic budget.)
  const offsetArg = args["offset"];
  const limitArg = args["limit"];
  const page = paginate<KpiResult>(perKpi, {
    offset: typeof offsetArg === "number" ? offsetArg : undefined,
    limit: typeof limitArg === "number" ? limitArg : undefined
  });
  // 0.15.1 (item 5): paginação PRÓPRIA dos gaps (gaps_offset/gaps_limit) — o destaque
  // deixa de ser um corte sem caminho (2 de 91): coverage própria, walk completo.
  const gapsSorted = [...gaps].sort((a, b) => GAP_SEVERITY[a.status] - GAP_SEVERITY[b.status]);
  const gapsOffset = typeof args["gaps_offset"] === "number" ? Math.max(0, Math.floor(args["gaps_offset"] as number)) : 0;
  const gapsLimit = typeof args["gaps_limit"] === "number" ? Math.max(1, Math.floor(args["gaps_limit"] as number)) : 10;
  const boundedGaps = gapsSorted.slice(gapsOffset, gapsOffset + gapsLimit);
  const gapsNext = gapsOffset + boundedGaps.length < gapsSorted.length ? gapsOffset + boundedGaps.length : null;

  return {
    data: {
      risk_level: riskLevel,
      posture,
      per_kpi: page.items,
      gaps: boundedGaps,
      totals: { applicable, meets, gaps: gaps.length, not_reported: notReported },
      scope: {
        ...(chapterScope !== undefined ? { chapter: chapterScope } : {}),
        published_total: loadMetrics().length,
        applicable_at_level: applicable,
        note:
          (chapterScope !== undefined
            ? `Avaliação RESTRITA ao capítulo \`${chapterScope}\`: o veredicto é DESTE âmbito, não do Manual inteiro. `
            : "Avaliação do Manual INTEIRO — se a tua pergunta é sobre um capítulo, passa `chapter` ou o `posture` responde a uma pergunta que não fizeste. ") +
          `DENOMINADORES: o Manual publica ${loadMetrics().length} KPIs no total; ${applicable} aplicam-se a ${riskLevel} ` +
          "(a diferença são KPIs cujo `thresholds_by_level` não define alvo para este nível — não é omissão, é proporcionalidade). " +
          "Os KPIs que o Manual define pedem-se em `get_sbd_toe_chapter_capability`.",
      },
      gaps_returned: boundedGaps.length,
      gaps_coverage: { total: gapsSorted.length, returned: boundedGaps.length, offset: gapsOffset, nextOffset: gapsNext, hasMore: gapsNext !== null },
      unknown_metrics: unknownMetrics,
      mode: "self_report_stateless"
    },
    coverage: page.coverage,
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "implementation_assessment_self_report",
      source_data:
        "Published KPI catalog (implementation/consult profile, '| ID | L1 | L2 | L3 |' tables) — " +
        "structured via runtime/metrics.json (thresholds_by_level_parsed); each KPI cites its source " +
        "document (per_kpi[].source). Compared to the submitted kpi_values.",
      note:
        "Stateless self-report (OSS): submitted values compared to the published per-level thresholds; " +
        "thresholds are retrieval-grounded in the KPI catalog and cited, never invented; nothing persisted. " +
        "A KPI with a threshold but no value is not_reported (never a pass). " +
        "Tracked/observed progress over time is the Premium state layer, not this tool."
    },
    next: boundAffordances([
      {
        // 0.20.0-beta.34 — o ciclo fecha-se: até aqui o chamador tinha de trazer os KPIs às
        // cegas, porque nada publicava os que o Manual define. A vista IMPL publica-os com
        // os thresholds por nível; esta tool avalia os valores que ele medir.
        intent: "os KPIs que o MANUAL define para o capítulo, com os thresholds por nível (traz-os para cá)",
        tool: "get_sbd_toe_chapter_capability",
        with: 'chapter="07-cicd-seguro", risk_level="L2"',
        kind: "structural"
      },
      {
        intent: "close a gap: get the implementation checklist for the gap's chapter",
        tool: "get_sbd_toe_chapter_implementation_checklist",
        with: "chapter (from a gap above)",
        kind: "structural"
      },
      {
        intent: "get the level-sharp work for the role that owns the gap",
        tool: "get_guide_by_role",
        with: `risk_level="${riskLevel}", role`,
        kind: "semantic"
      }
    ])
  };
}

/** Test-only: clear the metrics cache. */
export function _resetMetricsCache(): void {
  cachedMetrics = undefined;
}
