const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

function isValidRiskLevel(value: unknown): value is RiskLevel {
  return (
    typeof value === "string" &&
    (VALID_RISK_LEVELS as readonly string[]).includes(value)
  );
}

function makeRpcError(message: string, data?: unknown): Error {
  return Object.assign(new Error(message), {
    rpcError: { code: -32602, message, data: data ?? null }
  });
}

// ---------------------------------------------------------------------------
// Readable titles (consistent with structured-tools.ts READABLE_TITLES)
// ---------------------------------------------------------------------------

const READABLE_TITLES: Record<string, string> = {
  "01-classificacao-aplicacoes": "Classificação de Aplicações",
  "02-requisitos-seguranca":     "Requisitos de Segurança",
  "03-threat-modeling":          "Threat Modeling",
  "04-arquitetura-segura":       "Arquitetura Segura",
  "05-dependencias-sbom-sca":    "Dependências, SBOM e SCA",
  "06-desenvolvimento-seguro":   "Desenvolvimento Seguro",
  "07-cicd-seguro":              "CI/CD Seguro",
  "08-iac-infraestrutura":       "IaC e Infraestrutura",
  "09-containers-imagens":       "Containers e Imagens",
  "10-testes-seguranca":         "Testes de Segurança",
  "11-deploy-seguro":            "Deploy Seguro",
  "12-monitorizacao-operacoes":  "Monitorização e Operações",
  "13-formacao-onboarding":      "Formação e Onboarding",
  "14-governanca-contratacao":   "Governança e Contratação"
};

type BundleCategory = "foundation" | "domain" | "operational";

const BUNDLE_CATEGORIES: Record<string, BundleCategory> = {
  "01-classificacao-aplicacoes": "foundation",
  "02-requisitos-seguranca":     "foundation",
  "03-threat-modeling":          "foundation",
  "04-arquitetura-segura":       "foundation",
  "05-dependencias-sbom-sca":    "domain",
  "06-desenvolvimento-seguro":   "domain",
  "08-iac-infraestrutura":       "domain",
  "09-containers-imagens":       "domain",
  "10-testes-seguranca":         "domain",
  "07-cicd-seguro":              "operational",
  "11-deploy-seguro":            "operational",
  "12-monitorizacao-operacoes":  "operational",
  "13-formacao-onboarding":      "operational",
  "14-governanca-contratacao":   "operational"
};

const EXPECTED_EVIDENCE: Record<string, string[]> = {
  "01-classificacao-aplicacoes": [
    "Classificação da aplicação documentada e actualizada.",
    "Nível de risco revisto face às mudanças introduzidas."
  ],
  "02-requisitos-seguranca": [
    "Requisitos de segurança revistos e actualizados.",
    "Critérios de aceitação de segurança definidos para as mudanças."
  ],
  "03-threat-modeling": [
    "Threat model actualizado para os flows afectados.",
    "Novas ameaças identificadas e endereçadas."
  ],
  "04-arquitetura-segura": [
    "Diagrama de arquitectura actualizado.",
    "Decisões de segurança documentadas nos ADRs."
  ],
  "05-dependencias-sbom-sca": [
    "SBOM actualizado após mudanças de dependências.",
    "Scan de dependências executado sem findings críticos."
  ],
  "06-desenvolvimento-seguro": [
    "Revisão de código com foco em segurança realizada.",
    "Sem hardcoded secrets ou dados sensíveis no código."
  ],
  "07-cicd-seguro": [
    "Pipeline CI/CD com security gates activos.",
    "Secrets em vault — não expostos nos logs do pipeline."
  ],
  "08-iac-infraestrutura": [
    "Configuração de infraestrutura revista com princípio de least privilege.",
    "Drift de configuração verificado e remediado."
  ],
  "09-containers-imagens": [
    "Imagem base actualizada e scanned sem vulnerabilidades críticas.",
    "Dockerfile sem execução como root."
  ],
  "10-testes-seguranca": [
    "SAST/DAST executados sem findings críticos por resolver.",
    "Testes de segurança relevantes para as mudanças adicionados."
  ],
  "11-deploy-seguro": [
    "Processo de release documentado e aprovado.",
    "Rollback plan definido e testado."
  ],
  "12-monitorizacao-operacoes": [
    "Alertas de segurança actualizados para cobrir as mudanças.",
    "Logs de segurança activos e a fluir correctamente."
  ],
  "13-formacao-onboarding": [
    "Equipa informada das mudanças com impacto em processos.",
    "Documentação de onboarding actualizada."
  ],
  "14-governanca-contratacao": [
    "Documentação de governança actualizada.",
    "Aprovações e revisões necessárias obtidas."
  ]
};

// ---------------------------------------------------------------------------
// Path matching patterns
// ---------------------------------------------------------------------------

