/**
 * selection — the MP1 selection operation (G-mp1a, O2; ciclo MP1 P2, 2026-08-31).
 *
 * Implements the reference semantics DECLARED by the published ontology
 * (`requirement_selection_model`, sbdtoe-ontology v2.2, served since contract v1.14):
 *
 *   selection = baseline(cap. 02, `type: base`, by risk level)
 *             ∪ domain_specific(chapters activated by CONTEXT)
 *             ⊕ overlay(extend — the `replace` operator awaits ADR 0014)
 *
 * followed by deterministic, DECLARED narrowing by the task over that eligible set.
 * Two output bands, both listed (never-silent):
 *   - `selected[]`     — requirement with a declared signal (selection_trace per item)
 *   - `narrowed_out[]` — eligible without a signal, grouped by category with reason.
 *
 * The engine consumes the activation machinery of prepare-codegen-context (one
 * audited signal table for the whole serving layer — D4: the concern lexicon is ONE
 * signal among task terms, compound phrases, changed_files, stack, exposure,
 * data_sensitivity and explicit concerns) and the path→chapter knowledge of
 * map_sbd_toe_review_scope. It never invents requirements and never consults a model.
 */
import { getOntologyData, type Requirement } from "../tools/ontology-loader.js";
import {
  VALID_CONCERNS,
  activate,
  categoriesForConcerns,
  normalizeInput,
  type ActivationResult,
  type ActivationTraceEntry,
  type Concern,
  type NormalizedInput
} from "../tools/prepare-codegen-context.js";
import { bundlesForChangedFiles } from "../tools/map-review-scope.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { EXPOSURE_CONCERNS as EXPOSURE_ACTIVATION, SENSITIVITY_CONCERNS as SENSITIVITY_ACTIVATION } from "../tools/prepare-codegen-context.js";

export type SelectionRiskLevel = "L1" | "L2" | "L3";
const LEVELS: readonly SelectionRiskLevel[] = ["L1", "L2", "L3"];

/** Concern → the domain chapter(s) whose catalogue it activates (aligned with the
 * ontology's `activation_examples` and the applicability model; audited table). */
export const CONCERN_TO_DOMAIN_CHAPTERS: Readonly<Partial<Record<Concern, readonly string[]>>> = {
  deployment: ["09-containers-imagens", "11-deploy-seguro"],
  iac: ["08-iac-infraestrutura"],
  build: ["07-cicd-seguro"],
  release: ["11-deploy-seguro"],
  supply_chain: ["05-dependencias-sbom-sca"],
  testing: ["10-testes-seguranca"],
  threat_modeling: ["03-threat-modeling"],
  monitoring: ["12-monitorizacao-operacoes"],
  architecture: ["04-arquitetura-segura"],
};

/** Technology vocabulary → chapters (mirrors map_sbd_toe_applicability). */
export const TECHNOLOGY_TO_CHAPTERS: Readonly<Record<string, readonly string[]>> = {
  containers: ["08-iac-infraestrutura", "09-containers-imagens"],
  kubernetes: ["08-iac-infraestrutura", "09-containers-imagens"],
  iac: ["08-iac-infraestrutura"],
  "ci-cd": ["07-cicd-seguro"],
  "sca-sbom": ["05-dependencias-sbom-sca"],
  sast: ["10-testes-seguranca"],
  dast: ["10-testes-seguranca"],
  monitoring: ["12-monitorizacao-operacoes"],
};

/**
 * The agentic-governance wave: `agents` selects the domain-specific requirements
 * whose published name/description carries the agentic vocabulary (mandate,
 * autonomy, kill-switch, tool-call, AI agent). Deterministic lexical rule over
 * published fields — declared per match, never a model call.
 */
/**
 * R1 (decisão pós-P2 do programme lead, 2026-08-31, GC-07): o concern `agents` activa,
 * como regra NOMEADA e declarada no selection_trace, o conjunto "principal não-humano" —
 * o agente é um principal (ARC-015: least privilege para agentes): {ACC-002 menor
 * privilégio, AUT-006 credenciais em claro, ENC-006 segredos expostos} ∪ {DEP-011,
 * DEP-013, DEP-014 — supply chain AI do cap. 05}.
 */
export const R1_RULE_ID = "R1:principal-nao-humano";
export const R1_PRINCIPAL_SET: readonly string[] = ["ACC-002", "AUT-006", "ENC-006", "DEP-011", "DEP-013", "DEP-014"];

/**
 * R2 (decisão pós-P2 do programme lead, 2026-08-31, GC-02): SES-* resolve-se por
 * narrowing de sinais — sem sinais de sessão/login/token DE UTILIZADOR na tarefa, a
 * categoria SES sai para `narrowed_out` com razão declarada; com eles, fica. O
 * `concernsMap` do loader (`auth → [AUT, ACC, SES]`) NÃO é alterado neste ciclo; a via
 * de dados fica anotada para avaliação futura no loader.
 */
const R2_RULE_ID = "R2:narrowing-de-sinais-SES";
const SESSION_SIGNAL_PATTERN =
  /sess[ãa]o|session|login|logout|sign.?in|\bjwt\b|cookie|token de utilizador|user token|refresh token|autentica[çc][ãa]o de utilizador|user authentication|utilizador(es)? autenticado/i;

/**
 * SES-008-por-tecnologia (decisão do Author, 2026-08-31 — fecha o paradoxo GC-08):
 * o sinal JWT/token de utilizador activa SES-008 (scope/TTL/revogação de tokens JWT)
 * INDEPENDENTEMENTE do nível, declarado no trace — a tecnologia impõe a guidance,
 * o filtro de nível continua a mandar em tudo o resto.
 */
const SES008_RULE_ID = "SES-008-por-tecnologia";
/**
 * 0.20.0-beta.21: a regra do Author sobrevive à mudança de fronteira — passa a ser
 * accionada pela TECNOLOGIA DECLARADA (`technologies: ["jwt"]`, valor publicado no
 * vocabulário) em vez de por regex sobre a prosa da tarefa. Em `discover` o gatilho
 * lexical histórico continua a valer.
 */
export const SES008_TECHNOLOGY = "jwt";
const SES008_TECH_PATTERN = /\bjwt\b|token de utilizador|user token|bearer token|refresh token/i;

export const AGENTIC_WAVE_PATTERN = /\bagente|\bagent\b|agêntic|agentic|autonom|kill.?switch|mandate|tool.?call/i;

/** 0.19.0 (ronda 3): estabilidade da origem — lexical = casamento de termos da
 * redacção (revogável por reescrever a frase); declared = concern explícito, regra
 * nomeada, sinal de contexto declarado ou dado do bundle. */
/**
 * 0.20.0-beta.21 — modos de selecção («declarativo primeiro», experiência da linha beta
 * autorizada pelo lead 2026-09-05).
 *
 * - `declarative` (DEFAULT): a selecção é função APENAS do que o chamador declarou —
 *   risk_level, concerns, exposure, data_sensitivity, changed_files, technologies. O
 *   `task` fica registado para auditoria e não influencia o resultado. Sem nenhuma
 *   declaração ⇒ `needs_input` (nunca zero, nunca adivinhar).
 * - `baseline`: devolve a baseline do nível por PEDIDO EXPLÍCITO (nunca como fallback).
 * - `discover`: comportamento inferencial histórico, COM os avisos todos, marcado
 *   exploratório — instrumento do oráculo histórico e do estudo de paráfrase.
 */
export type SelectionMode = "declarative" | "baseline" | "discover";

