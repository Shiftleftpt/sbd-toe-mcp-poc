/**
 * get_sbd_toe_verification_matrix
 *
 * The deterministic EXPECTED side of verification: per requirement/control at a risk
 * level, the validation method + expected evidence + the EvidencePattern reference.
 * Exposes the 223 published EvidencePatterns as a consumable surface — the complement
 * of the sbd-auditor's expectation and of the test-plan. Implementation/audit lens.
 *
 * Data-ready: every EvidencePattern carries structured `verification_logic` (method)
 * and `evidence_expectation` (expected evidence) + maps_to_requirement/control; nothing
 * is invented and each row cites its source document. Two coverage gaps are DECLARED,
 * never hidden: `risk_level_hint` is sparse (level filter is a hint), and some
 * level-applicable requirements have no EvidencePattern yet (routed to Codex).
 *
 * Contract: agentic/em-curso/2026-06-14-pontifex-implementation-view-tool-contracts-v0.1.md
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { getOntologyData } from "./ontology-loader.js";
import { paginate, type PageCoverage } from "../serving/response-shaping.js";
import { boundAffordances, type ProtocolEnvelope } from "../serving/protocol-envelope.js";

const VALID_RISK = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK)[number];

interface EvidencePattern {
  id: string;
  verification_logic?: string;
  verification_when?: string | null;
  evidence_expectation?: string;
  evidence_type?: string;
  maps_to_requirement_id?: string;
  requirement_name?: string;
  requirement_category?: string;
  maps_to_control_id?: string;
  maps_to_control_name?: string;
  expected_artifact_type_ids?: string[];
  responsible_roles?: string[];
  risk_level_hint?: string | string[] | null;
  source_document?: string;
}

let cachedEps: EvidencePattern[] | undefined;
function loadEvidencePatterns(): EvidencePattern[] {
  if (cachedEps !== undefined) return cachedEps;
  try {
    const parsed = JSON.parse(readFileSync(resolveAppPath("data/publish/runtime/evidence_patterns.json"), "utf-8")) as {
      items?: EvidencePattern[];
    };
    cachedEps = Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    cachedEps = [];
  }
  return cachedEps;
}

/**
 * A risk_level_hint applies at a level cumulatively: "L1+" → L1/L2/L3, "L2+" → L2/L3,
 * "L3" → L3. A null/absent hint cannot be excluded — it applies broadly (declared).
 */
function hintAppliesAtLevel(hint: EvidencePattern["risk_level_hint"], level: RiskLevel): { applies: boolean; hinted: boolean } {
  const raw = Array.isArray(hint) ? hint.join(",") : typeof hint === "string" ? hint : "";
  if (!raw.trim()) return { applies: true, hinted: false }; // unhinted: apply broadly
  const order: Record<RiskLevel, number> = { L1: 1, L2: 2, L3: 3 };
  const m = /L([123])/.exec(raw);
  if (!m) return { applies: true, hinted: false };
  const base = Number(m[1]);
  const plus = raw.includes("+");
  const lvl = order[level];
  const applies = plus ? lvl >= base : lvl === base;
  return { applies, hinted: true };
}

export interface VerificationRow {
  evidence_pattern_id: string;
  requirement_id?: string;
  requirement_name?: string;
  requirement_category?: string;
  control_id?: string;
  control_name?: string;
  validation_method?: string;
  verification_when?: string;
  expected_evidence?: string;
  evidence_type?: string;
  expected_artifact_type_ids?: string[];
  responsible_roles?: string[];
  level_hint: string;
  source?: string;
}

export interface VerificationMatrixData {
  risk_level: string;
  rows: VerificationRow[];
  requested_requirement_ids?: string[];
  /** Ids pedidos SEM EvidencePattern mapeado — declarados, nunca omitidos. */
  unknown_requirement_ids?: string[];
  totals: { evidence_patterns: number; requirements_covered: number; unhinted: number };
  coverage_gaps: {
    requirements_without_evidence_pattern: number;
    sample: string[];
    /**
     * 0.20.0-beta.26 (P1-3, de beta.22): a ausência PARCIAL de campo também é lacuna.
     * EP-ENC-001/003/006/007 existem e não trazem `validation_method`: a linha aparece,
     * a coluna que a torna verificável não — e `coverage_gaps` dizia 0. Ter o padrão sem
     * o método é meia cobertura, e meia cobertura declarada como total é a falha.
     */
    evidence_patterns_without_validation_method: number;
    evidence_patterns_without_validation_method_sample: string[];
    note: string;
  };
}

