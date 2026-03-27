const VALID_DOCUMENT_TYPES = [
  "classification-template",
  "threat-model-template",
  "checklist",
  "training-plan",
  "secure-config"
] as const;

type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

const VALID_RISK_LEVELS = ["L1", "L2", "L3"] as const;
type RiskLevel = (typeof VALID_RISK_LEVELS)[number];

type FieldRequired = "mandatory" | "conditional" | "optional";

interface Field {
  name: string;
  required: FieldRequired;
  guidance: string;
}

interface Section {
  name: string;
  mandatory: boolean;
  fields: Field[];
}

interface GenerateDocumentResult {
  documentType: string;
  riskLevel: RiskLevel;
  sections: Section[];
  acceptanceCriteria: string[];
  relevantBundles: string[];
}

function isValidDocumentType(value: unknown): value is DocumentType {
  return (
    typeof value === "string" &&
    (VALID_DOCUMENT_TYPES as readonly string[]).includes(value)
  );
}

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
// Document structure definitions
// ---------------------------------------------------------------------------

function buildClassificationTemplate(riskLevel: RiskLevel): Section[] {
  const base: Section[] = [
    {
      name: "Identificação",
      mandatory: true,
      fields: [
        { name: "Nome da Aplicação", required: "mandatory", guidance: "Identificador único e nome oficial da aplicação." },
        { name: "Proprietário / Equipa", required: "mandatory", guidance: "Nome da equipa ou pessoa responsável." },
        { name: "Descrição Funcional", required: "mandatory", guidance: "Resumo do propósito e funcionalidades principais." }
      ]
    },
    {
      name: "Dados Processados",
      mandatory: true,
      fields: [
        { name: "Tipos de Dados", required: "mandatory", guidance: "Listar categorias de dados (ex: PII, financeiros, operacionais)." },
        { name: "Volume Estimado", required: "conditional", guidance: "Preencher se relevante para a classificação de risco." },
        { name: "Retenção e Eliminação", required: "optional", guidance: "Política de retenção aplicável." }
      ]
    },
    {
      name: "Nível de Risco",
      mandatory: true,
      fields: [
        { name: "Classificação Determinada", required: "mandatory", guidance: "Indicar L1, L2 ou L3 com justificação baseada nos critérios SbD-ToE." },
        { name: "Critérios Aplicados", required: "mandatory", guidance: "Listar os critérios que levaram à classificação." }
      ]
    }
  ];

  if (riskLevel === "L2" || riskLevel === "L3") {
    base.push({
      name: "Ameaças Identificadas",
      mandatory: true,
      fields: [
        { name: "Principais Ameaças", required: "mandatory", guidance: "Listar as ameaças identificadas no contexto da aplicação." },
        { name: "Impacto Estimado", required: "mandatory", guidance: "Para cada ameaça, descrever o impacto potencial." },
        { name: "Probabilidade", required: "conditional", guidance: "Estimativa de probabilidade para cada ameaça (alta/média/baixa)." }
      ]
    });
  }

  if (riskLevel === "L3") {
    base.push({
      name: "Plano de Remediação",
      mandatory: true,
      fields: [
        { name: "Acções de Mitigação", required: "mandatory", guidance: "Para cada ameaça L3, descrever as acções de mitigação concretas." },
        { name: "Responsáveis", required: "mandatory", guidance: "Assignar responsáveis por cada acção." },
        { name: "Prazo de Implementação", required: "mandatory", guidance: "Data limite para cada acção de remediação." },
        { name: "Evidências de Validação", required: "conditional", guidance: "Artefactos que comprovam a implementação das mitigações." }
      ]
    });
  }

  return base;
}