export type SelectionBasis = "declared" | "lexical";
const LEXICAL_SOURCES = new Set(["task_term", "alias_expansion", "compound_term", "intent_keyword"]);
export function basisOfSource(source: string): SelectionBasis {
  return LEXICAL_SOURCES.has(source) ? "lexical" : "declared";
}

export interface SelectionTraceEntry {
  layer: "baseline" | "domain_specific" | "declared_category" | "declared_structure" | "agents_wave" | "named_rule";
  source:
    | ActivationTraceEntry["source"]
    | "context_chapter"
    | "declared_category"
    /** 0.20.0-beta.30 — forma B: o pedido foi por ESTRUTURA (capítulo ou categoria). */
    | "declared_structure"
    | "agents_wave"
    | "named_rule";
  trigger: string;
  score: number;
  reason: string;
  /** 0.19.0: declared|lexical — ver basisOfSource. */
  basis?: SelectionBasis;
}

export interface SelectedRequirement {
  requirement_id: string;
  name: string;
  category: string;
  type: string;
  source_chapter: number;
  selection_trace: SelectionTraceEntry[];
}

export interface NarrowedOutGroup {
  /** 0.19.0: lexical = revogável por reescrever a tarefa; declared = regra/dados. */
  basis?: SelectionBasis;
  category: string;
  count: number;
  requirement_ids: string[];
  reason: string;
}

export interface ActivatedChapter {
  chapter: string;
  /** O PRIMEIRO activador (estável desde 0.11.0; mantido para compatibilidade). */
  source: "changed_file" | "technology" | "concern" | "stack" | "declared_chapter";
  trigger: string;
  /**
   * 0.20.0-beta.26 — TODOS os activadores deste capítulo, não só o primeiro.
   * Duas declarações podem activar o mesmo capítulo (`concerns:["iac"]` e
   * `technologies:["containers"]` activam ambas o cap. 08) e o traço registava só quem
   * chegou primeiro: a resposta a «porquê este capítulo?» vinha incompleta, e retirar a
   * declaração que aparecia no traço não desactivava o capítulo — o que faz o traço
   * parecer errado a quem o testa.
   */
  activated_by: Array<{ source: ActivatedChapter["source"]; trigger: string }>;
}

/** Declarações que a selecção aceita — o vocabulário está em sbd://toe/activation-vocabulary. */
export interface DeclaredActivators {
  concerns: string[];
  exposure?: string;
  data_sensitivity?: string;
  technologies: string[];
  changed_files: string[];
}

/** Resposta a uma chamada sem declarações: pedido de declaração, não resultado. */
export interface NeedsInput {
  reason: string;
  /** P1-A: declarações válidas que não activaram nada (ex.: exposure=local, data_sensitivity=low). */
  inert_declarations?: string[];
  declared: DeclaredActivators;
  vocabulary_resource: string;
  candidates_to_confirm: {
    note: string;
    from_task_text: string[];
  };
  example: { tool: string; with: string; note: string };
  baseline_escape_hatch: { tool: string; with: string; note: string };
}

export interface SelectionResult {
  risk_level: SelectionRiskLevel;
  eligible_count: number;
  selected: SelectedRequirement[];
  narrowed_out: NarrowedOutGroup[];
  /** 0.15.0 (P0-3): requisitos DENTRO do âmbito (base ou capítulo activado) mas não
   * aplicáveis a este nível (applicable_levels) — declarados com a mesma dignidade
   * do narrowed_out; nunca invisíveis. */
  excluded_by_level: NarrowedOutGroup[];
  /** 0.19.0: quantos selected têm ≥1 base declarada vs só-lexical; share e aviso. */
  basis_summary: { declared: number; lexical_only: number; lexical_share: number };
  lexical_dominance_warning: { lexical_share: number; threshold: number; note: string; candidate_concerns: string[] } | null;
  /** 0.19.1 (ronda 4, V2): selecção VAZIA com candidatos é ALARME, não resultado. */
  empty_selection_warning: { note: string; narrowed_categories: string[]; candidate_concerns: string[] } | null;
  activated_chapters: ActivatedChapter[];
  activated_categories: string[];
  activation: ActivationResult;
  input: NormalizedInput;
  notes: string[];
  /** Modo efectivo desta selecção (0.20.0-beta.21). */
  mode: SelectionMode;
  /** Presente quando nada foi declarado no modo declarativo: pedido de declaração + aula. */
  needs_input?: NeedsInput;
  /**
   * 0.20.0-beta.24 — ÂMBITO DA PROMESSA: capítulos de domínio que NENHUMA declaração
   * activou e que por isso não têm um único requisito em banda nenhuma. Até aqui
   * desapareciam sem uma linha (no teste cego do avaliador, ~65 requisitos dos caps.
   * 05/07/10) enquanto o cabeçalho prometia «nunca em silêncio» sem dizer sobre O QUÊ.
   * Declara-se o que ficou FORA por capítulo — inclusive a parte que falta de um
   * capítulo parcialmente coberto (o cap. 02 tem a baseline em banda e os REQ-AGN-*
   * fora; a granularidade «capítulo inteiro» deixava-os cair). Contagens e caminho de
   * recuperação — nunca os requisitos por extenso: declarar a ausência não pode custar
   * o que custaria tê-los.
   */
  out_of_scope_chapters?: {
    scope_note: string;
    count: number;
    requirements_out_of_scope: number;
    chapters: Array<{ chapter: string; at_level: number; out_of_scope: number; activate_with: string }>;
  };
  /**
   * 0.20.0-beta.26 — DENOMINADORES NOMEADOS E DEFINIDOS.
   *
   * `meta.eligible` valeu 121 e 187 na mesma sessão (baseline vs baseline+capítulos
   * activados) e 273 só aparecia em prosa: três denominadores diferentes, todos
   * implícitos. «Num servidor determinístico, um denominador implícito é uma dívida.»
   * Cada um passa a ter nome, valor e definição no payload — e as desigualdades entre
   * eles são invariante testada, não convenção.
   */
  denominators: {
    note: string;
    baseline_at_level: { value: number; definition: string };
    activated_at_level: { value: number; definition: string };
    catalogue_at_level: { value: number; definition: string };
    catalogue_total: { value: number; definition: string };
  };
  /** 0.20.0-beta.23: tokens de `technologies` fora do vocabulário — nomeados, nunca descartados em silêncio. */
  unknown_technologies?: string[];
  /** 0.20.0-beta.30: valores estruturais fora do catálogo publicado — declarados, nunca descartados. */
  unknown_structural?: string[];
  /** O `task` é contexto registado, não motor (excepto em discover). */
  task_record: { text: string; role: "recorded_context"; affects_selection: boolean };
}

export interface SelectionContextInput {
  task?: string;
  risk_level: SelectionRiskLevel;
  stack?: string;
  exposure?: string;
  data_sensitivity?: string;
  concerns?: string[];
  changed_files?: string[];
  /** 0.20.0-beta.21 — default `declarative`. */
  mode?: SelectionMode;
  technologies?: string[];
  /**
   * 0.20.0-beta.30 — FORMA B: pedir por ESTRUTURA.
   *
   * Os `concerns` são um ATALHO — um agrupamento pré-cozinhado de categorias para casos
   * comuns. Ao promovê-los a interface única, um grafo com dezenas de tipos passou a ser
   * consumido como um menu de 24 botões: 14 concerns declarados exaustiva e correctamente
   * não chegavam ao cap. 14, e a única porta publicada era `changed_files=["docs/**"]` —
   * declarar um ficheiro que não existe. Num contrato cuja regra é «declara só o que sabes
   * ser verdade», o servidor pedia uma mentira.
   *
   * `chapters` e `categories` são declarações VERDADEIRAS e verificáveis contra o catálogo
   * publicado, na MESMA superfície: mesmas bandas, mesmo traço, mesmos denominadores.
   * Não são inferência — o LLM continua a declarar; declara uma estrutura em vez de um
   * conceito.
   */
  chapters?: string[];
  categories?: string[];
}