interface PatternRule {
  pattern: string;
  bundles: string[];
  matches: (normalizedPath: string) => boolean;
}

const PATTERN_RULES: PatternRule[] = [
  {
    pattern: "src/config.ts",
    bundles: ["02-requisitos-seguranca", "06-desenvolvimento-seguro", "08-iac-infraestrutura", "10-testes-seguranca"],
    matches: (p) => p === "src/config.ts"
  },
  {
    pattern: "src/**",
    bundles: ["02-requisitos-seguranca", "06-desenvolvimento-seguro", "10-testes-seguranca"],
    matches: (p) => p.startsWith("src/")
  },
  {
    pattern: ".github/workflows/**",
    bundles: ["07-cicd-seguro", "10-testes-seguranca", "11-deploy-seguro"],
    matches: (p) => p.startsWith(".github/workflows/")
  },
  {
    pattern: "package.json / *-lock.json / yarn.lock",
    bundles: ["05-dependencias-sbom-sca"],
    matches: (p) =>
      p === "package.json" ||
      p === "package-lock.json" ||
      p === "yarn.lock" ||
      p.endsWith("-lock.json")
  },
  {
    pattern: "release/** / scripts/package-*",
    bundles: ["11-deploy-seguro"],
    matches: (p) => p.startsWith("release/") || p.startsWith("scripts/package-")
  },
  {
    pattern: "docs/**",
    bundles: ["14-governanca-contratacao"],
    matches: (p) => p.startsWith("docs/")
  },
  {
    pattern: "aos/** / .github/skills/**",
    bundles: ["14-governanca-contratacao", "13-formacao-onboarding"],
    matches: (p) => p.startsWith("aos/") || p.startsWith(".github/skills/")
  }
];

const GUARDRAIL_BUNDLES = ["01-classificacao-aplicacoes", "02-requisitos-seguranca"];

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

interface BundleToReview {
  chapterId: string;
  readableTitle: string;
  category: BundleCategory;
  reason: string;
  expectedEvidence: string[];
}

interface PathMappingEntry {
  pattern: string;
  matchedFiles: string[];
  bundles: string[];
}

