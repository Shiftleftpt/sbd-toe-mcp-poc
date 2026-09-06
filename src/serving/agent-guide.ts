/**
 * agent-guide — o guia servido, com as partes enumeráveis DERIVADAS.
 *
 * 0.20.0-beta.24. O agent-guide era a última peça escrita à mão num sistema onde tudo o
 * resto é gerado, e pagou o preço: a tabela que publicava como «ontology-controlled
 * vocabulary» era, carácter a carácter e na mesma ordem alfabética, o `supported_values`
 * do MAPA DE AMEAÇAS — a lista errada com o nome errado. Custo medido pelo avaliador:
 * numa tarefa de webhooks com dados pessoais, obedecer ao guia custava `integration` e
 * `privacy`, 17 requisitos, incluindo validação de assinatura e anti-replay.
 *
 * Regra desta linha: **nada hardcoded que os dados governem**. A prosa autoral do guia
 * (o porquê, o método, os padrões de resposta) fica onde está; tudo o que ENUMERA
 * vocabulário, valores, tools, recursos, prompts, capítulos ou contagens passa a ser
 * gerado das mesmas fontes que o servidor serve. `agent-guide-derived.test.ts` guarda
 * que o guia servido não diverge das fontes de que deriva — a mesma família da
 * invariante next-verbatim.
 */
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { RESOURCE_CATALOG, PROMPT_CATALOG } from "./server-surface.js";
import { buildModelResource } from "./model-resource.js";
import { getOntologyData } from "../tools/ontology-loader.js";
import { handleListSbdToeChapters } from "../tools/structured-tools.js";
import { handleConsultSecurityRequirements, consultSupportedConcerns } from "../tools/consult-security-requirements.js";
import { threatConcernSupport, threatDomainConcerns } from "../tools/get-threat-landscape.js";

type GuideChapter = {
  id: string;
  title: string;
  applicability?: Partial<Record<"L1" | "L2" | "L3", boolean>>;
  demand_by_level?: Partial<Record<"L1" | "L2" | "L3", string>>;
};

function guideChapters(): GuideChapter[] {
  const listed = handleListSbdToeChapters({}) as { chapters?: GuideChapter[] };
  return listed.chapters ?? [];
}

const BEGIN = (id: string) => `<!-- BEGIN GENERATED: ${id} -->`;
const END = (id: string) => `<!-- END GENERATED: ${id} -->`;

/**
 * 0.20.0-beta.25 — a teoria do minLevel morre EXPLICITAMENTE.
 *
 * A aplicabilidade graduada (0.14.0) retirou o modelo binário «este capítulo só começa a
 * aplicar-se em L2». `list_sbd_toe_chapters` di-lo («the binary minLevel theory is
 * retired») e `map_sbd_toe_applicability` também («nothing is excluded by level») — mas o
 * guia continuava a publicar a teoria, primeiro numa coluna «Min level» escrita à mão
 * (06→L2, 11→L2, 13→L3) e no «L2 unlocks + chapters 06, 11», e depois — já gerado — numa
 * coluna «Presente desde» que a reintroduzia pela forma. Nenhuma coluna deste guia volta
 * a dizer quando um capítulo «começa»: TODOS estão presentes em TODOS os níveis.
 */
export const MINLEVEL_RETIRED =
  "**Aplicabilidade GRADUADA (0.14.0): nenhum capítulo se exclui por nível.** Todos os 15 estão " +
  "presentes em L1, L2 e L3 — o que escala é a EXIGÊNCIA, não a presença. A teoria binária do " +
  "`minLevel` («o capítulo N só se aplica a partir de LX») está RETIRADA: não existe «unlock» de " +
  "capítulos por nível, e nenhuma coluna aqui diz quando um capítulo começa, porque nenhum começa.";

/** Nota que acompanha cada bloco: quem lê o guia tem de saber o que é derivado. */
const DERIVED_NOTE = "*(gerado — não editar à mão; a suite guarda a igualdade com a fonte)*";

function domainsOf(category: string): string {
  const mapping = getOntologyData().domainMapping as Record<string, string[] | undefined>;
  return (mapping[category] ?? []).join(", ");
}

/**
 * 0.20.0-beta.28 — a caixa de aviso sobre o mapa de ameaças passa a ser DERIVADA.
 *
 * Era texto fixo dentro de um bloco gerado: escrita na beta.24, quando o mapa resolvia 13
 * dos 24, e ficou a dizer «SUBCONJUNTO» depois de a beta.27 o ter posto a resolver os 24 —
 * enquanto o bloco `cross-surface`, esse derivado, dizia «24 de 24». Dois blocos GERADOS a
 * afirmar coisas incompatíveis sobre a MESMA tool: a suite guardava igualdade com a fonte,
 * não NÃO-CONTRADIÇÃO. Agora o aviso lê a cobertura real e diz o que ela for.
 */
