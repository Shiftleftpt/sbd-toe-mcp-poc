/**
 * server-surface — a superfície MCP declarada num só sítio.
 *
 * 0.20.0-beta.24: o `agent-guide` deixou de a repetir à mão. As tabelas de recursos e
 * prompts do guia são GERADAS daqui, e a suite guarda que não divergem. Antes desta
 * vaga havia duas listas: esta (a verdadeira) e a do guia, escrita à mão — a do guia
 * não tinha `sbd://toe/activation-vocabulary` (o recurso que o próprio guia manda ler
 * no passo 1) nem o prompt `prepare_grounded_codegen`.
 */

/** The single source of the resource surface — resources/list AND the
 * read_sbd_toe_resource tool derive from THIS list (never hardcoded twice). */
export const RESOURCE_CATALOG = [
        {
          uri: "sbd://toe/agent-guide",
          name: "SbD-ToE Agent Guide",
          description:
            "ENTRY POINT — READ THIS FIRST. Operational guide for AI agents: SbD-ToE identity (Security by Design — Theory of Everything), CONSULT/GUIDE modes, routing by SDLC phase and domain, tool selection, epistemic standards, chapter map, risk levels, identifier conventions.",
          mimeType: "text/markdown"
        },
        {
          uri: "sbd://toe/chapter-applicability/{riskLevel}",
          name: "SbD-ToE Chapter Applicability",
          description:
            "Graduated chapter applicability for a risk level (L1/L2/L3): presence always, demand scales — derived from authored assignment proportionality (0.14.0).",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/quick-start",
          name: "SbD-ToE Quick Start",
          description:
            "ARRANQUE MÍNIMO (0.20.0-beta.30): o essencial para fazer a primeira chamada certa — a fronteira, a primeira chamada, as três formas de pedir e o que fazer quando não há atalho. Derivado. Lê isto primeiro se o contexto é caro; o guia completo (sbd://toe/agent-guide) tem o resto.",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/model",
          name: "SbD-ToE Model (as três formas de pedir)",
          description:
            "O MAPA do conhecimento servido, não a lista de botões (0.20.0-beta.30): entidades com contagens reais, relações com cardinalidades reais, capítulos e categorias com a FORMA que os alcança, e as TRÊS FORMAS DE PEDIR — por conceito (atalho), por estrutura (preciso) e por navegação (relacional) — com quando usar cada uma. Derivado do bundle servido; nada enumerável escrito à mão. Lê-o quando o atalho de `concerns` não tiver a pergunta que precisas.",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/activation-vocabulary",
          name: "SbD-ToE Activation Vocabulary",
          description:
            "DECLARATIVE-FIRST (0.20-beta): the CLOSED vocabulary this server accepts and what each value activates — concerns, exposure, data_sensitivity, technologies, changed_files path table, roles, phases, risk levels. Derived from the served bundle and the engine's own tables, never hand-written. Read it, map your reading of the request onto these values, and DECLARE them: the server answers the declared, it does not interpret prose.",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/index-compact",
          name: "SbD-ToE Index Compact",
          description:
            "Compact JSON index of the manual, DERIVED at read-time from the served bundle (graduated demand_by_level; no minLevel). Injectable into system prompt to eliminate exploratory discovery.",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/ontology",
          name: "SbD-ToE Ontology",
          description:
            "Full SbD-ToE ontology YAML: domain_mapping (requirement category → control domains), " +
            "inference rules with priorities, resolution pipelines (consult/guide/threats/review), " +
            "and entity schemas. Read once per session to understand the deterministic resolution model " +
            "before calling consult_security_requirements, get_threat_landscape or get_guide_by_role.",
          mimeType: "application/yaml"
        },
        {
          uri: "sbd://toe/skill/{role}",
          name: "SbD-ToE Role Skill",
          description:
            "Role-specialised SbD-ToE skill for a canonical role — RISK LEVEL FIXED AT L2 neste URI; " +
            "para outro nível usa generate_sbd_toe_skill(role, risk_level=…). Same output as generate_sbd_toe_skill(role, format=skill).",
          mimeType: "text/markdown"
        },
        {
          uri: "sbd://toe/subagent/{role}",
          name: "SbD-ToE Role Sub-agent Definition",
          description:
            "Installable sub-agent definition for a canonical role (default risk L2, harnessed flavour — " +
            "grants mcp__sbd-toe__* tools). Same output as generate_sbd_toe_skill(role, format=subagent).",
          mimeType: "text/markdown"
        },
        {
          uri: "sbd://toe/codegen-instructions/{mode}",
          name: "SbD-ToE Codegen Instructions (per mode)",
          description:
            "Static per-mode boilerplate of prepare_sbd_toe_codegen_context (mode: codegen, review or " +
            "test-plan): llm_codegen_instructions slots + security_rationale_template skeleton — " +
            "byte-identical to the detail=full inline content when assembled per the embedded rules — " +
            "plus the detail_encoding legend for detail=standard/minimal payloads (v2 token diet). " +
            "Referenced by codegen_instructions_ref in dieted payloads.",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/version",
          name: "SbD-ToE MCP Version",
          description: "Version of the running SbD-ToE MCP server (name, version, description) plus the provenance of the served knowledge: manual {version, commit}, kg {release_tag, substrate_version, consumer_contract_version} and ontology {tag, commit}, read from the consumed-bundle pin.",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/grounded-codegen-guide",
          name: "SbD-ToE Grounded Codegen Guide",
          description:
            "Agent-facing guide for using prepare_sbd_toe_codegen_context. " +
            "Covers workflow, branching by status (ready_for_codegen / needs_clarification / " +
            "needs_decomposition / unsupported_scope), output discipline (cite citation_map, fill " +
            "security_rationale, distinguish code/tests/evidence), and explicit prohibitions " +
            "(no invented IDs, no compliance claims, no rastreabilidade-noise inside source files).",
          mimeType: "text/markdown"
        }
] as const;