interface MapReviewScopeResult {
  bundlesToReview: BundleToReview[];
  pathMapping: PathMappingEntry[];
  nextSteps: string[];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export function handleMapSbdToeReviewScope(
  args: Record<string, unknown>
): MapReviewScopeResult {
  // Validate riskLevel
  const riskLevelArg = args["riskLevel"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw makeRpcError(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`,
      { invalidValue: riskLevelArg }
    );
  }
  const riskLevel = riskLevelArg;

  // Validate changedFiles
  const changedFilesArg = args["changedFiles"];
  if (!Array.isArray(changedFilesArg) || changedFilesArg.length === 0) {
    throw makeRpcError(
      'O argumento "changedFiles" é obrigatório e deve conter pelo menos um path.',
      { receivedValue: changedFilesArg }
    );
  }

  // Normalize and validate each path
  const normalizedPaths: string[] = [];
  for (const raw of changedFilesArg) {
    if (typeof raw !== "string") {
      throw makeRpcError(`Path inválido: ${JSON.stringify(raw)}. Todos os paths devem ser strings.`);
    }
    // Normalize separators (cross-platform)
    const normalized = raw.replace(/\\/g, "/");

    // Path traversal check
    if (normalized.includes("..")) {
      throw makeRpcError(
        `Path inválido (path traversal detectado): "${normalized}". Paths com ".." não são permitidos.`,
        { invalidPath: normalized }
      );
    }

    normalizedPaths.push(normalized);
  }

  // Truncate diffSummary to 500 chars (no error)
  const rawDiffSummary = args["diffSummary"];
  const _diffSummary =
    typeof rawDiffSummary === "string"
      ? rawDiffSummary.slice(0, 500)
      : undefined;
  void _diffSummary; // reserved for future use

  // ---------------------------------------------------------------------------
  // Match paths to patterns
  // ---------------------------------------------------------------------------

  // Map: chapterId → { reason paths set, matched by guardrail only }
  const bundlePathsMap = new Map<string, Set<string>>();
  const guardrailFiles: string[] = [];

  // Track which patterns matched which files (for pathMapping output)
  const patternMatchedFiles = new Map<string, string[]>();

  for (const filePath of normalizedPaths) {
    let matchedAnyPattern = false;

    for (const rule of PATTERN_RULES) {
      if (rule.matches(filePath)) {
        matchedAnyPattern = true;
        if (!patternMatchedFiles.has(rule.pattern)) {
          patternMatchedFiles.set(rule.pattern, []);
        }
        patternMatchedFiles.get(rule.pattern)!.push(filePath);

        for (const bundleId of rule.bundles) {
          if (!bundlePathsMap.has(bundleId)) {
            bundlePathsMap.set(bundleId, new Set());
          }
          bundlePathsMap.get(bundleId)!.add(filePath);
        }
      }
    }

    if (!matchedAnyPattern) {
      guardrailFiles.push(filePath);
    }
  }

  // Apply guardrail bundles for unmatched files
  if (guardrailFiles.length > 0) {
    const guardrailPattern = "Guardrail (path não mapeado)";
    patternMatchedFiles.set(guardrailPattern, guardrailFiles);
    for (const bundleId of GUARDRAIL_BUNDLES) {
      if (!bundlePathsMap.has(bundleId)) {
        bundlePathsMap.set(bundleId, new Set());
      }
      for (const f of guardrailFiles) {
        bundlePathsMap.get(bundleId)!.add(f);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Build deduplicated bundlesToReview
  // ---------------------------------------------------------------------------

  const bundlesToReview: BundleToReview[] = [];
  for (const [chapterId, filesSet] of bundlePathsMap) {
    const filesList = [...filesSet].sort();
    const readableTitle = READABLE_TITLES[chapterId] ?? chapterId;
    const category = BUNDLE_CATEGORIES[chapterId] ?? "domain";
    const reason =
      filesList.length === 1
        ? `Ficheiro "${filesList[0]}" despoleta revisão deste bundle.`
        : `Ficheiros ${filesList.map((f) => `"${f}"`).join(", ")} despoletam revisão deste bundle.`;
    const expectedEvidence = EXPECTED_EVIDENCE[chapterId] ?? [
      "Verificar impacto das mudanças neste bundle."
    ];

    bundlesToReview.push({ chapterId, readableTitle, category, reason, expectedEvidence });
  }

  // Sort by category then chapterId for deterministic output
  bundlesToReview.sort((a, b) => {
    const catOrder: Record<BundleCategory, number> = { foundation: 0, domain: 1, operational: 2 };
    const catDiff = catOrder[a.category] - catOrder[b.category];
    return catDiff !== 0 ? catDiff : a.chapterId.localeCompare(b.chapterId);
  });

  // ---------------------------------------------------------------------------
  // Build pathMapping
  // ---------------------------------------------------------------------------

  const pathMapping: PathMappingEntry[] = [];
  for (const [pattern, matchedFiles] of patternMatchedFiles) {
    // Collect bundles for this pattern
    const bundlesForPattern = new Set<string>();
    for (const rule of PATTERN_RULES) {
      if (rule.pattern === pattern) {
        for (const b of rule.bundles) bundlesForPattern.add(b);
      }
    }
    // For guardrail pattern
    if (pattern === "Guardrail (path não mapeado)") {
      for (const b of GUARDRAIL_BUNDLES) bundlesForPattern.add(b);
    }
    pathMapping.push({
      pattern,
      matchedFiles: [...matchedFiles].sort(),
      bundles: [...bundlesForPattern].sort()
    });
  }

  // ---------------------------------------------------------------------------
  // Build nextSteps
  // ---------------------------------------------------------------------------

  const foundationIds = bundlesToReview
    .filter((b) => b.category === "foundation")
    .map((b) => b.chapterId);
  const domainIds = bundlesToReview
    .filter((b) => b.category === "domain")
    .map((b) => b.chapterId);
  const operationalIds = bundlesToReview
    .filter((b) => b.category === "operational")
    .map((b) => b.chapterId);

  const nextSteps: string[] = [];

  if (foundationIds.length > 0) {
    nextSteps.push(
      `Rever bundles fundacionais: ${foundationIds.join(", ")} — assegurar que a classificação e requisitos de segurança estão actualizados.`
    );
  }
  if (domainIds.length > 0) {
    nextSteps.push(
      `Rever bundles de domínio: ${domainIds.join(", ")} — validar que as práticas de segurança específicas foram aplicadas.`
    );
  }
  if (operationalIds.length > 0) {
    nextSteps.push(
      `Rever bundles operacionais: ${operationalIds.join(", ")} — confirmar que processos operacionais de segurança estão actualizados.`
    );
  }

  if (riskLevel === "L2" || riskLevel === "L3") {
    nextSteps.push(
      `Para nível ${riskLevel}: executar testes de segurança automatizados (SAST/DAST) antes do merge.`
    );
  }
  if (riskLevel === "L3") {
    nextSteps.push(
      "Para nível L3: obter aprovação formal do responsável de segurança antes do deploy."
    );
  }

  nextSteps.push(
    `Usar get_sbd_toe_chapter_brief(chapterId) para obter detalhe de cada bundle activado.`
  );

  return { bundlesToReview, pathMapping, nextSteps };
}
