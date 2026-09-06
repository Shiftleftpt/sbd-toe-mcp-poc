/**
 * 0.20.0-beta.21 («declarativo primeiro»): ESTE ficheiro mede CODIFICAÇÃO (dieta v2),
 * não selecção. Para a série de medições continuar comparável byte a byte, as fixtures
 * correm no caminho inferencial histórico — `selection_mode: "discover"` — injectado
 * em `handlePrepareCodegenContext` pelo wrapper abaixo. A selecção declarativa tem os
 * seus próprios testes (selection.declarative.test.ts + next-invariant.beta).
 */
/**
 * s3 — Caps, boilerplate e o "how" publicado (epic v2-token-diet).
 *
 * Gates do slice (EPIC §s3 + instruções do guardian):
 *   - cap evidence_patterns 25→10 em `standard` (desde o s3b REVISTO — ADENDA
 *     2026-07-05 do operador, sem top-N — o `minimal` diverge para cap 5 com o
 *     MESMO mecanismo; ver prepare-codegen-context.minimal.test.ts), com padrão
 *     boundList nunca-silencioso: `completeness_report` reporta
 *     total/returned/capped (omitted+returned == total) e, quando algo foi
 *     cortado, `evidence_patterns_rest` diz COMO obter o resto — referência
 *     EXECUTÁVEL (mesma tool, detail="full"), testada por execução real;
 *   - ordenação do corte DETERMINÍSTICA (relevance desc, id asc — a ordem que
 *     o core já emite; o dieted é o PREFIXO do top-25 clássico) e estável
 *     (2 chamadas ⇒ byte-igual);
 *   - `llm_codegen_instructions` + `security_rationale_template` →
 *     resource MCP `sbd://toe/codegen-instructions/{mode}`: o conteúdo do
 *     resource, montado pelas regras embutidas (slots filtrados por
 *     active_conditions; task = input_echo.task.trim()), é BYTE-IGUAL ao
 *     conteúdo inline de `detail=full` — para os 3 modes e com/sem risk_level;
 *   - `activation_trace` só com `debug: true` em standard/minimal; quando
 *     elidido fica contador exato (activation_trace_ref.entries);
 *   - QUALIDADE (o "how"): `description` VERBATIM do bundle publicado
 *     (data/publish/runtime/requirements.json e controls.json, byte-igual,
 *     nunca parafraseada) nos requirements do activated_scope e nos controls
 *     `direct`;
 *   - invariante 3 × cap: os evidence patterns NÃO têm ids no citation_map
 *     (verificado) — o corte não toca no conjunto citável;
 *   - derivação `category` = prefixo do requirement_id: invariante verificado
 *     em TODO o bundle publicado (se um dia falhar, o campo sobrevive inline —
 *     guarda sem perda testada indiretamente pela reconstrução no detail.test).
 */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildCodegenInstructionsResourceContent,
  codegenInstructionsResourceUri,
  CODEGEN_INSTRUCTION_MODES,
  handlePrepareCodegenContext,
  type CodegenMode,
  type InstructionCondition,
  type PrepareCodegenContextInput,
  type PrepareCodegenContextResult,
  type PrepareCodegenContextResultReady,
  type PrepareCodegenContextResultReadyDieted
} from "./prepare-codegen-context.js";
import { getOntologyData } from "./ontology-loader.js";
import { requirementCategoryOf } from "../serving/requirement-id.js";
import { resolveAppPath } from "../config.js";
import { clearG2RuntimeCacheForTests } from "./g2-runtime-loader.js";
import { clearRegulatoryOverlayCacheForTests } from "./regulatory-overlay-loader.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __prepareRaw = handlePrepareCodegenContext;
const handlePrepareCodegenContextDiscover = (input: Parameters<typeof __prepareRaw>[0]) =>
  __prepareRaw({ selection_mode: "discover", ...input });


// ---------------------------------------------------------------------------
// Fixtures — byte-identical to EPIC.md §Fixtures baseline (como budget/detail).
// ---------------------------------------------------------------------------

interface BaselineFixture {
  name: "fixture1" | "fixture2";
  label: string;
  input: PrepareCodegenContextInput;
}

const FIXTURES: readonly BaselineFixture[] = [
  {
    name: "fixture1",
    label: "baseline 1 — auth+validation endpoint (típica)",
    input: {
      task: "Adicionar validação de payload e autenticação ao endpoint POST /users/:id/email",
      risk_level: "L2",
      mode: "codegen"
    }
  },
  {
    name: "fixture2",
    label: "baseline 2 — secure upload endpoint (3 famílias)",
    input: {
      task: "Implement a secure endpoint for uploading documents with logging",
      risk_level: "L2",
      mode: "codegen"
    }
  }
];