/** Chapters activated by the CONTEXT (changed files, technologies, stack, concerns). */
function activateChapters(
  input: NormalizedInput,
  technologies: readonly string[],
  activation: ActivationResult
): ActivatedChapter[] {
  const out: ActivatedChapter[] = [];
  const byChapter = new Map<string, ActivatedChapter>();
  const push = (chapter: string, source: ActivatedChapter["source"], trigger: string) => {
    const existing = byChapter.get(chapter);
    if (existing) {
      // acumula: mesma origem+gatilho não se repete, activador novo regista-se
      if (!existing.activated_by.some((a) => a.source === source && a.trigger === trigger))
        existing.activated_by.push({ source, trigger });
      return;
    }
    const entry: ActivatedChapter = { chapter, source, trigger, activated_by: [{ source, trigger }] };
    byChapter.set(chapter, entry);
    out.push(entry);
  };
  const fileMap = bundlesForChangedFiles(input.changed_files);
  for (const [file, bundles] of fileMap) {
    for (const bundle of bundles) push(bundle, "changed_file", file);
  }
  for (const tech of technologies) {
    for (const chapter of TECHNOLOGY_TO_CHAPTERS[tech] ?? []) push(chapter, "technology", tech);
  }
  const stackLower = (input.stack ?? "").toLowerCase();
  for (const [token, chapters] of Object.entries(TECHNOLOGY_TO_CHAPTERS)) {
    if (stackLower.includes(token)) for (const chapter of chapters) push(chapter, "stack", token);
  }
  for (const concern of activation.concerns) {
    for (const chapter of CONCERN_TO_DOMAIN_CHAPTERS[concern] ?? []) push(chapter, "concern", concern);
  }
  return out;
}

/**
 * Run the MP1 selection. Deterministic; every inclusion carries a trace and every
 * eligible exclusion is listed with a reason.
 */
export function runSelection(context: SelectionContextInput): SelectionResult {
  const mode: SelectionMode = context.mode ?? "declarative";
  const input = normalizeInput({
    task: context.task ?? "",
    risk_level: context.risk_level,
    ...(context.stack ? { stack: context.stack } : {}),
    ...(context.exposure ? { exposure: context.exposure } : {}),
    ...(context.data_sensitivity ? { data_sensitivity: context.data_sensitivity } : {}),
    ...(context.concerns ? { concerns: context.concerns } : {}),
    ...(context.changed_files ? { changed_files: context.changed_files } : {}),
  });
  // No caminho declarativo o motor lexical não corre: nem termos da tarefa, nem
  // aliases sobre a prosa, nem heurísticas de NOME de ficheiro (a tabela de PATHS
  // continua, que essa é dado publicado, não interpretação).
  const activation = activate(input, { declaredOnly: mode !== "discover" });
  return runSelectionWithActivation(input, activation, context.technologies ?? [], mode, {
    chapters: context.chapters ?? [],
    categories: context.categories ?? [],
  });
}

/** Tecnologias declaradas normalizadas: valor do vocabulário fechado, ou token exacto dentro do `stack`. */
/** Tokens do vocabulário FECHADO presentes no `stack` declarado (P1-D: dão rasto). */
export function stackTokensFromVocabulary(stack: string | undefined): string[] {
  const out = new Set<string>();
  for (const token of (stack ?? "").toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean)) {
    if (token in TECHNOLOGY_TO_CHAPTERS || token === SES008_TECHNOLOGY) out.add(token);
  }
  return [...out].sort();
}

/**
 * 0.20.0-beta.23 (P0-3, varredura) — tokens de `technologies` que o vocabulário NÃO
 * conhece. Mesma classe do `unknown_concerns` (beta.22): num contrato declarativo o
 * vocabulário é o único canal, e uma gralha custa a activação inteira. Descartar em
 * silêncio é a falha; nomear é o contrato.
 */
export function unknownDeclaredTechnologies(technologies: readonly string[]): string[] {
  const out = new Set<string>();
  for (const t of technologies) {
    const key = t.trim().toLowerCase();
    if (key.length > 0 && !(key in TECHNOLOGY_TO_CHAPTERS) && key !== SES008_TECHNOLOGY) out.add(key);
  }
  return [...out].sort();
}

export function normalizeDeclaredTechnologies(
  technologies: readonly string[],
  stack: string | undefined
): string[] {
  const out = new Set<string>();
  for (const t of technologies) {
    const key = t.trim().toLowerCase();
    if (key in TECHNOLOGY_TO_CHAPTERS || key === SES008_TECHNOLOGY) out.add(key);
  }
  // `stack` é texto livre: só conta quando traz um valor do vocabulário como TOKEN
  // exacto — normalizar o declarado é legítimo, adivinhar prosa não.
  for (const token of stackTokensFromVocabulary(stack)) out.add(token);
  return [...out].sort();
}

function declaredActivatorsOf(
  input: NormalizedInput,
  technologies: readonly string[]
): DeclaredActivators {
  return {
    concerns: [...input.concerns],
    ...(input.exposure ? { exposure: input.exposure } : {}),
    ...(input.data_sensitivity ? { data_sensitivity: input.data_sensitivity } : {}),
    technologies: [...technologies],
    changed_files: [...input.changed_files],
  };
}

function hasAnyDeclaration(d: DeclaredActivators): boolean {
  return (
    d.concerns.length > 0 ||
    d.exposure !== undefined ||
    d.data_sensitivity !== undefined ||
    d.technologies.length > 0 ||
    d.changed_files.length > 0
  );
}

/**
 * A aula do `needs_input`: vocabulário aplicável + candidatos DERIVADOS do texto da
 * tarefa marcados como SUGESTÃO A CONFIRMAR (nunca selecção) + um exemplo copiável.
 * Os candidatos saem do mesmo motor lexical do `discover` — mas aqui não seleccionam
 * nada: são uma proposta ao LLM, que é quem tem o contexto para confirmar.
 */
function buildNeedsInput(input: NormalizedInput, declared: DeclaredActivators, inert: string[] = []): NeedsInput {
  const exploratory = activate({ ...input, concerns: [] }, { declaredOnly: false });
  const suggested = [...new Set(exploratory.concerns.map(String))].sort();
  const exampleConcerns = suggested.slice(0, 3);
  const level = input.risk_level ?? "L2";
  return {
    reason:
      inert.length > 0
        ? `Declarações recebidas mas INERTES: ${inert.join("; ")} — são valores válidos do vocabulário que não activam nada (estão publicados como \`activates: []\`). Zero requisitos não é uma resposta: declara pelo menos um activador com efeito (concerns, exposure authenticated/public, data_sensitivity personal/regulated/secrets, technologies ou changed_files).`
        : "Nenhum activador DECLARADO nesta chamada. O servidor não interpreta prosa: não adivinha o âmbito a partir do `task`, e não devolve zero em silêncio. Declara o que a tua leitura do pedido justifica — tu tens o contexto (código, ticket, conversa) que o servidor nunca terá.",
    ...(inert.length > 0 ? { inert_declarations: inert } : {}),
    declared,
    vocabulary_resource: "sbd://toe/activation-vocabulary",
    candidates_to_confirm: {
      note:
        "SUGESTÃO A CONFIRMAR, não selecção: derivada do texto do `task` pelo motor exploratório. Confirma (ou corrige) e declara em `concerns` — a decisão é tua.",
      from_task_text: suggested,
    },
    example: {
      tool: "select_sbd_toe_requirements",
      with:
        exampleConcerns.length > 0
          ? `risk_level="${level}", concerns=[${exampleConcerns.join(", ")}]`
          : `risk_level="${level}", concerns=[auth, logging]`,
      note:
        "Exemplo copiável: lê sbd://toe/activation-vocabulary (via read_sbd_toe_resource), escolhe os valores que a tua leitura justifica e re-chama com eles.",
    },
    baseline_escape_hatch: {
      tool: "select_sbd_toe_requirements",
      with: `risk_level="${level}", mode="baseline"`,
      note:
        "Queres a baseline completa do nível, sem contexto? Pede-a EXPLICITAMENTE — nunca aparece como fallback.",
    },
  };
}

