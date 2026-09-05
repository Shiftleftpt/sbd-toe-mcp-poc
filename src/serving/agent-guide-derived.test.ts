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
  GENERATED_BLOCK_IDS
} from "./agent-guide.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { RESOURCE_CATALOG, PROMPT_CATALOG } from "./server-surface.js";
import { threatConcernSupport } from "../tools/get-threat-landscape.js";

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
    // a regressão específica: os 11 que o mapa de ameaças NÃO resolve têm de estar lá
    const unsupported = threatConcernSupport().unsupported;
    expect(unsupported.length).toBeGreaterThan(0);
    const swallowed = unsupported.filter((c) => !guide.includes(`\`${c}\``));
    expect(
      swallowed,
      `o guia voltou a publicar a cobertura do mapa de ameaças como vocabulário (faltam ${swallowed.join(", ")})`
    ).toEqual([]);
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

  it("o guia é determinístico e não deixa marcadores por expandir", () => {
    expect(buildAgentGuide()).toBe(guide);
    expect(guide).not.toMatch(/<!-- BEGIN GENERATED: [a-z-]+ -->\s*<!-- END GENERATED/);
  });
});
