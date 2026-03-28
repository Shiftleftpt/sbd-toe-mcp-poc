// Static chapter applicability data aligned with the SbD-ToE manual (chapters 00–14).
// Source of truth: assets/agent-guide.md chapter reference table.
// Used by MCP resources chapter-applicability and prompt setup_sbd_toe_agent.

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(value);
}

interface ChapterApplicability {
  active: string[];
  excluded: string[];
}

// Risk level progression per agent-guide.md:
//   L1: all chapters with minLevel L1
//   L2: L1 + chapters 06, 11  (minLevel L2)
//   L3: L2 + chapter 13       (minLevel L3)
const RISK_LEVEL_CHAPTERS: Record<RiskLevel, ChapterApplicability> = {
  L1: {
    active: [
      "Cap. 00", "Cap. 01", "Cap. 02", "Cap. 03", "Cap. 04",
      "Cap. 05", "Cap. 07", "Cap. 08", "Cap. 09", "Cap. 10",
      "Cap. 12", "Cap. 14"
    ],
    excluded: ["Cap. 06", "Cap. 11", "Cap. 13"]
  },
  L2: {
    active: [
      "Cap. 00", "Cap. 01", "Cap. 02", "Cap. 03", "Cap. 04",
      "Cap. 05", "Cap. 06", "Cap. 07", "Cap. 08", "Cap. 09",
      "Cap. 10", "Cap. 11", "Cap. 12", "Cap. 14"
    ],
    excluded: ["Cap. 13"]
  },
  L3: {
    active: [
      "Cap. 00", "Cap. 01", "Cap. 02", "Cap. 03", "Cap. 04",
      "Cap. 05", "Cap. 06", "Cap. 07", "Cap. 08", "Cap. 09",
      "Cap. 10", "Cap. 11", "Cap. 12", "Cap. 13", "Cap. 14"
    ],
    excluded: []
  }
};

const CHAPTER_TITLES: Record<string, string> = {
  "Cap. 00": "Fundamentos SbD-ToE",
  "Cap. 01": "Classificação de Aplicações",
  "Cap. 02": "Requisitos de Segurança",
  "Cap. 03": "Threat Modeling",
  "Cap. 04": "Arquitetura Segura",
  "Cap. 05": "Dependências, SBOM e SCA",
  "Cap. 06": "Desenvolvimento Seguro",
  "Cap. 07": "CI/CD Seguro",
  "Cap. 08": "IaC e Infraestrutura",
  "Cap. 09": "Containers e Imagens",
  "Cap. 10": "Testes de Segurança",
  "Cap. 11": "Deploy Seguro",
  "Cap. 12": "Monitorização e Operações",
  "Cap. 13": "Formação e Onboarding",
  "Cap. 14": "Governança e Contratação"
};

/**
 * Returns a JSON-serialisable object with active/excluded chapters for the given risk level.
 * Throws if riskLevel is not in the allowlist.
 * SEC note: riskLevel validated via allowlist (VAL-002).
 */
export function buildChapterApplicabilityJson(riskLevel: string): object {
  if (!isValidRiskLevel(riskLevel)) {
    throw new Error(
      `riskLevel inválido: "${riskLevel}". Valores permitidos: L1, L2, L3.`
    );
  }

  const chapters = RISK_LEVEL_CHAPTERS[riskLevel];
  return {
    riskLevel,
    active: chapters.active,
    excluded: chapters.excluded
  };
}

/**
 * Returns a structured prompt text instructing an agent to follow the SbD-ToE manual.
 * Throws if riskLevel is not in the allowlist.
 * SEC note: riskLevel validated via allowlist (VAL-002); projectRole is optional free text included as-is.
 */
export function buildSetupAgentPrompt(riskLevel: string, projectRole?: string): string {
  if (!isValidRiskLevel(riskLevel)) {
    throw new Error(
      `riskLevel inválido: "${riskLevel}". Valores permitidos: L1, L2, L3.`
    );
  }

  const chapters = RISK_LEVEL_CHAPTERS[riskLevel];
  const roleContext =
    projectRole !== undefined && projectRole.length > 0
      ? ` Project role: ${projectRole}.`
      : "";

  const activeStr = chapters.active
    .map((c) => `${c} (${CHAPTER_TITLES[c] ?? c})`)
    .join(", ");
  const excludedStr = chapters.excluded.length > 0 ? chapters.excluded.join(", ") : "none";

  return [
    `You are operating under the SbD-ToE manual at risk level ${riskLevel}.${roleContext}`,
    "",
    "Active chapters for this risk level:",
    activeStr,
    "",
    `Excluded chapters: ${excludedStr}`,
    "",
    "Rules:",
    "1. Always start with Cap. 00 (Fundamentos) → Cap. 01 → Cap. 02 before any technical chapter.",
    "2. Use search_sbd_toe_manual for grounding before answering about the manual.",
    "3. Never assert compliance without evidence in the codebase or manual.",
    "4. Never invent citations, chapter references, control IDs, or links.",
    "5. Treat AI-generated code as untrusted — require human review.",
    "",
    "Recommended next step:",
    `Call plan_sbd_toe_repo_governance(riskLevel="${riskLevel}") to get the full list of artefacts/documents`,
    "the manual identifies for this risk level, grouped by chapter.",
    "Use that list as the basis for any governance, documentation, or audit planning — do not invent artefacts."
  ].join("\n");
}
