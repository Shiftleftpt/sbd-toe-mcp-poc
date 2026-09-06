/**
 * 0.20.0-beta.24 — INVARIANTE: o guia SERVIDO não diverge das fontes de que deriva.
 *
 * Mesma família da invariante next-verbatim (0.19.3): ali, todo o `next` tem de ser
 * executável contra o schema REAL; aqui, tudo o que o guia ENUMERA tem de bater com a
 * fonte que o servidor serve. A regressão que motivou esta suite: o guia publicava
 * 13 concerns rotulados «ontology-controlled vocabulary» que eram, carácter a carácter,
 * o `supported_values` do mapa de ameaças — a lista errada com o nome errado.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import {
  buildAgentGuide,
  readAgentGuideTemplate,
  markersInTemplate,
  GENERATED_BLOCK_IDS,
  MINLEVEL_RETIRED
} from "./agent-guide.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { RESOURCE_CATALOG, PROMPT_CATALOG } from "./server-surface.js";
import { threatConcernSupport } from "../tools/get-threat-landscape.js";
import { handleConsultSecurityRequirements } from "../tools/consult-security-requirements.js";

const guide = buildAgentGuide();
const vocab = buildActivationVocabulary();

let toolNames = new Set<string>();
let server: ChildProcess | null = null;

beforeAll(async () => {
  expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build`").toBe(true);
  server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const pending = new Map<number, (m: { result?: { tools?: { name: string }[] } }) => void>();
  let id = 0;
  server.stdout!.on("data", (d: Buffer) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      try {
        pending.get(JSON.parse(line).id)?.(JSON.parse(line));
      } catch {
        /* linhas parciais */
      }
    }
  });
  const rpc = (method: string, params: unknown) =>
    new Promise<{ result?: { tools?: { name: string }[] } }>((res) => {
      const i = ++id;
      pending.set(i, res);
      server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "guide-invariant", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const t = await rpc("tools/list", {});
  toolNames = new Set((t.result?.tools ?? []).map((x) => x.name));
  expect(toolNames.size).toBeGreaterThan(20);
}, 20000);

afterAll(() => server?.kill());

