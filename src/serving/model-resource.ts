/**
 * sbd://toe/model — o MAPA, não a lista de botões.
 *
 * 0.20.0-beta.30. Publicávamos o `activation-vocabulary` (os atalhos) e não o modelo. Ao
 * matar a inferência promovemos os `concerns` — que são um ATALHO — a interface única, e um
 * grafo com dezenas de tipos e relações passou a ser consumido como um menu de 24 botões.
 * Sintoma: 14 concerns declarados exaustiva e correctamente não chegavam ao cap. 14.
 *
 * O contrário de «adivinhar prosa» não é «escolher de uma lista» — é «pedir com precisão».
 * Este recurso publica as TRÊS FORMAS DE PEDIR e o que cada uma alcança, tudo DERIVADO do
 * bundle servido: entidades com contagens reais, relações com cardinalidades reais,
 * capítulos e categorias com a forma que os alcança. Nada enumerável escrito à mão.
 */
import { getOntologyData } from "../tools/ontology-loader.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";

interface RelationSummary {
  relation: string;
  from: string;
  to: string;
  edges: number;
  distinct_sources: number;
  distinct_targets: number;
  navigate_with: string;
}

export function buildModelResource(): Record<string, unknown> {
  const o = getOntologyData();
  const vocab = buildActivationVocabulary();

  const chapters = [...new Set(o.requirements.map((r) => r.source_bundle).filter((x): x is string => typeof x === "string"))].sort();
  const categories = [...new Set(o.requirements.map((r) => r.category))].sort();

  const conceptForChapter = (chapter: string): string[] => [
    ...vocab.concerns.values.filter((c) => c.activates_chapters.includes(chapter)).map((c) => `concerns=["${String(c.value)}"]`),
    ...vocab.technologies.values.filter((t) => t.activates_chapters.includes(chapter)).map((t) => `technologies=["${String(t.value)}"]`)
  ];
  const conceptForCategory = (category: string): string[] =>
    vocab.concerns.values.filter((c) => c.activates_categories.includes(category)).map((c) => `concerns=["${String(c.value)}"]`);

  const edges = (list: ReadonlyArray<{ source_id?: string; target_id?: string }> | undefined, relation: string, from: string, to: string, navigate: string): RelationSummary | undefined => {
    if (!list || list.length === 0) return undefined;
    return {
      relation,
      from,
      to,
      edges: list.length,
      distinct_sources: new Set(list.map((l) => l.source_id)).size,
      distinct_targets: new Set(list.map((l) => l.target_id)).size,
      navigate_with: navigate
    };
  };

  const relations = [
    edges(o.requirementControlLinks, "requirement → control", "requirement", "control", 'resolve_entities(record_type="control", filters={…})'),
    edges(o.antipatternRequirementLinks, "antipattern → requirement", "antipattern", "requirement", 'query_sbd_toe_entities(query="<ANTI-…>")'),
    edges(o.antipatternThreatLinks, "antipattern → threat", "antipattern", "threat", 'get_threat_landscape(risk_level, concerns=[…])'),
    edges(
      (o.artifactRequirements ?? []) as ReadonlyArray<{ source_id?: string; target_id?: string }>,
      "artifact → requirement",
      "artifact",
      "requirement",
      "get_sbd_toe_chapter_brief(chapter)"
    ),
    edges(o.signalEvidenceLinks, "signal → evidence", "signal", "evidence", "trace_sbd_toe_graph(anchor, lens)")
  ].filter((x): x is RelationSummary => x !== undefined);

  return {
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "model_resource_builder",
      source_data: "runtime/*.json + ontology (mesmo bundle que o activation-vocabulary)",
      note:
        "O MAPA do conhecimento servido e as TRÊS FORMAS de o pedir. Derivado do bundle: contagens e " +
        "cardinalidades são as reais desta build, nunca escritas à mão."
    },
    how_to_ask: {
      note:
        "Três formas, todas DECLARATIVAS — em nenhuma o servidor interpreta prosa. Muda o que declaras: " +
        "um conceito, uma estrutura, ou um nó do grafo.",
      ways: [
        {
          id: "A",
          name: "por CONCEITO (atalho)",
          declare: ["concerns", "exposure", "data_sensitivity", "technologies", "changed_files"],
          when: "arranque recomendado: os casos comuns têm atalho pronto e é a forma mais barata.",
          limit: `Um atalho é um agrupamento pré-cozinhado: cobre ${vocab.concerns.values.length} casos, não o Manual inteiro. Quando não há atalho para o que precisas, usa a forma B — não inventes um valor.`,
          example: 'select_sbd_toe_requirements(risk_level="L2", concerns=["auth"], exposure="public")'
        },
        {
          id: "B",
          name: "por ESTRUTURA (preciso)",
          declare: ["chapters", "categories", "requirement_ids", "record_type + filters"],
          when:
            "quando sabes exactamente o que queres, ou quando não existe atalho: governança, formação, " +
            "classificação, ou uma família de requisitos específica. É sempre uma declaração VERDADEIRA — " +
            "o capítulo existe no catálogo, ao contrário de um ficheiro que talvez não exista no teu repositório.",
          example: 'select_sbd_toe_requirements(risk_level="L3", chapters=["14-governanca-contratacao"])',
          also: [
            'select_sbd_toe_requirements(risk_level="L3", categories=["GOV"])',
            'resolve_entities(record_type="requirement", filters={category:"GOV"})',
            "get_sbd_toe_verification_matrix(risk_level, requirement_ids=[…])"
          ]
        },
        {
          id: "C",
          name: "por NAVEGAÇÃO (relacional)",
          declare: ["anchor", "lens"],
          when:
            "quando a pergunta é sobre LIGAÇÕES: que provas tem este requisito, que ameaças mitiga este " +
            "controlo, o que se liga a este capítulo. Segue-se o grafo a partir de um nó declarado.",
          example: 'trace_sbd_toe_graph(anchor="ASC-01", lens="slice_implementation")',
          relations_available: relations.length
        }
      ]
    },
    entities: {
      note: "Tipos de entidade do bundle servido, com as contagens REAIS desta build.",
      counts: {
        requirements: o.requirements.length,
        controls: (o.controls ?? []).length,
        threats: (o.threats ?? []).length,
        artifacts: (o.artifacts ?? []).length,
        practices: (o.practices ?? []).length,
        roles: (o.roles ?? []).length,
        phases: (o.phases ?? []).length,
        antipatterns: (o.antipatterns ?? []).length,
        evidence_patterns: (o.evidencePatterns ?? []).length
      }
    },
    relations: {
      note: "Relações navegáveis, com cardinalidades reais (arestas e nós distintos de cada lado).",
      values: relations
    },
    chapters: {
      note:
        "Todos os capítulos com requisitos, e COMO se alcança cada um. Um capítulo sem atalho de conceito " +
        "não é inalcançável: pede-se por estrutura, que é sempre verdadeira.",
      values: chapters.map((chapter) => {
        const by_concept = conceptForChapter(chapter);
        return {
          chapter,
          requirements: o.requirements.filter((r) => r.source_bundle === chapter).length,
          reachable_by: by_concept.length > 0 ? ["A", "B", "C"] : ["B", "C"],
          by_concept,
          by_structure: `chapters=["${chapter}"]`
        };
      })
    },
    categories: {
      note: "Categorias (o prefixo dos ids de requisito) e como se alcança cada uma.",
      values: categories.map((category) => {
        const by_concept = conceptForCategory(category);
        return {
          category,
          requirements: o.requirements.filter((r) => r.category === category).length,
          reachable_by: by_concept.length > 0 ? ["A", "B"] : ["B"],
          by_concept,
          by_structure: `categories=["${category}"]`
        };
      })
    },
    see_also: {
      "sbd://toe/activation-vocabulary": "os ATALHOS da forma A: valores fechados e o que cada um activa",
      "sbd://toe/agent-guide": "o guia operacional, com as três formas e quando usar cada uma"
    }
  };
}