/** Variant for callers that already ran the activation engine (prepare). */
/** 0.20.0-beta.30 — declaração ESTRUTURAL (forma B). */
export interface StructuralDeclaration {
  chapters: readonly string[];
  categories: readonly string[];
}

export function runSelectionWithActivation(
  input: NormalizedInput,
  activation: ActivationResult,
  technologiesRaw: readonly string[] = [],
  mode: SelectionMode = "declarative",
  structuralRaw: StructuralDeclaration = { chapters: [], categories: [] }
): SelectionResult {
  const level = (input.risk_level ?? "L2") as SelectionRiskLevel;
  const declarative = mode !== "discover";
  const technologies = declarative ? normalizeDeclaredTechnologies(technologiesRaw, input.stack) : technologiesRaw;
  const declared = declaredActivatorsOf(input, technologies);
  // beta.23 (P0-3): a regra nomeada SES-008 é EFEITO de uma tecnologia declarada.
  // Tem de ser conhecida ANTES da guarda anti-zero — senão a guarda deita fora uma
  // declaração que activa mesmo alguma coisa (era o caso de `technologies:["jwt"]`).
  const ses008Declared = technologies.includes(SES008_TECHNOLOGY);
  const unknownTechnologies = declarative ? unknownDeclaredTechnologies(technologiesRaw) : [];
  const taskRecord = {
    text: input.taskTrimmed,
    role: "recorded_context" as const,
    affects_selection: mode === "discover",
  };

  const ontology = getOntologyData();
  const atLevel = (r: Requirement) => r.applicable_levels?.[level] === true;

  /**
   * Forma B aplicada: validada contra o CATÁLOGO publicado (não contra uma lista à mão).
   * Um valor que o catálogo não conhece é DECLARADO, nunca descartado em silêncio — a
   * mesma regra do `unknown_concerns` e do `unknown_technologies`.
   */
  const ontologyForStructure = getOntologyData();
  const knownChapters = new Set(
    ontologyForStructure.requirements.map((r) => r.source_bundle).filter((x): x is string => typeof x === "string")
  );
  const knownCategories = new Set(ontologyForStructure.requirements.map((r) => r.category));
  const declaredChaptersB = declarative ? [...new Set(structuralRaw.chapters)].filter((c) => knownChapters.has(c)) : [];
  const declaredCategoriesB = declarative
    ? [...new Set(structuralRaw.categories)].filter((c) => knownCategories.has(c))
    : [];
  const unknownStructural = declarative
    ? [
        ...[...new Set(structuralRaw.chapters)].filter((c) => !knownChapters.has(c)).map((c) => `chapters="${c}"`),
        ...[...new Set(structuralRaw.categories)].filter((c) => !knownCategories.has(c)).map((c) => `categories="${c}"`),
      ].sort()
    : [];

  const activatedChapters = activateChapters(input, technologies, activation);
  for (const chapter of declaredChaptersB)
    if (!activatedChapters.some((c) => c.chapter === chapter))
      activatedChapters.push({
        chapter,
        source: "declared_chapter",
        trigger: chapter,
        activated_by: [{ source: "declared_chapter", trigger: chapter }],
      });
  const chapterSet = new Set(activatedChapters.map((c) => c.chapter));
  const activatedCategories = categoriesForConcerns(activation.concerns);
  for (const category of declaredCategoriesB) activatedCategories.add(category);
  const concernByCategory = new Map<string, ActivationTraceEntry>();
  for (const entry of activation.trace) {
    const produced = entry.produced as Concern;
    for (const category of categoriesForConcerns([produced])) {
      const existing = concernByCategory.get(category);
      if (!existing || entry.score > existing.score) concernByCategory.set(category, entry);
    }
  }

  // Layer 1 — eligibility.
  const baselineEligible = ontology.requirements.filter((r) => r.type === "base" && atLevel(r));
  const domainEligible = ontology.requirements.filter(
    (r) => r.type !== "base" && atLevel(r) && r.source_bundle !== undefined && chapterSet.has(r.source_bundle)
  );
  /**
   * 0.20.0-beta.23 (P0-1) — CONSERVAÇÃO: o MOTOR CEDE ao vocabulário publicado.
   *
   * `domainEligible` exige que o CAPÍTULO do requisito esteja activado. Mas o
   * vocabulário publicado (sbd://toe/activation-vocabulary) promete activar por
   * CATEGORIA: `concerns:["build"]` anuncia CIC+DEV. Os requisitos DEV vivem num
   * capítulo que o concern não activa — e desapareciam de TODAS as bandas, nem
   * seleccionados nem narrowed_out nem excluded_by_level. Silêncio, que é o que
   * este contrato proíbe.
   *
   * Decisão (programme lead, 2026-09-05): a promessa publicada é o contrato; o
   * motor é que cede. Uma categoria DECLARADA torna elegíveis os seus requisitos
   * ao nível, com capítulo activado ou sem ele — e com traço próprio
   * (`declared_category`), para que a inclusão nunca seja anónima.
   *
   * Só no caminho declarativo: em `discover` a activação é inferida de texto e a
   * continuidade histórica do oráculo manda (ver relatório da vaga).
   */
  const domainIds = new Set(domainEligible.map((r) => r.requirement_id));
  const categoryEligible = declarative
    ? ontology.requirements.filter(
        (r) =>
          r.type !== "base" &&
          atLevel(r) &&
          !domainIds.has(r.requirement_id) &&
          activatedCategories.has(r.category)
      )
    : [];
  const categoryEligibleIds = new Set(categoryEligible.map((r) => r.requirement_id));

  const agentsActive = activation.concerns.includes("agents" as Concern);
  const agentsWave = agentsActive
    ? ontology.requirements.filter(
        (r) =>
          r.type !== "base" &&
          atLevel(r) &&
          !domainEligible.includes(r) &&
          !categoryEligibleIds.has(r.requirement_id) &&
          AGENTIC_WAVE_PATTERN.test(`${r.name} ${r.description ?? ""}`)
      )
    : [];

  // `mode: "baseline"` — pedido EXPLÍCITO da baseline do nível (nunca fallback).
  const baselineMode = mode === "baseline";

  // ── P1-A (0.20.0-beta.22): a guarda anti-zero indexa-se à ACTIVAÇÃO PRODUZIDA,
  // não à presença de campos. `exposure=local` + `data_sensitivity=low` são
  // declarações VÁLIDAS e INERTES: davam selected:[] sem aviso — o mesmo ponto cego
  // do empty_selection_warning noutra roupa. Qualquer caminho que não active nada
  // responde needs_input, e diz QUAIS declarações foram inertes.
  if (
    mode === "declarative" &&
    activatedCategories.size === 0 &&
    activatedChapters.length === 0 &&
    !ses008Declared &&
    declaredChaptersB.length === 0 &&
    declaredCategoriesB.length === 0
  ) {
    const inert: string[] = [];
    if (declared.exposure !== undefined && (EXPOSURE_ACTIVATION[declared.exposure] ?? []).length === 0)
      inert.push(`exposure="${declared.exposure}"`);
    if (declared.data_sensitivity !== undefined && (SENSITIVITY_ACTIVATION[declared.data_sensitivity] ?? []).length === 0)
      inert.push(`data_sensitivity="${declared.data_sensitivity}"`);
    if (declared.technologies.length === 0 && input.stack) inert.push(`stack="${input.stack}" (nenhum token do vocabulário)`);
    // 4ª instância da mesma classe (P0-3, beta.23): `technologies` era o único
    // activador que a guarda nunca nomeava — o utilizador via «nenhum activador
    // DECLARADO» com `declared.technologies` preenchido à frente. Contradição no
    // próprio payload.
    if (unknownTechnologies.length > 0)
      inert.push(
        `technologies=[${unknownTechnologies.join(", ")}] (fora do vocabulário publicado — valores conhecidos em sbd://toe/activation-vocabulary → technologies)`
      );
    if (declared.technologies.length > 0)
      inert.push(
        `technologies=[${declared.technologies.join(", ")}] (do vocabulário, mas não activam capítulo nem categoria a este nível)`
      );
    // 3ª instância da mesma classe (apanhada pelo cenário TC-F-27): caminhos declarados
    // que não casam nenhum padrão da tabela publicada activam zero — dizê-lo é o que
    // separa «não conheço estes caminhos» de «não há nada a aplicar».
    if (declared.changed_files.length > 0)
      inert.push(
        `changed_files=[${declared.changed_files.slice(0, 3).join(", ")}${declared.changed_files.length > 3 ? ", …" : ""}] (nenhum caminho casou a tabela de padrões publicada em sbd://toe/activation-vocabulary)`
      );
    return {
      risk_level: level,
      eligible_count: baselineEligible.length,
      denominators: buildDenominators(level, baselineEligible.length),
      selected: [],
      narrowed_out: [],
      excluded_by_level: [],
      basis_summary: { declared: 0, lexical_only: 0, lexical_share: 0 },
      lexical_dominance_warning: null,
      empty_selection_warning: null,
      activated_chapters: [],
      activated_categories: [],
      activation,
      input,
      notes: [
        inert.length > 0
          ? `needs_input: as declarações recebidas são VÁLIDAS mas INERTES (${inert.join("; ")}) — não activam categorias nem capítulos. Zero requisitos não é resposta.`
          : "needs_input: nenhuma declaração activou categorias ou capítulos — o servidor responde ao declarado e não interpreta o `task`."
      ],
      mode,
      needs_input: buildNeedsInput(input, declared, inert),
      ...(unknownTechnologies.length > 0 ? { unknown_technologies: unknownTechnologies } : {}),
    ...(unknownStructural.length > 0 ? { unknown_structural: unknownStructural } : {}),
    task_record: taskRecord,
    };
  }

  // Layer 2 — narrowing into the two declared bands.
  const selected: SelectedRequirement[] = [];
  const narrowedByCategory = new Map<string, string[]>();
  const pushSelected = (r: Requirement, trace: SelectionTraceEntry[]) => {
    selected.push({
      requirement_id: r.requirement_id,
      name: r.name,
      category: r.category,
      type: r.type,
      source_chapter: r.source_chapter,
      selection_trace: trace,
    });
  };

  // R2 existia para remendar o casamento de palavras (SES espúrio do replay DualGauge).
  // Sem motor lexical não há nada a remendar: só corre em `discover`.
  const sessionSignals = mode === "discover" && SESSION_SIGNAL_PATTERN.test(input.task ?? "");
  let r2Applied = false;
  for (const r of baselineEligible) {
    const signal = concernByCategory.get(r.category);
    // 0.19.1 (ronda 4, V4): DECLARADO VENCE LEXICAL — mas «declarado» aqui é o pedido
    // EXPLÍCITO do utilizador (source explicit_concern), não activadores derivados
    // (exposure/data_sensitivity): o replay DualGauge usa exposure=public e o seu SES
    // espúrio TEM de continuar a cair. concerns=["auth"] do utilizador preserva SES.
    const sesDeclaredBase = activation.trace.some(
      (t) => t.produced === "auth" && t.source === "explicit_concern"
    );
    if (baselineMode) {
      pushSelected(r, [
        {
          layer: "baseline",
          source: "risk_level",
          trigger: level,
          score: 1,
          reason: `baseline cap. 02 (${level}) devolvida por PEDIDO EXPLÍCITO (mode="baseline") — sem contexto, sem narrowing`,
        },
      ]);
      continue;
    }
    if (mode === "discover" && r.category === "SES" && !sessionSignals && !sesDeclaredBase && (signal || activatedCategories.has(r.category))) {
      // R2: SES elegível com sinal de categoria (via auth LEXICAL) e SEM sinal de sessão.
      r2Applied = true;
      const list = narrowedByCategory.get(r.category) ?? [];
      list.push(r.requirement_id);
      narrowedByCategory.set(r.category, list);
      continue;
    }
    if (signal || activatedCategories.has(r.category)) {
      const entry = signal ?? {
        source: "explicit_concern" as const,
        produced: r.category,
        trigger: r.category,
        score: 1,
        confidence: "deterministic" as const,
        reason: "categoria activada",
      };
      pushSelected(r, [
        {
          layer: "baseline",
          source: entry.source,
          trigger: entry.trigger,
          score: entry.score,
          reason: `baseline cap. 02 (${level}); categoria ${r.category} com sinal: ${entry.reason}`,
        },
      ]);
    } else {
      const list = narrowedByCategory.get(r.category) ?? [];
      list.push(r.requirement_id);
      narrowedByCategory.set(r.category, list);
    }
  }

  for (const r of domainEligible) {
    const via = activatedChapters.find((c) => c.chapter === r.source_bundle);
    pushSelected(r, [
      {
        layer: "domain_specific",
        source: via && via.source === "changed_file" ? "changed_file" : "context_chapter",
        trigger: via?.trigger ?? r.source_bundle ?? "",
        score: 0.9,
        reason:
          via?.source === "declared_chapter"
            ? `capítulo ${r.source_bundle} DECLARADO por estrutura (forma B): pedido directo, sem depender de existir um atalho de vocabulário`
            : `capítulo ${r.source_bundle} activado pelo contexto (${via?.source ?? "context"}: ${via?.trigger ?? ""})`,
      },
    ]);
  }

  // Traço da forma B: uma inclusão por estrutura nunca é anónima.
  const structuralTrace = (r: Requirement): SelectionTraceEntry | undefined => {
    if (declaredChaptersB.includes(r.source_bundle ?? "")) 
      return {
        layer: "declared_structure",
        source: "declared_structure",
        trigger: r.source_bundle ?? "",
        score: 1,
        reason: `capítulo ${r.source_bundle} DECLARADO por estrutura (forma B): pedido directo, sem depender de existir um atalho de vocabulário`,
      };
    if (declaredCategoriesB.includes(r.category))
      return {
        layer: "declared_structure",
        source: "declared_structure",
        trigger: r.category,
        score: 1,
        reason: `categoria ${r.category} DECLARADA por estrutura (forma B): pedido directo, sem depender de existir um atalho de vocabulário`,
      };
    return undefined;
  };

  for (const r of categoryEligible) {
    const viaStructure = structuralTrace(r);
    if (viaStructure) {
      pushSelected(r, [viaStructure]);
      continue;
    }
    const entry = concernByCategory.get(r.category);
    pushSelected(r, [
      {
        layer: "declared_category",
        source: "declared_category",
        trigger: entry?.trigger ?? r.category,
        score: 0.9,
        reason: `categoria ${r.category} PROMETIDA pelo vocabulário para o que foi declarado (${entry?.reason ?? "activação declarada"}); capítulo ${r.source_bundle ?? "?"} não activado por contexto, mas a promessa publicada é o contrato`,
      },
    ]);
  }

  for (const r of agentsWave) {
    pushSelected(r, [
      {
        layer: "agents_wave",
        source: "agents_wave",
        trigger: "agents",
        score: 0.85,
        reason:
          "concern `agents`: requisito domain-specific da onda agêntica (nome/descrição publicados casam o vocabulário mandate/autonomia/kill-switch/tool-call)",
      },
    ]);
  }

  // R1 — named rule: the agent is a non-human principal.
  let extraEligible = 0;
  let r1Added = 0;
  if (agentsActive) {
    const already = new Set(selected.map((s) => s.requirement_id));
    for (const rid of R1_PRINCIPAL_SET) {
      if (already.has(rid)) continue;
      const r = ontology.requirements.find((x) => x.requirement_id === rid);
      if (!r || !atLevel(r)) continue;
      pushSelected(r, [
        {
          layer: "named_rule",
          source: "named_rule",
          trigger: R1_RULE_ID,
          score: 0.95,
          reason:
            `regra nomeada ${R1_RULE_ID} (decisão pós-P2 2026-08-31): o agente é um principal não-humano (ARC-015 — least privilege para agentes); conjunto {ACC-002, AUT-006, ENC-006} ∪ {DEP-011, DEP-013, DEP-014}`,
        },
      ]);
      r1Added += 1;
      const parked = narrowedByCategory.get(r.category);
      if (parked) {
        const at = parked.indexOf(rid);
        if (at >= 0) parked.splice(at, 1);
        if (parked.length === 0) narrowedByCategory.delete(r.category);
      }
      if (!baselineEligible.includes(r) && !domainEligible.includes(r) && !categoryEligibleIds.has(r.requirement_id)) extraEligible += 1;
    }
  }

  // SES-008-por-tecnologia (Author): JWT/user-token signal selects SES-008 at any level.
  let ses008Applied = false;
  const ses008Triggered = declarative ? ses008Declared : SES008_TECH_PATTERN.test(input.task ?? "");
  // P1-E (0.20.0-beta.22): a regra é PUBLICADA no vocabulário — tem de deixar rasto,
  // senão SES-008 entra e o auditor não distingue a regra da activação por exposure.
  if (declarative && ses008Declared) {
    activation.trace.push({
      source: "named_rule",
      produced: "SES-008",
      trigger: SES008_TECHNOLOGY,
      score: 0.95,
      confidence: "deterministic",
      reason: `regra NOMEADA ${SES008_RULE_ID} accionada por tecnologia declarada '${SES008_TECHNOLOGY}' (publicada em sbd://toe/activation-vocabulary): SES-008 entra a qualquer nível`
    });
  }
  if (ses008Triggered && !selected.some((s) => s.requirement_id === "SES-008")) {
    const r = ontology.requirements.find((x) => x.requirement_id === "SES-008");
    if (r) {
      pushSelected(r, [
        {
          layer: "named_rule",
          source: "named_rule",
          trigger: SES008_RULE_ID,
          score: 0.95,
          reason: declarative
            ? "regra nomeada SES-008-por-tecnologia (decisão do Author, 2026-08-31): a tecnologia DECLARADA `jwt` activa SES-008 independentemente do nível — a tecnologia impõe a guidance de scope/TTL/revogação"
            : "regra nomeada SES-008-por-tecnologia (decisão do Author, 2026-08-31): o sinal JWT/token de utilizador activa SES-008 independentemente do nível — a tecnologia impõe a guidance de scope/TTL/revogação",
        },
      ]);
      ses008Applied = true;
      const parked = narrowedByCategory.get("SES");
      if (parked) {
        const at = parked.indexOf("SES-008");
        if (at >= 0) parked.splice(at, 1);
        if (parked.length === 0) narrowedByCategory.delete("SES");
      }
      if (!baselineEligible.includes(r) && !domainEligible.includes(r) && !categoryEligibleIds.has(r.requirement_id)) extraEligible += 1;
    }
  }

  // 0.19.0: basis por entrada (ponto único) + sumário + aviso de dominância lexical.
  for (const sreq of selected) {
    // No caminho declarativo o campo mantém-se por estabilidade de contrato, com
    // valor único `declared`: por construção nenhuma fonte lexical corre.
    for (const t of sreq.selection_trace) t.basis = declarative ? "declared" : basisOfSource(t.source);
  }
  const declaredCount = selected.filter((sreq) => sreq.selection_trace.some((t) => t.basis === "declared")).length;
  const lexicalOnlyCount = selected.length - declaredCount;
  const lexicalShare = selected.length > 0 ? lexicalOnlyCount / selected.length : 0;
  const LEXICAL_DOMINANCE_THRESHOLD = 0.5; // declarado: metade da selecção só-lexical dispara o aviso
  const lexicalConcerns = [...new Set(
    activation.trace.filter((t) => LEXICAL_SOURCES.has(t.source)).map((t) => t.produced)
  )];
  // 0.20.0-beta.21: os avisos de dominância/vazio existiam para gerir um default
  // inferencial. No caminho declarativo esse default deixou de existir (a ausência
  // de sinal é `needs_input`), logo os avisos perdem OBJECTO — só em `discover`.
  const lexical_dominance_warning =
    mode === "discover" && lexicalShare > LEXICAL_DOMINANCE_THRESHOLD
      ? {
          lexical_share: Math.round(lexicalShare * 100) / 100,
          threshold: LEXICAL_DOMINANCE_THRESHOLD,
          note:
            "A REDACÇÃO da tarefa decide a maior parte desta selecção (casamento lexical de termos) — reformular a frase pode mudar o conjunto. Para estabilidade, declara concerns explícitos.",
          candidate_concerns: lexicalConcerns,
        }
      : null;

  // 0.19.1 (V2): 0 selected com narrowed/excluídos ≠ 0 — o share=0 escondia o pior caso.
  const narrowedTotalCount = [...narrowedByCategory.values()].reduce((n, l) => n + l.length, 0);
  const narrowedCats = [...narrowedByCategory.keys()].sort();
  // 0.19.2: candidatos ORDENADOS POR PESO (nº de requisitos arrumados nas categorias
  // que o concern cobre) — o next mostra top-3 (limite do destino: prepare rejeita
  // >3 famílias) e o resto fica informativo; o aviso mantém a lista completa.
  const emptyCandidates = selected.length === 0 && narrowedCats.length > 0
    ? VALID_CONCERNS.map((c) => {
        const cats = categoriesForConcerns([c as Concern]);
        let w = 0;
        for (const [cat, list] of narrowedByCategory) if (cats.has(cat)) w += list.length;
        return [c, w] as const;
      })
        .filter(([, w]) => w > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([c]) => c)
    : [];
  const empty_selection_warning =
    mode === "discover" && selected.length === 0 && narrowedTotalCount > 0
      ? {
          note:
            "SELECÇÃO VAZIA com candidatos elegíveis — isto é um ALARME, não um resultado: a redacção da tarefa não casou nenhum sinal. Re-corre com concerns EXPLÍCITOS (candidatos derivados das categorias arrumadas).",
          narrowed_categories: narrowedCats,
          candidate_concerns: emptyCandidates,
        }
      : null;

  selected.sort((a, b) => a.requirement_id.localeCompare(b.requirement_id));

  // 0.15.0 (P0-3): banda excluded_by_level — o filtro de nível deixa de ser silencioso.
  const excludedByCategory = new Map<string, string[]>();
  const selectedIds = new Set(selected.map((s) => s.requirement_id));
  for (const r of ontology.requirements) {
    if (atLevel(r) || selectedIds.has(r.requirement_id)) continue;
    const inScope =
      r.type === "base" ||
      (r.source_bundle !== undefined && chapterSet.has(r.source_bundle)) ||
      // beta.23: categoria declarada mas requisito fora do nível — banda, não silêncio.
      (declarative && activatedCategories.has(r.category));
    if (!inScope) continue;
    const list = excludedByCategory.get(r.category) ?? [];
    list.push(r.requirement_id);
    excludedByCategory.set(r.category, list);
  }
  const excluded_by_level: NarrowedOutGroup[] = [...excludedByCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, ids]) => ({
      category,
      count: ids.length,
      requirement_ids: ids.sort(),
      basis: "declared" as SelectionBasis,
      reason: `no âmbito (base/capítulo activado) mas não aplicável a ${level} por applicable_levels (regra de DADOS, estável à redacção) — declarado, nunca em silêncio`,
    }));

  const narrowed_out: NarrowedOutGroup[] = [...narrowedByCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, ids]) => ({
      category,
      count: ids.length,
      requirement_ids: ids.sort(),
      basis: (declarative ? "declared" : "lexical") as SelectionBasis,
      reason: declarative
        ? `elegível na baseline ${level} (cap. 02) e não coberta por nenhuma declaração desta chamada (concerns/exposure/data_sensitivity/technologies/changed_files) — exclusão DETERMINÍSTICA e estável à redacção: declara o concern da categoria para a trazer`
        : category === "SES" && r2Applied
          ? `${R2_RULE_ID} (decisão pós-P2 2026-08-31): sem sinais de sessão/login/token de utilizador na tarefa, SES-* sai por narrowing declarado (o concernsMap do loader mantém auth → [AUT, ACC, SES]); com esses sinais na tarefa, fica`
          : `elegível na baseline ${level} (cap. 02) sem sinal na tarefa/contexto — exclusão SENSÍVEL À REDACÇÃO da tarefa (não é regra de domínio): reescrever a frase ou declarar concerns explícitos pode trazê-la de volta; nunca em silêncio`,
    }));

  // ── P1-A (2ª instância, apanhada pela INVARIANTE): as declarações activaram
  // categorias/capítulos, mas o filtro de NÍVEL esvaziou a selecção (ex.: `privacy`
  // ou `threat_modeling` em L1). Continua a ser zero — logo continua a ser
  // needs_input, agora com a explicação certa: o problema é o nível, não a falta de
  // declaração. A banda excluded_by_level vai junto: é a prova do que existe noutro
  // nível. Nunca zero em silêncio, qualquer que seja o caminho.
  if (mode === "declarative" && selected.length === 0) {
    const otherLevels = LEVELS.filter((other) => other !== level).filter((other) =>
      ontology.requirements.some(
        (r) => activatedCategories.has(r.category) && r.applicable_levels?.[other] === true
      )
    );
    const ni = buildNeedsInput(input, declared, []);
    return {
      risk_level: level,
      eligible_count: baselineEligible.length + domainEligible.length + categoryEligible.length,
      denominators: buildDenominators(level, baselineEligible.length + domainEligible.length + categoryEligible.length),
      selected: [],
      narrowed_out: [],
      excluded_by_level,
      basis_summary: { declared: 0, lexical_only: 0, lexical_share: 0 },
      lexical_dominance_warning: null,
      empty_selection_warning: null,
      activated_chapters: activatedChapters,
      activated_categories: [...activatedCategories].sort(),
      activation,
      input,
      notes: [
        `needs_input: as declarações ACTIVARAM ${activatedCategories.size} categoria(s) e ${activatedChapters.length} capítulo(s), mas nenhum requisito dessas categorias se aplica a ${level} — a banda excluded_by_level mostra o que existe (e onde).`
      ],
      mode,
      needs_input: {
        ...ni,
        reason:
          `As declarações são válidas e activaram categorias, mas o filtro de NÍVEL deixou a selecção vazia em ${level}` +
          (otherLevels.length > 0
            ? `: os requisitos dessas categorias existem em ${otherLevels.join("/")}. Declara o nível certo para o contexto, ou declara também outras categorias — a exigência escala com o nível, o capítulo nunca se exclui.`
            : ". Nenhum requisito publicado dessas categorias está activo em nenhum nível — vê excluded_by_level e o vocabulário.") +
          " Zero requisitos não é uma resposta.",
        ...(excluded_by_level.length > 0
          ? {
              inert_declarations: [
                `nível ${level}: ${excluded_by_level.reduce((n, g) => n + g.count, 0)} requisito(s) das categorias declaradas ficam fora por applicable_levels`
              ]
            }
          : {})
      },
      ...(unknownTechnologies.length > 0 ? { unknown_technologies: unknownTechnologies } : {}),
    ...(unknownStructural.length > 0 ? { unknown_structural: unknownStructural } : {}),
    task_record: taskRecord,
    };
  }

  /**
   * Banda de ausência (beta.24). Um capítulo entra aqui quando tem requisitos ao nível e
   * NENHUM deles aparece em selected/narrowed_out/excluded_by_level — isto é, quando
   * nada do que foi declarado lhe tocou. O caminho de recuperação é DERIVADO do
   * vocabulário (concern > tecnologia > caminho, por esta ordem de custo para quem
   * declara); quando o vocabulário publicado não tem forma de activar o capítulo,
   * diz-se isso em vez de se inventar um caminho.
   */
  const out_of_scope_chapters = declarative ? buildOutOfScopeChapters(level, selected, narrowed_out, excluded_by_level) : undefined;

  const notes: string[] = [];
  if (r1Added > 0) {
    notes.push(`${R1_RULE_ID}: ${r1Added} requisitos do principal não-humano seleccionados por regra nomeada (decisão pós-P2 2026-08-31).`);
  }
  if (r2Applied) {
    notes.push(`${R2_RULE_ID}: categoria SES excluída por narrowing de sinais — sem sinais de sessão/login/token de utilizador na tarefa.`);
  }
  if (ses008Applied) {
    notes.push(`${SES008_RULE_ID}: SES-008 seleccionado por sinal de tecnologia (JWT/token de utilizador), independente do nível — decisão do Author 2026-08-31.`);
  }
  if (agentsActive && agentsWave.length > 0) {
    notes.push(`agents_wave: ${agentsWave.length} requisitos domain-specific seleccionados pelo vocabulário agêntico publicado.`);
  }

  return {
    risk_level: level,
    eligible_count: baselineEligible.length + domainEligible.length + categoryEligible.length + agentsWave.length + extraEligible,
    denominators: buildDenominators(level, baselineEligible.length + domainEligible.length + categoryEligible.length + agentsWave.length + extraEligible),
    selected,
    narrowed_out,
    excluded_by_level,
    basis_summary: { declared: declaredCount, lexical_only: lexicalOnlyCount, lexical_share: Math.round(lexicalShare * 100) / 100 },
    lexical_dominance_warning: empty_selection_warning ? null : lexical_dominance_warning,
    empty_selection_warning,
    activated_chapters: activatedChapters,
    activated_categories: [...new Set([...activatedCategories, ...selected.map((s) => s.category)])].sort(),
    activation,
    input,
    notes,
    mode,
    ...(unknownTechnologies.length > 0 ? { unknown_technologies: unknownTechnologies } : {}),
    ...(unknownStructural.length > 0 ? { unknown_structural: unknownStructural } : {}),
    ...(out_of_scope_chapters && out_of_scope_chapters.count > 0 ? { out_of_scope_chapters } : {}),
    task_record: taskRecord,
  };
}

