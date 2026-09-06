/**
 * 0.20.0-beta.21 — «declarativo primeiro»: o vocabulário publicado.
 *
 * O servidor deixou de adivinhar palavras: PUBLICA a lista fechada de valores que
 * aceita e, para cada valor, o que ele activa. O LLM — que tem o contexto — lê,
 * mapeia e DECLARA; o servidor responde ao declarado, de forma reproduzível.
 *
 * Regra da casa: nada aqui é escrito à mão. Cada entrada é DERIVADA das mesmas
 * tabelas/dados que o motor usa (loader do bundle, mapas de concern→categoria/
 * capítulo, tabela de tecnologias, tabela de padrões de path, activadores
 * declarados de exposure/data_sensitivity, papéis e fases canónicos do bundle) —
 * se o motor mudar, o vocabulário muda com ele, ou o teste parte.
 */
import { getOntologyData } from "../tools/ontology-loader.js";
import { R1_RULE_ID, R1_PRINCIPAL_SET, AGENTIC_WAVE_PATTERN } from "./selection.js";
import {
  VALID_CONCERNS,
  CONCERN_TO_V0_CATEGORIES_SUPPLEMENT,
  EXPOSURE_CONCERNS,
  SENSITIVITY_CONCERNS,
  type Concern
} from "../tools/prepare-codegen-context.js";
import { CONCERN_TO_DOMAIN_CHAPTERS, TECHNOLOGY_TO_CHAPTERS, SES008_TECHNOLOGY } from "./selection.js";
import { PATTERN_RULES } from "../tools/map-review-scope.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";

export interface ConcernVocabularyEntry {
  value: Concern;
  activates_categories: string[];
  activates_chapters: string[];
  requirements_at: Record<"L1" | "L2" | "L3", number>;
  /**
   * 0.20.0-beta.27 — o que REGRAS NOMEADAS acrescentam além das categorias.
   *
   * `requirements_at` conta por CATEGORIA, e era a única coisa publicada: para `agents` o
   * vocabulário prometia 4 a L3 enquanto o `select` devolvia 19. A diferença não era um
   * defeito do motor — eram regras nomeadas e publicadas (R1:principal-nao-humano e a vaga
   * agêntica) que o vocabulário não declarava. Apanhado pela invariante entre superfícies.
   */
  also_activates_by_named_rule?: {
    rule_ids: string[];
    requirements_at: Record<"L1" | "L2" | "L3", number>;
    requirement_ids: string[];
    note: string;
  };
}

export interface ActivatorVocabularyEntry {
  value: string;
  activates_concerns: string[];
  /** P1-A/item 2: valor válido que NÃO activa nada — publicado como tal, nunca omitido. */
  inert?: true;
  note: string;
}

export interface ActivationVocabulary {
  provenance: {
    kg: string;
    server: string;
    content_type: "derived";
    produced_by: "activation_vocabulary_builder";
    source_data: string;
    note: string;
  };
  contract: { serving_semantics: "declarative-first"; version: string; note: string };
  how_to_use: string[];
  risk_level: { values: string[]; baseline_requirements: Record<string, number>; note: string };
  concerns: { closed_set: true; note: string; values: ConcernVocabularyEntry[] };
  exposure: { closed_set: true; note: string; values: ActivatorVocabularyEntry[] };
  data_sensitivity: { closed_set: true; note: string; values: ActivatorVocabularyEntry[] };
  technologies: {
    closed_set: true;
    note: string;
    values: { value: string; activates_chapters: string[]; named_rule?: string; note?: string }[];
  };
  changed_files: { closed_set: false; note: string; patterns: { pattern: string; activates_chapters: string[] }[] };
  roles: { closed_set: true; note: string; values: { value: string; aliases: string[] }[] };
  phases: { closed_set: true; note: string; values: { value: string; label: string; aliases: string[] }[] };
  not_activators: { field: string; role: string; note: string }[];
}

/** Categorias v0 que um concern activa — pela mesma via do motor (loader ⊕ suplemento). */
export function categoriesForConcernPublished(concern: Concern): string[] {
  const ontology = getOntologyData();
  const set = new Set<string>();
  for (const c of ontology.concernsMap[concern] ?? []) set.add(c);
  for (const c of CONCERN_TO_V0_CATEGORIES_SUPPLEMENT[concern] ?? []) set.add(c);
  return [...set].sort();
}