function toRow(ep: EvidencePattern, hinted: boolean): VerificationRow {
  return {
    evidence_pattern_id: ep.id,
    ...(ep.maps_to_requirement_id ? { requirement_id: ep.maps_to_requirement_id } : {}),
    ...(ep.requirement_name ? { requirement_name: ep.requirement_name } : {}),
    ...(ep.requirement_category ? { requirement_category: ep.requirement_category } : {}),
    ...(ep.maps_to_control_id ? { control_id: ep.maps_to_control_id } : {}),
    ...(ep.maps_to_control_name ? { control_name: ep.maps_to_control_name } : {}),
    ...(ep.verification_logic ? { validation_method: ep.verification_logic } : {}),
    ...(ep.verification_when ? { verification_when: ep.verification_when } : {}),
    ...(ep.evidence_expectation ? { expected_evidence: ep.evidence_expectation } : {}),
    ...(ep.evidence_type ? { evidence_type: ep.evidence_type } : {}),
    ...(ep.expected_artifact_type_ids?.length ? { expected_artifact_type_ids: ep.expected_artifact_type_ids } : {}),
    ...(ep.responsible_roles?.length ? { responsible_roles: ep.responsible_roles } : {}),
    level_hint: hinted ? "level-hinted" : "unhinted",
    ...(ep.source_document ? { source: ep.source_document } : {})
  };
}