function buildThreatModelTemplate(riskLevel: RiskLevel): Section[] {
  const base: Section[] = [
    {
      name: "Âmbito",
      mandatory: true,
      fields: [
        { name: "Sistema em Análise", required: "mandatory", guidance: "Identificar os componentes e boundaries do sistema." },
        { name: "Pressupostos", required: "mandatory", guidance: "Listar os pressupostos de segurança assumidos." },
        { name: "Exclusões", required: "optional", guidance: "Componentes fora do âmbito e justificação." }
      ]
    },
    {
      name: "Actores",
      mandatory: true,
      fields: [
        { name: "Actores Legítimos", required: "mandatory", guidance: "Identificar utilizadores e sistemas que interagem com o sistema." },
        { name: "Actores Adversariais", required: "mandatory", guidance: "Perfis de atacante relevantes para o contexto." },
        { name: "Nível de Confiança por Actor", required: "conditional", guidance: "Descrever o nível de confiança atribuído a cada actor." }
      ]
    },
    {
      name: "Superfície de Ataque",
      mandatory: true,
      fields: [
        { name: "Entry Points", required: "mandatory", guidance: "Listar todos os pontos de entrada no sistema (APIs, UI, ficheiros, etc.)." },
        { name: "Assets Críticos", required: "mandatory", guidance: "Identificar os assets que precisam de protecção." },
        { name: "Trust Boundaries", required: "conditional", guidance: "Desenhar os limites de confiança entre componentes." }
      ]
    }
  ];

  if (riskLevel === "L2" || riskLevel === "L3") {
    base.push(
      {
        name: "Árvores de Ameaça",
        mandatory: true,
        fields: [
          { name: "Ameaças STRIDE", required: "mandatory", guidance: "Identificar ameaças usando a metodologia STRIDE por componente." },
          { name: "Cenários de Ataque", required: "mandatory", guidance: "Descrever cenários de ataque realistas para as ameaças identificadas." },
          { name: "Priorização", required: "conditional", guidance: "Priorizar ameaças por impacto e probabilidade." }
        ]
      },
      {
        name: "Controlos",
        mandatory: true,
        fields: [
          { name: "Controlos Existentes", required: "mandatory", guidance: "Listar controlos de segurança já implementados." },
          { name: "Controlos Propostos", required: "mandatory", guidance: "Descrever novos controlos a implementar por cada ameaça." },
          { name: "Referências SbD-ToE", required: "optional", guidance: "Citar os CTRL-* relevantes do manual SbD-ToE." }
        ]
      }
    );
  }

  if (riskLevel === "L3") {
    base.push({
      name: "Análise de Residual Risk",
      mandatory: true,
      fields: [
        { name: "Risco Residual por Ameaça", required: "mandatory", guidance: "Após mitigações, documentar o risco residual aceite para cada ameaça." },
        { name: "Aprovação Formal", required: "mandatory", guidance: "Registo de aprovação do risco residual pela entidade responsável." },
        { name: "Plano de Revisão", required: "conditional", guidance: "Periodicidade de revisão do threat model." }
      ]
    });
  }

  return base;
}

