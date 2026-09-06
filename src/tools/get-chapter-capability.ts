/**
 * get_sbd_toe_chapter_capability — a vista IMPL: a CAPACIDADE de um capítulo.
 *
 * 0.20.0-beta.34. A medição do Eixo I dava ao GR-01 — «a organização quer implementar o
 * cap. 07: o que precisa de ter, como sabe que está capaz, e como mede?» — o veredicto
 * **NÃO SERVIDO** sob o critério v1.1, porque a PEÇA CENTRAL da leitura (a medida de
 * capacidade) não tinha caminho: as 99 métricas estão publicadas em
 * `runtime/metrics.json` com thresholds por nível, e a única superfície que lhes tocava
 * (`assess_sbd_toe_implementation`) avalia KPIs que o CHAMADOR traz — não publica os que o
 * Manual define.
 *
 * Esta é a leitura **IMPL**, e é diferente da **GUIDE**. A mesma pergunta sobre o cap. 07
 * tem duas respostas legítimas:
 *   - GUIDE  → «que requisitos se aplicam a ESTA tarefa» (`select_sbd_toe_requirements`);
 *   - IMPL   → «que capacidade a ORGANIZAÇÃO precisa de ter, e como sabe que a tem» (aqui).
 * O consumidor tem de saber qual recebeu: a resposta di-lo no campo `reading`, e o
 * must-NOT do próprio caso é responder à IMPL com a lista de requisitos técnicos.
 */
import { loadMetrics, type MetricRecord } from "./assess-implementation.js";
import { getOntologyData } from "./ontology-loader.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { paginate } from "../serving/response-shaping.js";
import type { Affordance } from "../serving/protocol-envelope.js";

const LEVELS = ["L1", "L2", "L3"] as const;

export interface ChapterCapabilityResult {
  provenance: { kg: string; server: string; content_type: string; produced_by: string; source_data: string; note: string };
  reading: { id: "IMPL"; note: string };
  [key: string]: unknown;
  next?: Affordance[];
}

function measureOf(m: MetricRecord, level: string | undefined) {
  const byLevel = m.thresholds_by_level_parsed ?? {};
  const thresholds = Object.fromEntries(
    LEVELS.map((l) => {
      const t = byLevel[l];
      return [l, t == null ? null : { raw: t.raw, operator: t.operator, value: t.value, unit: t.unit }];
    })
  );
  const target = level !== undefined ? thresholds[level] : undefined;
  return {
    metric_id: m.metric_id,
    label: m.label,
    metric_type: m.metric_type,
    metric_scope: m.metric_scope,
    period: m.period,
    dimension_ids: m.dimension_ids ?? [],
    thresholds_by_level: thresholds,
    ...(level !== undefined ? { target_at_level: target ?? null } : {}),
    ...(m.related_documents ? { related_documents: m.related_documents } : {})
  };
}

