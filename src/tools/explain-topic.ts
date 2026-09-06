/**
 * explain_sbd_toe_topic — a leitura CONSULT: «o que é que o Manual diz sobre X?»
 *
 * 0.20.0-beta.35. O Eixo I media o GR-05 em 5/7, com duas peças em falta e a mesma causa:
 * a leitura de CONHECIMENTO estava a ser servida por superfícies de SELECÇÃO.
 *
 *  1. **Os 26 antipadrões não tinham caminho próprio.** «O que NÃO fazer» é metade do valor
 *     de um manual de segurança e não havia porta — só o `resolve_entities` genérico.
 *  2. **Todas as superfícies normativas exigiam `risk_level`** para responder a uma pergunta
 *     de conhecimento: uma exigência de SELECÇÃO aplicada a uma leitura que, por natureza,
 *     não tem projecto nem nível. O oráculo lista isso como must-NOT do caso.
 *
 * A regra que esta superfície aplica: **o nível ANOTA, não filtra.** Cada requisito vem com
 * os níveis em que se aplica (`applies_at`), e o chamador não precisa de declarar um nível
 * que ainda não tem. Se ele o declarar, é anotação (`your_level`), nunca filtro.
 *
 * FRONTEIRA, e é deliberada: o `risk_level` continua OBRIGATÓRIO onde é legítimo — na
 * SELECÇÃO (`select_sbd_toe_requirements`), no `prepare_sbd_toe_codegen_context` e na vista
 * de CAPACIDADE. Aí a pergunta é «o que se aplica ao MEU caso», e sem nível não há resposta
 * honesta. Aqui a pergunta é «o que diz o Manual», e o nível é uma anotação.
 */
import { getOntologyData } from "./ontology-loader.js";
import { categoriesForConcerns, VALID_CONCERNS, type Concern } from "./prepare-codegen-context.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { paginate } from "../serving/response-shaping.js";
import type { Affordance } from "../serving/protocol-envelope.js";

const LEVELS = ["L1", "L2", "L3"] as const;

export interface ExplainTopicResult {
  provenance: { kg: string; server: string; content_type: string; produced_by: string; source_data: string; note: string };
  reading: { id: "CONSULT"; note: string };
  [key: string]: unknown;
  next?: Affordance[];
}

