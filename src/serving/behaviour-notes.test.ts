/**
 * 0.20.0-beta.31 — INVARIANTE: uma nota que descreve comportamento não pode divergir da
 * descrição da tool nem do comportamento.
 *
 * A beta.25 gerou o agent-guide e as notas das RESPOSTAS ficaram manuais — «o último texto
 * escrito à mão do sistema». Resultado: o `meta.note` do mapa de ameaças descrevia a
 * ordenação da beta.26 duas versões depois de ela ter mudado, dando o conselho OPOSTO ao
 * correcto, enquanto a descrição dizia a verdade. Esta suite fecha essa porta: a frase vive
 * num sítio (`behaviour-notes.ts`) e tem de aparecer nos DOIS.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { BEHAVIOUR_NOTES, THREAT_ORDERING, SELECT_PAGINATION } from "./behaviour-notes.js";
import { handleGetThreatLandscape } from "../tools/get-threat-landscape.js";
import { handleSelectRequirements } from "../tools/select-requirements.js";

let descriptions: Record<string, string> = {};
let server: ChildProcess | null = null;

beforeAll(async () => {
  server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const pending = new Map<number, (m: { result?: { tools?: Array<{ name: string; description?: string }> } }) => void>();
  let id = 0;
  server.stdout!.on("data", (d: Buffer) => {
    buf += d.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const m = JSON.parse(line);
        pending.get(m.id)?.(m);
      } catch {
        /* parciais */
      }
    }
  });
  const rpc = (method: string, params: unknown) =>
    new Promise<{ result?: { tools?: Array<{ name: string; description?: string }> } }>((res) => {
      const i = ++id;
      pending.set(i, res);
      server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "notes", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const t = await rpc("tools/list", {});
  for (const tool of t.result?.tools ?? []) descriptions[tool.name] = String(tool.description ?? "");
}, 20000);

afterAll(() => server?.kill());

describe("beta.31 — notas de comportamento: uma fonte, dois consumidores", () => {
  it("cada frase publicada aparece na DESCRIÇÃO da sua tool", () => {
    const offenders: string[] = [];
    for (const note of BEHAVIOUR_NOTES) {
      const description = descriptions[note.tool] ?? "";
      if (!description.includes(note.text))
        offenders.push(`${note.id}: a descrição de \`${note.tool}\` não traz a frase publicada`);
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });

  it("cada frase publicada aparece na NOTA da resposta", () => {
    const threat = handleGetThreatLandscape({ risk_level: "L2", concerns: ["auth"] }) as unknown as {
      meta: { note: string };
    };
    expect(threat.meta.note, "a nota do threat não vem da fonte única").toContain(THREAT_ORDERING);
    const select = handleSelectRequirements({ risk_level: "L2", concerns: ["auth"] });
    expect(select.meta.note, "a nota do select não vem da fonte única").toContain(SELECT_PAGINATION);
  });

  it("nenhuma nota conserva a descrição FÓSSIL que a beta.29 substituiu", () => {
    const fossils = [
      /não presumas que as primeiras são as mais relevantes/i,
      /ordenadas por mitigation_confidence e, dentro do mesmo grau, por chapter_id/i
    ];
    const payloads = [
      JSON.stringify(handleGetThreatLandscape({ risk_level: "L2", concerns: ["auth"] })),
      JSON.stringify(handleSelectRequirements({ risk_level: "L2", concerns: ["auth"] }))
    ].join(" ");
    const hits = fossils.filter((re) => re.test(payloads)).map((re) => re.source.slice(0, 40));
    expect(hits, `notas fósseis vivas: ${hits.join("; ")}`).toEqual([]);
  });

  it("a nota descreve o comportamento REAL: a página 1 é do domínio, não da governação", () => {
    const r = handleGetThreatLandscape({ risk_level: "L2", concerns: ["iac"] }) as unknown as {
      threats: Array<{ chapter_id?: string }>;
      meta: { note: string };
    };
    const genericFirst = /^0?[12]-/.test(String(r.threats[0]?.chapter_id ?? ""));
    expect(genericFirst, "a nota promete domínio na página 1 e a resposta abre com governação").toBe(false);
    expect(r.meta.note).toContain("a página 1 É a parte relevante");
  });
});