/**
 * Como se activa um capítulo, dito com o vocabulário publicado. Ordem de preferência:
 * o concern (uma palavra), depois a tecnologia, depois o caminho — do mais barato ao
 * mais específico para quem declara.
 */
function activationHintFor(chapter: string, categories: readonly string[] = []): string {
  /**
   * 0.20.0-beta.30 — O CAMINHO OFERECIDO TEM DE SER VERDADEIRO.
   *
   * Antes, quando não havia atalho de vocabulário, oferecia-se o padrão de caminho:
   * `changed_files=["docs/**"]` para governança, `["aos/**"]` para formação. Isso é pedir
   * ao chamador que DECLARE UM FICHEIRO QUE PODE NÃO EXISTIR no repositório dele — uma
   * mentira, num contrato cuja regra é «declara só o que sabes ser verdade». Foi o caso que
   * motivou este ciclo: 14 concerns declarados correctamente não chegavam ao cap. 14.
   *
   * A via ESTRUTURAL (forma B) é sempre verdadeira e sempre disponível: o capítulo existe no
   * catálogo publicado, e declará-lo é um facto, não uma suposição sobre o repositório.
   * Ordem de oferta: atalho de conceito (o mais barato) → tecnologia → ESTRUTURA (sempre
   * verdadeira) → e o caminho de ficheiro só como opção ADICIONAL, quando existir.
   */
  const vocab = buildActivationVocabulary();
  const options: string[] = [];
  if (categories.length > 0) {
    const byCategory = vocab.concerns.values
      .filter((c) => c.activates_categories.some((cat) => categories.includes(cat)))
      .map((c) => String(c.value));
    if (byCategory.length > 0)
      options.push(`concerns=[${byCategory.slice(0, 2).map((c) => `"${c}"`).join(", ")}]`);
  }
  const concerns = vocab.concerns.values.filter((c) => c.activates_chapters.includes(chapter)).map((c) => String(c.value));
  if (concerns.length > 0) options.push(`concerns=[${concerns.slice(0, 2).map((c) => `"${c}"`).join(", ")}]`);
  const techs = vocab.technologies.values.filter((t) => t.activates_chapters.includes(chapter)).map((t) => String(t.value));
  if (techs.length > 0) options.push(`technologies=[${techs.slice(0, 2).map((t) => `"${t}"`).join(", ")}]`);

  // ESTRUTURA: sempre verdadeira, e por isso sempre presente.
  options.push(`chapters=["${chapter}"]`);

  const paths = vocab.changed_files.patterns
    .filter((pattern) => pattern.activates_chapters.includes(chapter))
    .sort((x, y) => x.activates_chapters.length - y.activates_chapters.length);
  const firstPath = paths[0];
  const pathHint =
    firstPath !== undefined ? ` — ou \`changed_files=["${firstPath.pattern.split(" / ")[0]!.trim()}"]\` SE esses ficheiros existirem mesmo no teu repositório` : "";

  return `${[...new Set(options)].join(" · ")}${pathHint}`;
}