export function handleExplainTopic(args: Record<string, unknown>): ExplainTopicResult {
  const o = getOntologyData();
  const concern = typeof args["concern"] === "string" ? (args["concern"] as string) : undefined;
  const category = typeof args["category"] === "string" ? (args["category"] as string) : undefined;
  const chapter = typeof args["chapter"] === "string" ? (args["chapter"] as string) : undefined;
  const annotateLevel = typeof args["risk_level"] === "string" ? (args["risk_level"] as string) : undefined;

  const provenance = {
    kg: servedKgReleaseTag(),
    server: servingServerVersion(),
    content_type: "canonical",
    produced_by: "topic_crossing_projection",
    source_data: "runtime/requirements + practices + evidence_patterns + threats + antipatterns (+ links)",
    note:
      "manual-grounded: tudo o que vem aqui é entidade publicada do Manual. NADA é inferido e nada é " +
      "selecionado para um projecto — esta é a leitura de CONHECIMENTO."
  };
  const reading = {
    id: "CONSULT" as const,
    note:
      "Leitura CONSULT — «o que o Manual DIZ sobre X», sem tarefa e sem projecto. O `risk_level` é " +
      "OPCIONAL aqui e ANOTA (`applies_at` por requisito), nunca filtra: uma pergunta de conhecimento não " +
      "tem nível. Se o que queres é «o que se aplica ao MEU caso», isso é selecção — " +
      "`select_sbd_toe_requirements`, onde o nível é obrigatório e com razão."
  };

  // âmbito do tópico: por conceito (concern), por estrutura (category/chapter)
  const categories = new Set<string>();
  if (concern !== undefined) for (const c of categoriesForConcerns([concern as Concern])) categories.add(c);
  if (category !== undefined) categories.add(category);
  const inScope = (requirementCategory: string, bundle: string | undefined) =>
    (categories.size === 0 || categories.has(requirementCategory)) && (chapter === undefined || bundle === chapter);

  if (concern !== undefined && !VALID_CONCERNS.includes(concern as Concern)) {
    return {
      provenance,
      reading,
      status: "unknown_concern",
      requested: concern,
      valid_values: [...VALID_CONCERNS],
      note: `\`${concern}\` não é um valor do vocabulário. Os válidos vêm acima; ou pede por estrutura (\`category\`/\`chapter\`).`
    };
  }
  if (concern === undefined && category === undefined && chapter === undefined) {
    return {
      provenance,
      reading,
      status: "needs_topic",
      note:
        "Diz sobre O QUÊ: `concern=\"secrets\"` (conceito), `category=\"ENC\"` ou `chapter=\"08-iac-infraestrutura\"` " +
        "(estrutura). Não é preciso `risk_level` — esta leitura não filtra por nível."
    };
  }

  const requirements = o.requirements.filter((r) => inScope(r.category, r.source_bundle));
  const reqIds = new Set(requirements.map((r) => r.requirement_id));
  const chapters = new Set(requirements.map((r) => r.source_bundle).filter((x): x is string => typeof x === "string"));

  const offsetArg = typeof args["offset"] === "number" ? Math.max(0, Math.floor(args["offset"] as number)) : 0;
  const limitArg = typeof args["limit"] === "number" ? Math.max(1, Math.floor(args["limit"] as number)) : 20;
  const page = paginate(requirements, { offset: offsetArg, limit: limitArg }, requirements.length || 1);

  // ANTIPADRÕES — «o que NÃO fazer», a peça que não tinha porta
  const apReqLinks = o.antipatternRequirementLinks ?? [];
  const apThreatLinks = o.antipatternThreatLinks ?? [];
  /**
   * Dois caminhos até um antipadrão: o CAPÍTULO onde vive, e a LIGAÇÃO a um requisito do
   * âmbito. Nenhum se inventa — são os dois que o bundle publica.
   */
  const antipatterns = (o.antipatterns ?? [])
    .filter((a) => {
      const id = (a as { antipattern_id: string }).antipattern_id;
      const bundles = (a as { bundle_ids?: string[] }).bundle_ids ?? [];
      const byChapter = chapter !== undefined ? bundles.includes(chapter) : bundles.some((b) => chapters.has(b));
      const byLink = apReqLinks.some((l) => l.source_id === id && reqIds.has(l.target_id));
      return byChapter || byLink;
    })
    .map((a) => {
      const id = (a as { antipattern_id: string }).antipattern_id;
      return {
        antipattern_id: id,
        label: (a as { label?: string }).label,
        risk: (a as { risk?: string }).risk,
        chapters: (a as { bundle_ids?: string[] }).bundle_ids ?? [],
        linked_requirements: apReqLinks.filter((l) => l.source_id === id).map((l) => l.target_id),
        linked_threats: apThreatLinks.filter((l) => l.source_id === id).map((l) => l.target_id)
      };
    });

  const practices = (o.practices ?? []).filter((p) => {
    const bundle = (p as { chapter_id?: string; bundle_id?: string }).chapter_id ?? (p as { bundle_id?: string }).bundle_id;
    return bundle !== undefined && chapters.has(bundle);
  });
  const evidence = (o.evidencePatterns ?? []).filter(
    (e) => typeof e.maps_to_requirement_id === "string" && reqIds.has(e.maps_to_requirement_id)
  );
  const threats = (o.threats ?? []).filter((t) => {
    const ch = (t as { chapter_id?: string }).chapter_id;
    return ch !== undefined && chapters.has(ch);
  });
  const phases = [...new Set((o.assignments ?? []).filter((a) => chapters.has(a.chapter_id)).map((a) => a.phase))]
    .filter((p) => p !== "unassigned")
    .sort();

  return {
    provenance,
    reading,
    topic: { concern, category, chapter, categories: [...categories].sort(), chapters: [...chapters].sort() },
    ...(annotateLevel !== undefined ? { your_level: { value: annotateLevel, note: "ANOTAÇÃO: destaca o que se aplica a este nível. NÃO filtrou nada — a resposta é a mesma sem ele." } } : {}),
    requirements: {
      note:
        "REQUISITO — o que o Manual EXIGE. `applies_at` diz em que níveis se aplica: é anotação, não filtro. " +
        "Distingue-se da ORIENTAÇÃO (práticas), que descreve COMO fazer e não é exigível por si.",
      total: requirements.length,
      values: page.items.map((r) => ({
        requirement_id: r.requirement_id,
        name: r.name,
        category: r.category,
        chapter: r.source_bundle,
        kind: "requirement" as const,
        applies_at: LEVELS.filter((l) => r.applicable_levels?.[l] === true),
        ...(annotateLevel !== undefined ? { applies_to_your_level: r.applicable_levels?.[annotateLevel as (typeof LEVELS)[number]] === true } : {})
      })),
      coverage: { ...page.coverage, total: requirements.length }
    },
    anti_patterns: {
      // Zero DECLARADO, nunca mudo: um tópico sem antipadrão publicado não é «não há o que
      // evitar» — é o Manual a publicá-los por capítulo de domínio, e este tópico não estar
      // lá. A porta existe e diz onde eles estão.
      note:
        (antipatterns.length === 0
          ? `NENHUM antipadrão ESTRUTURALMENTE ligado a este tópico. Isto NÃO significa que não haja nada a evitar — ` +
            `e a consequência de o deixar assim é conhecida: quem segue o atalho sai a pensar que o Manual nada diz ` +
            `sobre o que evitar aqui. Por isso o catálogo COMPLETO vem em \`elsewhere\`: são ${(o.antipatterns ?? []).length}, ` +
            "com o capítulo de cada um e a chamada concreta para o ler. O servidor NÃO afirma quais são relevantes para " +
            "este tópico — não tem ligação publicada que o diga, e não a inventa: lê os rótulos e decide tu. "
          : `O QUE NÃO FAZER — ${antipatterns.length} antipadrões publicados para este tópico. `) +
        "É a metade do Manual " +
        "que não tinha caminho próprio até 0.20.0-beta.35. As ligações a requisitos e ameaças são as que o " +
        `bundle publica (${apReqLinks.length} req · ${apThreatLinks.length} ameaças no TOTAL do bundle — são POUCAS, ` +
        "e não se inventam: um antipadrão sem ligação continua a ser conhecimento válido do Manual).",
      total: antipatterns.length,
      values: antipatterns,
      /**
       * Conservação NA BANDA (emenda v1.2 do oráculo): uma banda anunciada e vazia, havendo
       * conteúdo no bundle, tem de dar o CAMINHO CONCRETO — não a lista genérica de onde
       * «poderá estar». Aqui o caminho é o catálogo inteiro (são 26) com a chamada por
       * capítulo, porque o servidor não tem ligação estrutural que diga quais interessam a
       * este tópico e não a inventa.
       */
      ...(antipatterns.length === 0
        ? {
            elsewhere: {
              note:
                "Todos os antipadrões publicados, com a chamada concreta por capítulo. Um deles pode ser " +
                "exactamente sobre o teu tópico sem o bundle publicar a ligação — é por isso que vêm aqui inteiros.",
              by_chapter: [...new Set((o.antipatterns ?? []).flatMap((a) => (a as { bundle_ids?: string[] }).bundle_ids ?? []))]
                .sort()
                .map((ch) => ({
                  chapter: ch,
                  total: (o.antipatterns ?? []).filter((a) => ((a as { bundle_ids?: string[] }).bundle_ids ?? []).includes(ch)).length,
                  read_with: `explain_sbd_toe_topic(chapter="${ch}")`,
                  labels: (o.antipatterns ?? [])
                    .filter((a) => ((a as { bundle_ids?: string[] }).bundle_ids ?? []).includes(ch))
                    .map((a) => (a as { label?: string }).label)
                }))
            }
          }
        : {})
    },
    guidance: {
      note: "ORIENTAÇÃO — práticas: descrevem COMO fazer. Não são exigíveis por si; o que é exigível são os requisitos.",
      practices: practices.length,
      sample: practices.slice(0, 5).map((p) => ({ id: (p as { practice_id?: string; id?: string }).practice_id ?? (p as { id?: string }).id, label: (p as { label?: string; name?: string }).label ?? (p as { name?: string }).name }))
    },
    proof: { note: "PROVA — padrões de evidência que fecham requisito→prova.", evidence_patterns: evidence.length },
    threats: { note: "AMEAÇAS publicadas nos capítulos deste tópico.", total: threats.length },
    where_in_lifecycle: { note: "Fases do ciclo onde este tópico tem trabalho atribuído.", phases },
    next: [
      {
        intent: "O que NÃO fazer, em detalhe (todos os antipadrões)",
        tool: "resolve_entities",
        with: 'record_type="antipattern"',
        kind: "structural" as const
      },
      {
        intent: "O que se aplica ao MEU caso (aí sim, com nível)",
        tool: "select_sbd_toe_requirements",
        with: `risk_level="L2"${concern !== undefined ? `, concerns=["${concern}"]` : ""}`,
        kind: "structural" as const
      },
      {
        intent: "As provas destes requisitos",
        tool: "get_sbd_toe_verification_matrix",
        with: `risk_level="L2", requirement_ids=[${page.items.slice(0, 3).map((r) => `"${r.requirement_id}"`).join(", ")}]`,
        kind: "structural" as const
      }
    ]
  };
}
