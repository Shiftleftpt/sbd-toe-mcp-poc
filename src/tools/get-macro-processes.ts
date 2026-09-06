/**
 * get_sbd_toe_macro_processes — a vista PROCESSUAL (MP1–MP5).
 *
 * 0.20.0-beta.37. O Eixo I dava ao GR-03 — «organização sem programa de segurança
 * aplicacional: por onde começamos e com que sequência?» — NÃO SERVIDO, porque a peça
 * central (a sequência/programa) só existia como PROSA. O ciclo dos macro-processos passou-a
 * a dados: `semantic/macro_processes.jsonl` + `mp_edges.jsonl`. Esta tool é a última perna.
 *
 * Invariantes que esta superfície respeita, e que não se negoceiam:
 *  1. **Declarativo, não enumerado.** Activa-se por ser CHAMADA — o consumidor declara a
 *     leitura que quer. Não há detecção lexical de «programa» em prosa nenhuma.
 *  2. **Ordem = só `dependency`.** As arestas `feedback` NUNCA entram na ordem: se
 *     entrassem, os cinco MP ciclariam. Vêm servidas à parte e marcadas como tal.
 *  3. **MP ↔ fase do SDLC é LACUNA DECLARADA** — travessia parcial e não publicada. Não se
 *     deriva de capítulos nem de assignments; declara-se, verbatim, o que a fonte diz.
 *  4. **Três segmentações sem contenção.** MacroProcess, capítulo e fase são agregações
 *     paralelas do mesmo substrato. `traverses_bundles` é PERCURSO publicado, nunca contenção.
 *  5. **Não existe entidade «programa»** — e é deliberado. A tool serve os cinco MP e a
 *     ordem publicada; não inventa um agregador que a curadoria recusou.
 */
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import type { Affordance } from "../serving/protocol-envelope.js";

type Rec = Record<string, unknown>;
let cache: { header: Rec; items: Rec[]; edgeHeader: Rec; edges: Rec[] } | undefined;

function load(): typeof cache {
  if (cache !== undefined) return cache;
  const read = (rel: string): Rec[] => {
    try {
      return readFileSync(resolveAppPath(rel), "utf-8")
        .split("\n")
        .filter((l: string) => l.trim().length > 0)
        .map((l: string) => JSON.parse(l) as Rec);
    } catch {
      return [];
    }
  };
  const mp = read("data/publish/semantic/macro_processes.jsonl");
  const ed = read("data/publish/semantic/mp_edges.jsonl");
  if (mp.length === 0 || ed.length === 0) return undefined;
  // ambos abrem com um registo de CABEÇALHO auto-descritivo — conta a partir do 2.º
  cache = { header: mp[0]!, items: mp.slice(1), edgeHeader: ed[0]!, edges: ed.slice(1) };
  return cache;
}

const str = (r: Rec, k: string): string | undefined => (typeof r[k] === "string" ? (r[k] as string) : undefined);

export interface MacroProcessResult {
  provenance: { kg: string; server: string; content_type: string; produced_by: string; source_data: string; note: string };
  reading: { id: "PROGRAMA"; note: string };
  [key: string]: unknown;
  next?: Affordance[];
}