function buildDenominators(
  level: SelectionRiskLevel,
  eligible: number
): SelectionResult["denominators"] {
  const ontology = getOntologyData();
  const atLevel = (r: Requirement) => r.applicable_levels?.[level] === true;
  return {
    note:
      "Denominadores NOMEADOS: uma percentagem só significa alguma coisa com o denominador dito. " +
      "`meta.eligible` é o `activated_at_level` — nem a baseline sozinha, nem o catálogo do nível.",
    baseline_at_level: {
      value: ontology.requirements.filter((r) => r.type === "base" && atLevel(r)).length,
      definition: `Requisitos BASE (cap. 02) aplicáveis a ${level}. É o piso: existe sempre, com ou sem declarações.`
    },
    activated_at_level: {
      value: eligible,
      definition:
        `Baseline de ${level} ∪ capítulos de domínio activados pelo que foi DECLARADO ∪ categorias que o ` +
        "vocabulário promete. É o universo desta resposta, e é o denominador de `meta.eligible`: " +
        "`selected + narrowed_out == activated_at_level`."
    },
    catalogue_at_level: {
      value: ontology.requirements.filter(atLevel).length,
      definition:
        `TODOS os requisitos publicados aplicáveis a ${level}, activados ou não. A diferença para ` +
        "`activated_at_level` está declarada em `out_of_scope_chapters` — não é «não aplicável», é não-perguntado."
    },
    catalogue_total: {
      value: ontology.requirements.length,
      definition: "Catálogo publicado inteiro, todos os níveis. Não é denominador de nada nesta resposta — vem nomeado para não voltar a aparecer só em prosa."
    }
  };
}

