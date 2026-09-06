/**
 * 0.20.0-beta.28 — INVARIANTES ENTRE SUPERFÍCIES: a CLASSE, não a instância.
 *
 * A classe, nas palavras do avaliador: «uma superfície honra um contrato que outra não
 * honra, e a divergência nunca é auto-declarada». Quatro versões seguidas corrigiram a
 * instância observada e deixaram a seguinte ao lado (inertes: exposure/data_sensitivity →
 * faltou technologies; unsupported_concerns: threat map → faltou consult; concerns
 * harmonizados → faltou exposure/data_sensitivity no consult).
 *
 * O servidor já tinha a disciplina certa aplicada às TABELAS do guia (blocos gerados +
 * suite de igualdade). Esta suite estende-a das tabelas para as RESPOSTAS, e da
 * igualdade-com-a-fonte para a NÃO-CONTRADIÇÃO entre superfícies.
 *
 * As mensagens de falha são o INVENTÁRIO: cada linha é uma instância da classe.
 */
import { describe, it, expect } from "vitest";
import { handleSelectRequirements } from "../tools/select-requirements.js";
import { handleConsultSecurityRequirements } from "../tools/consult-security-requirements.js";
import { handleGetThreatLandscape } from "../tools/get-threat-landscape.js";
import { handleMapSbdToeApplicability } from "../tools/structured-tools.js";
import { buildActivationVocabulary, EXPOSURE_VALUES, SENSITIVITY_VALUES } from "./activation-vocabulary.js";
import { buildAgentGuide } from "./agent-guide.js";

const LEVELS = ["L1", "L2", "L3"] as const;
const vocab = buildActivationVocabulary();
const CONCERNS = vocab.concerns.values.map((c) => String(c.value));
const TECHNOLOGIES = vocab.technologies.values.map((t) => String(t.value));

type Surface = {
  name: string;
  accepts: string[];
  call: (args: Record<string, unknown>) => Record<string, unknown>;
  /** Assinatura observável da resposta: se não mudar, o activador não teve efeito. */
  signature: (r: Record<string, unknown>) => string;
};

const SURFACES: Surface[] = [
  {
    name: "select_sbd_toe_requirements",
    accepts: ["concerns", "exposure", "data_sensitivity", "technologies", "changed_files", "stack"],
    call: (a) => handleSelectRequirements({ ...a, limit: 500 }) as unknown as Record<string, unknown>,
    signature: (r) => {
      const sel = (r["selection"] as { selected?: Array<{ requirement_id: string }> })?.selected ?? [];
      return sel.map((x) => x.requirement_id).sort().join(",");
    }
  },
  {
    name: "consult_security_requirements",
    accepts: ["concerns", "exposure", "data_sensitivity"],
    call: (a) => handleConsultSecurityRequirements(a) as unknown as Record<string, unknown>,
    signature: (r) => {
      const reqs = (r["requirements"] as Array<{ requirement_id: string }>) ?? [];
      return reqs.map((x) => x.requirement_id).sort().join(",");
    }
  },
  {
    name: "get_threat_landscape",
    accepts: ["concerns"],
    call: (a) => handleGetThreatLandscape(a) as unknown as Record<string, unknown>,
    signature: (r) => {
      const t = (r["threats"] as Array<{ id?: string }>) ?? [];
      return t.map((x) => x.id ?? "").sort().join(",");
    }
  },
  {
    name: "map_sbd_toe_applicability",
    accepts: ["technologies"],
    call: (a) => handleMapSbdToeApplicability({ riskLevel: a["risk_level"], ...a }) as unknown as Record<string, unknown>,
    // Assinatura COMPLETA: a primeira versão truncava a 4.000 chars e não via a banda
    // `conditional` que o `technologies` produz — a suite acusava a tool de ignorar um
    // activador que ela honra. Um inventário com falsos positivos é pior que não o ter.
    signature: (r) => JSON.stringify(r["data"] ?? r)
  }
];

/** Bandas onde uma superfície pode DECLARAR que não honrou um activador. */
const DECLARATION_KEYS = [
  "ignored_activators",
  "unsupported_concerns",
  "unknown_concerns",
  "unknown_technologies",
  "empty_at_level",
  "needs_input",
  "inert_declarations",
  "not_implemented_activators"
];