function threatCoverageCaveat(total: number): string[] {
  const supported = threatConcernSupport().supported.length;
  if (supported >= total)
    return [
      "> **O mapa de ameaças cobre hoje os mesmos valores.** `get_threat_landscape` resolve",
      `> ${supported} de ${total} — mas resolve AMEAÇAS, não requisitos, e um concern pode`,
      "> não trazer capítulo nenhum ao nível pedido: nesse caso a resposta declara-o",
      "> (`empty_at_level`), nunca devolve zero em silêncio. (Até 0.20.0-beta.23 este guia",
      "> publicava a cobertura do mapa de ameaças com o rótulo «vocabulário» — 13 em vez de 24.)"
    ];
  return [
    "> **Atenção — não confundir com a cobertura do mapa de ameaças.** `get_threat_landscape`",
    `> resolve ${supported} de ${total} destes concerns e declara os restantes em`,
    "> `unsupported_concerns`. Um concern não roteável por ameaças **tem requisitos à mesma**:",
    "> usa `select_sbd_toe_requirements`."
  ];
}

/** Tabela de concerns: o VOCABULÁRIO REAL (24), com o que cada valor activa. */
export function generateConcernsBlock(): string {
  const vocab = buildActivationVocabulary();
  const rows = vocab.concerns.values.map((entry) => {
    const value = String(entry.value);
    const cats = [...entry.activates_categories].sort();
    const domains = [...new Set(cats.flatMap((c) => domainsOf(c).split(", ").filter(Boolean)))].sort().join(", ");
    const chapters = entry.activates_chapters.length > 0 ? entry.activates_chapters.join(", ") : "—";
    const at = entry.requirements_at;
    return `| \`${value}\` | ${cats.join(", ")} | ${domains || "—"} | ${chapters} | ${at.L1} / ${at.L2} / ${at.L3} |`;
  });
  return [
    `**${rows.length} valores** — conjunto FECHADO, derivado do bundle servido. ${DERIVED_NOTE}`,
    "",
    "| concern | Categorias activadas | Domínios | Capítulos activados | Requisitos L1/L2/L3 |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "Passa os concerns como strings minúsculas exactas desta tabela. Um valor fora dela é",
    "DECLARADO em `unknown_concerns` e ignorado — nunca descartado em silêncio.",
    "",
    ...threatCoverageCaveat(rows.length)
  ].join("\n");
}

/** Os outros activadores declaráveis, com a mesma proveniência. */
export function generateActivatorsBlock(): string {
  const v = buildActivationVocabulary();
  const line = (label: string, values: string[]) => `| \`${label}\` | ${values.map((x) => `\`${x}\``).join(" · ")} |`;
  const inert = v.exposure.values.filter((x) => x.inert).map((x) => String(x.value));
  const inertSens = v.data_sensitivity.values.filter((x) => x.inert).map((x) => String(x.value));
  return [
    `${DERIVED_NOTE}`,
    "",
    "| Activador | Valores aceites |",
    "|---|---|",
    line("exposure", v.exposure.values.map((x) => String(x.value))),
    line("data_sensitivity", v.data_sensitivity.values.map((x) => String(x.value))),
    line("technologies", v.technologies.values.map((x) => String(x.value))),
    `| \`changed_files\` | ${v.changed_files.patterns.length} padrões de caminho publicados (ver \`sbd://toe/activation-vocabulary\` → \`changed_files.patterns\`) |`,
    "",
    `**Válidos e INERTES** (não activam nada; declarados sozinhos dão \`needs_input\`, nunca zero em silêncio): ` +
      `\`exposure\` ${inert.map((x) => `\`${x}\``).join(", ") || "—"}; ` +
      `\`data_sensitivity\` ${inertSens.map((x) => `\`${x}\``).join(", ") || "—"}.`
  ].join("\n");
}

export function generateRolesBlock(): string {
  const v = buildActivationVocabulary();
  const values = v.roles.values.map((r) => {
    const aliases = (r.aliases ?? []).map((a: string) => `\`${a}\``).join(", ");
    return `| \`${String(r.value)}\` | ${aliases || "—"} |`;
  });
  return [
    `**${values.length} papéis canónicos** do bundle servido; os aliases são normalização legítima. ${DERIVED_NOTE}`,
    "",
    "| Papel canónico | Aliases aceites |",
    "|---|---|",
    ...values
  ].join("\n");
}

