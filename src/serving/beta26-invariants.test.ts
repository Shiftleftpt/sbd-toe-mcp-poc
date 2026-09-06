/**
 * 0.20.0-beta.26 — INVARIANTES de economia e auditoria.
 *
 * Três dos itens desta vaga pedem PROPRIEDADE testada, não cenário (a família da
 * conservação e da next-verbatim): a ordenação dos evidence_patterns por PERTENÇA ao
 * âmbito, o traço multi-activador, e os denominadores nomeados. Junta-se a reconstrução
 * da dieta do `select`, que é a promessa que a torna aceitável.
 */
import { describe, it, expect } from "vitest";
import { runSelection } from "./selection.js";
import { handleSelectRequirements } from "../tools/select-requirements.js";
import { handlePrepareCodegenContext } from "../tools/prepare-codegen-context.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";
import { getOntologyData } from "../tools/ontology-loader.js";

const LEVELS = ["L1", "L2", "L3"] as const;
const ontology = getOntologyData();

describe("beta.26 — evidence_patterns por PERTENÇA ao âmbito", () => {
  it("nenhum EP fora do âmbito aparece enquanto houver EPs do âmbito por mostrar", () => {
    const offenders: string[] = [];
    const cases: Array<{ task: string; concerns: string[] }> = [
      { task: "Validar payload de entrada no endpoint", concerns: ["validation"] },
      { task: "Exigir reautenticação em operações sensíveis", concerns: ["auth"] },
      { task: "Registar eventos de auditoria da aplicação", concerns: ["logging"] },
      { task: "Endurecer a configuração de infraestrutura como código", concerns: ["iac"] }
    ];
    for (const { task, concerns } of cases) {
      for (const detail of ["minimal", "standard", "full"] as const) {
        const r = handlePrepareCodegenContext({ task, risk_level: "L2", concerns, detail });
        if (r.status !== "ready_for_codegen") continue;
        const scope = new Set(
          ((r as { activated_scope?: { requirements?: Array<{ requirement_id?: string }> } }).activated_scope?.requirements ?? [])
            .map((x) => x.requirement_id)
            .filter((x): x is string => typeof x === "string")
        );
        const eps = ((r as { g2_context?: { evidence_patterns?: Array<{ id?: string; maps_to_requirement_id?: string }> } }).g2_context
          ?.evidence_patterns ?? []);
        if (eps.length === 0) continue;
        const inScope = (e: { maps_to_requirement_id?: string }) =>
          typeof e.maps_to_requirement_id === "string" && scope.has(e.maps_to_requirement_id);
        // pertença é MONÓTONA: nenhum de fora antes de um de dentro
        const firstOut = eps.findIndex((e) => !inScope(e));
        const lastIn = eps.map(inScope).lastIndexOf(true);
        if (firstOut >= 0 && lastIn > firstOut)
          offenders.push(
            `${concerns.join("+")}@${detail}: EP fora do âmbito (${eps[firstOut]?.id}) antes de um do âmbito (${eps[lastIn]?.id})`
          );
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("beta.26 — traço multi-activador", () => {
  it("um capítulo activado por duas declarações regista AS DUAS", () => {
    const r = runSelection({ risk_level: "L2", concerns: ["iac"], technologies: ["containers"] });
    const ch = r.activated_chapters.find((c) => c.chapter === "08-iac-infraestrutura");
    expect(ch, "cap. 08 não activado — fixture mudou").toBeDefined();
    const sources = (ch?.activated_by ?? []).map((a) => `${a.source}:${a.trigger}`).sort();
    expect(sources).toContain("concern:iac");
    expect(sources).toContain("technology:containers");
  });

  it("propriedade: todo activador que sozinho activa um capítulo aparece no traço quando declarado em conjunto", () => {
    const offenders: string[] = [];
    const vocab = buildActivationVocabulary();
    for (const tech of vocab.technologies.values) {
      for (const concern of vocab.concerns.values) {
        const shared = tech.activates_chapters.filter((c) => concern.activates_chapters.includes(c));
        if (shared.length === 0) continue;
        const r = runSelection({
          risk_level: "L2",
          concerns: [String(concern.value)],
          technologies: [String(tech.value)]
        });
        for (const chapter of shared) {
          const entry = r.activated_chapters.find((c) => c.chapter === chapter);
          const seen = (entry?.activated_by ?? []).map((a) => `${a.source}:${a.trigger}`);
          if (!seen.includes(`concern:${String(concern.value)}`) || !seen.includes(`technology:${String(tech.value)}`))
            offenders.push(`${chapter}: declarados concern=${String(concern.value)} + technology=${String(tech.value)}, traço só ${seen.join(",")}`);
        }
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("beta.26 — denominadores nomeados e definidos", () => {
  it("as desigualdades fecham e `meta.eligible` é o denominador que diz ser", () => {
    const offenders: string[] = [];
    for (const level of LEVELS) {
      for (const concerns of [["auth"], ["auth", "iac", "build"], ["logging"]]) {
        const out = handleSelectRequirements({ risk_level: level, concerns, limit: 500 });
        const d = out.denominators;
        const atLevel = ontology.requirements.filter((r) => r.applicable_levels?.[level] === true).length;
        const base = ontology.requirements.filter((r) => r.type === "base" && r.applicable_levels?.[level] === true).length;
        if (d.baseline_at_level.value !== base) offenders.push(`${level}: baseline ${d.baseline_at_level.value} ≠ ${base}`);
        if (d.catalogue_at_level.value !== atLevel) offenders.push(`${level}: catálogo ao nível ${d.catalogue_at_level.value} ≠ ${atLevel}`);
        if (d.catalogue_total.value !== ontology.requirements.length) offenders.push(`${level}: total ${d.catalogue_total.value}`);
        if (!(d.baseline_at_level.value <= d.activated_at_level.value)) offenders.push(`${level} ${concerns}: baseline > activado`);
        if (!(d.activated_at_level.value <= d.catalogue_at_level.value)) offenders.push(`${level} ${concerns}: activado > catálogo do nível`);
        if (!(d.catalogue_at_level.value <= d.catalogue_total.value)) offenders.push(`${level}: catálogo do nível > total`);
        if (out.meta.eligible !== d.activated_at_level.value)
          offenders.push(`${level} ${concerns}: meta.eligible ${out.meta.eligible} ≠ activated_at_level ${d.activated_at_level.value}`);
        if (out.meta.eligible_denominator !== "activated_at_level") offenders.push(`${level}: denominador não nomeado`);
        for (const [name, entry] of Object.entries(d)) {
          if (name === "note") continue;
          const def = (entry as { definition?: string }).definition;
          if (typeof def !== "string" || def.length < 40) offenders.push(`${level}: denominador ${name} sem definição`);
        }
      }
    }
    expect(offenders, `\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("beta.26 — a dieta do select não perde nada", () => {
  it("legenda + refs reconstroem o selection_trace clássico, byte a byte", () => {
    const args = { risk_level: "L3", concerns: ["auth", "iac", "build", "deployment", "logging", "validation"], limit: 500 };
    const full = handleSelectRequirements(args);
    for (const detail of ["standard", "minimal"] as const) {
      const dieted = handleSelectRequirements({ ...args, detail });
      const legend = new Map((dieted.selection_trace_legend ?? []).map((e) => [e.ref, e]));
      expect(legend.size, `${detail}: sem legenda`).toBeGreaterThan(0);
      const rebuilt = (dieted.selection.selected as Array<{ requirement_id: string; trace: string[] }>).map((row) => ({
        requirement_id: row.requirement_id,
        selection_trace: row.trace.map((ref) => {
          const { ref: _drop, ...entry } = legend.get(ref) as Record<string, unknown> & { ref: string };
          return entry;
        })
      }));
      const original = (full.selection.selected as Array<{ requirement_id: string; selection_trace: unknown[] }>).map((x) => ({
        requirement_id: x.requirement_id,
        selection_trace: x.selection_trace
      }));
      expect(JSON.stringify(rebuilt), `${detail}: reconstrução divergente`).toBe(JSON.stringify(original));
    }
  });

  it("`full` continua byte-idêntico ao comportamento anterior (default inalterado)", () => {
    const args = { risk_level: "L2", concerns: ["auth"] };
    expect(JSON.stringify(handleSelectRequirements(args))).toBe(JSON.stringify(handleSelectRequirements({ ...args, detail: "full" })));
  });
});
