/**
 * 0.20.0-beta.27 — INVARIANTE ENTRE SUPERFÍCIES.
 *
 * `select`, `consult`, `sbd://toe/activation-vocabulary` e `get_threat_landscape` derivam
 * do MESMO bundle. Têm de concordar sobre «que requisitos activa o concern X ao nível Y» —
 * 24 concerns × 3 níveis. Uma discordância é defeito de uma delas, nunca uma diferença de
 * opinião: não há duas verdades sobre o mesmo bundle.
 *
 * NOTA DE MÉTODO (vale para todos os ciclos): a correcção aplica-se à CLASSE, não à tool
 * onde o defeito foi visto. Esta suite existe porque a evidência era esmagadora —
 * `unsupported_concerns` nasceu no mapa de ameaças e não chegou ao `consult`; a guarda de
 * inertes nasceu no `exposure` e não chegou a `technologies`; o `narrowed_out` cobria a
 * baseline e não os capítulos. Cada um foi encontrado por um avaliador, uma vaga depois.
 * Esta invariante teria apanhado o P0 do `consult` antes de qualquer avaliação: o
 * vocabulário publicava 5 para `privacy`@L2, o `select` devolvia 5, e o `consult` dizia 0.
 */
import { describe, it, expect } from "vitest";
import { handleSelectRequirements } from "../tools/select-requirements.js";
import { handleConsultSecurityRequirements } from "../tools/consult-security-requirements.js";
import { handleGetThreatLandscape } from "../tools/get-threat-landscape.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { getOntologyData } from "../tools/ontology-loader.js";

const LEVELS = ["L1", "L2", "L3"] as const;
const vocab = buildActivationVocabulary();
const ontology = getOntologyData();
const CONCERNS = vocab.concerns.values.map((c) => String(c.value));

