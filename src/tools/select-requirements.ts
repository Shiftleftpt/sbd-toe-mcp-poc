/**
 * select_sbd_toe_requirements — the MP1 selection operation as a first-class
 * consultive tool (L3, OSS line; G-mp1a decision 1, O2, 2026-08-31).
 *
 * "Estou a desenvolver X com Y — que requisitos se aplicam?" answered by the
 * reference semantics the ontology declares (`requirement_selection_model` v2.2):
 * baseline(cap. 02, by level) ∪ domain chapters activated by the context ⊕ overlay
 * (extend), narrowed by the task's declared signals. Both bands are returned:
 * `selected[]` (with per-item selection_trace) and `narrowed_out[]` (grouped by
 * category, with reason) — never silent. Deterministic; paginated (G1).
 */
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { VALID_CONCERNS } from "./prepare-codegen-context.js";
import { runSelection, type SelectionContextInput, type SelectionResult } from "../serving/selection.js";
import { getRegulatoryOverlay, type RegulatoryObligation } from "./regulatory-overlay-loader.js";
import { selectRequirementsAffordances } from "../serving/affordances.js";
import type { Affordance } from "../serving/protocol-envelope.js";

const DEFAULT_LIMIT = 100;

export interface SelectRequirementsOutput {
  provenance: {
    kg: string;
    server: string;
    content_type: "derived";
    produced_by: "mp1_selection_engine";
    source_data: string;
    note: string;
  };
  risk_level: string;
  selection: {
    selected: SelectionResult["selected"];
    narrowed_out: SelectionResult["narrowed_out"];
    excluded_by_level: SelectionResult["excluded_by_level"];
  };
  /**
   * 0.20.0-beta.24 — ÂMBITO DA PROMESSA. `narrowed_out` cobria a baseline; os capítulos
   * de domínio que nenhuma declaração activou desapareciam sem uma linha. Agora são
   * declarados por contagem, com o caminho para os trazer — nunca por extenso.
   */
  out_of_scope_chapters?: SelectionResult["out_of_scope_chapters"];
  /** 0.20.0-beta.21 — modo efectivo e semântica da resposta. */
  mode: SelectionResult["mode"];
  /** `task` é contexto registado (auditoria); só influencia a selecção em mode="discover". */
  task: SelectionResult["task_record"];
  /** Presente quando nada foi declarado: pedido de declaração com a aula, não resultado. */
  needs_input?: SelectionResult["needs_input"];
  /**
   * P1-B (0.20.0-beta.22): valores de `concerns` fora do conjunto fechado. Sob
   * declarative-first o vocabulário é o ÚNICO canal — uma gralha custa a categoria
   * inteira, logo é DECLARADA (mesmo padrão do unknown_filter_fields de 0.15.0).
   */
  unknown_concerns?: {
    values: string[];
    valid_values: string[];
    vocabulary_resource: string;
    note: string;
  };
  /**
   * 0.20.0-beta.23 (P0-3, varredura): tokens de `technologies` fora do vocabulário.
   * Mesma classe do `unknown_concerns` — num contrato declarativo uma gralha custa a
   * activação inteira, e o descarte em silêncio é a falha.
   */
  unknown_technologies?: {
    values: string[];
    vocabulary_resource: string;
    note: string;
  };
  /** Só em mode="discover": a resposta é exploratória e vem marcada como tal. */
  exploratory?: { mode: "discover"; note: string };
  basis_summary: SelectionResult["basis_summary"];
  lexical_dominance_warning?: SelectionResult["lexical_dominance_warning"];
  empty_selection_warning?: SelectionResult["empty_selection_warning"];
  context: {
    activated_chapters: SelectionResult["activated_chapters"];
    activated_categories: string[];
  };
  activation_trace: SelectionResult["activation"]["trace"];
  overlay: {
    status: "skipped" | "absent" | "resolved";
    operator: "extend";
    obligations: Array<Pick<RegulatoryObligation, "obligation_id" | "framework_id" | "title">>;
    note: string;
  };
  coverage: {
    total: number;
    returned: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
    narrowed_out_requirements: number;
    excluded_by_level_requirements: number;
  };
  meta: { eligible: number; note: string; notes: string[] };
  next?: Affordance[];
}