export function handleGetChapterCapability(args: Record<string, unknown>): ChapterCapabilityResult {
  const chapterArg = typeof args["chapter"] === "string" ? (args["chapter"] as string) : undefined;
  const metricId = typeof args["metric_id"] === "string" ? (args["metric_id"] as string) : undefined;
  const dimension = typeof args["dimension"] === "string" ? (args["dimension"] as string) : undefined;
  const levelArg = typeof args["risk_level"] === "string" ? (args["risk_level"] as string) : undefined;
  const level = LEVELS.includes(levelArg as (typeof LEVELS)[number]) ? levelArg : undefined;

  const metrics = loadMetrics();
  const ontology = getOntologyData();
  const provenance = {
    kg: servedKgReleaseTag(),
    server: servingServerVersion(),
    content_type: "canonical",
    produced_by: "chapter_capability_projection",
    source_data: "data/publish/runtime/metrics.json + runtime/artifact_requirements + runtime/artifacts",
    note:
      "KPIs e artefactos que o MANUAL define para a capacidade do capítulo, com os thresholds por nível " +
      "como o bundle os publica. Nada é inventado e nada é avaliado aqui — avaliar é o " +
      "`assess_sbd_toe_implementation`, com os valores que TU medires."
  };
  const reading = {
    id: "IMPL" as const,
    note:
      "Leitura IMPL — «que capacidade a ORGANIZAÇÃO precisa de ter, e como sabe que a tem». NÃO é a " +
      "leitura GUIDE: se o que queres é «que requisitos se aplicam a ESTA tarefa», isso é " +
      "`select_sbd_toe_requirements` e a resposta é outra. Responder à IMPL com a lista de requisitos " +
      "técnicos é o erro que este caminho existe para evitar."
  };

  // um KPI concreto
  if (metricId !== undefined) {
    const found = metrics.find((m) => m.metric_id === metricId);
    if (found === undefined)
      return {
        provenance,
        reading,
        status: "unknown_metric",
        requested: metricId,
        note: `\`${metricId}\` não é um KPI publicado. Pede por capítulo (\`chapter="07-cicd-seguro"\`) para ver os que existem.`
      };
    return { provenance, reading, measure: measureOf(found, level), chapter: found.chapter_id };
  }

  const scoped = metrics.filter(
    (m) =>
      (chapterArg === undefined || m.chapter_id === chapterArg) &&
      (dimension === undefined || (m.dimension_ids ?? []).includes(dimension))
  );

  // capítulo pedido e sem KPIs publicados: declarado, nunca vazio mudo
  if (chapterArg !== undefined && scoped.length === 0) {
    const covered = [...new Set(metrics.map((m) => m.chapter_id))].sort();
    return {
      provenance,
      reading,
      status: "no_measures_published",
      requested: chapterArg,
      chapters_with_measures: covered,
      note:
        `O Manual não publica KPIs para \`${chapterArg}\`. Isto NÃO significa que a capacidade não se meça — ` +
        "significa que a medida não está publicada como dado nesta build. Os capítulos com KPIs vêm acima."
    };
  }

  const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : 25;
  const page = paginate(scoped, { offset: offsetArg, limit: limitArg }, scoped.length || 1);

  // artefactos da capacidade (a outra peça do GR-01), quando o pedido é por capítulo
  const artifactsById = new Map((ontology.artifacts ?? []).map((a) => [a.artifact_type_id, a]));
  const artifacts =
    chapterArg === undefined
      ? undefined
      : (ontology.artifactRequirements ?? [])
          .filter((ar) => (ar.chapter_ids ?? []).includes(chapterArg))
          .map((ar) => {
            const meta = artifactsById.get(ar.artifact_type_id);
            return {
              artifact_type_id: ar.artifact_type_id,
              name: meta?.name ?? ar.artifact_type_id,
              category: meta?.category,
              lifecycle_phases: meta?.lifecycle_phases ?? [],
              mandatory: ar.mandatory === true
            };
          })
          .sort((a, b) => a.artifact_type_id.localeCompare(b.artifact_type_id));

  return {
    provenance,
    reading,
    scope: chapterArg ?? (dimension !== undefined ? `dimension=${dimension}` : "todos os capítulos"),
    ...(level !== undefined ? { risk_level: level } : {}),
    measures: page.items.map((m) => measureOf(m, level)),
    coverage: { ...page.coverage, total: scoped.length },
    ...(artifacts !== undefined
      ? {
          artifacts: {
            note:
              "Artefactos que esta capacidade tem de PRODUZIR (o Manual declara que não fornece templates — " +
              "define o que tem de existir, não como se escreve).",
            total: artifacts.length,
            mandatory: artifacts.filter((a) => a.mandatory).length,
            values: artifacts
          }
        }
      : {}),
    next: [
      {
        intent: "Avaliar-te contra ESTES KPIs (traz os teus valores medidos)",
        tool: "assess_sbd_toe_implementation",
        with: `risk_level="${level ?? "L2"}", metrics={"${page.items[0]?.metric_id ?? "ARC-K01"}": <valor medido>}`,
        kind: "structural" as const
      },
      {
        intent: "O checklist de implementação do capítulo",
        tool: "get_sbd_toe_chapter_implementation_checklist",
        with: `chapter="${chapterArg ?? "07-cicd-seguro"}"`,
        kind: "structural" as const
      },
      {
        intent: "Os papéis e o momento no ciclo",
        tool: "get_guide_by_role",
        with: `risk_level="${level ?? "L2"}", phase="build"`,
        kind: "structural" as const
      }
    ]
  };
}