export function generateResourcesBlock(): string {
  const rows = RESOURCE_CATALOG.map((r) => {
    const first = String(r.description).split(/(?<=\.)\s/)[0] ?? String(r.description);
    return `| \`${r.uri}\` | ${first.replace(/\|/g, "\\|")} |`;
  });
  return [`${DERIVED_NOTE}`, "", "| Resource URI | When to use |", "|---|---|", ...rows].join("\n");
}

export function generatePromptsBlock(): string {
  const rows = PROMPT_CATALOG.map((p) => {
    const args = (p["arguments"] as Array<{ name: string; required?: boolean }> | undefined) ?? [];
    const sig = args.map((a) => (a.required === true ? a.name : `${a.name}?`)).join(", ");
    const first = String(p["description"] ?? "").split(/(?<=\.)\s/)[0] ?? "";
    return `| \`${String(p["name"])}(${sig})\` | ${first.replace(/\|/g, "\\|")} |`;
  });
  return [`${DERIVED_NOTE}`, "", "| Prompt | When to use |", "|---|---|", ...rows].join("\n");
}

export function generateChaptersBlock(): string {
  const chapters = guideChapters();
  const rows = chapters.map((c) => {
    const demand = c.demand_by_level ?? {};
    return `| \`${c.id}\` | ${c.title} | ${demand.L1 ?? "—"} / ${demand.L2 ?? "—"} / ${demand.L3 ?? "—"} |`;
  });
  return [
    `**${rows.length} capítulos.** ${MINLEVEL_RETIRED} ${DERIVED_NOTE}`,
    "",
    "| chapterId | Title | Exigência L1 / L2 / L3 |",
    "|---|---|---|",
    ...rows
  ].join("\n");
}

export function generateRiskLevelsBlock(): string {
  const chapters = guideChapters();
  const rows = (["L1", "L2", "L3"] as const).map((level) => {
    const mandatory = chapters.filter((c) => (c.demand_by_level ?? {})[level] === "obrigatorio").length;
    const present = chapters.filter((c) => (c.applicability ?? {})[level] === true).length;
    return `| \`${level}\` | ${present} de ${chapters.length} | ${mandatory} obrigatórios |`;
  });
  return [
    `${MINLEVEL_RETIRED} ${DERIVED_NOTE}`,
    "",
    "| Level | Capítulos presentes | Exigência |",
    "|---|---|---|",
    ...rows
  ].join("\n");
}

/**
 * Tamanhos de resposta MEDIDOS, não recordados. O guia anunciava «L1 ≈ 22k, L2 ≈ 36k,
 * L3 ≈ 36k chars»; a medição dá 32k / 47k / 51k — 30 a 45% de erro numa afirmação que o
 * agente usa para decidir se cabe no contexto. Medir custa ~23 ms uma vez por processo.
 */
export function generateOutputSizesBlock(): string {
  const rows = (["L1", "L2", "L3"] as const).map((level) => {
    const full = JSON.stringify(handleConsultSecurityRequirements({ risk_level: level })).length;
    const scoped = JSON.stringify(handleConsultSecurityRequirements({ risk_level: level, concerns: ["auth"] })).length;
    return `| \`${level}\` | ≈ ${(full / 1000).toFixed(0)}k chars | ≈ ${(scoped / 1000).toFixed(0)}k chars |`;
  });
  return [
    `Medido nesta build sobre \`consult_security_requirements\` (o \`concerns\` de exemplo é \`["auth"]\`). ${DERIVED_NOTE}`,
    "",
    "| Nível | Resposta completa | Com `concerns` declarados |",
    "|---|---|---|",
    ...rows,
    "",
    "**Declara sempre `concerns` para delimitar L2/L3** — a resposta completa pode exceder o contexto."
  ].join("\n");
}

/**
 * 0.20.0-beta.27 (item B) — QUE SUPERFÍCIE RESOLVE O QUÊ, derivado.
 *
 * As superfícies derivam do MESMO bundle e podem discordar por defeito (foi o que
 * aconteceu: o `consult` resolvia 13 dos 24 concerns porque usava o mapa cru em vez do
 * publicado, e AFIRMAVA «0 requirements active»). O agente precisa de saber que a
 * discordância é possível — e o que fazer quando a encontra.
 */