function buildChecklist(riskLevel: RiskLevel): Section[] {
  const base: Section[] = [
    {
      name: "Requisitos Mínimos L1",
      mandatory: true,
      fields: [
        { name: "Autenticação Básica", required: "mandatory", guidance: "Verificar se autenticação está implementada e configurada correctamente." },
        { name: "Gestão de Segredos", required: "mandatory", guidance: "Confirmar que secrets não estão hardcoded no código ou versionados." },
        { name: "Logging de Eventos de Segurança", required: "mandatory", guidance: "Verificar que eventos relevantes de segurança são registados." },
        { name: "Dependências Actualizadas", required: "conditional", guidance: "Confirmar ausência de dependências com vulnerabilidades conhecidas críticas." }
      ]
    }
  ];

  if (riskLevel === "L2" || riskLevel === "L3") {
    base.push({
      name: "Requisitos Adicionais L2",
      mandatory: true,
      fields: [
        { name: "Testes de Segurança Automatizados", required: "mandatory", guidance: "SAST/DAST integrados no pipeline CI/CD sem findings críticos." },
        { name: "Revisão de Código com Foco em Segurança", required: "mandatory", guidance: "Processo de code review inclui verificação de aspectos de segurança." },
        { name: "Gestão de Incidentes", required: "mandatory", guidance: "Processo documentado de resposta a incidentes de segurança." },
        { name: "Monitorização Activa", required: "conditional", guidance: "Alertas configurados para eventos de segurança anómalos." }
      ]
    });
  }

  if (riskLevel === "L3") {
    base.push({
      name: "Requisitos Regulatórios L3",
      mandatory: true,
      fields: [
        { name: "Conformidade Normativa", required: "mandatory", guidance: "Identificar e documentar conformidade com normas aplicáveis (GDPR, NIS2, etc.)." },
        { name: "Auditoria e Rastreabilidade", required: "mandatory", guidance: "Logs de auditoria com retenção conforme requisitos legais." },
        { name: "Relatório de Segurança Periódico", required: "mandatory", guidance: "Frequência e formato do relatório de segurança exigido." },
        { name: "Aprovações de Terceiros", required: "conditional", guidance: "Auditorias externas ou certificações necessárias." }
      ]
    });
  }

  return base;
}

function buildTrainingPlan(riskLevel: RiskLevel): Section[] {
  const base: Section[] = [
    {
      name: "Objectivos",
      mandatory: true,
      fields: [
        { name: "Objectivos de Aprendizagem", required: "mandatory", guidance: "Listar os conhecimentos e competências a adquirir." },
        { name: "Resultados Esperados", required: "mandatory", guidance: "Descrever o estado de preparação da equipa após a formação." }
      ]
    },
    {
      name: "Audiência",
      mandatory: true,
      fields: [
        { name: "Perfis Alvo", required: "mandatory", guidance: "Identificar os papéis que devem participar na formação." },
        { name: "Pré-requisitos", required: "conditional", guidance: "Conhecimentos mínimos esperados dos participantes." }
      ]
    },
    {
      name: "Módulos Base",
      mandatory: true,
      fields: [
        { name: "Fundamentos SbD-ToE", required: "mandatory", guidance: "Conceitos base do manual, níveis de risco e estrutura de capítulos." },
        { name: "Práticas de Segurança no Ciclo de Desenvolvimento", required: "mandatory", guidance: "Como integrar segurança nas fases de design, dev e deploy." },
        { name: "Uso das Tools MCP SbD-ToE", required: "conditional", guidance: "Demonstração prática das tools disponíveis no servidor MCP." }
      ]
    }
  ];

  if (riskLevel === "L2" || riskLevel === "L3") {
    base.push({
      name: "Exercícios Práticos",
      mandatory: true,
      fields: [
        { name: "Cenários de Ameaça", required: "mandatory", guidance: "Exercícios baseados em cenários reais de ameaça do contexto da equipa." },
        { name: "Hands-on Threat Modeling", required: "mandatory", guidance: "Exercício prático de threat modeling com metodologia SbD-ToE." },
        { name: "Simulação de Incident Response", required: "conditional", guidance: "Exercício de resposta a incidente de segurança simulado." }
      ]
    });
  }

  if (riskLevel === "L3") {
    base.push({
      name: "Avaliação e Certificação",
      mandatory: true,
      fields: [
        { name: "Critérios de Avaliação", required: "mandatory", guidance: "Definir os critérios e limites de aprovação." },
        { name: "Formato da Avaliação", required: "mandatory", guidance: "Descrever o método de avaliação (teste, projecto, demonstração)." },
        { name: "Registo de Conclusão", required: "mandatory", guidance: "Documento comprovativo de conclusão e aprovação da formação." },
        { name: "Periodicidade de Renovação", required: "conditional", guidance: "Frequência com que a formação deve ser repetida ou actualizada." }
      ]
    });
  }

  return base;
}