/**
 * Os enums PUBLICADOS dos activadores — a fonte única do que as tools aceitam
 * (P1-C: o schema é gerado daqui) e do que o vocabulário publica (P1-A/item 2:
 * incluindo os valores válidos mas INERTES, que antes eram omitidos).
 */
export const EXPOSURE_VALUES = ["local", "internal", "authenticated", "public"] as const;
export const SENSITIVITY_VALUES = ["low", "personal", "regulated", "secrets"] as const;

export function buildActivationVocabulary(): ActivationVocabulary {
  const ontology = getOntologyData();
  const levels = ["L1", "L2", "L3"] as const;

  const baseline: Record<string, number> = {};
  for (const level of levels)
    baseline[level] = ontology.requirements.filter((r) => r.type === "base" && r.applicable_levels?.[level] === true).length;

  const concerns: ConcernVocabularyEntry[] = VALID_CONCERNS.map((concern) => {
    const categories = categoriesForConcernPublished(concern);
    const counts = {} as Record<"L1" | "L2" | "L3", number>;
    for (const level of levels)
      counts[level] = ontology.requirements.filter(
        (r) => categories.includes(r.category) && r.applicable_levels?.[level] === true
      ).length;
    // Regras NOMEADAS que acrescentam requisitos a este concern além das categorias.
    const namedExtra =
      concern === ("agents" as Concern)
        ? ontology.requirements.filter(
            (r) =>
              !categories.includes(r.category) &&
              (R1_PRINCIPAL_SET.includes(r.requirement_id) ||
                (r.type !== "base" && AGENTIC_WAVE_PATTERN.test(`${r.name} ${r.description ?? ""}`)))
          )
        : [];
    const namedCounts = {} as Record<"L1" | "L2" | "L3", number>;
    for (const level of levels)
      namedCounts[level] = namedExtra.filter((r) => r.applicable_levels?.[level] === true).length;
    return {
      value: concern,
      activates_categories: categories,
      activates_chapters: [...(CONCERN_TO_DOMAIN_CHAPTERS[concern] ?? [])],
      requirements_at: counts,
      ...(namedExtra.length > 0
        ? {
            also_activates_by_named_rule: {
              rule_ids: [R1_RULE_ID, "agents_wave"],
              requirements_at: namedCounts,
              requirement_ids: namedExtra.map((r) => r.requirement_id).sort(),
              note:
                `Além das categorias (${categories.join(", ")}), este concern activa requisitos por REGRA NOMEADA — ` +
                `${R1_RULE_ID} (o agente é um principal não-humano) e a vaga agêntica. Cada inclusão traz o seu ` +
                "traço no `select`; contam-se aqui para o vocabulário não prometer menos do que o servidor entrega."
            }
          }
        : {})
    };
  });

  const roles = ontology.roles
    .filter((r) => r.canonical)
    .map((r) => ({ value: r.role_id, aliases: [...r.aliases].sort() }))
    .sort((a, b) => a.value.localeCompare(b.value));

  const phases = (ontology.phases ?? [])
    .filter((p) => p.canonical)
    .map((p) => ({ value: p.phase_id, label: p.label, aliases: [...p.aliases].sort() }))
    .sort((a, b) => a.value.localeCompare(b.value));

  return {
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "activation_vocabulary_builder",
      source_data:
        "data/publish/runtime/{requirements,assignments,roles}.json + ontology concernsMap + tabelas de activação do motor (concern→categoria/capítulo, tecnologia→capítulo, path→capítulo, exposure/data_sensitivity→concern)",
      note:
        "Derivado, nunca escrito à mão: o mesmo mapa que o motor usa para seleccionar é o que aqui se publica. Contagens por nível vêm do bundle pinado."
    },
    contract: {
      serving_semantics: "declarative-first",
      version: "v1.18-beta",
      note:
        "Nesta linha (0.20-beta, experiência autorizada pelo lead 2026-09-05) a selecção é função do que o chamador DECLARA. O servidor normaliza o declarado; não decide o que quiseram dizer."
    },
    how_to_use: [
      "1. Tu (LLM) lês o pedido, o código e a conversa — tens o contexto que o servidor nunca terá.",
      "2. Mapeias o que interpretaste para ESTES valores e DECLARAS: risk_level, concerns, exposure, data_sensitivity, technologies, changed_files.",
      "3. Chamas select_sbd_toe_requirements com as declarações; o `task` podes enviá-lo à mesma — fica registado para auditoria e NÃO influencia o resultado.",
      "4. Sem nenhuma declaração o servidor responde needs_input (com este vocabulário e candidatos A CONFIRMAR) — nunca adivinha, nunca devolve zero em silêncio.",
      "5. Queres a baseline do nível, sem contexto? Pede-a explicitamente: mode='baseline'.",
      "6. Queres o comportamento inferencial antigo (investigação/estudo de paráfrase)? mode='discover' — exploratório, marcado como tal na resposta."
    ],
    risk_level: {
      values: [...levels],
      baseline_requirements: baseline,
      note: "Filtro de nível sobre os requisitos publicados (applicable_levels). Um capítulo nunca se exclui por nível — a exigência escala."
    },
    concerns: {
      closed_set: true,
      note:
        "Conjunto fechado. Cada concern activa categorias v0 (baseline cap. 02) e/ou capítulos de domínio. Declara os que a tua leitura do pedido justifica — somam activação, não restringem.",
      values: concerns
    },
    exposure: {
      closed_set: true,
      note: "Activador declarado: a superfície exposta impõe concerns por regra publicada.",
      values: EXPOSURE_VALUES.map((value) => {
        const list = [...(EXPOSURE_CONCERNS[value] ?? [])];
        return list.length > 0
          ? { value, activates_concerns: list, note: `exposure='${value}' activa ${list.join(", ")} por regra declarada.` }
          : {
              value,
              activates_concerns: [],
              inert: true as const,
              note: `exposure='${value}' é um valor VÁLIDO e INERTE: não activa nada. Declarado sozinho não produz selecção — a resposta será needs_input, nunca zero em silêncio.`
            };
      })
    },
    data_sensitivity: {
      closed_set: true,
      note: "Activador declarado: a natureza dos dados impõe concerns por regra publicada.",
      values: SENSITIVITY_VALUES.map((value) => {
        const list = [...(SENSITIVITY_CONCERNS[value] ?? [])];
        return list.length > 0
          ? { value, activates_concerns: list, note: `data_sensitivity='${value}' activa ${list.join(", ")} por regra declarada.` }
          : {
              value,
              activates_concerns: [],
              inert: true as const,
              note: `data_sensitivity='${value}' é um valor VÁLIDO e INERTE: não activa nada. Declarado sozinho não produz selecção — a resposta será needs_input, nunca zero em silêncio.`
            };
      })
    },
    technologies: {
      closed_set: true,
      note:
        "Conjunto fechado de tecnologias que activam capítulos por TABELA (não por semelhança de texto). O campo livre `stack` só conta quando um destes valores aparece nele como token exacto.",
      values: [
        ...Object.entries(TECHNOLOGY_TO_CHAPTERS).map(([value, chapters]) => ({ value, activates_chapters: [...chapters] })),
        {
          value: SES008_TECHNOLOGY,
          activates_chapters: [],
          named_rule: "SES-008-por-tecnologia",
          note:
            "Não activa capítulos: aciona a regra NOMEADA SES-008 (scope/TTL/revogação de tokens) a qualquer nível — decisão do Author 2026-08-31, agora por tecnologia DECLARADA em vez de casamento de palavras na tarefa."
        }
      ]
    },
    changed_files: {
      closed_set: false,
      note:
        "Caminhos reais do repositório. A activação é por TABELA de padrões de path publicada abaixo — não há interpretação do conteúdo nem do nome.",
      patterns: PATTERN_RULES.map((r) => ({ pattern: r.pattern, activates_chapters: [...r.bundles] }))
    },
    roles: {
      closed_set: true,
      note: "Papéis canónicos do bundle; os aliases publicados são normalização legítima (ex.: sre → devops-sre).",
      values: roles
    },
    phases: {
      closed_set: true,
      note: "Fases canónicas do bundle; aliases publicados idem (ex.: implement → develop).",
      values: phases
    },
    not_activators: [
      {
        field: "task",
        role: "recorded_context",
        note:
          "Texto livre. Fica no registo para auditoria e NÃO influencia a selecção no modo declarativo (só em mode='discover', exploratório)."
      },
      {
        field: "stack",
        role: "recorded_context_with_exact_normalisation",
        note:
          "Texto livre. Só activa quando contém, como token exacto, um valor de `technologies` — normalizar o declarado é legítimo, adivinhar prosa não."
      }
    ]
  };
}