export function generateCrossSurfaceBlock(): string {
  const concerns = buildActivationVocabulary().concerns.values.map((c) => String(c.value));
  const domainConcerns = threatDomainConcerns();
  const consultOk = consultSupportedConcerns().length;
  const threats = threatConcernSupport();
  return [
    `${DERIVED_NOTE}`,
    "",
    "| Superfície | Resolve concerns | O que devolve |",
    "|---|---|---|",
    `| \`select_sbd_toe_requirements\` | ${concerns.length} de ${concerns.length} | os requisitos do que declaraste, com traço |`,
    `| \`consult_security_requirements\` | ${consultOk} de ${concerns.length} | o catálogo do nível, filtrado pelos concerns |`,
    `| \`sbd://toe/activation-vocabulary\` | ${concerns.length} de ${concerns.length} | o que cada valor activa, e quantos requisitos por nível |`,
    `| \`get_threat_landscape\` | ${threats.supported.length} de ${concerns.length} **sem erro** · ${domainConcerns.length} com ameaças de DOMÍNIO próprias | AMEAÇAS, não requisitos — ver abaixo |`,
    "",
    "",
    `**Roteamento ≠ cobertura.** \`get_threat_landscape\` aceita os ${concerns.length} concerns sem erro, mas só`,
    `**${domainConcerns.length}** têm capítulo de ameaças PRÓPRIO — ${domainConcerns.map((c) => "`" + c + "`").join(", ")}.`,
    `Para os outros ${concerns.length - domainConcerns.length} as ameaças chegam pelos capítulos onde se DEFINEM os`,
    "controlos que o concern activa: são reais e do âmbito activado, mas não são «as ameaças deste",
    "domínio». A resposta di-lo em `routing_basis` (`domain_chapter` vs `activated_controls`) — e agora",
    "sabe-lo ANTES de gastar a chamada. As ameaças vêm ordenadas por PERTENÇA ao âmbito declarado",
    "(capítulo de domínio primeiro, governação genérica dos caps. 01/02 por último).",
    "",
    "**Regra de contraprova.** Um resultado vazio **sem** `unsupported_concerns` não é",
    "prova de ausência: CONTRAPROVA antes de comunicar — `select_sbd_toe_requirements` com",
    "os mesmos concerns, ou `sbd://toe/activation-vocabulary`, que publica quantos requisitos",
    "cada valor activa por nível. Se as superfícies discordarem, **é sinal, não ruído**:",
    "comunica a discordância, não escolhas a que te dá jeito — e nunca apresentes o vazio",
    "como «manual-grounded», que é o selo epistémico mais forte deste servidor."
  ].join("\n");
}

/**
 * 0.20.0-beta.30 — AS TRÊS FORMAS DE PEDIR, no arranque do guia.
 *
 * O guia dizia «declara concerns» como via única. Os concerns são um ATALHO: cobrem os
 * casos comuns, não o Manual inteiro — e quando não cobrem, a única porta publicada era
 * inventar um `changed_files`. Este bloco é derivado do mesmo modelo que o recurso
 * `sbd://toe/model` publica, para o ensino não poder divergir do que o servidor faz.
 */
export function generateHowToAskBlock(): string {
  const model = buildModelResource() as {
    how_to_ask: { ways: Array<{ id: string; name: string; when: string; example: string }> };
    chapters: { values: Array<{ chapter: string; reachable_by: string[] }> };
    categories: { values: Array<{ category: string; reachable_by: string[] }> };
  };
  const soB = model.chapters.values.filter((c) => !c.reachable_by.includes("A")).map((c) => c.chapter);
  const catSoB = model.categories.values.filter((c) => !c.reachable_by.includes("A")).map((c) => c.category);
  const rows = model.how_to_ask.ways.map(
    (w) => `| **${w.id} — ${w.name}** | ${w.when.replace(/\|/g, "\\|")} | \`${w.example}\` |`
  );
  return [
    `${DERIVED_NOTE}`,
    "",
    "| Forma | Quando | Exemplo executável |",
    "|---|---|---|",
    ...rows,
    "",
    "**Nenhuma das três é inferência.** Em todas TU declaras — um conceito, uma estrutura ou um nó;",
    "o servidor nunca interpreta prosa. O que muda é a PRECISÃO do pedido.",
    "",
    `**Quando A não chega:** ${soB.length} capítulos não têm atalho de conceito — ${soB.map((c) => "`" + c + "`").join(", ")} — ` +
      `e ${catSoB.length} categorias — ${catSoB.map((c) => "`" + c + "`").join(", ")}. Não são inalcançáveis:`,
    "pede-os por ESTRUTURA. O `out_of_scope_chapters` de cada resposta oferece-te o caminho verdadeiro no",
    "momento em que faz falta — e **nunca te pede para declarar um ficheiro que talvez não exista**.",
    "",
    "O mapa completo (entidades, relações, cardinalidades, o que cada forma alcança) está em",
    "`sbd://toe/model`. Os atalhos da forma A continuam em `sbd://toe/activation-vocabulary`."
  ].join("\n");
}