/**
 * sbd://toe/quick-start — o arranque MÍNIMO (o avaliador mediu ~14.100 tk para arrancar).
 *
 * Não substitui o guia: dá o suficiente para a primeira chamada correcta e diz onde está o
 * resto. Derivado, como tudo — as contagens e os exemplos vêm do mesmo modelo.
 */
export function buildQuickStart(): Record<string, unknown> {
  const model = buildModelResource() as {
    how_to_ask: { ways: Array<{ id: string; name: string; when: string; example: string }> };
    chapters: { values: Array<{ chapter: string; reachable_by: string[] }> };
    entities: { counts: Record<string, number> };
  };
  const semAtalho = model.chapters.values.filter((c) => !c.reachable_by.includes("A")).map((c) => c.chapter);
  return {
    provenance: {
      kg: servedKgReleaseTag(),
      server: servingServerVersion(),
      content_type: "derived",
      produced_by: "quick_start_builder",
      source_data: "derivado do mesmo modelo que sbd://toe/model",
      note: "Arranque mínimo. O guia completo (sbd://toe/agent-guide) tem o resto; lê-o quando precisares."
    },
    in_one_line:
      "TU tens o contexto, EU tenho o conhecimento: declara o que interpretaste e eu respondo ao declarado — " +
      "nunca interpreto prosa, nunca devolvo zero em silêncio, e digo sempre o que ficou de fora.",
    first_call: {
      tool: "select_sbd_toe_requirements",
      with: 'risk_level="L2", concerns=["auth"], exposure="public"',
      note: "risk_level é obrigatório em quase tudo. Não sabes qual é? O método está no cap. 01: chapters=[\"01-classificacao-aplicacoes\"] — o servidor ENSINA a classificar, nunca CALCULA o nível."
    },
    three_ways: model.how_to_ask.ways.map((w) => ({ id: w.id, name: w.name, example: w.example })),
    if_the_shortcut_does_not_exist: {
      note:
        `${semAtalho.length} capítulos não têm atalho de conceito. Não inventes um \`changed_files\`: pede por ESTRUTURA.`,
      chapters: semAtalho,
      example: `select_sbd_toe_requirements(risk_level="L3", chapters=["${semAtalho[0] ?? "14-governanca-contratacao"}"])`
    },
    read_next: {
      "sbd://toe/model": "o mapa: entidades, relações, o que cada forma alcança",
      "sbd://toe/activation-vocabulary": "os valores fechados da forma A",
      "sbd://toe/agent-guide": "o guia operacional completo"
    },
    catalogue_size: model.entities.counts
  };
}
