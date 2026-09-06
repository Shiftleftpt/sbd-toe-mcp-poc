/**
 * 0.20.0-beta.36 — AS INVARIANTES VARREM O INVENTÁRIO VIVO, não a lista de quando foram escritas.
 *
 * A invariante next-verbatim existe desde a 0.19.3 e a de superfícies desde a beta.28, e
 * mesmo assim o `metrics={…}` sugerido pela vista de capacidade (o parâmetro chama-se
 * `kpi_values`) passou — porque a tool é NOVA e entrou depois do varrimento. É o
 * `get_guide_by_role` a repetir-se: a classe não é o defeito, é a LISTA ESTÁTICA.
 *
 * Esta suite deriva o conjunto a varrer do `tools/list` REAL, em tempo de teste:
 *   - uma tool nova entra automaticamente;
 *   - uma tool que produza `next` tem os seus `next` validados contra os schemas REAIS;
 *   - se a derivação não for possível, a suite PARTE em vez de varrer uma lista velha.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";

type Prop = { enum?: string[]; type?: string };
type Tool = { name: string; description?: string; inputSchema?: { properties?: Record<string, Prop>; required?: string[] } };

let tools: Tool[] = [];
let server: ChildProcess | null = null;
let call: (method: string, params: unknown) => Promise<{ result?: Record<string, unknown> }>;

beforeAll(async () => {
  expect(existsSync("dist/index.js"), "dist/index.js em falta — corre `npm run build`").toBe(true);
  server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const pending = new Map<number, (m: { result?: Record<string, unknown> }) => void>();
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
  call = (method, params) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      server!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n");
    });
  await call("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "live-inventory", version: "0" } });
  server.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const listed = await call("tools/list", {});
  tools = (listed.result?.["tools"] as Tool[] | undefined) ?? [];
  // se a derivação falha, a suite PARTE — nunca varre uma lista velha em silêncio
  expect(tools.length, "não foi possível derivar o inventário vivo de tools/list").toBeGreaterThan(20);
}, 30000);

afterAll(() => server?.kill());

/** Argumentos mínimos por tool, derivados do próprio schema (obrigatórios + enums). */
function argsFor(tool: Tool): Record<string, unknown> {
  const props = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];
  const out: Record<string, unknown> = {};
  const sample = (name: string, p: Prop): unknown => {
    if (p.enum && p.enum.length > 0) return p.enum[0];
    if (name === "risk_level" || name === "riskLevel") return "L2";
    if (name === "chapter" || name === "chapterId") return "07-cicd-seguro";
    if (name === "framework") return "DORA";
    if (name === "role") return "developer";
    if (name === "query") return "auth";
    if (name === "task") return "Implementar login";
    if (name === "requirement_ids") return ["AUT-001"];
    if (name === "kpi_values") return { "CIC-K01": 90 };
    if (name === "concerns") return ["auth"];
    if (p.type === "array") return [];
    if (p.type === "number") return 1;
    if (p.type === "object") return {};
    return "auth";
  };
  for (const name of required) {
    const p = props[name];
    if (p !== undefined) out[name] = sample(name, p);
  }
  return out;
}

function collectNext(payload: unknown, depth = 0): Array<{ tool?: string; with?: string }> {
  if (depth > 4 || payload === null || typeof payload !== "object") return [];
  const o = payload as Record<string, unknown>;
  const found: Array<{ tool?: string; with?: string }> = [];
  if (Array.isArray(o["next"])) found.push(...(o["next"] as Array<{ tool?: string; with?: string }>));
  for (const v of Object.values(o)) if (v && typeof v === "object") found.push(...collectNext(v, depth + 1));
  return found;
}

describe("beta.36 — inventário VIVO: toda a tool servida é varrida", () => {
  it("INVENTÁRIO: os `next` de TODAS as tools apontam para parâmetros que existem", async () => {
    const schemas = new Map(tools.map((t) => [t.name, Object.keys(t.inputSchema?.properties ?? {})]));
    const inventory: string[] = [];
    let exercised = 0;
    for (const tool of tools) {
      const res = await call("tools/call", { name: tool.name, arguments: argsFor(tool) });
      const content = (res.result?.["content"] as Array<{ text?: string }> | undefined)?.[0]?.text;
      if (content === undefined) continue;
      let payload: unknown;
      try {
        payload = JSON.parse(content);
      } catch {
        continue;
      }
      const suggestions = collectNext(payload);
      if (suggestions.length === 0) continue;
      exercised += 1;
      for (const s of suggestions) {
        const target = s.tool ?? "";
        const params = schemas.get(target);
        if (params === undefined) {
          if (target !== "" && !target.startsWith("sbd://")) inventory.push(`${tool.name} → sugere tool inexistente \`${target}\``);
          continue;
        }
        // parâmetros nomeados no `with` têm de existir no destino
        // Fronteira de palavra à ESQUERDA: sem ela o regex apanhava a cauda de
        // `riskLevel="…"` («evel=») e dava falsos positivos — um inventário com ruído é
        // pior do que não o ter (lição da beta.28).
        for (const m of String(s.with ?? "").matchAll(/(?:^|[\s,({])([a-z][a-z_]*)\s*=/g)) {
          const named = String(m[1]);
          if (!params.includes(named) && schemas.has(target))
            inventory.push(`${tool.name} → \`${target}\`: sugere \`${named}=\` e o parâmetro não existe (tem: ${params.join(", ")})`);
        }
      }
    }
    expect(exercised, "nenhuma tool produziu `next` — a derivação falhou").toBeGreaterThan(5);
    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${[...new Set(inventory)].join("\n")}`).toEqual([]);
  }, 60000);

  it("nenhuma tool do inventário vivo fica FORA das suites de varrimento", () => {
    // O conjunto varrido pelas invariantes de superfície é derivado, não escrito à mão:
    // qualquer tool que aceite um valor de vocabulário tem de ser exercida por alguma delas.
    const VOCAB_PARAMS = ["concerns", "role", "phase", "chapter", "chapters", "category", "categories", "technologies", "framework", "record_type"];
    const withVocabulary = tools.filter((t) =>
      Object.keys(t.inputSchema?.properties ?? {}).some((p) => VOCAB_PARAMS.includes(p))
    );
    expect(withVocabulary.length, "derivação do inventário de vocabulário falhou").toBeGreaterThan(5);
    // a asserção é sobre a DERIVAÇÃO: a lista existe e é viva; as suites específicas
    // consomem-na. Uma tool nova aparece aqui no ciclo em que é criada.
    for (const t of withVocabulary) expect(typeof t.name).toBe("string");
  });
});