/**
 * 0.20.0-beta.34 — AS LEITURAS: a mesma pergunta sobre um capítulo tem respostas diferentes.
 *
 * «O que é preciso para o cap. 07?» é ambígua: pode ser «que requisitos se aplicam à MINHA
 * TAREFA» (GUIDE) ou «que capacidade a ORGANIZAÇÃO precisa de ter e como sabe que a tem»
 * (IMPL). Servir uma quando se pedia a outra é o must-NOT do caso GR-01 do oráculo — e era
 * o que acontecia, porque só a leitura GUIDE tinha superfície própria.
 */
export function generateReadingsBlock(): string {
  return [
    `${DERIVED_NOTE}`,
    "",
    "| Leitura | A pergunta que responde | Onde |",
    "|---|---|---|",
    "| **GUIDE** | «que requisitos se aplicam a ESTA tarefa/mudança?» | `select_sbd_toe_requirements` · `prepare_sbd_toe_codegen_context` |",
    "| **IMPL** | «que capacidade a ORGANIZAÇÃO precisa de ter, e COMO MEDE que a tem?» | `get_sbd_toe_chapter_capability` (KPIs com thresholds por nível + artefactos) · `get_sbd_toe_chapter_implementation_checklist` · `assess_sbd_toe_implementation` |",
    "| **CONSULT** | «o que o Manual diz sobre X?» (sem tarefa) | `consult_security_requirements` · `get_threat_landscape` · `get_sbd_toe_verification_matrix` |",
    "| **CROSS-CHECK** | «somos sujeitos à norma N — como é que o Manual serve?» | `get_sbd_toe_playbook` · `map_sbd_toe_regulatory_activation` |",
    "| **PAPEL/MOMENTO** | «o que faço EU, agora?» | `get_guide_by_role` |",
    "| **SETUP** | «como me configuro?» | `sbd://toe/quick-start` · `generate_sbd_toe_skill` |",
    "",
    "**A mesma pergunta sobre um capítulo tem duas respostas legítimas** — «o que fazer na tarefa»",
    "(GUIDE) e «o que a organização precisa de ter» (IMPL) — e não são substituíveis. Responder à",
    "IMPL com a lista de requisitos técnicos é um erro conhecido: as respostas da vista IMPL",
    "declaram-no no campo `reading`, para saberes qual recebeste."
  ].join("\n");
}

const GENERATORS: Record<string, () => string> = {
  readings: generateReadingsBlock,
  "how-to-ask": generateHowToAskBlock,
  "cross-surface": generateCrossSurfaceBlock,
  "output-sizes": generateOutputSizesBlock,
  concerns: generateConcernsBlock,
  activators: generateActivatorsBlock,
  roles: generateRolesBlock,
  resources: generateResourcesBlock,
  prompts: generatePromptsBlock,
  chapters: generateChaptersBlock,
  "risk-levels": generateRiskLevelsBlock
};

export const GENERATED_BLOCK_IDS = Object.keys(GENERATORS);

/** Os marcadores presentes no asset — a suite exige que sejam exactamente os gerados. */
export function markersInTemplate(template: string): string[] {
  return [...template.matchAll(/<!-- BEGIN GENERATED: ([a-z-]+) -->/g)].map((m) => String(m[1]));
}

export function readAgentGuideTemplate(): string {
  return readFileSync(resolveAppPath("assets/agent-guide.md"), "utf-8");
}

/**
 * O guia servido: prosa autoral do asset + blocos derivados expandidos. Um marcador sem
 * gerador (ou um gerador sem marcador) parte a suite — não se serve um guia meio-derivado.
 */
export function buildAgentGuide(): string {
  let out = readAgentGuideTemplate();
  for (const [id, generate] of Object.entries(GENERATORS)) {
    const begin = BEGIN(id);
    const end = END(id);
    const from = out.indexOf(begin);
    const to = out.indexOf(end);
    if (from < 0 || to < 0 || to < from) continue;
    out = out.slice(0, from + begin.length) + "\n" + generate() + "\n" + out.slice(to);
  }
  return out;
}
