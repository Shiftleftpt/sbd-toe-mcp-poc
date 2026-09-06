/**
 * 0.20.0-beta.31 — INVARIANTE ALARGADA: TODAS as superfícies que resolvem vocabulário.
 *
 * O P0 desta ronda entrou porque o `get_guide_by_role` NUNCA ESTEVE NO VARRIMENTO:
 * `role="fornecedores-terceiros"` — canónico, publicado no guia e no vocabulário — devolvia
 * `assignments: []` sem `unsupported_role`, com `canonicalRole` preenchido, e com
 * `meta.knownRoles` a listar 13 entradas que o OMITIAM. A resposta continha a prova de que o
 * papel não existia naquela superfície e nunca fazia a ligação.
 *
 * A regra «onde mais vive esta classe?» aplicada ao PRÓPRIO conjunto de superfícies vigiadas:
 * qualquer tool que aceite um valor de vocabulário entra aqui. Valor canónico que a
 * superfície não resolve ⇒ banda DECLARADA, com os válidos DESSA superfície e a razão.
 */
import { describe, it, expect } from "vitest";
import { handleGetGuideByRole } from "../tools/get-guide-by-role.js";
import { handleGetChapterImplementationChecklist } from "../tools/get-chapter-implementation-checklist.js";
import { handleMapRegulatoryActivation } from "../tools/map-regulatory-activation.js";
import { handleMapSbdToeApplicability, handleListSbdToeChapters } from "../tools/structured-tools.js";
import { handleResolveEntities } from "../tools/resolve-entities.js";
import { handleGenerateSbdToeSkill } from "../tools/generate-sbd-toe-skill.js";
import { buildActivationVocabulary } from "./activation-vocabulary.js";

const vocab = buildActivationVocabulary();
const ROLES = vocab.roles.values.map((r) => String(r.value));
const PHASES = (vocab.phases?.values ?? []).map((p: { value: unknown }) => String(p.value));
const CHAPTERS = (handleListSbdToeChapters({}) as { chapters?: Array<{ id: string }> }).chapters?.map((c) => c.id) ?? [];

/** Uma resposta «vazia» só é aceitável se DECLARAR que aquele valor não é resolvido aqui. */
function declares(payload: unknown, value: string): boolean {
  const text = JSON.stringify(payload ?? {});
  return /unsupported_|not_supported|ignored_activators|empty_at_level|needs_input|unknown_/.test(text) && text.includes(value);
}

function emptiness(payload: unknown): number {
  const p = (payload ?? {}) as Record<string, unknown>;
  const d = (p["data"] ?? p) as Record<string, unknown>;
  for (const key of ["assignments", "entities", "requirements", "threats", "items", "chapters", "activated", "steps", "checklist"]) {
    const v = d[key];
    if (Array.isArray(v)) return v.length;
  }
  return -1; // sem lista reconhecível: não se avalia
}

describe("beta.31 — inventário das superfícies que resolvem vocabulário", () => {
  it("INVENTÁRIO: valor CANÓNICO que a superfície não resolve tem de vir DECLARADO", () => {
    const inventory: string[] = [];
    const probe = (surface: string, value: string, run: () => unknown) => {
      let out: unknown;
      try {
        out = run();
      } catch (error) {
        // um erro explícito é uma declaração legítima (o valor é recusado, não engolido)
        if (!String((error as Error).message).includes(value))
          inventory.push(`${surface} × "${value}": erro que não nomeia o valor — ${String((error as Error).message).slice(0, 60)}`);
        return;
      }
      const n = emptiness(out);
      if (n === 0 && !declares(out, value))
        inventory.push(`${surface} × "${value}": resolve o valor como canónico e devolve VAZIO sem o declarar`);
    };

    for (const role of ROLES) probe("get_guide_by_role(role)", role, () => handleGetGuideByRole({ risk_level: "L3", role }));
    for (const phase of PHASES) probe("get_guide_by_role(phase)", phase, () => handleGetGuideByRole({ risk_level: "L3", phase }));
    for (const chapter of CHAPTERS)
      probe("chapter_implementation_checklist(chapter)", chapter, () => handleGetChapterImplementationChecklist({ chapter }));
    for (const framework of ["RGPD", "NIS2", "DORA", "CRA", "AI-ACT", "ENISA-CSA"])
      probe("map_regulatory_activation(framework)", framework, () => handleMapRegulatoryActivation({ framework }));
    for (const tech of vocab.technologies.values.map((t) => String(t.value)))
      probe("map_applicability(technologies)", tech, () => handleMapSbdToeApplicability({ riskLevel: "L2", technologies: [tech] }));
    for (const rt of ["requirement", "control", "practice", "role", "artifact"])
      probe("resolve_entities(record_type)", rt, () => handleResolveEntities({ record_type: rt, limit: 5 }));
    for (const role of ROLES) probe("generate_sbd_toe_skill(role)", role, () => handleGenerateSbdToeSkill({ role, format: "skill" }));

    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${inventory.join("\n")}`).toEqual([]);
  });

  it("INVENTÁRIO: o que a superfície diz conhecer inclui o que ela própria resolve como canónico", () => {
    const inventory: string[] = [];
    for (const role of ROLES) {
      const out = handleGetGuideByRole({ risk_level: "L3", role }) as unknown as Record<string, unknown>;
      const data = ((out["data"] ?? out) as Record<string, unknown>);
      const meta = (data["meta"] ?? {}) as { knownRoles?: string[]; canonicalRole?: string };
      const known = meta.knownRoles ?? [];
      const canonical = (data["canonicalRole"] as string | undefined) ?? (meta as { canonicalRole?: string }).canonicalRole;
      if (canonical !== undefined && known.length > 0 && !known.includes(canonical))
        inventory.push(
          `get_guide_by_role × "${role}": resolve para canonicalRole="${canonical}" e o próprio meta.knownRoles OMITE-O (${known.length} valores)`
        );
    }
    expect(inventory, `\nINVENTÁRIO (${inventory.length}):\n${inventory.join("\n")}`).toEqual([]);
  });
});