describe("invariante beta.24 — agent-guide derivado", () => {
  it("todo o marcador tem gerador e todo o gerador tem marcador (nada meio-derivado)", () => {
    const markers = markersInTemplate(readAgentGuideTemplate());
    expect([...markers].sort()).toEqual([...GENERATED_BLOCK_IDS].sort());
  });

  it("o guia servido publica o VOCABULÁRIO (24), não a cobertura do mapa de ameaças (13)", () => {
    const concerns = vocab.concerns.values.map((c) => String(c.value));
    const missing = concerns.filter((c) => !guide.includes(`\`${c}\``));
    expect(missing, `concerns do vocabulário ausentes do guia: ${missing.join(", ")}`).toEqual([]);
    // A regressão específica: o guia seguia a cobertura do MAPA DE AMEAÇAS em vez do
    // vocabulário. Desde 0.20.0-beta.27 as duas coberturas coincidem (a correcção da
    // resolução de concerns no consult tornou os 24 roteáveis), por isso a asserção
    // deixou de poder assumir que há não-roteáveis — mas a protecção sobrevive:
    // SE o mapa voltar a perder concerns, o guia não pode segui-lo.
    const unsupported = threatConcernSupport().unsupported;
    const swallowed = unsupported.filter((c) => !guide.includes(`\`${c}\``));
    expect(
      swallowed,
      `o guia voltou a publicar a cobertura do mapa de ameaças como vocabulário (faltam ${swallowed.join(", ")})`
    ).toEqual([]);
    // e o guia continua a publicar os 24, venha de onde vier a cobertura das ameaças
    expect(concerns.length).toBe(24);
  });

  it("as contagens por nível do guia são as do vocabulário (não folclore)", () => {
    for (const entry of vocab.concerns.values) {
      const at = entry.requirements_at;
      const row = `| \`${String(entry.value)}\` |`;
      const line = guide.split("\n").find((l) => l.startsWith(row));
      expect(line, `sem linha para ${String(entry.value)}`).toBeDefined();
      expect(line, `contagens divergentes para ${String(entry.value)}`).toContain(`${at.L1} / ${at.L2} / ${at.L3}`);
    }
  });

  it("recursos e prompts do guia são os da superfície real (nenhum a mais, nenhum a menos)", () => {
    for (const r of RESOURCE_CATALOG) expect(guide, `recurso ausente do guia: ${r.uri}`).toContain(r.uri);
    for (const p of PROMPT_CATALOG) expect(guide, `prompt ausente do guia: ${String(p["name"])}`).toContain(String(p["name"]));
    // e nenhum sbd:// citado no guia fora do catálogo (contando templates {…})
    const cited = [...guide.matchAll(/`(sbd:\/\/[^`]+)`/g)].map((m) => String(m[1]));
    const known = RESOURCE_CATALOG.map((r) => r.uri);
    const unknown = cited.filter((u) => !known.some((k) => k === u || k.replace(/\{[^}]+\}/, "") === u.replace(/[^/]+$/, "")));
    expect(unknown, `URIs citados no guia fora do catálogo: ${unknown.join(", ")}`).toEqual([]);
  });

  it("toda a tool nomeada no guia existe no servidor real", () => {
    const cited = new Set([...guide.matchAll(/`([a-z_]+)\(/g)].map((m) => String(m[1])));
    const suspect = [...cited].filter((n) => n.includes("sbd_toe") || n.endsWith("_requirements") || n.endsWith("_entities"));
    expect(suspect.length).toBeGreaterThan(5);
    const ghosts = suspect.filter((n) => !toolNames.has(n) && !PROMPT_CATALOG.some((p) => p["name"] === n));
    expect(ghosts, `tools nomeadas no guia que não existem: ${ghosts.join(", ")}`).toEqual([]);
  });

  /**
   * 0.20.0-beta.25 — a teoria do minLevel não volta.
   *
   * Retirada em 0.14.0 (aplicabilidade graduada) e contradita pelas próprias tools
   * (`list_sbd_toe_chapters`: «the binary minLevel theory is retired»;
   * `map_sbd_toe_applicability`: «nothing is excluded by level»), sobreviveu na
   * documentação-mãe: primeiro escrita à mão («Min level» 06→L2/11→L2/13→L3 e «L2 unlocks
   * + chapters 06, 11») e depois, já gerada, numa coluna «Presente desde» que a
   * reintroduzia pela forma.
   */
  it("o guia servido não publica a teoria do minLevel (retirada em 0.14.0)", () => {
    const banned: Array<[RegExp, string]> = [
      [/Min level/i, "coluna «Min level»"],
      [/Presente desde/i, "coluna «Presente desde» (reintroduz a teoria pela forma)"],
      [/unlocks?\b/i, "linguagem de «unlock» de capítulos por nível"],
      [/\+ chapters? \d/i, "«+ chapters NN» — capítulos que só entram a partir de um nível"],
      [/só se aplica a partir de|only applies from/i, "capítulo que «só se aplica a partir de»"]
    ];
    // A frase que ENTERRA a teoria nomeia-a — não pode ser lida como se a publicasse.
    const withoutObituary = guide.split(MINLEVEL_RETIRED).join(" ");
    const hits = banned.filter(([re]) => re.test(withoutObituary)).map(([, label]) => label);
    expect(hits, `teoria do minLevel viva no guia: ${hits.join("; ")}`).toEqual([]);
    // e a afirmação positiva tem de estar lá
    expect(guide).toMatch(/nenhum cap[íi]tulo se exclui por n[íi]vel/i);
  });

  it("o guia não descreve bandas a menos do que a resposta traz", () => {
    expect(guide, "«TWO bands» — são quatro desde 0.15.0/beta.24").not.toMatch(/TWO bands|two-band/i);
    for (const band of ["selected[]", "narrowed_out[]", "excluded_by_level", "out_of_scope_chapters"])
      expect(guide, `banda ausente do guia: ${band}`).toContain(band);
  });

  it("os tamanhos de resposta anunciados são MEDIDOS, não recordados", () => {
    for (const level of ["L1", "L2", "L3"] as const) {
      const measured = Math.round(JSON.stringify(handleConsultSecurityRequirements({ risk_level: level })).length / 1000);
      const row = guide.split("\n").find((l) => l.startsWith(`| \`${level}\` | ≈ `));
      expect(row, `sem linha de tamanho para ${level}`).toBeDefined();
      expect(row, `tamanho anunciado para ${level} diverge do medido (${measured}k)`).toContain(`≈ ${measured}k chars`);
    }
  });

  it("o guia repete as declarações que as próprias tools fazem (search é NÃO-NORMATIVO)", () => {
    expect(guide, "o guia apresenta search_sbd_toe_manual sem a marca que a tool declara").toMatch(
      /search_sbd_toe_manual[\s\S]{0,120}N[ÃA]O-NORMATIVO/i
    );
  });

  it("o guia não promete inferência a partir do texto da tarefa", () => {
    const residues: Array<[RegExp, string]> = [
      [/narrowed by declared task signals/i, "«narrowed by declared task signals»"],
      [/a task refina/i, "«a task refina»"],
      [/when the task mentions/i, "«when the task mentions …» como caminho de recuperação"]
    ];
    const hits = residues.filter(([re]) => re.test(guide)).map(([, label]) => label);
    expect(hits, `resíduos de inferência no guia: ${hits.join("; ")}`).toEqual([]);
  });

  it("o guia é determinístico e não deixa marcadores por expandir", () => {
    expect(buildAgentGuide()).toBe(guide);
    expect(guide).not.toMatch(/<!-- BEGIN GENERATED: [a-z-]+ -->\s*<!-- END GENERATED/);
  });
});
