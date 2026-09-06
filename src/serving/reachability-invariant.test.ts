/**
 * 0.20.0-beta.30 — INVARIANTE DE ALCANÇABILIDADE: três formas de pedir.
 *
 * O contrário de «adivinhar prosa» não é «escolher de uma lista» — é «pedir com precisão».
 * Ao matar a inferência promovemos os `concerns` (um ATALHO) a interface única, e um grafo
 * com dezenas de tipos passou a ser consumido como um menu de 24 botões. Prova: 14 concerns
 * declarados exaustiva e correctamente não chegaram ao cap. 14, e a única porta publicada
 * era `changed_files=["docs/**"]` — declarar um ficheiro que não existe. Num contrato cuja
 * regra é «declara só o que sabes ser verdade», o servidor pediu uma mentira.
 *
 * Três propriedades:
 *   (a) todo o capítulo e toda a categoria são alcançáveis por pelo menos uma das formas —
 *       A (conceito), B (estrutura) ou C (navegação) — e o servidor sabe dizer por quais;
 *   (b) nenhum caminho oferecido pode ser uma declaração FALSA: quando não há atalho
 *       verdadeiro, oferece-se a via ESTRUTURAL, nunca um ficheiro inventado;
 *   (c) o inventário: quem tem atalho, quem só se alcança por estrutura, quem fica de fora.
 */
import { describe, it, expect } from "vitest";
import { runSelection } from "./selection.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { getOntologyData } from "../tools/ontology-loader.js";
import { handleResolveEntities } from "../tools/resolve-entities.js";

const vocab = buildActivationVocabulary();
const ontology = getOntologyData();

const ALL_CHAPTERS = [...new Set(ontology.requirements.map((r) => r.source_bundle).filter((x): x is string => typeof x === "string"))].sort();
const ALL_CATEGORIES = [...new Set(ontology.requirements.map((r) => r.category))].sort();

/** Forma A — existe um atalho de vocabulário que activa isto? */
function reachableByConcept(chapter?: string, category?: string): string[] {
  const ways: string[] = [];
  for (const entry of vocab.concerns.values) {
    const hitsChapter = chapter !== undefined && entry.activates_chapters.includes(chapter);
    const hitsCategory = category !== undefined && entry.activates_categories.includes(category);
    if (hitsChapter || hitsCategory) ways.push(`concerns=["${String(entry.value)}"]`);
  }
  for (const tech of vocab.technologies.values)
    if (chapter !== undefined && tech.activates_chapters.includes(chapter)) ways.push(`technologies=["${String(tech.value)}"]`);
  return ways;
}

/** Forma B — existe uma declaração ESTRUTURAL que o alcança e é verdadeira? */
function reachableByStructure(chapter?: string, category?: string): string[] {
  const ways: string[] = [];
  if (category !== undefined) {
    const found = handleResolveEntities({ record_type: "requirement", filters: { category }, limit: 1 });
    if ((found.total ?? 0) > 0) ways.push(`resolve_entities(record_type="requirement", filters={category:"${category}"})`);
  }
  if (chapter !== undefined) {
    const found = handleResolveEntities({ record_type: "requirement", filters: { source_bundle: chapter }, limit: 1 });
    if ((found.total ?? 0) > 0) ways.push(`resolve_entities(record_type="requirement", filters={source_bundle:"${chapter}"})`);
  }
  // via de SELECÇÃO por estrutura (aberta nesta vaga): `chapters` / `categories`
  try {
    const level = "L3" as const;
    if (chapter !== undefined) {
      const r = runSelection({ risk_level: level, chapters: [chapter] } as Parameters<typeof runSelection>[0]);
      if (!r.needs_input && r.selected.length > 0) ways.push(`select(chapters=["${chapter}"])`);
    }
    if (category !== undefined) {
      const r = runSelection({ risk_level: level, categories: [category] } as Parameters<typeof runSelection>[0]);
      if (!r.needs_input && r.selected.length > 0) ways.push(`select(categories=["${category}"])`);
    }
  } catch {
    /* a via de selecção estrutural pode ainda não existir — é isso que o inventário mostra */
  }
  return ways;
}

describe("beta.30 (a+c) — INVENTÁRIO de alcançabilidade das três formas", () => {
  it("todo o capítulo é alcançável, e o servidor sabe dizer por quê", () => {
    const semAtalho: string[] = [];
    const inalcancavel: string[] = [];
    for (const chapter of ALL_CHAPTERS) {
      const a = reachableByConcept(chapter);
      const b = reachableByStructure(chapter);
      if (a.length === 0 && b.length === 0) inalcancavel.push(chapter);
      else if (a.length === 0) semAtalho.push(`${chapter} → só por ESTRUTURA (${b[0]})`);
    }
    // o inventário é impresso mesmo quando passa: é o produto desta suite
    console.log(`\n[INVENTÁRIO capítulos] ${ALL_CHAPTERS.length} no total · sem atalho A: ${semAtalho.length}`);
    for (const line of semAtalho) console.log("   " + line);
    expect(inalcancavel, `capítulos INALCANÇÁVEIS por qualquer forma: ${inalcancavel.join(", ")}`).toEqual([]);
  });

  it("toda a categoria é alcançável, e o servidor sabe dizer por quê", () => {
    const semAtalho: string[] = [];
    const inalcancavel: string[] = [];
    for (const category of ALL_CATEGORIES) {
      const a = reachableByConcept(undefined, category);
      const b = reachableByStructure(undefined, category);
      if (a.length === 0 && b.length === 0) inalcancavel.push(category);
      else if (a.length === 0) semAtalho.push(`${category} → só por ESTRUTURA`);
    }
    console.log(`\n[INVENTÁRIO categorias] ${ALL_CATEGORIES.length} no total · sem atalho A: ${semAtalho.length}`);
    for (const line of semAtalho) console.log("   " + line);
    expect(inalcancavel, `categorias INALCANÇÁVEIS: ${inalcancavel.join(", ")}`).toEqual([]);
  });
});

describe("beta.30 (b) — nenhum caminho oferecido é uma declaração FALSA", () => {
  it("nenhum `activate_with` oferece SÓ um ficheiro inventado", () => {
    const offenders: string[] = [];
    for (const level of ["L1", "L2", "L3"] as const) {
      for (const concerns of [["auth"], ["logging"], ["validation"]]) {
        const r = runSelection({ risk_level: level, concerns });
        for (const entry of r.out_of_scope_chapters?.chapters ?? []) {
          const hint = entry.activate_with;
          const soFicheiro = /^changed_files=/.test(hint);
          if (soFicheiro)
            offenders.push(
              `${entry.chapter}@${level}: o único caminho oferecido é declarar um ficheiro (${hint}) — pode não existir no repositório de quem pergunta`
            );
          if (/SEM ACTIVADOR PUBLICADO/.test(hint) && !/chapters=|categories=|resolve_entities|trace_sbd_toe_graph/.test(hint))
            offenders.push(`${entry.chapter}@${level}: declara que não há caminho sem oferecer a via estrutural`);
        }
      }
    }
    expect(offenders, `\nINVENTÁRIO (${offenders.length}):\n${offenders.join("\n")}`).toEqual([]);
  });
});