function declaresActivator(response: Record<string, unknown>, activator: string): boolean {
  const scan = (node: unknown, insideDeclaration: boolean, depth = 0): boolean => {
    if (depth > 5 || node === null || node === undefined) return false;
    if (typeof node === "string") return insideDeclaration && node.includes(activator);
    if (Array.isArray(node)) return node.some((x) => scan(x, insideDeclaration, depth + 1));
    if (typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const isDecl = insideDeclaration || DECLARATION_KEYS.includes(key);
        if (isDecl && key.includes(activator)) return true;
        if (scan(value, isDecl, depth + 1)) return true;
      }
    }
    return false;
  };
  return scan(response, false);
}

/** Valores de teste por activador — os que o vocabulário publica como tendo efeito. */
const PROBE_VALUES: Record<string, unknown> = {
  concerns: ["auth"],
  exposure: "public",
  data_sensitivity: "regulated",
  technologies: ["containers"],
  changed_files: ["src/auth/login.ts"],
  stack: "kubernetes"
};

describe("beta.28 (a) — as superfícies concordam sobre o que cada activador activa", () => {
  it("INVENTÁRIO: activador aceite pelo schema tem efeito OU é declarado", () => {
    const inventory: string[] = [];
    for (const surface of SURFACES) {
      for (const activator of surface.accepts) {
        for (const level of LEVELS) {
          const base = { risk_level: level, concerns: ["auth"] };
          const withActivator = { ...base, [activator]: PROBE_VALUES[activator] };
          const reference = activator === "concerns" ? { risk_level: level } : base;
          let before: string;
          let after: Record<string, unknown>;
          try {
            before = surface.signature(surface.call(reference));
            after = surface.call(withActivator);
          } catch {
            continue; // input inválido para esta superfície: não é instância da classe
          }
          const changed = surface.signature(after) !== before;
          if (!changed && !declaresActivator(after, activator))
            inventory.push(
              `${surface.name} @${level}: aceita \`${activator}\` no schema, NÃO altera a resposta e NÃO o declara`
            );
        }
      }
    }
    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${inventory.join("\n")}`).toEqual([]);
  });

  it("INVENTÁRIO: superfícies que implementam o MESMO activador concordam com o vocabulário", () => {
    const inventory: string[] = [];
    for (const entry of vocab.concerns.values) {
      const concern = String(entry.value);
      for (const level of LEVELS) {
        const named = entry.also_activates_by_named_rule?.requirements_at[level] ?? 0;
        const sel = handleSelectRequirements({ risk_level: level, concerns: [concern], limit: 500 }).selection
          .selected.length;
        const con = handleConsultSecurityRequirements({ risk_level: level, concerns: [concern] }).meta
          .requirementCount;
        if (sel !== entry.requirements_at[level] + named)
          inventory.push(`concerns=${concern}@${level}: select ${sel} ≠ vocabulário ${entry.requirements_at[level]}+${named}`);
        if (con !== entry.requirements_at[level])
          inventory.push(`concerns=${concern}@${level}: consult ${con} ≠ vocabulário ${entry.requirements_at[level]}`);
      }
    }
    // exposure / data_sensitivity: o vocabulário publica os concerns que activam
    for (const level of LEVELS) {
      for (const [field, values] of [
        ["exposure", vocab.exposure.values],
        ["data_sensitivity", vocab.data_sensitivity.values]
      ] as const) {
        for (const value of values) {
          if (value.activates_concerns.length === 0) continue;
          const viaActivator = handleSelectRequirements({
            risk_level: level,
            [field]: value.value,
            limit: 500
          } as Parameters<typeof handleSelectRequirements>[0]).selection.selected.length;
          const viaConcerns = handleSelectRequirements({
            risk_level: level,
            concerns: [...value.activates_concerns],
            limit: 500
          }).selection.selected.length;
          if (viaActivator !== viaConcerns)
            inventory.push(
              `${field}=${String(value.value)}@${level}: activador dá ${viaActivator}, os concerns que ele publica dão ${viaConcerns}`
            );
        }
      }
    }
    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${inventory.join("\n")}`).toEqual([]);
  });

  it("INVENTÁRIO: technologies e changed_files — efeito ou declaração, em todas as superfícies que os aceitam", () => {
    const inventory: string[] = [];
    for (const level of LEVELS) {
      for (const tech of TECHNOLOGIES) {
        const r = handleSelectRequirements({ risk_level: level, technologies: [tech], limit: 500 }) as unknown as Record<string, unknown>;
        const sel = ((r["selection"] as { selected?: unknown[] })?.selected ?? []).length;
        const needs = Boolean(r["needs_input"]);
        if (sel === 0 && !needs) inventory.push(`select technologies=[${tech}]@${level}: 0 requisitos sem needs_input`);
      }
      for (const pattern of vocab.changed_files.patterns) {
        const sample = pattern.pattern.split(" / ")[0]!.replace("**", "x").replace("*", "x").trim();
        const r = handleSelectRequirements({ risk_level: level, changed_files: [sample], limit: 500 }) as unknown as Record<string, unknown>;
        const sel = ((r["selection"] as { selected?: unknown[] })?.selected ?? []).length;
        if (sel === 0 && !r["needs_input"]) inventory.push(`select changed_files=[${sample}]@${level}: 0 sem needs_input`);
      }
    }
    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${inventory.join("\n")}`).toEqual([]);
  });
});

describe("beta.28 (b) — dois blocos GERADOS não afirmam coisas incompatíveis sobre a mesma tool", () => {
  it("INVENTÁRIO: contradições entre blocos GENERATED do agent-guide", () => {
    const guide = buildAgentGuide();
    const blocks = [...guide.matchAll(/<!-- BEGIN GENERATED: ([a-z-]+) -->([\s\S]*?)<!-- END GENERATED: \1 -->/g)].map(
      (m) => ({ id: String(m[1]), body: String(m[2]) })
    );
    expect(blocks.length, "sem blocos gerados — o guia deixou de ser derivado").toBeGreaterThan(4);
    const tools = [
      "get_threat_landscape",
      "consult_security_requirements",
      "select_sbd_toe_requirements",
      "search_sbd_toe_manual"
    ];
    const inventory: string[] = [];
    for (const tool of tools) {
      const mentioning = blocks.filter((b) => b.body.includes(tool));
      if (mentioning.length < 2) continue;
      // afirmação de cobertura TOTAL vs de SUBCONJUNTO sobre a mesma tool
      const claimsFull = mentioning.filter((b) => {
        const line = b.body.split("\n").find((l) => l.includes(tool)) ?? "";
        const m = /(\d+)\s+de\s+(\d+)/.exec(line);
        return m !== null && m[1] === m[2];
      });
      // A afirmação de subconjunto tem de ser SOBRE esta tool: o nome e a palavra na
      // MESMA frase. Sem isto, uma caixa que diz «o threat map resolve um SUBCONJUNTO —
      // usa select_sbd_toe_requirements» acusava também o `select`.
      const claimsSubset = mentioning.filter((b) =>
        b.body
          .split(/(?<=\.)\s|\n\n/)
          .some((sentence) => sentence.includes(tool) && /SUBCONJUNTO|subconjunto|subset/.test(sentence))
      );
      if (claimsFull.length > 0 && claimsSubset.length > 0)
        inventory.push(
          `${tool}: bloco «${claimsFull[0]!.id}» afirma cobertura TOTAL e bloco «${claimsSubset[0]!.id}» afirma SUBCONJUNTO`
        );
    }
    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${inventory.join("\n")}`).toEqual([]);
  });
});

describe("beta.28 (c) — activador aceite pelo schema produz activação ou banda de declaração", () => {
  it("INVENTÁRIO: o par (superfície × activador) que não faz nem uma coisa nem outra", () => {
    const inventory: string[] = [];
    for (const surface of SURFACES) {
      for (const activator of surface.accepts) {
        const base = { risk_level: "L2" as const, concerns: ["auth"] };
        let ref: string;
        let out: Record<string, unknown>;
        try {
          ref = surface.signature(surface.call(activator === "concerns" ? { risk_level: "L2" } : base));
          out = surface.call({ ...base, [activator]: PROBE_VALUES[activator] });
        } catch {
          continue;
        }
        const activated = surface.signature(out) !== ref;
        const declared = declaresActivator(out, activator);
        if (!activated && !declared)
          inventory.push(`${surface.name} × ${activator}: aceite, inerte e mudo — o contrato aceita o que não usa`);
      }
    }
    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${inventory.join("\n")}`).toEqual([]);
  });
});