function buildOutOfScopeChapters(
  level: SelectionRiskLevel,
  selected: SelectedRequirement[],
  narrowedOut: NarrowedOutGroup[],
  excludedByLevel: NarrowedOutGroup[]
): NonNullable<SelectionResult["out_of_scope_chapters"]> {
  const ontology = getOntologyData();
  const banded = new Set<string>([
    ...selected.map((x) => x.requirement_id),
    ...narrowedOut.flatMap((g) => g.requirement_ids),
    ...excludedByLevel.flatMap((g) => g.requirement_ids),
  ]);
  const byChapter = new Map<string, Requirement[]>();
  for (const r of ontology.requirements) {
    if (r.source_bundle === undefined) continue;
    if (r.applicable_levels?.[level] !== true) continue;
    const list = byChapter.get(r.source_bundle) ?? [];
    list.push(r);
    byChapter.set(r.source_bundle, list);
  }
  const chapters: Array<{ chapter: string; at_level: number; out_of_scope: number; activate_with: string }> = [];
  let outOfScope = 0;
  for (const [chapter, reqs] of [...byChapter.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const missing = reqs.filter((r) => !banded.has(r.requirement_id));
    if (missing.length === 0) continue;
    const categories = [...new Set(missing.map((r) => r.category))];
    chapters.push({
      chapter,
      at_level: reqs.length,
      out_of_scope: missing.length,
      activate_with: activationHintFor(chapter, categories),
    });
    outOfScope += missing.length;
  }
  return {
    scope_note:
      `ÂMBITO: esta resposta cobre a baseline do cap. 02 a ${level}, os capítulos activados pelo que declaraste e as categorias que o vocabulário promete. ` +
      `Fora dele ficaram ${outOfScope} requisitos em ${chapters.length} capítulos — NÃO são «não aplicáveis», são não-perguntados. ` +
      "«Nada falta sem aviso» vale para o universo, não só para a baseline: ficam aqui por contagem, com o caminho para os trazer.",
    count: chapters.length,
    requirements_out_of_scope: outOfScope,
    chapters,
  };
}