describe("invariante entre superfícies — 24 concerns × 3 níveis", () => {
  /**
   * ENUNCIADO (afinado quando a invariante o exigiu): `consult` é resolução por CATEGORIA
   * e tem de bater exactamente com `requirements_at`. O `select` acrescenta o que as
   * REGRAS NOMEADAS activam — e o vocabulário publica-o em `also_activates_by_named_rule`,
   * para não prometer menos do que o servidor entrega. A lei é
   * `select == requirements_at + named_rule` e `consult == requirements_at`.
   */
  it("vocabulário, select e consult concordam na CONTAGEM de requisitos activados", () => {
    const offenders: string[] = [];
    for (const entry of vocab.concerns.values) {
      const concern = String(entry.value);
      for (const level of LEVELS) {
        const named = entry.also_activates_by_named_rule?.requirements_at[level] ?? 0;
        const published = entry.requirements_at[level] + named;
        const selected = handleSelectRequirements({ risk_level: level, concerns: [concern], limit: 500 })
          .selection.selected.length;
        const consulted = handleConsultSecurityRequirements({ risk_level: level, concerns: [concern] })
          .meta.requirementCount;
        if (published !== selected)
          offenders.push(
            `${concern}@${level}: vocabulário ${entry.requirements_at[level]}+${named} (regra nomeada) = ${published} · select ${selected}`
          );
        if (entry.requirements_at[level] !== consulted)
          offenders.push(
            `${concern}@${level}: vocabulário por categoria ${entry.requirements_at[level]} · consult ${consulted} — três superfícies, um bundle`
          );
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("concordam no CONJUNTO de ids, não só na contagem", () => {
    const offenders: string[] = [];
    for (const concern of CONCERNS) {
      for (const level of LEVELS) {
        const selected = new Set(
          (handleSelectRequirements({ risk_level: level, concerns: [concern], limit: 500 }).selection.selected as Array<{
            requirement_id: string;
          }>).map((x) => x.requirement_id)
        );
        const consulted = new Set(
          handleConsultSecurityRequirements({ risk_level: level, concerns: [concern] }).requirements.map(
            (r) => r.requirement_id
          )
        );
        const namedIds = new Set(
          vocab.concerns.values.find((c) => String(c.value) === concern)?.also_activates_by_named_rule?.requirement_ids ?? []
        );
        // o que o select traz a mais tem de ser EXACTAMENTE o que as regras nomeadas publicam
        const onlySelect = [...selected].filter((x) => !consulted.has(x) && !namedIds.has(x));
        const onlyConsult = [...consulted].filter((x) => !selected.has(x));
        if (onlySelect.length > 0 || onlyConsult.length > 0)
          offenders.push(
            `${concern}@${level}: só no select ${onlySelect.slice(0, 3).join(",") || "—"} · só no consult ${onlyConsult.slice(0, 3).join(",") || "—"}`
          );
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("as CATEGORIAS que cada superfície diz activar são as mesmas do vocabulário", () => {
    const offenders: string[] = [];
    for (const entry of vocab.concerns.values) {
      const concern = String(entry.value);
      for (const level of LEVELS) {
        const promised = [...entry.activates_categories].sort();
        // categorias realmente presentes no catálogo a este nível (o vocabulário promete
        // a categoria; o nível pode não ter requisitos dela — isso não é discordância)
        const withRequirements = promised.filter((cat) =>
          ontology.requirements.some((r) => r.category === cat && r.applicable_levels?.[level] === true)
        );
        const consulted = [...handleConsultSecurityRequirements({ risk_level: level, concerns: [concern] }).active_categories].sort();
        if (JSON.stringify(withRequirements) !== JSON.stringify(consulted))
          offenders.push(`${concern}@${level}: vocabulário ${withRequirements.join(",") || "—"} · consult ${consulted.join(",") || "—"}`);
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("nenhuma superfície devolve um vazio MUDO para um valor do vocabulário", () => {
    const offenders: string[] = [];
    for (const concern of CONCERNS) {
      for (const level of LEVELS) {
        const consulted = handleConsultSecurityRequirements({ risk_level: level, concerns: [concern] });
        // vazio DECLARADO: ou o concern não resolve (unsupported_concerns), ou resolve e o
        // nível está vazio (empty_at_level). Um vazio sem nenhuma das duas é mudo.
        if (
          consulted.meta.requirementCount === 0 &&
          !consulted.unsupported_concerns &&
          !consulted.empty_at_level
        )
          offenders.push(`consult ${concern}@${level}: 0 requisitos sem declaração (nem unsupported_concerns nem empty_at_level)`);
        // e o rule_trace não pode AFIRMAR o que não é verdade
        const byRisk = consulted.rule_trace.find((t) => t.startsWith("REQUIREMENT_APPLIES_BY_RISK"));
        const atLevel = ontology.requirements.filter((r) => r.applicable_levels?.[level] === true).length;
        if (byRisk !== undefined && !byRisk.includes(`${atLevel} requirements active`))
          offenders.push(`consult ${concern}@${level}: rule_trace afirma "${byRisk}" com ${atLevel} aplicáveis ao nível`);

        const threats = handleGetThreatLandscape({ risk_level: level, concerns: [concern] });
        const total = threats.coverage?.total ?? threats.meta.threatCount;
        const declared =
          Boolean((threats as { unsupported_concerns?: unknown }).unsupported_concerns) ||
          Boolean((threats as { needs_input?: unknown }).needs_input) ||
          Boolean((threats as { empty_at_level?: unknown }).empty_at_level);
        if (total === 0 && !declared) offenders.push(`threats ${concern}@${level}: 0 ameaças sem declaração`);
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("um valor FORA do vocabulário é declarado por todas as superfícies que o aceitam", () => {
    const bogus = "authz";
    const sel = handleSelectRequirements({ risk_level: "L2", concerns: [bogus, "auth"] });
    expect(sel.unknown_concerns?.values, "select não declara o valor desconhecido").toContain(bogus);
    const con = handleConsultSecurityRequirements({ risk_level: "L2", concerns: [bogus] });
    expect(con.unsupported_concerns?.values, "consult não declara o valor por resolver").toContain(bogus);
    const thr = handleGetThreatLandscape({ risk_level: "L2", concerns: [bogus] });
    expect(
      Boolean((thr as { unsupported_concerns?: unknown }).unsupported_concerns) || Boolean((thr as { needs_input?: unknown }).needs_input),
      "threat map não declara o valor por resolver"
    ).toBe(true);
  });
});