export function handleSelectRequirements(args: Record<string, unknown>): SelectRequirementsOutput {
  const risk = args["risk_level"];
  if (risk !== "L1" && risk !== "L2" && risk !== "L3") {
    throw Object.assign(new Error(`Invalid risk_level: "${String(risk)}". Allowed: L1, L2, L3.`), {
      rpcError: { code: -32602, message: `Invalid risk_level: "${String(risk)}"` }
    });
  }
  const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
  const arr = (k: string) =>
    Array.isArray(args[k]) ? (args[k] as unknown[]).filter((x): x is string => typeof x === "string") : undefined;

  // 0.20.0-beta.24: `task_context` é o nome canónico; `task` fica aceite como alias.
  // O nome carregava semântica — um campo chamado `task` convida o chamador a acreditar
  // que o texto decide, e no contrato v1.18 não decide.
  const task = str("task_context") ?? str("task");
  const stack = str("stack"), exposure = str("exposure"), dataSensitivity = str("data_sensitivity");
  const concerns = arr("concerns"), changedFiles = arr("changed_files"), technologies = arr("technologies");
  const modeArg = str("mode");
  if (modeArg !== undefined && !["declarative", "baseline", "discover"].includes(modeArg)) {
    throw Object.assign(new Error(`Invalid mode: "${modeArg}". Allowed: declarative, baseline, discover.`), {
      rpcError: { code: -32602, message: `Invalid mode: "${modeArg}". Allowed: declarative, baseline, discover.` }
    });
  }
  const mode = (modeArg ?? "declarative") as NonNullable<SelectionContextInput["mode"]>;
  const context: SelectionContextInput = {
    risk_level: risk,
    mode,
    ...(task !== undefined ? { task } : {}),
    ...(stack !== undefined ? { stack } : {}),
    ...(exposure !== undefined ? { exposure } : {}),
    ...(dataSensitivity !== undefined ? { data_sensitivity: dataSensitivity } : {}),
    ...(concerns !== undefined ? { concerns } : {}),
    ...(changedFiles !== undefined ? { changed_files: changedFiles } : {}),
    ...(technologies !== undefined ? { technologies } : {})
  };
  const result = runSelection(context);
  const unknownConcerns = result.input.unknownConcerns;

  // Overlay — operator `extend` only (the `replace` operator awaits ADR 0014).
  const frameworks = arr("regulatory_frameworks") ?? [];
  const wantsOverlay = args["include_regulatory_overlay"] === true || frameworks.length > 0;
  let overlay: SelectRequirementsOutput["overlay"] = {
    status: "skipped",
    operator: "extend",
    obligations: [],
    note: "Overlay não pedido (include_regulatory_overlay / regulatory_frameworks ausentes)."
  };
  if (wantsOverlay) {
    const data = getRegulatoryOverlay();
    if (data.status === "absent") {
      overlay = { status: "absent", operator: "extend", obligations: [], note: `Overlay regulatório ausente: ${data.absentReason ?? "not published"}.` };
    } else {
      const wanted = new Set(frameworks.map((f) => f.toUpperCase()));
      const obligations = data.obligations
        .filter((o) => wanted.size === 0 || wanted.has(o.framework_id.toUpperCase()) || wanted.has(o.framework_id.replace(/^EXT-/, "").toUpperCase()))
        .map((o) => ({ obligation_id: o.obligation_id, framework_id: o.framework_id, title: o.title }));
      overlay = {
        status: "resolved",
        operator: "extend",
        obligations,
        note: "Operador `extend`: obrigações do overlay ACRESCEM à selecção por categoria; `replace` aguarda o modelo de overlay (ADR 0014)."
      };
    }
  }

  const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : DEFAULT_LIMIT;
  const page = result.selected.slice(offsetArg, offsetArg + limitArg);
  const nextOffset = offsetArg + page.length < result.selected.length ? offsetArg + page.length : null;

  return {
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "mp1_selection_engine",
      source_data:
        "runtime/requirements.json + ontology requirement_selection_model (v2.2) + review-scope path map + activation vocabulary (sbd://toe/activation-vocabulary)",
      note:
        mode === "discover"
          ? "MODO EXPLORATÓRIO (discover): activação por casamento de palavras na tarefa, com os avisos de basis/dominância/vazio. Instrumento de investigação — a resposta NÃO é o contrato declarativo desta linha."
          : "Selecção DECLARATIVA (contrato v1.18-beta): função apenas do que foi declarado — risk_level, concerns, exposure, data_sensitivity, technologies, changed_files. O `task` fica registado para auditoria e não influencia o resultado. Cada inclusão tem selection_trace; cada exclusão elegível está em narrowed_out com razão — nunca em silêncio. ÂMBITO da promessa (0.20.0-beta.24): ela vale para o UNIVERSO, não só para a baseline — `narrowed_out` cobre o que era elegível e ficou de fora, `excluded_by_level` o que existe noutro nível, e `out_of_scope_chapters` o que nenhuma declaração activou, por capítulo e por contagem, com o caminho para o trazer. Nada é inventado."
    },
    risk_level: risk,
    mode: result.mode,
    task: result.task_record,
    ...(result.needs_input ? { needs_input: result.needs_input } : {}),
    ...(unknownConcerns.length > 0
      ? {
          unknown_concerns: {
            values: [...unknownConcerns],
            valid_values: [...VALID_CONCERNS],
            vocabulary_resource: "sbd://toe/activation-vocabulary",
            note: `Valores fora do conjunto fechado, IGNORADOS nesta selecção: ${unknownConcerns.join(", ")}. Num contrato declarativo o vocabulário é o único canal — uma gralha custa a categoria inteira, por isso é declarada e nunca descartada em silêncio. Corrige e re-chama.`
          }
        }
      : {}),
    ...(result.unknown_technologies && result.unknown_technologies.length > 0
      ? {
          unknown_technologies: {
            values: [...result.unknown_technologies],
            vocabulary_resource: "sbd://toe/activation-vocabulary",
            note: `Tokens de \`technologies\` fora do vocabulário publicado, IGNORADOS nesta selecção: ${result.unknown_technologies.join(", ")}. Os valores conhecidos estão em sbd://toe/activation-vocabulary → technologies. Corrige e re-chama.`
          }
        }
      : {}),
    ...(mode === "discover"
      ? {
          exploratory: {
            mode: "discover" as const,
            note:
              "Resposta EXPLORATÓRIA: a selecção foi inferida do texto da tarefa (casamento lexical), não declarada. Serve investigação (oráculo histórico, estudo de paráfrase); para trabalho reproduzível declara os activadores — vocabulário em sbd://toe/activation-vocabulary."
          }
        }
      : {}),
    selection: { selected: page, narrowed_out: result.narrowed_out, excluded_by_level: result.excluded_by_level },
    ...(result.out_of_scope_chapters ? { out_of_scope_chapters: result.out_of_scope_chapters } : {}),
    context: { activated_chapters: result.activated_chapters, activated_categories: result.activated_categories },
    activation_trace: result.activation.trace,
    overlay,
    basis_summary: result.basis_summary,
    ...(result.empty_selection_warning ? { empty_selection_warning: result.empty_selection_warning } : {}),
    ...(result.lexical_dominance_warning ? { lexical_dominance_warning: result.lexical_dominance_warning } : {}),
    coverage: {
      total: result.selected.length,
      returned: page.length,
      offset: offsetArg,
      nextOffset,
      hasMore: nextOffset !== null,
      excluded_by_level_requirements: result.excluded_by_level.reduce((n, g) => n + g.count, 0),
      narrowed_out_requirements: result.narrowed_out.reduce((n, g) => n + g.count, 0)
    },
    meta: {
      eligible: result.eligible_count,
      note:
        "coverage pagina `selected`; `narrowed_out` vem completo (agrupado por categoria). O veredicto de nível usa o catálogo publicado. `out_of_scope_chapters` fecha o âmbito: o que nenhuma declaração activou é dito por contagem, não por omissão.",
      notes: result.notes
    },
    next: result.needs_input
      ? [
          {
            intent: "Ler o vocabulário fechado que substitui a adivinhação de palavras",
            tool: "read_sbd_toe_resource",
            with: 'uri="sbd://toe/activation-vocabulary"',
            kind: "structural" as const
          },
          {
            intent: "Re-chamar DECLARANDO o que a tua leitura do pedido justifica (os candidatos são sugestão a confirmar)",
            tool: result.needs_input.example.tool,
            with: result.needs_input.example.with,
            kind: "structural" as const
          },
          {
            intent: "Ou pedir explicitamente a baseline do nível (nunca aparece como fallback)",
            tool: result.needs_input.baseline_escape_hatch.tool,
            with: result.needs_input.baseline_escape_hatch.with,
            kind: "structural" as const
          }
        ]
      : selectRequirementsAffordances(risk, page.map((x) => x.requirement_id), result.empty_selection_warning?.candidate_concerns ?? result.lexical_dominance_warning?.candidate_concerns, result.selected.length)
  };
}