/**
 * The single source of the PROMPT surface — prompts/list derives from THIS list, and so
 * does the agent-guide's prompt table (0.20.0-beta.24). The hand-written table in the
 * guide listed 2 of the 3 prompts.
 */
export const PROMPT_CATALOG: ReadonlyArray<Record<string, unknown>> = [
  {
      name: "ask_sbd_toe_manual",
      title: "Ask SbD-ToE Manual",
      description:
        "MCP prompt to guide the AI chat to answer questions about the SbD-ToE manual with grounding.",
      arguments: [
        {
          name: "question",
          description: "Question about the SbD-ToE manual.",
          required: true
        }
      ]
    },
        
        {
          name: "setup_sbd_toe_agent",
          title: "Setup SbD-ToE Agent",
          description:
            "START HERE — entry point (2ª chamada, após leres sbd://toe/agent-guide): MCP PROMPT (clientes sem suporte de prompts não o expõem — alternativa: activadores estruturados directos no select) to configure an agent with SbD-ToE manual context and rules for a given risk level.",
          arguments: [
            {
              name: "riskLevel",
              description: "Project risk level: L1, L2 or L3.",
              required: true
            },
            {
              name: "projectRole",
              description: "Project role or description (optional).",
              required: false
            }
          ]
        },
        {
          name: "prepare_grounded_codegen",
          title: "Prepare Grounded Codegen (SbD-ToE)",
          description:
            "MCP prompt that bundles the grounded-codegen guide with a user task and instructs the " +
            "agent to call prepare_sbd_toe_codegen_context before producing code. Forces citation of " +
            "citation_map IDs, fills security_rationale_template, distinguishes code/tests/evidence, " +
            "blocks compliance claims, and routes needs_clarification / needs_decomposition / " +
            "unsupported_scope to user dialog instead of silent guessing.",
          arguments: [
            {
              name: "task",
              description: "Concrete coding task (e.g. 'Add payload validation to PATCH /users/:id/email').",
              required: true
            },
            {
              name: "mode",
              description: "codegen | review | test-plan. Defaults to codegen.",
              required: false
            },
            {
              name: "riskLevel",
              description: "Project risk level: L1, L2 or L3.",
              required: false
            },
            {
              name: "concerns",
              description:
                "Concerns DECLARADOS do vocabulário fechado (`sbd://toe/activation-vocabulary`); string separada por vírgulas ou array. Sem declaração o servidor NÃO infere a partir do texto: pede-a (needs_input).",
              required: false
            },
            {
              name: "stack",
              description: "Stack hint (e.g. 'Node.js/Express'). Informational.",
              required: false
            },
            {
              name: "regulatoryFrameworks",
              description:
                "Optional regulatory framework short codes or IDs (e.g. 'GDPR', 'EXT-DORA'). Comma-separated string or array.",
              required: false
            },
            {
              name: "includeRegulatoryOverlay",
              description: "When true, asks the tool to surface regulatory overlay context.",
              required: false
            }
          ]
        }];
