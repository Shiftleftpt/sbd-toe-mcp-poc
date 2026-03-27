// ---------------------------------------------------------------------------
// Allowlists
// ---------------------------------------------------------------------------

const VALID_REPO_TYPES = [
  "library", "service", "webapp", "infrastructure", "pipeline", "monorepo"
] as const;

const VALID_PLATFORMS = ["github", "gitlab"] as const;

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;

const VALID_SCALES = ["startup", "mid-size", "enterprise"] as const;

const VALID_ENFORCEMENT_LEVELS = ["advisory", "enforced", "strict"] as const;

type RepoType = (typeof VALID_REPO_TYPES)[number];
type Platform = (typeof VALID_PLATFORMS)[number];
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];
type Scale = (typeof VALID_SCALES)[number];
type EnforcementLevel = (typeof VALID_ENFORCEMENT_LEVELS)[number];
type ControlCategory = "access" | "code-quality" | "supply-chain" | "secrets" | "ci-cd" | "audit";

function isValid<T extends string>(value: unknown, allowlist: readonly T[]): value is T {
  return typeof value === "string" && (allowlist as readonly string[]).includes(value);
}

function makeRpcError(message: string, data?: unknown): Error {
  return Object.assign(new Error(message), {
    rpcError: { code: -32602, message, data: data ?? null }
  });
}

// ---------------------------------------------------------------------------
// Controls catalog
// ---------------------------------------------------------------------------

interface Control {
  controlId: string;
  description: string;
  category: ControlCategory;
  rationale: string;
}

const ALL_CONTROLS: Control[] = [
  {
    controlId: "CTRL-ACCESS-001",
    category: "access",
    description: "Branch protection com ≥1 reviewer obrigatório",
    rationale: "Previne commits directos na branch principal sem revisão humana."
  },
  {
    controlId: "CTRL-ACCESS-002",
    category: "access",
    description: "CODEOWNERS definido para paths críticos",
    rationale: "Garante que alterações a código sensível são revistas por especialistas designados."
  },
  {
    controlId: "CTRL-ACCESS-003",
    category: "access",
    description: "MFA obrigatório para todos os contributors",
    rationale: "Reduz risco de comprometimento de conta de contributor com acesso ao repositório."
  },
  {
    controlId: "CTRL-QUALITY-001",
    category: "code-quality",
    description: "Linting e type-checking em CI",
    rationale: "Detecta erros de código e problemas de qualidade de forma automatizada."
  },
  {
    controlId: "CTRL-QUALITY-002",
    category: "code-quality",
    description: "Cobertura de testes mínima (L1: 60%, L2: 70%, L3: 80%)",
    rationale: "Assegura que o código tem cobertura de testes adequada ao nível de risco."
  },
  {
    controlId: "CTRL-QUALITY-003",
    category: "code-quality",
    description: "Code review obrigatório (L2: 1 reviewer; L3: 2 reviewers)",
    rationale: "Revisão por pares reduz a probabilidade de introduzir vulnerabilidades de segurança."
  },
  {
    controlId: "CTRL-SUPPLY-001",
    category: "supply-chain",
    description: "Dependency scanning (Dependabot/Renovate)",
    rationale: "Detecta vulnerabilidades conhecidas em dependências de forma contínua."
  },
  {
    controlId: "CTRL-SUPPLY-002",
    category: "supply-chain",
    description: "SBOM gerado em cada release",
    rationale: "Mantém rastreabilidade completa dos componentes incluídos em cada artefacto de release."
  },
  {
    controlId: "CTRL-SUPPLY-003",
    category: "supply-chain",
    description: "Pinning de versões de dependências de CI",
    rationale: "Previne ataques de supply chain via dependências de CI não fixadas."
  },
  {
    controlId: "CTRL-SECRETS-001",
    category: "secrets",
    description: "Scanning de segredos (gitleaks/trufflehog)",
    rationale: "Detecta segredos expostos no histórico de commits e pull requests."
  },
  {
    controlId: "CTRL-SECRETS-002",
    category: "secrets",
    description: "Variáveis sensíveis exclusivamente em vault/secrets manager",
    rationale: "Elimina o risco de exposição de credenciais em configurações versionadas."
  },
  {
    controlId: "CTRL-CICD-001",
    category: "ci-cd",
    description: "Pipeline de CI obrigatório em PRs",
    rationale: "Garante que todos os PRs passam por gates automáticos de qualidade e segurança."
  },
  {
    controlId: "CTRL-CICD-002",
    category: "ci-cd",
    description: "SAST em CI (CodeQL/semgrep)",
    rationale: "Análise estática detecta classes comuns de vulnerabilidades antes do merge."
  },
  {
    controlId: "CTRL-CICD-003",
    category: "ci-cd",
    description: "Container image scanning (L2+)",
    rationale: "Verifica vulnerabilidades em imagens de container antes do deploy."
  },
  {
    controlId: "CTRL-AUDIT-001",
    category: "audit",
    description: "Audit log de acessos ao repositório",
    rationale: "Mantém rastreabilidade de quem acedeu e alterou o repositório."
  },
  {
    controlId: "CTRL-AUDIT-002",
    category: "audit",
    description: "Signed commits obrigatórios (L3)",
    rationale: "Garante autenticidade e não-repúdio dos commits em repositórios de alto risco."
  }
];

