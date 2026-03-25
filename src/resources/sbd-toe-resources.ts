// Static chapter applicability data derived from docs/sbd-toe-applicability.md.
// Used as source for MCP resources — does not depend on JSON indices for the base structure.

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (VALID_RISK_LEVELS as readonly string[]).includes(value);
}

interface ChapterApplicability {
  active: string[];
  conditional: string[];
  excluded: string[];
}

// L1: directly applicable (active) and conditionally applicable chapters from docs/sbd-toe-applicability.md.
// L2/L3: progressive inclusion — L1 conditional chapters become active in L2; all active in L3.
const RISK_LEVEL_CHAPTERS: Record<RiskLevel, ChapterApplicability> = {
  L1: {
    active: ["Cap. 01", "Cap. 02", "Cap. 05", "Cap. 06", "Cap. 07", "Cap. 10"],
    conditional: ["Cap. 03", "Cap. 04", "Cap. 11", "Cap. 12", "Cap. 14"],
    excluded: ["Cap. 08", "Cap. 09", "Cap. 13", "Cap. 15"]
  },
  L2: {
    active: [
      "Cap. 01", "Cap. 02", "Cap. 03", "Cap. 04", "Cap. 05",
      "Cap. 06", "Cap. 07", "Cap. 10", "Cap. 11", "Cap. 12", "Cap. 14"
    ],
    conditional: ["Cap. 08", "Cap. 09", "Cap. 13", "Cap. 15"],
    excluded: []
  },
  L3: {
    active: [
      "Cap. 01", "Cap. 02", "Cap. 03", "Cap. 04", "Cap. 05",
      "Cap. 06", "Cap. 07", "Cap. 08", "Cap. 09", "Cap. 10",
      "Cap. 11", "Cap. 12", "Cap. 13", "Cap. 14", "Cap. 15"
    ],
    conditional: [],
    excluded: []
  }
};

const CHAPTER_TITLES: Record<string, string> = {
  "Cap. 01": "Classificação de Criticidade",
  "Cap. 02": "Requisitos de Segurança",
  "Cap. 03": "Threat Modeling",
  "Cap. 04": "Arquitetura Segura",
  "Cap. 05": "Dependências, SBOM e SCA",
  "Cap. 06": "Desenvolvimento Seguro",
  "Cap. 07": "CI/CD Seguro",
  "Cap. 08": "Segurança de Rede e Exposição",
  "Cap. 09": "Autenticação e Acesso",
  "Cap. 10": "Testes de Segurança",
  "Cap. 11": "Deploy Seguro",
  "Cap. 12": "Monitorização & Operações",
  "Cap. 13": "Gestão de Incidentes",
  "Cap. 14": "Governança, Revisões e Conformidade",
  "Cap. 15": "Formação e Cultura de Segurança"
};

const CONSULTATION_TRIGGERS: Array<{ context: string; chapter: string }> = [
  { context: "Qualquer alteração de segurança nova", chapter: "Cap. 01 → Cap. 02 → capítulo técnico" },
  { context: "`package.json`, dependências, lockfiles", chapter: "Cap. 05" },
  { context: "Código TypeScript em `src/`, parsing, validação, prompts", chapter: "Cap. 06" },
  { context: "Workflows CI/CD, scripts de build, packaging", chapter: "Cap. 07" },
  { context: "CodeQL, SAST, quality gates, scanning pré-release", chapter: "Cap. 10" },
  { context: "Release, bundle, artefactos publicados", chapter: "Cap. 11" },
  { context: "Fronteiras de sistema, trust model, canais `stdout`/`stderr`", chapter: "Cap. 04" },
  { context: "Logging, auditabilidade, debug seguro", chapter: "Cap. 12" },
  { context: "Rastreabilidade, exceções formais, conformidade", chapter: "Cap. 14" }
];

const BASE_REQUIREMENTS: string[] = [
  "AUT-006 — proibição de credenciais por omissão",
  "ACC-002 — menor privilégio",
  "ACC-005 — controlo de acesso a APIs e serviços",
  "LOG-001 / LOG-002 / LOG-003 — eventos críticos, atributos mínimos, proteção de logs",
  "VAL-001 / VAL-002 / VAL-004 — validação geral, allowlists, sanitização contra injeções",
  "ERR-* — mensagens de erro seguras, sem stack trace para o cliente",
  "CFG-* — configuração segura, separação entre código e configuração"
];

/**
 * Returns a Markdown skill template for the given risk level and project role.
 * Throws if riskLevel is not in the allowlist.
 * SEC note: riskLevel validated via allowlist (VAL-002).
 */
export function buildSkillTemplateMarkdown(riskLevel: string, projectRole: string): string {
  if (!isValidRiskLevel(riskLevel)) {
    throw new Error(
      `riskLevel inválido: "${riskLevel}". Valores permitidos: L1, L2, L3.`
    );
  }

  const chapters = RISK_LEVEL_CHAPTERS[riskLevel];
  const roleHeader = projectRole.length > 0 ? ` | Papel: ${projectRole}` : "";

  const activeList = chapters.active
    .map((c) => `- ${c} — ${CHAPTER_TITLES[c] ?? c}`)
    .join("\n");

  const conditionalList =
    chapters.conditional.length > 0
      ? chapters.conditional.map((c) => `- ${c} — ${CHAPTER_TITLES[c] ?? c}`).join("\n")
      : "_(nenhum)_";

  const triggersRows = CONSULTATION_TRIGGERS.map(
    (t) => `| ${t.context} | ${t.chapter} |`
  ).join("\n");

  const reqList = BASE_REQUIREMENTS.map((r) => `- ${r}`).join("\n");

  return [
    "# SbD-ToE Skill Template",
    "",
    "## Classificação de Risco",
    "",
    `**Nível:** ${riskLevel}${roleHeader}`,
    "",
    "Começar sempre por **Cap. 01 → Cap. 02** antes do capítulo técnico relevante.",
    "Nunca afirmar conformidade sem evidência no código ou no manual.",
    "",
    "## Capítulos Activos",
    "",
    activeList,
    "",
    "## Capítulos Condicionais",
    "",
    conditionalList,
    "",
    "## Triggers de Consulta",
    "",
    "| Contexto da alteração | Capítulo a consultar |",
    "|---|---|",
    triggersRows,
    "",
    "## Requisitos Base",
    "",
    reqList
  ].join("\n");
}

/**
 * Returns a JSON-serialisable object with active/conditional/excluded chapters for the given risk level.
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
    conditional: chapters.conditional,
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
      ? ` O papel do projecto é: ${projectRole}.`
      : "";

  const activeStr = chapters.active.join(", ");
  const conditionalStr =
    chapters.conditional.length > 0 ? chapters.conditional.join(", ") : "nenhum";

  return [
    `Segue o manual SbD-ToE para o nível de risco ${riskLevel}.${roleContext}`,
    "",
    "Regras:",
    "1. Começa sempre por Cap. 01 → Cap. 02 antes do capítulo técnico relevante.",
    `2. Consulta os capítulos activos antes de implementar qualquer controlo de segurança.`,
    `3. Capítulos activos para ${riskLevel}: ${activeStr}.`,
    `4. Capítulos condicionais: ${conditionalStr}.`,
    "5. Exige evidência antes de qualquer claim de compliance.",
    "6. Usa a tool `search_sbd_toe_manual` para grounding antes de responder sobre o manual.",
    "7. Trata código gerado por IA como artefacto não confiável: exige revisão humana.",
    "8. Nunca inventa citações, capítulos, links ou anchors."
  ].join("\n");
}