const DIET_LEVELS = ["standard", "minimal"] as const;

/** Cap de evidence por nível dieted (s3: standard 10; s3b revisto: minimal 5). */
const EXPECTED_CAP: Record<(typeof DIET_LEVELS)[number], number> = {
  standard: 10,
  minimal: 5
};

// ---------------------------------------------------------------------------
// Bundle publicado — lido DIRETAMENTE dos JSON (prova verbatim byte-igual).
// ---------------------------------------------------------------------------

function loadBundleItems(relPath: string): Array<Record<string, unknown>> {
  const parsed = JSON.parse(readFileSync(resolveAppPath(relPath), "utf-8")) as
    | Array<Record<string, unknown>>
    | { items?: Array<Record<string, unknown>> };
  return Array.isArray(parsed) ? parsed : (parsed.items ?? []);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expectReadyFull(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReady {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citation_map");
}

function expectReadyDieted(
  result: PrepareCodegenContextResult
): asserts result is PrepareCodegenContextResultReadyDieted {
  expect(result.status).toBe("ready_for_codegen");
  expect(result).toHaveProperty("citations");
  expect(result).not.toHaveProperty("citation_map");
}

/** Reconstrói o llm_codegen_instructions inline a partir do RESOURCE + as
 * active_conditions do payload (a regra embutida no resource). */
function assembleInstructions(
  mode: CodegenMode,
  activeConditions: readonly InstructionCondition[]
): string[] {
  const resource = buildCodegenInstructionsResourceContent(mode);
  const active = new Set(activeConditions);
  return resource.llm_codegen_instructions.slots
    .filter((slot) => slot.when === "always" || active.has(slot.when))
    .map((slot) => slot.text);
}

/** Reconstrói o security_rationale_template inline a partir do RESOURCE
 * (task = input_echo.task.trim(), regra embutida no resource). */
function assembleTemplate(mode: CodegenMode, echoedTask: string): unknown {
  const resource = buildCodegenInstructionsResourceContent(mode);
  return { ...resource.security_rationale_template.template, task: echoedTask.trim() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("prepare_sbd_toe_codegen_context — caps + resource + description (v2-token-diet s3)", () => {
  beforeAll(() => {
    clearG2RuntimeCacheForTests();
    clearRegulatoryOverlayCacheForTests();
  });

  // -------------------------------------------------------------------------
  // Cap 25→10 (boundList nunca-silencioso + referência executável)
  // -------------------------------------------------------------------------

  describe.each(FIXTURES)("$label — cap de evidence_patterns", (fixture) => {
    it.each([...DIET_LEVELS])(
      "%s: cap por nível (standard 10 / minimal 5 — s3b revisto), omitted+returned == total, prefixo determinístico do top-25 clássico",
      (detail) => {
        const full = handlePrepareCodegenContextDiscover(fixture.input);
        expectReadyFull(full);
        const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
        expectReadyDieted(dieted);

        const report = dieted.completeness_report;
        // sentinelas do budget.test: s3CapsLanded (standard, cap ≤ 10) e
        // s3bMinimalLanded (minimal, cap ≤ 5 — ADENDA s3b 2026-07-05).
        expect(report.evidence_pattern_cap).toBe(EXPECTED_CAP[detail]);
        expect(dieted.g2_context.evidence_patterns.length).toBe(
          report.evidence_patterns_returned
        );
        // boundList: omitted + returned == total, sem corte silencioso.
        expect(report.evidence_patterns_returned + report.evidence_patterns_capped).toBe(
          report.evidence_patterns_total
        );
        // total é o MESMO universo do full (o cap muda o returned, não o total).
        expect(report.evidence_patterns_total).toBe(
          full.completeness_report.evidence_patterns_total
        );

        // Corte determinístico documentado: prefixo do top-25 clássico (que o
        // core já ordena por relevance_score desc, id asc), sem os campos
        // derivável-elididos (source, relevance_score).
        const expected = full.g2_context.evidence_patterns
          .slice(0, EXPECTED_CAP[detail])
          .map(({ source: _s, relevance_score: _r, ...rest }) => rest);
        expect(JSON.stringify(dieted.g2_context.evidence_patterns)).toBe(
          JSON.stringify(expected)
        );
        // A ordem do full é de facto (score desc, id asc) — auditável.
        const scores = full.g2_context.evidence_patterns.map((p) => p.relevance_score);
        for (let i = 1; i < scores.length; i++) {
          const prev = full.g2_context.evidence_patterns[i - 1]!;
          const curr = full.g2_context.evidence_patterns[i]!;
          expect(
            prev.relevance_score > curr.relevance_score ||
              (prev.relevance_score === curr.relevance_score && prev.id < curr.id)
          ).toBe(true);
        }
      }
    );

    it("ordenação do corte estável: 2 chamadas idênticas ⇒ byte-igual", () => {
      clearG2RuntimeCacheForTests();
      clearRegulatoryOverlayCacheForTests();
      const first = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
      const second = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });

    it("a referência para obter o resto é EXECUTÁVEL: detail='full' devolve o top-25 clássico de que o dieted é prefixo", () => {
      const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      const rest = dieted.completeness_report.evidence_patterns_rest;
      expect(rest).toBeDefined(); // ambas as fixtures cortam (>10 matched)
      expect(rest!.tool).toBe("prepare_sbd_toe_codegen_context");
      expect(rest!.with).toEqual({ detail: "full" });

      // EXECUTA a referência de verdade: mesmo input, detail='full'.
      const followUp = handlePrepareCodegenContextDiscover({
        ...fixture.input,
        detail: rest!.with.detail
      });
      expectReadyFull(followUp);
      const followUpIds = followUp.g2_context.evidence_patterns.map((p) => p.id);
      const dietedIds = dieted.g2_context.evidence_patterns.map((p) => p.id);
      // O dieted é prefixo exato — o follow-up devolve os 10 + os omitidos
      // face ao cap clássico (25).
      expect(followUpIds.slice(0, dietedIds.length)).toEqual(dietedIds);
      expect(followUpIds.length).toBe(
        followUp.completeness_report.evidence_patterns_returned
      );
      expect(followUpIds.length).toBeGreaterThan(dietedIds.length);

      // E os ids para lá do cap clássico são listáveis com debug=true
      // (debug.rejected_candidates), como a nota indica — executado também.
      const debugFull = handlePrepareCodegenContextDiscover({ ...fixture.input, debug: true });
      expectReadyFull(debugFull);
      const rejectedIds = new Set(
        (debugFull.debug?.rejected_candidates ?? [])
          .filter((entry) => entry.reason.includes("scope-membership cap"))
          .map((entry) => entry.produced)
      );
      const beyondClassicCap =
        dieted.completeness_report.evidence_patterns_total - followUpIds.length;
      expect(rejectedIds.size).toBe(beyondClassicCap);
      // Contabilidade completa do universo: 10 (dieted) + resto do top-25 +
      // rejeitados pelo cap clássico == total.
      expect(
        dietedIds.length + (followUpIds.length - dietedIds.length) + rejectedIds.size
      ).toBe(dieted.completeness_report.evidence_patterns_total);
    });

    it("invariante 3 × cap: evidence patterns não têm ids no citation_map — o corte não toca no conjunto citável", () => {
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      const citable = new Set(Object.keys(full.citation_map));
      for (const pattern of full.g2_context.evidence_patterns) {
        expect(citable.has(pattern.id), `evidence id ${pattern.id} no citation_map`).toBe(
          false
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // Resource MCP sbd://toe/codegen-instructions/{mode} — byte-igual ao inline
  // -------------------------------------------------------------------------

  describe("resource codegen-instructions", () => {
    it("payload dieted substitui instructions/template pela referência ao resource", () => {
      for (const fixture of FIXTURES) {
        for (const detail of DIET_LEVELS) {
          const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
          expectReadyDieted(dieted);
          expect(dieted).not.toHaveProperty("llm_codegen_instructions");
          expect(dieted).not.toHaveProperty("security_rationale_template");
          expect(dieted.codegen_instructions_ref.resource).toBe(
            codegenInstructionsResourceUri(dieted.mode)
          );
          expect(dieted.codegen_instructions_ref.active_conditions).toEqual([
            "risk_level:L2"
          ]);
        }
      }
    });

    it.each([...CODEGEN_INSTRUCTION_MODES])(
      "mode %s: resource + active_conditions reconstrói o inline de detail=full BYTE-IGUAL",
      (mode) => {
        for (const fixture of FIXTURES) {
          const input = { ...fixture.input, mode };
          const full = handlePrepareCodegenContextDiscover(input);
          expectReadyFull(full);
          const dieted = handlePrepareCodegenContextDiscover({ ...input, detail: "standard" });
          expectReadyDieted(dieted);

          const instructions = assembleInstructions(
            mode,
            dieted.codegen_instructions_ref.active_conditions
          );
          expect(JSON.stringify(instructions)).toBe(
            JSON.stringify(full.llm_codegen_instructions)
          );

          const template = assembleTemplate(mode, dieted.input_echo.task);
          expect(JSON.stringify(template)).toBe(
            JSON.stringify(full.security_rationale_template)
          );
        }
      }
    );

    it("sem risk_level: a condição não dispara e a reconstrução continua byte-igual", () => {
      const input: PrepareCodegenContextInput = {
        task: "Add input validation to the POST /orders endpoint payload",
        mode: "codegen"
      };
      const full = handlePrepareCodegenContextDiscover(input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContextDiscover({ ...input, detail: "standard" });
      expectReadyDieted(dieted);
      expect(dieted.codegen_instructions_ref.active_conditions).toEqual([]);
      const instructions = assembleInstructions(
        "codegen",
        dieted.codegen_instructions_ref.active_conditions
      );
      expect(JSON.stringify(instructions)).toBe(
        JSON.stringify(full.llm_codegen_instructions)
      );
    });

    it("task com whitespace: template reconstruído com trim é byte-igual ao inline", () => {
      const input: PrepareCodegenContextInput = {
        task: "  Add payload validation to the PATCH /users/:id/email endpoint  ",
        risk_level: "L2",
        mode: "codegen"
      };
      const full = handlePrepareCodegenContextDiscover(input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContextDiscover({ ...input, detail: "standard" });
      expectReadyDieted(dieted);
      const template = assembleTemplate("codegen", dieted.input_echo.task);
      expect(JSON.stringify(template)).toBe(
        JSON.stringify(full.security_rationale_template)
      );
    });

    it("o conteúdo do resource é determinístico e carrega a legenda detail_encoding", () => {
      for (const mode of CODEGEN_INSTRUCTION_MODES) {
        const first = buildCodegenInstructionsResourceContent(mode);
        const second = buildCodegenInstructionsResourceContent(mode);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
        expect(first.resource).toBe(`sbd://toe/codegen-instructions/${mode}`);
        expect(Object.keys(first.detail_encoding.sources.map)).toContain(
          "activated_scope.requirements"
        );
        // template: task é null no resource (preenchido pelo cliente).
        expect(first.security_rationale_template.template.task).toBeNull();
      }
    });
  });

  // -------------------------------------------------------------------------
  // activation_trace só com debug (nunca-silencioso via contador exato)
  // -------------------------------------------------------------------------

  describe.each(FIXTURES)("$label — activation_trace", (fixture) => {
    it.each([...DIET_LEVELS])("%s: elidido por omissão, contador exato", (detail) => {
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
      expectReadyDieted(dieted);
      expect(dieted.activation_trace).toBeUndefined();
      expect(dieted.activation_trace_ref).toBeDefined();
      expect(dieted.activation_trace_ref!.entries).toBe(full.activation_trace.length);
    });

    it("debug=true repõe o trace completo (byte-igual ao de full) e remove o contador", () => {
      const fullDebug = handlePrepareCodegenContextDiscover({ ...fixture.input, debug: true });
      expectReadyFull(fullDebug);
      const dieted = handlePrepareCodegenContextDiscover({
        ...fixture.input,
        detail: "standard",
        debug: true
      });
      expectReadyDieted(dieted);
      expect(dieted.activation_trace_ref).toBeUndefined();
      expect(JSON.stringify(dieted.activation_trace)).toBe(
        JSON.stringify(fullDebug.activation_trace)
      );
      expect(dieted.debug).toBeDefined();
    });

    it("full mantém sempre o trace inline (com e sem debug)", () => {
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      expect(Array.isArray(full.activation_trace)).toBe(true);
      expect(full).not.toHaveProperty("activation_trace_ref");
    });
  });

  // -------------------------------------------------------------------------
  // QUALIDADE — description VERBATIM do bundle publicado (o "how")
  // -------------------------------------------------------------------------

  describe.each(FIXTURES)("$label — description verbatim do bundle", (fixture) => {
    it.each([...DIET_LEVELS])(
      "%s: requirements com description byte-igual a data/publish/runtime/requirements.json",
      (detail) => {
        const bundle = loadBundleItems("data/publish/runtime/requirements.json");
        const descriptionById = new Map(
          bundle.map((item) => [item.requirement_id as string, item.description as string])
        );
        const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
        expectReadyDieted(dieted);
        expect(dieted.activated_scope.requirements.length).toBeGreaterThan(0);
        for (const requirement of dieted.activated_scope.requirements) {
          const published = descriptionById.get(requirement.requirement_id);
          expect(
            published,
            `bundle sem description para ${requirement.requirement_id}`
          ).toBeTruthy();
          // Byte-igual, nunca parafraseada.
          expect(requirement.description).toBe(published);
        }
      }
    );

    it.each([...DIET_LEVELS])(
      "%s: controls direct com description byte-igual a data/publish/runtime/controls.json; derived sem description",
      (detail) => {
        const bundle = loadBundleItems("data/publish/runtime/controls.json");
        const descriptionById = new Map(
          bundle.map((item) => [item.control_id as string, item.description as string])
        );
        const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail });
        expectReadyDieted(dieted);
        const direct = dieted.activated_scope.controls.filter(
          (control) => control.confidence === "direct"
        );
        expect(direct.length).toBeGreaterThan(0);
        for (const control of dieted.activated_scope.controls) {
          if (control.confidence === "direct") {
            const published = descriptionById.get(control.control_id);
            expect(published, `bundle sem description para ${control.control_id}`).toBeTruthy();
            expect(control.description).toBe(published);
          } else {
            expect(control.description).toBeUndefined();
          }
        }
      }
    );

    it("full NÃO ganha description (byte-idêntico ao contrato clássico)", () => {
      const full = handlePrepareCodegenContextDiscover(fixture.input);
      expectReadyFull(full);
      for (const requirement of full.activated_scope.requirements) {
        expect(requirement).not.toHaveProperty("description");
      }
      for (const control of full.activated_scope.controls) {
        expect(control).not.toHaveProperty("description");
      }
    });
  });

  // -------------------------------------------------------------------------
  // Derivação category = prefixo do requirement_id — invariante do bundle
  // -------------------------------------------------------------------------

  it("invariante bundle-wide: category == segmento de categoria do requirement_id (v1.10 §1.18) em TODOS os requirements publicados", () => {
    const requirements = getOntologyData().requirements;
    expect(requirements.length).toBeGreaterThan(0);
    for (const requirement of requirements) {
      // Gramática v1.10: `AUT-003` → AUT, `REQ-AGN-001` → AGN (nunca `REQ`).
      expect(requirementCategoryOf(requirement.requirement_id)).toBe(requirement.category);
    }
    // O bundle pinado publica a categoria namespaced AGN (REQ-AGN-001…004).
    const agn = requirements.filter((r) => r.requirement_id.startsWith("REQ-AGN-"));
    expect(agn.map((r) => r.category)).toEqual(agn.map(() => "AGN"));
    expect(agn.length).toBe(4);
  });

  it("dieted: category elidido (derivável); nenhum requirement o transporta", () => {
    for (const fixture of FIXTURES) {
      const dieted = handlePrepareCodegenContextDiscover({ ...fixture.input, detail: "standard" });
      expectReadyDieted(dieted);
      for (const requirement of dieted.activated_scope.requirements) {
        expect(requirement).not.toHaveProperty("category");
      }
    }
  });

  // -------------------------------------------------------------------------
  // Sentinelas do budget.test (s3 aciona standard; s3b REVISTO aciona minimal)
  // -------------------------------------------------------------------------

  it("sentinelas: s3CapsLanded (standard, cap ≤ 10) e s3bMinimalLanded (minimal, cap ≤ 5) acionam; requirements CONTINUA array completo (ADENDA s3b: sem top-N)", () => {
    const standard = handlePrepareCodegenContextDiscover({
      ...FIXTURES[0]!.input,
      detail: "standard"
    });
    expectReadyDieted(standard);
    expect(standard.completeness_report.evidence_pattern_cap).toBeLessThanOrEqual(10);

    const minimal = handlePrepareCodegenContextDiscover({
      ...FIXTURES[0]!.input,
      detail: "minimal"
    });
    expectReadyDieted(minimal);
    // Sentinela s3b revista (budget.test): cap de evidence ≤ 5 em minimal.
    expect(minimal.completeness_report.evidence_pattern_cap).toBeLessThanOrEqual(5);
    // ADENDA s3b (2026-07-05): SEM top-N — o conjunto ativado vai COMPLETO em
    // todos os níveis; requirements permanece um array plano completo.
    expect(Array.isArray(minimal.activated_scope.requirements)).toBe(true);
    expect(minimal.activated_scope.requirements.length).toBe(
      standard.activated_scope.requirements.length
    );
  });
});