const CONTROLS_BY_ID = new Map<string, Control>(
  ALL_CONTROLS.map((c) => [c.controlId, c])
);

// ---------------------------------------------------------------------------
// Mandatory controls per risk level (additive)
// ---------------------------------------------------------------------------

const MANDATORY_L1 = ["CTRL-ACCESS-001", "CTRL-QUALITY-001", "CTRL-SECRETS-001", "CTRL-CICD-001"];

const MANDATORY_L2_ADDITIONAL = [
  "CTRL-ACCESS-002", "CTRL-QUALITY-002", "CTRL-QUALITY-003", "CTRL-SUPPLY-001", "CTRL-CICD-002"
];

const MANDATORY_L3_ADDITIONAL = [
  "CTRL-ACCESS-003", "CTRL-SUPPLY-002", "CTRL-SUPPLY-003",
  "CTRL-SECRETS-002", "CTRL-AUDIT-001", "CTRL-AUDIT-002"
];

function getMandatoryControlIds(riskLevel: RiskLevel): string[] {
  const ids = [...MANDATORY_L1];
  if (riskLevel === "L2" || riskLevel === "L3") {
    ids.push(...MANDATORY_L2_ADDITIONAL);
  }
  if (riskLevel === "L3") {
    ids.push(...MANDATORY_L3_ADDITIONAL);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Additional controls per repoType
// ---------------------------------------------------------------------------

const REPO_TYPE_EXTRA_CONTROLS: Record<RepoType, string[]> = {
  library:        ["CTRL-SUPPLY-002", "CTRL-QUALITY-002"],
  service:        ["CTRL-CICD-002", "CTRL-SECRETS-001"],
  webapp:         ["CTRL-CICD-002", "CTRL-SECRETS-001", "CTRL-CICD-003"],
  infrastructure: ["CTRL-SUPPLY-003", "CTRL-CICD-002", "CTRL-AUDIT-001"],
  pipeline:       ["CTRL-SUPPLY-003", "CTRL-CICD-001", "CTRL-SECRETS-002"],
  monorepo:       ["CTRL-ACCESS-002", "CTRL-QUALITY-003"]
};

function getApplicableControls(
  repoType: RepoType,
  riskLevel: RiskLevel
): Control[] {
  const mandatoryIds = new Set(getMandatoryControlIds(riskLevel));
  const repoExtraIds = new Set(REPO_TYPE_EXTRA_CONTROLS[repoType]);

  // webapp: CTRL-CICD-003 only for L2+
  if (repoType === "webapp" && riskLevel === "L1") {
    repoExtraIds.delete("CTRL-CICD-003");
  }

  const allIds = new Set([...mandatoryIds, ...repoExtraIds]);
  const controls: Control[] = [];
  for (const id of allIds) {
    const ctrl = CONTROLS_BY_ID.get(id);
    if (ctrl !== undefined) {
      controls.push(ctrl);
    }
  }

  return controls.sort((a, b) => a.controlId.localeCompare(b.controlId));
}

// ---------------------------------------------------------------------------
// Baseline checkpoints
// ---------------------------------------------------------------------------

interface BaselineCheckpoint {
  phase: string;
  actions: string[];
  tooling?: string[];
}

function buildBaselineCheckpoints(
  riskLevel: RiskLevel,
  platform: Platform
): BaselineCheckpoint[] {
  const reviewCount = riskLevel === "L3" ? 2 : 1;
  const coverageTarget = riskLevel === "L1" ? "60%" : riskLevel === "L2" ? "70%" : "80%";
  const platformCi = platform === "github" ? "GitHub Actions" : "GitLab CI/CD";

  const checkpoints: BaselineCheckpoint[] = [
    {
      phase: "setup",
      actions: [
        "Activar branch protection na branch principal.",
        "Definir CODEOWNERS para paths críticos.",
        "Configurar scanning de segredos (gitleaks ou trufflehog).",
        "Criar ficheiro de configuração de CI base.",
        ...(riskLevel === "L2" || riskLevel === "L3"
          ? ["Configurar dependency scanning (Dependabot/Renovate)."]
          : []),
        ...(riskLevel === "L3"
          ? ["Activar MFA para todos os contributors.", "Configurar audit log."]
          : [])
      ],
      tooling: [
        platform === "github" ? "GitHub Branch Protection Settings" : "GitLab Protected Branches",
        "gitleaks / trufflehog",
        ...(riskLevel !== "L1" ? ["Dependabot / Renovate"] : [])
      ]
    },
    {
      phase: "pre-merge",
      actions: [
        `Executar linting e type-checking em ${platformCi}.`,
        `Exigir cobertura de testes ≥ ${coverageTarget}.`,
        `Exigir ${reviewCount} reviewer(s) aprovados antes do merge.`,
        "Executar scanning de segredos em cada PR.",
        ...(riskLevel === "L2" || riskLevel === "L3"
          ? ["Executar SAST (CodeQL ou semgrep) em cada PR."]
          : [])
      ],
      tooling: [
        platformCi,
        "CodeQL / semgrep",
        "gitleaks / trufflehog"
      ]
    },
    {
      phase: "release",
      actions: [
        "Verificar que todos os gates de CI estão a verde antes do release.",
        "Criar release tag com changelog de segurança.",
        ...(riskLevel === "L2" || riskLevel === "L3"
          ? ["Gerar e publicar SBOM do artefacto de release."]
          : []),
        ...(riskLevel === "L3"
          ? ["Verificar que todos os commits da release estão assinados.", "Obter aprovação formal do responsável de segurança."]
          : [])
      ],
      tooling: [
        "syft / cyclonedx-cli (SBOM)",
        ...(riskLevel === "L3" ? ["GPG / Sigstore"] : [])
      ]
    },
    {
      phase: "audit",
      actions: [
        "Rever permissões de acesso ao repositório trimestralmente.",
        "Verificar que todas as dependências estão actualizadas.",
        "Rever configuração de branch protection e CODEOWNERS.",
        ...(riskLevel === "L2" || riskLevel === "L3"
          ? ["Rever resultados de SAST/dependency scan dos últimos 30 dias."]
          : []),
        ...(riskLevel === "L3"
          ? ["Rever audit log de acessos críticos.", "Verificar conformidade com politicas de MFA."]
          : [])
      ]
    }
  ];

  if (riskLevel === "L2" || riskLevel === "L3") {
    checkpoints.push({
      phase: "incident-response",
      actions: [
        "Revogar acessos comprometidos imediatamente.",
        "Notificar responsável de segurança nas primeiras 4 horas.",
        "Abrir issue de segurança confidencial com template de IR.",
        "Conduzir post-mortem com acções correctivas no prazo de 5 dias úteis.",
        ...(riskLevel === "L3"
          ? ["Avaliar obrigação de notificação regulatória (GDPR/NIS2)."]
          : [])
      ],
      tooling: ["Security Advisory (GitHub/GitLab)", "Template de Incident Response"]
    });
  }

  return checkpoints;
}

// ---------------------------------------------------------------------------
// Evidence checklist
// ---------------------------------------------------------------------------

interface EvidenceItem {
  item: string;
  category: string;
  requiredFor: RiskLevel[];
}

function buildEvidenceChecklist(riskLevel: RiskLevel): EvidenceItem[] {
  const l1Items: EvidenceItem[] = [
    {
      item: "Branch protection activa na branch principal",
      category: "access",
      requiredFor: ["L1", "L2", "L3"]
    },
    {
      item: "Pipeline de CI funcional com execução em PRs",
      category: "ci-cd",
      requiredFor: ["L1", "L2", "L3"]
    },
    {
      item: "Scanning de segredos configurado e a executar",
      category: "secrets",
      requiredFor: ["L1", "L2", "L3"]
    },
    {
      item: "Linting e type-checking em CI sem erros críticos",
      category: "code-quality",
      requiredFor: ["L1", "L2", "L3"]
    }
  ];

  const l2Items: EvidenceItem[] = [
    {
      item: "Ficheiro CODEOWNERS presente e actualizado",
      category: "access",
      requiredFor: ["L2", "L3"]
    },
    {
      item: "Dependency scanning activo (Dependabot/Renovate configurado)",
      category: "supply-chain",
      requiredFor: ["L2", "L3"]
    },
    {
      item: "SAST configurado em CI sem findings críticos por resolver",
      category: "code-quality",
      requiredFor: ["L2", "L3"]
    },
    {
      item: "Logs de code review disponíveis (PRs com aprovações documentadas)",
      category: "code-quality",
      requiredFor: ["L2", "L3"]
    }
  ];

  const l3Items: EvidenceItem[] = [
    {
      item: "SBOM artefacto gerado e publicado em cada release",
      category: "supply-chain",
      requiredFor: ["L3"]
    },
    {
      item: "Signed commits verificados na branch principal",
      category: "audit",
      requiredFor: ["L3"]
    },
    {
      item: "Audit log configurado com retenção ≥ 90 dias",
      category: "audit",
      requiredFor: ["L3"]
    },
    {
      item: "MFA activado e evidenciado para todos os contributors com acesso de escrita",
      category: "access",
      requiredFor: ["L3"]
    }
  ];

  const items: EvidenceItem[] = [...l1Items];
  if (riskLevel === "L2" || riskLevel === "L3") {
    items.push(...l2Items);
  }
  if (riskLevel === "L3") {
    items.push(...l3Items);
  }

  return items;
}

// ---------------------------------------------------------------------------
// Gaps
// ---------------------------------------------------------------------------

interface Gap {
  area: string;
  risk: string;
  mitigation: string;
}

function buildGaps(repoType: RepoType, riskLevel: RiskLevel): Gap[] {
  const gaps: Gap[] = [];

  if (repoType === "library") {
    gaps.push({
      area: "Supply chain",
      risk: "Dependências transitivas não auditadas podem introduzir vulnerabilidades para consumidores da biblioteca.",
      mitigation: "Implementar SBOM em cada release e dependency scanning contínuo."
    });
  }

  if (repoType === "webapp" || repoType === "service") {
    gaps.push({
      area: "Runtime security",
      risk: "Código de aplicação pode conter vulnerabilidades injectáveis (XSS, SQLi, etc.) não detectadas por análise estática.",
      mitigation: "Complementar SAST com DAST em ambiente de staging antes de cada release."
    });
  }

  if (repoType === "infrastructure") {
    gaps.push({
      area: "IaC drift",
      risk: "Configuração de infraestrutura pode divergir do estado versionado (configuration drift).",
      mitigation: "Configurar detecção de drift com alertas automáticos (ex: Terraform Cloud, Pulumi Deployments)."
    });
  }

  if (repoType === "pipeline") {
    gaps.push({
      area: "CI/CD supply chain",
      risk: "Acções/scripts de CI não fixados a versões específicas podem ser substituídos maliciosamente.",
      mitigation: "Fixar todas as acções a SHA específicos e auditar periodicamente as permissões do pipeline."
    });
  }

  if (repoType === "monorepo") {
    gaps.push({
      area: "Granularidade de acesso",
      risk: "Acesso excessivamente amplo a componentes não relacionados dentro do monorepo.",
      mitigation: "Definir CODEOWNERS granular por directório e usar path-based permissions."
    });
  }

  if (riskLevel === "L2" || riskLevel === "L3") {
    gaps.push({
      area: "Cobertura de testes de segurança",
      risk: "SAST pode não detectar vulnerabilidades lógicas ou de negócio.",
      mitigation: "Realizar revisões manuais de segurança periódicas focadas em lógica de negócio crítica."
    });
  }

  if (riskLevel === "L3") {
    gaps.push({
      area: "Conformidade regulatória",
      risk: "Requisitos regulatórios (GDPR, NIS2) podem impor obrigações adicionais não cobertas por este plano.",
      mitigation: "Realizar avaliação de conformidade específica com um responsável de DPO/CISO."
    });
  }

  // Always include a general gap
  gaps.push({
    area: "Gestão de incidentes",
    risk: "Ausência de processo documentado de resposta a incidentes de segurança no repositório.",
    mitigation: "Criar SECURITY.md com processo de disclosure responsável e template de incident response."
  });

  return gaps;
}

// ---------------------------------------------------------------------------
// Platform-specific YAML
// ---------------------------------------------------------------------------

function buildGitHubYaml(riskLevel: RiskLevel): string {
  const requiredReviews = riskLevel === "L3" ? 2 : 1;
  const hasL2Plus = riskLevel === "L2" || riskLevel === "L3";

  return `branch_protection:
  required_reviews: ${requiredReviews}
  dismiss_stale_reviews: true
  require_code_owner_reviews: ${hasL2Plus}
  required_status_checks:
    - lint
    - test
    - secrets-scan${hasL2Plus ? "\n    - security-scan" : ""}${riskLevel === "L3" ? "\n    - sbom-verify" : ""}
  require_signed_commits: ${riskLevel === "L3"}
actions_permissions:
  allowed_actions: selected
  github_owned_allowed: true
  patterns_allowed:
    - "actions/*@v*"
    - "github/*@v*"
dependabot:
  enabled: ${hasL2Plus}
  update_schedule: weekly
  security_updates: true`;
}

function buildGitLabYaml(riskLevel: RiskLevel): string {
  const requiredApprovals = riskLevel === "L3" ? 2 : 1;
  const hasL2Plus = riskLevel === "L2" || riskLevel === "L3";

  return `protected_branches:
  allowed_to_merge: maintainer
  allowed_to_push: no_one
  code_owner_approval_required: ${hasL2Plus}
merge_request_approvals:
  approvals_required: ${requiredApprovals}
  reset_approvals_on_push: true
  disable_overriding_approvers: ${riskLevel === "L3"}
security_scanning:
  sast_enabled: ${hasL2Plus}
  dependency_scanning: ${hasL2Plus}
  secret_detection: true
  container_scanning: ${hasL2Plus}${riskLevel === "L3" ? "\n  license_scanning: true" : ""}
audit_events:
  enabled: ${riskLevel === "L3"}
  retention_days: ${riskLevel === "L3" ? 90 : 30}`;
}

function buildPlatformSpecific(platform: Platform, riskLevel: RiskLevel): { recommendations: string } {
  const yaml = platform === "github"
    ? buildGitHubYaml(riskLevel)
    : buildGitLabYaml(riskLevel);
  return { recommendations: yaml };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export function handlePlanRepoGovernance(args: Record<string, unknown>): {
  applicableControls: Control[];
  mandatoryControls: string[];
  recommendedControls: string[];
  baselineCheckpoints: BaselineCheckpoint[];
  evidenceChecklist: EvidenceItem[];
  gaps: Gap[];
  platformSpecific: { recommendations: string };
} {
  // Validate repoType
  const repoTypeArg = args["repoType"];
  if (!isValid(repoTypeArg, VALID_REPO_TYPES)) {
    throw makeRpcError(
      `repoType inválido: "${String(repoTypeArg)}". Valores permitidos: ${VALID_REPO_TYPES.join(", ")}.`,
      { invalidValue: repoTypeArg }
    );
  }
  const repoType = repoTypeArg;

  // Validate platform
  const platformArg = args["platform"];
  if (!isValid(platformArg, VALID_PLATFORMS)) {
    throw makeRpcError(
      `platform inválido: "${String(platformArg)}". Valores permitidos: ${VALID_PLATFORMS.join(", ")}.`,
      { invalidValue: platformArg }
    );
  }
  const platform = platformArg;

  // Validate riskLevel
  const riskLevelArg = args["riskLevel"];
  if (!isValid(riskLevelArg, VALID_RISK_LEVELS)) {
    throw makeRpcError(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`,
      { invalidValue: riskLevelArg }
    );
  }
  const riskLevel = riskLevelArg;

  // Validate organizationContext (optional)
  const orgCtxArg = args["organizationContext"];
  if (orgCtxArg !== undefined && orgCtxArg !== null) {
    if (typeof orgCtxArg !== "object" || Array.isArray(orgCtxArg)) {
      throw makeRpcError('organizationContext deve ser um objecto.');
    }
    const orgCtx = orgCtxArg as Record<string, unknown>;

    const scaleArg = orgCtx["scale"];
    if (scaleArg !== undefined && !isValid(scaleArg, VALID_SCALES)) {
      throw makeRpcError(
        `organizationContext.scale inválido: "${String(scaleArg)}". Valores permitidos: ${VALID_SCALES.join(", ")}.`,
        { invalidValue: scaleArg }
      );
    }

    const enforcementArg = orgCtx["enforcementLevel"];
    if (enforcementArg !== undefined && !isValid(enforcementArg, VALID_ENFORCEMENT_LEVELS)) {
      throw makeRpcError(
        `organizationContext.enforcementLevel inválido: "${String(enforcementArg)}". Valores permitidos: ${VALID_ENFORCEMENT_LEVELS.join(", ")}.`,
        { invalidValue: enforcementArg }
      );
    }

    const teamSizeArg = orgCtx["teamSize"];
    if (teamSizeArg !== undefined) {
      if (
        typeof teamSizeArg !== "number" ||
        !Number.isInteger(teamSizeArg) ||
        teamSizeArg < 1
      ) {
        throw makeRpcError(
          `organizationContext.teamSize inválido: "${String(teamSizeArg)}". Deve ser um inteiro ≥ 1.`,
          { invalidValue: teamSizeArg }
        );
      }
    }
  }

  // Build output
  const applicableControls = getApplicableControls(repoType, riskLevel);
  const applicableIds = new Set(applicableControls.map((c) => c.controlId));
  const mandatoryControlIds = getMandatoryControlIds(riskLevel).filter((id) =>
    applicableIds.has(id)
  );
  const mandatorySet = new Set(mandatoryControlIds);
  const recommendedControlIds = applicableControls
    .map((c) => c.controlId)
    .filter((id) => !mandatorySet.has(id));

  return {
    applicableControls,
    mandatoryControls: mandatoryControlIds,
    recommendedControls: recommendedControlIds,
    baselineCheckpoints: buildBaselineCheckpoints(riskLevel, platform),
    evidenceChecklist: buildEvidenceChecklist(riskLevel),
    gaps: buildGaps(repoType, riskLevel),
    platformSpecific: buildPlatformSpecific(platform, riskLevel)
  };
}

// Export types needed for testing
export type { Control, BaselineCheckpoint, EvidenceItem, Gap };
// Export Scale/EnforcementLevel to avoid unused type warnings
export type { Scale, EnforcementLevel };