function buildSecureConfig(riskLevel: RiskLevel): Section[] {
  const base: Section[] = [
    {
      name: "Hardening Base",
      mandatory: true,
      fields: [
        { name: "Configuração Mínima de Sistema", required: "mandatory", guidance: "Listar as configurações de sistema operativo/runtime aplicadas para reduzir superfície de ataque." },
        { name: "Portos e Serviços Expostos", required: "mandatory", guidance: "Inventariar todos os portos e serviços activos, justificando cada um." },
        { name: "Actualizações e Patches", required: "mandatory", guidance: "Política de aplicação de patches de segurança." }
      ]
    },
    {
      name: "Segredos",
      mandatory: true,
      fields: [
        { name: "Inventário de Segredos", required: "mandatory", guidance: "Listar todos os segredos usados (API keys, passwords, certificados)." },
        { name: "Mecanismo de Armazenamento", required: "mandatory", guidance: "Descrever o vault ou mecanismo seguro de armazenamento de segredos." },
        { name: "Rotação de Segredos", required: "conditional", guidance: "Política de rotação periódica de segredos." }
      ]
    },
    {
      name: "Logging",
      mandatory: true,
      fields: [
        { name: "Eventos Registados", required: "mandatory", guidance: "Listar os eventos de segurança que devem ser logados." },
        { name: "Formato e Destino dos Logs", required: "mandatory", guidance: "Formato estruturado e destino seguro dos logs." },
        { name: "Retenção", required: "conditional", guidance: "Período de retenção dos logs de segurança." }
      ]
    }
  ];

  if (riskLevel === "L2" || riskLevel === "L3") {
    base.push(
      {
        name: "Network Segmentation",
        mandatory: true,
        fields: [
          { name: "Segmentação de Rede", required: "mandatory", guidance: "Descrever a segmentação de rede aplicada (VLANs, security groups, etc.)." },
          { name: "Firewall Rules", required: "mandatory", guidance: "Inventariar e justificar as regras de firewall activas." },
          { name: "Ingress/Egress Control", required: "conditional", guidance: "Políticas de controlo de tráfego de entrada e saída." }
        ]
      },
      {
        name: "mTLS",
        mandatory: true,
        fields: [
          { name: "Serviços com mTLS", required: "mandatory", guidance: "Identificar os serviços que requerem mTLS e o estado de implementação." },
          { name: "Gestão de Certificados", required: "mandatory", guidance: "Processo de emissão, renovação e revogação de certificados." },
          { name: "Certificate Pinning", required: "optional", guidance: "Avaliação da necessidade de certificate pinning para clientes móveis." }
        ]
      }
    );
  }

  if (riskLevel === "L3") {
    base.push(
      {
        name: "Auditoria Contínua",
        mandatory: true,
        fields: [
          { name: "Ferramentas de Auditoria", required: "mandatory", guidance: "Listar as ferramentas de auditoria contínua activas (CSPM, SIEM, etc.)." },
          { name: "Frequência de Revisão", required: "mandatory", guidance: "Periodicidade das revisões de segurança automatizadas e manuais." },
          { name: "Alertas Críticos", required: "mandatory", guidance: "Definir os alertas que requerem resposta imediata." }
        ]
      },
      {
        name: "Conformidade",
        mandatory: true,
        fields: [
          { name: "Frameworks Aplicáveis", required: "mandatory", guidance: "Listar os frameworks regulatórios e normativos aplicáveis (GDPR, NIS2, ISO 27001, etc.)." },
          { name: "Controlos de Conformidade", required: "mandatory", guidance: "Mapear controlos de segurança implementados para cada requisito normativo." },
          { name: "Evidências de Conformidade", required: "mandatory", guidance: "Documentar as evidências disponíveis para auditoria externa." },
          { name: "Plano de Melhoria", required: "conditional", guidance: "Acções planeadas para fechar gaps de conformidade identificados." }
        ]
      }
    );
  }

  return base;
}

// ---------------------------------------------------------------------------
// Acceptance criteria per type
// ---------------------------------------------------------------------------