export function handleGetVerificationMatrix(
  args: Record<string, unknown>
): ProtocolEnvelope<VerificationMatrixData> {
  const riskArg = args["risk_level"];
  if (typeof riskArg !== "string" || !(VALID_RISK as readonly string[]).includes(riskArg)) {
    throw Object.assign(new Error(`Invalid risk_level: "${String(riskArg)}". Allowed: L1, L2, L3.`), {
      rpcError: { code: -32602, message: "Invalid risk_level" }
    });
  }
  const riskLevel = riskArg as RiskLevel;

  const eps = loadEvidencePatterns();
  const scoped: { ep: EvidencePattern; hinted: boolean }[] = [];
  for (const ep of eps) {
    const { applies, hinted } = hintAppliesAtLevel(ep.risk_level_hint, riskLevel);
    if (applies) scoped.push({ ep, hinted });
  }

  // 0.17.0 (achado 3): «como provo ESTES requisitos» — filtro por ids concretos,
  // com os pedidos-sem-linha DECLARADOS (nunca silencioso).
  const reqIdsArg = Array.isArray(args["requirement_ids"])
    ? (args["requirement_ids"] as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  // 0.19.3: tecto REAL imposto (o schema anunciava-o sem verdade — 63 ids passavam;
  // medição: ~190 tk/id ⇒ respostas >50 custam >9,5k tk sem aviso prévio).
  if (reqIdsArg.length > 50) {
    throw Object.assign(
      new Error(
        `requirement_ids: máximo 50 por chamada (recebidos ${reqIdsArg.length}). Custo medido ~190 tk/id. ` +
          "Divide em lotes (p.ex. as páginas do select via offset/limit) e chama uma vez por lote."
      ),
      { rpcError: { code: -32602, message: "requirement_ids over limit (max 50)" } }
    );
  }
  const reqIdSet = new Set(reqIdsArg);
  const scopedByReq = reqIdsArg.length > 0
    ? scoped.filter(({ ep }) => ep.maps_to_requirement_id !== undefined && reqIdSet.has(ep.maps_to_requirement_id))
    : scoped;
  const coveredReqIds = new Set(scopedByReq.map(({ ep }) => ep.maps_to_requirement_id).filter(Boolean));
  const unknownRequirementIds = reqIdsArg.filter((id) => !coveredReqIds.has(id));
  const rows = scopedByReq.map(({ ep, hinted }) => toRow(ep, hinted));
  const requirementsCovered = new Set(rows.map((r) => r.requirement_id).filter(Boolean)).size;
  const unhinted = scoped.filter((s) => !s.hinted).length;

  // Declared coverage gap: requirements applicable at this level with no EvidencePattern.
  const epReqIds = new Set(eps.map((e) => e.maps_to_requirement_id).filter(Boolean));
  const applicableReqs = getOntologyData().requirements.filter(
    (r) => r.applicable_levels[riskLevel]
  );
  const missing = applicableReqs.filter((r) => !epReqIds.has(r.requirement_id)).map((r) => r.requirement_id);
  // P1-3: EPs desta resposta que não publicam `validation_method` — ausência PARCIAL.
  const withoutMethod = rows
    .filter((r) => typeof r.validation_method !== "string" || r.validation_method.length === 0)
    .map((r) => r.evidence_pattern_id)
    .sort();

  const offsetArg = args["offset"];
  const limitArg = args["limit"];
  const page = paginate(
    rows,
    {
      offset: typeof offsetArg === "number" ? offsetArg : undefined,
      limit: typeof limitArg === "number" ? limitArg : undefined
    },
    rows.length || 1
  );

  const coverage: PageCoverage & { evidence_patterns: number } = {
    ...page.coverage,
    evidence_patterns: rows.length
  };

  return {
    data: {
      risk_level: riskLevel,
      rows: page.items,
      ...(reqIdsArg.length > 0
        ? {
            requested_requirement_ids: reqIdsArg,
            unknown_requirement_ids: unknownRequirementIds,
          }
        : {}),
      totals: { evidence_patterns: rows.length, requirements_covered: requirementsCovered, unhinted },
      coverage_gaps: {
        requirements_without_evidence_pattern: missing.length,
        sample: missing.slice(0, 10),
        evidence_patterns_without_validation_method: withoutMethod.length,
        evidence_patterns_without_validation_method_sample: withoutMethod.slice(0, 10),
        note:
          // P1-4 (de beta.22): com n=0 não se declara lacuna nem encaminhamento que não existem.
          (missing.length === 0
            ? `Todos os ${applicableReqs.length} requisitos aplicáveis a ${riskLevel} têm EvidencePattern — sem lacuna a declarar e sem encaminhamento em curso.`
            : `${missing.length} of ${applicableReqs.length} ${riskLevel}-applicable requirements have no ` +
              `EvidencePattern yet — declared gap; routed to Codex for verification-reference completion.`) +
          (withoutMethod.length > 0
            ? ` COBERTURA PARCIAL: ${withoutMethod.length} EvidencePattern desta resposta não publicam \`validation_method\` (${withoutMethod.slice(0, 4).join(", ")}${withoutMethod.length > 4 ? ", …" : ""}) — a linha existe, o método de validação não. Não os apresentes como verificáveis.`
            : "")
      }
    },
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "canonical",
      produced_by: "verification_matrix_projection",
      source_data: "data/publish/runtime/evidence_patterns.json (verification_logic + evidence_expectation, structured) + requirements.json",
      note:
        "The EXPECTED side of verification: published EvidencePatterns (validation method + expected " +
        "evidence + control/requirement map), cited per row (source). risk_level_hint is sparse — the level " +
        "filter is a hint (unhinted patterns apply broadly, flagged); requirement→pattern coverage is " +
        "declared, not silently complete. Nothing invented."
    },
    coverage,
    next: boundAffordances([
      {
        intent: "get the role's work that produces this evidence",
        tool: "get_guide_by_role",
        with: `risk_level="${riskLevel}", role`,
        kind: "semantic"
      },
      {
        intent: "self-assess KPI posture for the same level",
        tool: "assess_sbd_toe_implementation",
        with: `kpi_values, risk_level="${riskLevel}"`,
        kind: "semantic"
      },
      {
        intent: "get the implementation steps for a requirement's chapter",
        tool: "get_sbd_toe_chapter_implementation_checklist",
        with: "chapter",
        kind: "structural"
      }
    ])
  };
}

/** Test-only: clear the EvidencePattern cache. */
export function _resetEvidencePatternCache(): void {
  cachedEps = undefined;
}