export function handleGetMacroProcesses(args: Record<string, unknown>): MacroProcessResult {
  const data = load();
  const provenance = {
    kg: servedKgReleaseTag(),
    server: servingServerVersion(),
    content_type: "canonical",
    produced_by: "macro_process_projection",
    source_data: "data/publish/semantic/macro_processes.jsonl + mp_edges.jsonl",
    note:
      "Macro-processos publicados pelo Manual (ontologia v2.5 × Manual v1.8.1). A ORDEM é a que a fonte " +
      "publica em `adoption_order_levels` — não é calculada aqui, e não se infere de capítulos nem de fases."
  };
  const reading = {
    id: "PROGRAMA" as const,
    note:
      "Leitura PROGRAMA — «por onde começamos e com que sequência». É a vista PROCESSUAL: os cinco " +
      "macro-processos e a ordem de adopção publicada. NÃO é a leitura GUIDE (que requisitos se aplicam a " +
      "uma tarefa) nem a IMPL (a capacidade de um capítulo): pedir o programa e receber 273 requisitos, ou " +
      "um capítulo isolado, seria responder a outra pergunta."
  };

  if (data === undefined) {
    return {
      provenance,
      reading,
      status: "not_published",
      note:
        "Este bundle não publica a vista processual (`semantic/macro_processes.jsonl`). Não é ausência de " +
        "programa — é ausência do artefacto nesta build. Declarado, não silencioso."
    };
  }

  const { header, items, edgeHeader, edges } = data;
  const mpId = typeof args["mp_id"] === "string" ? (args["mp_id"] as string) : undefined;

  // ── um macro-processo em detalhe
  if (mpId !== undefined) {
    const mp = items.find((m) => str(m, "mp_id") === mpId);
    if (mp === undefined)
      return {
        provenance,
        reading,
        status: "unknown_macro_process",
        requested: mpId,
        known: items.map((m) => str(m, "mp_id")).filter(Boolean),
        note: `\`${mpId}\` não é um macro-processo publicado. Os cinco ids vêm acima.`
      };
    const consumes = edges.filter((e) => str(e, "to_mp") === mpId);
    return {
      provenance,
      reading,
      macro_process: mp,
      prerequisites: {
        note: "Só arestas `dependency` — o que TEM de existir antes deste MP. As `feedback` estão à parte e não são pré-requisito.",
        values: consumes.filter((e) => str(e, "kind") === "dependency")
      },
      feedback_received: {
        note:
          "REALIMENTAÇÃO, não pré-requisito: fecha o laço depois de o MP correr. Se entrasse na ordem, os " +
          "cinco macro-processos ciclariam — por isso está fora dela, por definição da fonte.",
        values: consumes.filter((e) => str(e, "kind") === "feedback")
      },
      traversal_note: str(header, "model_note") ?? str(edgeHeader, "model_note"),
      next: [
        { intent: "A ordem de adopção completa", tool: "get_sbd_toe_macro_processes", with: "", kind: "structural" as const },
        {
          intent: "Os requisitos de um capítulo que este MP atravessa",
          tool: "select_sbd_toe_requirements",
          with: `risk_level="L2", chapters=["${(mp["traverses_bundles"] as string[] | undefined)?.[1] ?? "01-classificacao-aplicacoes"}"]`,
          kind: "structural" as const
        }
      ]
    };
  }

  // ── a vista de PROGRAMA: ordem publicada + os cinco MP + os limites declarados
  const levels = (edgeHeader["adoption_order_levels"] ?? header["adoption_order_levels"]) as string[][] | undefined;
  const dependencies = edges.filter((e) => str(e, "kind") === "dependency");
  const feedback = edges.filter((e) => str(e, "kind") === "feedback");
  const pathEdges = edges.filter((e) => ["fluxo", "piso", "ramo", "fecho", "laço"].includes(str(e, "kind") ?? ""));
  const roles = [...new Set(items.flatMap((m) => [str(m, "owner_role"), ...((m["participant_roles"] as string[] | undefined) ?? [])]))]
    .filter((x): x is string => typeof x === "string")
    .sort();

  return {
    provenance,
    reading,
    adoption_order: {
      note:
        "A ordem PUBLICADA pela fonte, por níveis: dentro do mesmo nível os MP são incomparáveis (declarado, " +
        "não inferido). Deriva EXCLUSIVAMENTE das arestas `dependency`.",
      rule: str(edgeHeader, "adoption_order_rule") ?? str(header, "adoption_order_rule"),
      levels: levels ?? [],
      first_step: (levels ?? [])[0]?.[0],
      excluded_from_order: {
        kind: "feedback",
        count: feedback.length,
        note:
          "As arestas de REALIMENTAÇÃO estão fora da ordem por definição da fonte: incluí-las tornaria o grafo " +
          "cíclico e os cinco MP deixariam de ter sequência. Vêm servidas, mas nunca como pré-requisito."
      }
    },
    macro_processes: items.map((m) => ({
      mp_id: str(m, "mp_id"),
      label: str(m, "label") ?? str(m, "name_pt"),
      question: str(m, "question"),
      continuity: str(m, "continuity"),
      invariant: str(m, "invariant"),
      owner_role: str(m, "owner_role"),
      participant_roles: m["participant_roles"] ?? [],
      traverses_bundles: m["traverses_bundles"] ?? [],
      read_with: `get_sbd_toe_macro_processes(mp_id="${str(m, "mp_id") ?? ""}")`
    })),
    prerequisites: {
      note: "O que é pré-requisito de quê — pares `dependency`, com o artefacto consumido (`via`) e as refs.",
      total: dependencies.length,
      values: dependencies.map((e) => ({
        from_mp: str(e, "from_mp"),
        to_mp: str(e, "to_mp"),
        via: str(e, "via"),
        output: str(e, "output_text"),
        refs: e["refs"] ?? []
      }))
    },
    feedback_loops: {
      note: "Realimentações — fecham o laço, NÃO entram na ordem de adopção.",
      total: feedback.length,
      values: feedback.map((e) => ({ from_mp: str(e, "from_mp"), to_mp: str(e, "to_mp"), via: str(e, "via") }))
    },
    chapter_path: {
      note:
        "Percurso de CAPÍTULOS publicado (fluxo · piso · ramo · fecho · laço). É percurso, NUNCA contenção: " +
        "MacroProcess, capítulo e fase são três segmentações paralelas do mesmo substrato.",
      total: pathEdges.length
    },
    roles_involved: {
      note: "Papéis que os MP nomeiam, resolvidos contra os canónicos do bundle. Para o que cada um faz, `get_guide_by_role`.",
      values: roles
    },
    declared_limits: {
      no_programme_entity:
        "NÃO existe entidade «programa» no modelo, e é deliberado (recusa de curadoria, ratificada). O que se " +
        "publica são os cinco macro-processos e a ordem entre eles. Um «programa» é o que a TUA organização " +
        "monta com isto — o servidor não o modela e não o inventa.",
      sdlc_phase_traversal:
        str(edgeHeader, "sdlc_phase_traversal") ??
        (edgeHeader["sdlc_phase_traversal"] as Rec | undefined)?.["reason"] ??
        "A travessia MP ↔ fase do SDLC é PARCIAL e NÃO PUBLICADA — lacuna declarada, nunca derivada.",
      three_segmentations: str(edgeHeader, "model_note") ?? str(header, "model_note")
    },
    next: [
      {
        intent: "O primeiro passo real: o método de classificação (cap. 01)",
        tool: "select_sbd_toe_requirements",
        with: 'risk_level="L1", chapters=["01-classificacao-aplicacoes"]',
        kind: "structural" as const
      },
      { intent: "Um macro-processo em detalhe", tool: "get_sbd_toe_macro_processes", with: 'mp_id="MP-01"', kind: "structural" as const },
      { intent: "O que cada papel faz", tool: "get_guide_by_role", with: 'risk_level="L2", role="appsec-engineer"', kind: "structural" as const }
    ]
  };
}