const ACCEPTANCE_CRITERIA: Record<DocumentType, string[]> = {
  "classification-template": [
    "Todas as secções obrigatórias preenchidas.",
    "Classificação de risco justificada com critérios documentados.",
    "Dados processados inventariados e categorizados.",
    "Documento revisto e aprovado pelo responsável de segurança."
  ],
  "threat-model-template": [
    "Âmbito e actores completamente identificados.",
    "Superfície de ataque mapeada com entry points e assets.",
    "Para L2+: todas as ameaças STRIDE endereçadas com controlos.",
    "Para L3: risco residual documentado e aprovado formalmente."
  ],
  "checklist": [
    "Todos os items marcados como cumpridos ou com justificação de não aplicabilidade.",
    "Evidências recolhidas para cada item obrigatório.",
    "Checklist revista e assinada antes do release.",
    "Para L3: conformidade normativa verificada e documentada."
  ],
  "training-plan": [
    "Todos os módulos base completados pela audiência alvo.",
    "Exercícios práticos realizados e documentados.",
    "Para L3: avaliação realizada com aprovação acima do threshold definido.",
    "Registo de conclusão arquivado."
  ],
  "secure-config": [
    "Hardening base aplicado e verificado em todos os ambientes.",
    "Segredos em vault — zero segredos em código ou configuração versionada.",
    "Logging de eventos de segurança activo e testado.",
    "Para L2+: segmentação de rede e mTLS implementados e documentados.",
    "Para L3: conformidade auditada e evidências recolhidas."
  ]
};

// ---------------------------------------------------------------------------
// Relevant bundles per type
// ---------------------------------------------------------------------------

const RELEVANT_BUNDLES: Record<DocumentType, string[]> = {
  "classification-template": ["01-classificacao-aplicacoes", "02-requisitos-seguranca", "14-governanca-contratacao"],
  "threat-model-template":   ["03-threat-modeling", "04-arquitetura-segura", "02-requisitos-seguranca"],
  "checklist":               ["02-requisitos-seguranca", "06-desenvolvimento-seguro", "10-testes-seguranca"],
  "training-plan":           ["13-formacao-onboarding", "14-governanca-contratacao"],
  "secure-config":           ["04-arquitetura-segura", "08-iac-infraestrutura", "09-containers-imagens", "07-cicd-seguro"]
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export function handleGenerateDocument(args: Record<string, unknown>): GenerateDocumentResult {
  const typeArg = args["type"];
  if (!isValidDocumentType(typeArg)) {
    throw makeRpcError(
      `Tipo de documento inválido: "${String(typeArg)}". Valores permitidos: ${VALID_DOCUMENT_TYPES.join(", ")}.`,
      { invalidValue: typeArg }
    );
  }
  const documentType = typeArg;

  const riskLevelArg = args["riskLevel"];
  if (!isValidRiskLevel(riskLevelArg)) {
    throw makeRpcError(
      `riskLevel inválido: "${String(riskLevelArg)}". Valores permitidos: L1, L2, L3.`,
      { invalidValue: riskLevelArg }
    );
  }
  const riskLevel = riskLevelArg;

  // context is accepted but not used in structure logic (reserved for future use)
  // sanitized: not forwarded to any external system

  let sections: Section[];
  switch (documentType) {
    case "classification-template":
      sections = buildClassificationTemplate(riskLevel);
      break;
    case "threat-model-template":
      sections = buildThreatModelTemplate(riskLevel);
      break;
    case "checklist":
      sections = buildChecklist(riskLevel);
      break;
    case "training-plan":
      sections = buildTrainingPlan(riskLevel);
      break;
    case "secure-config":
      sections = buildSecureConfig(riskLevel);
      break;
  }

  return {
    documentType,
    riskLevel,
    sections,
    acceptanceCriteria: ACCEPTANCE_CRITERIA[documentType],
    relevantBundles: RELEVANT_BUNDLES[documentType]
  };
}
