#!/usr/bin/env node

import { handleTraceRequirementSources } from "./tools/trace-requirement-sources.js";
import { buildDerivedIndexCompact } from "./serving/applicability.js";
import { TECHNOLOGY_TO_CHAPTERS } from "./serving/selection.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import readline from "node:readline";

import { getConfig, resolveAppPath } from "./config.js";
import {
  formatSampledAnswerResult,
  inspectManualRetrieval,
  prepareManualAnsweringContext,
  searchManualQuestion
} from "./orchestrator/ask-manual.js";
import { loadSystemPromptTemplate } from "./prompt/system-prompt.js";
import { loadBundleProvenance, servedKgReleaseTag, servingServerVersion } from "./version-info.js";
import {
  handleGetSbdToeChapterBrief,
  handleListSbdToeChapters,
  handleMapSbdToeApplicability,
  handleQuerySbdToeEntities
} from "./tools/structured-tools.js";
import { handleGenerateSbdToeSkill } from "./tools/generate-sbd-toe-skill.js";
import { handleMapSbdToeReviewScope } from "./tools/map-review-scope.js";
import { handleMapRegulatoryActivation } from "./tools/map-regulatory-activation.js";
import { handleGetChapterImplementationChecklist } from "./tools/get-chapter-implementation-checklist.js";
import { handleGetOperatingModel } from "./tools/get-operating-model.js";
import { handlePlanRollout } from "./tools/plan-rollout.js";
import { handleAssessImplementation } from "./tools/assess-implementation.js";
import { handleGetVerificationMatrix } from "./tools/get-verification-matrix.js";
import { handlePlanRepoGovernance } from "./tools/plan-repo-governance.js";
import { handleConsultSecurityRequirements } from "./tools/consult-security-requirements.js";
import { handleSelectRequirements } from "./tools/select-requirements.js";
import { handleGetThreatLandscape } from "./tools/get-threat-landscape.js";
import { handleGetGuideByRole } from "./tools/get-guide-by-role.js";
import { handleResolveEntities } from "./tools/resolve-entities.js";
import { handleTraceGraph } from "./tools/trace-graph.js";
import { buildActivationVocabulary } from "./serving/activation-vocabulary.js";

/**
 * P1-C (0.20.0-beta.22) — UM vocabulário, UM contrato: o `enum` dos `concerns` nas
 * três tools é GERADO pelo mesmo builder que produz sbd://toe/activation-vocabulary.
 * Antes havia três posturas para o mesmo conjunto fechado (select sem enum, consult
 * com 13 dos 24, prepare só na descrição) — sob declarative-first o vocabulário É a
 * interface, logo a divergência era um defeito de 1ª ordem. Agora não pode derivar:
 * se o vocabulário mudar, os schemas mudam com ele.
 */
const DECLARED_CONCERNS: string[] = buildActivationVocabulary().concerns.values.map((c) => String(c.value));
const CONCERNS_VOCABULARY_NOTE =
  `Conjunto FECHADO de ${DECLARED_CONCERNS.length} valores, gerado do mesmo vocabulário que sbd://toe/activation-vocabulary publica (com o que cada valor activa e quantos requisitos traz por nível). Valores fora do conjunto são DECLARADOS na resposta (unknown_concerns), nunca descartados em silêncio.`;
import {
  buildCodegenInstructionsResourceContent,
  handlePrepareCodegenContext,
  type CodegenMode
} from "./tools/prepare-codegen-context.js";
import {
  buildChapterApplicabilityJson,
  buildGroundedCodegenPrompt,
  buildSetupAgentPrompt,
  readGroundedCodegenGuide
} from "./resources/sbd-toe-resources.js";
import { RESOURCE_CATALOG, PROMPT_CATALOG } from "./serving/server-surface.js";
import { buildAgentGuide } from "./serving/agent-guide.js";
import { threatConcernSupport } from "./tools/get-threat-landscape.js";

type JsonRpcId = string | number;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: JsonRpcId | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

interface PackageMetadata {
  name: string;
  version: string;
  description: string;
}


type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcError;

const PROTOCOL_VERSION = "2025-03-26";
let cachedPackageMetadata: PackageMetadata | undefined;
const LOG_LEVELS = [
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency"
] as const;

function loadPackageMetadata(): PackageMetadata {
  if (cachedPackageMetadata) {
    return cachedPackageMetadata;
  }

  const pkgPath = resolveAppPath("package.json");
  let pkgText: string;
  try {
    pkgText = readFileSync(pkgPath, "utf-8");
  } catch {
    throw new Error("Could not read package.json.");
  }

  const pkg = JSON.parse(pkgText) as {
    name?: string;
    version?: string;
    description?: string;
  };

  cachedPackageMetadata = {
    name: pkg.name ?? "sbd-toe-mcp-poc",
    version: pkg.version ?? "0.0.0",
    description: pkg.description ?? ""
  };

  return cachedPackageMetadata;
}

type LogLevel = (typeof LOG_LEVELS)[number];

interface LogEvent {
  event_type: string;
  outcome?: "started" | "succeeded" | "failed" | "ignored";
  request_id?: string | undefined;
  rpc_method?: string | undefined;
  tool_name?: string | undefined;
  duration_ms?: number | undefined;
  question_length?: number | undefined;
  question_fingerprint?: string | undefined;
  debug_enabled?: boolean | undefined;
  top_k?: number | undefined;
  sampling_max_tokens?: number | undefined;
  previous_level?: LogLevel | undefined;
  new_level?: LogLevel | undefined;
  error_code?: number | string | undefined;
  error_name?: string | undefined;
  message: string;
}



/** Declared resource-read failure (never-silent): carries the JSON-RPC code. */
/**
 * Materialize any resource of RESOURCE_CATALOG by concrete URI (templated URIs
 * take the value in the URI, e.g. sbd://toe/codegen-instructions/codegen).
 * Shared by resources/read AND the read_sbd_toe_resource tool (0.13.0) — one
 * implementation, no drift. Unknown URI ⇒ ResourceReadError listing the valid set.
 */
async function materializeResource(uri: string): Promise<{ mimeType: string; text: string }> {
  const path = uri.startsWith("sbd:") ? uri.slice(4) : "";

  const applicabilityMatch = /^\/\/toe\/chapter-applicability\/([^/]+)$/.exec(path);
  if (applicabilityMatch !== null) {
    const riskLevel = applicabilityMatch[1] ?? "";
    if (!["L1", "L2", "L3"].includes(riskLevel)) {
      throw new ResourceReadError(-32602, `Invalid riskLevel: "${riskLevel}". Allowed values: L1, L2, L3.`);
    }
    const data = buildChapterApplicabilityJson(riskLevel);
    return { mimeType: "application/json", text: JSON.stringify(data, null, 2) };
  }

  const codegenInstructionsMatch = /^\/\/toe\/codegen-instructions\/([^/]+)$/.exec(path);
  if (codegenInstructionsMatch !== null) {
    const mode = codegenInstructionsMatch[1] ?? "";
    if (!["codegen", "review", "test-plan"].includes(mode)) {
      throw new ResourceReadError(-32602, `Invalid codegen-instructions mode: "${mode}". Allowed values: codegen, review, test-plan.`);
    }
    const content = buildCodegenInstructionsResourceContent(mode as CodegenMode);
    return { mimeType: "application/json", text: JSON.stringify(content, null, 2) };
  }

  const roleSkillMatch = /^\/\/toe\/(skill|subagent)\/([^/]+)$/.exec(path);
  if (roleSkillMatch !== null) {
    const format = roleSkillMatch[1] === "subagent" ? "subagent" : "skill";
    const role = decodeURIComponent(roleSkillMatch[2] ?? "");
    try {
      const result = handleGenerateSbdToeSkill({ role, format });
      return { mimeType: "text/markdown", text: result.content };
    } catch (error) {
      throw new ResourceReadError(-32602, error instanceof Error ? error.message : "Could not generate role skill.");
    }
  }

  if (uri === "sbd://toe/activation-vocabulary") {
    return { mimeType: "application/json", text: JSON.stringify(buildActivationVocabulary(), null, 2) };
  }

  if (uri === "sbd://toe/index-compact") {
    // 0.15.0 (P0-2): DERIVADO do bundle no arranque — o estático de Março morreu.
    return { mimeType: "application/json", text: JSON.stringify(buildDerivedIndexCompact(TECHNOLOGY_TO_CHAPTERS), null, 2) };
  }

  if (uri === "sbd://toe/agent-guide") {
    try {
      return { mimeType: "text/markdown", text: buildAgentGuide() };
    } catch {
      throw new ResourceReadError(-32603, "Could not read SbD-ToE agent guide.");
    }
  }

  if (uri === "sbd://toe/ontology") {
    try {
      return { mimeType: "application/yaml", text: readFileSync(resolveAppPath("data/publish/ontology/sbdtoe-ontology.yaml"), "utf-8") };
    } catch {
      throw new ResourceReadError(-32603, "Could not read SbD-ToE ontology YAML.");
    }
  }

  if (uri === "sbd://toe/grounded-codegen-guide") {
    try {
      return { mimeType: "text/markdown", text: readGroundedCodegenGuide() };
    } catch {
      throw new ResourceReadError(-32603, "Could not read SbD-ToE grounded codegen guide.");
    }
  }

  if (uri === "sbd://toe/version") {
    try {
      const pkg = loadPackageMetadata();
      const provenance = loadBundleProvenance();
      const payload = JSON.stringify({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        // Provenance of the served knowledge (from the consumed-bundle.json pin).
        // Absent if the pin cannot be read; never invented.
        manual: provenance?.manual,
        kg: provenance?.kg,
        ontology: provenance?.ontology,
        // 0.20.0-beta.21 — a SEMÂNTICA de serviço mudou nesta linha, não só a versão:
        // para um produto que vende reprodutibilidade, mudar isto em silêncio seria a
        // pior violação da própria promessa.
        serving_contract: {
          version: "v1.18-beta",
          semantics: "declarative-first",
          line: "0.20-beta (experiência autorizada pelo programme lead 2026-09-05)",
          changed:
            "A selecção passou a ser função APENAS do que o chamador declara (risk_level, concerns, exposure, data_sensitivity, technologies, changed_files). O `task` é contexto registado para auditoria e não influencia o resultado; sem declarações a resposta é needs_input (nunca zero, nunca adivinhado). A baseline do nível pede-se com mode='baseline'.",
          vocabulary_resource: "sbd://toe/activation-vocabulary",
          discover_mode:
            "O motor inferencial anterior (casamento lexical da prosa) continua disponível em mode='discover' — exploratório, marcado na resposta, para o oráculo histórico e o estudo de paráfrase.",
          migration:
            "v1.17 → v1.18-beta: quem enviava só `task` recebe agora needs_input com o vocabulário e candidatos A CONFIRMAR; declarar os activadores (ou pedir mode='discover'/'baseline') restabelece uma resposta com conteúdo. Linha estável inalterada."
        }
      });
      return { mimeType: "application/json", text: payload };
    } catch {
      throw new ResourceReadError(-32603, "Could not read package.json.");
    }
  }

  throw new ResourceReadError(-32602, `Unknown resource URI: ${uri}. Valid URIs (templated take the value in the URI): ${validResourceUris()}.`);
}

class ResourceReadError extends Error {
  constructor(public readonly code: number, message: string) {
    super(message);
  }
}

function validResourceUris(): string {
  return RESOURCE_CATALOG.map((r) => r.uri).join(", ");
}

class McpRuntime {
  private nextRequestId = 10_000;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private clientCapabilities: Record<string, unknown> = {};
  private initialized = false;
  private logLevel: LogLevel = "info";

  constructor() {
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity
    });

    rl.on("line", (line: string) => {
      void this.handleIncomingLine(line);
    });
  }

  private writeMessage(message: unknown): void {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  }

  private normalizeLogLevel(level: unknown): LogLevel {
    if (typeof level === "string") {
      const normalized = LOG_LEVELS.find((candidate) => candidate === level);
      if (normalized) {
        return normalized;
      }
    }

    return "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.logLevel);
  }

  private getRequestId(id: JsonRpcId | null | undefined): string | undefined {
    return id === null || id === undefined ? undefined : String(id);
  }

  private fingerprintQuestion(question: string): string {
    return createHash("sha256").update(question, "utf8").digest("hex").slice(0, 12);
  }

  private getQuestionMetadata(args: Record<string, unknown>): {
    question_length?: number;
    question_fingerprint?: string;
  } {
    const question = args.question;
    if (typeof question !== "string") {
      return {};
    }

    return {
      question_length: question.length,
      question_fingerprint: this.fingerprintQuestion(question)
    };
  }

  private sanitizeErrorMessage(message: string): string {
    // Strip absolute paths to avoid leaking filesystem layout to MCP clients
    return message
      .replace(/\/(?:Users|home|Volumes|tmp|var|etc|opt|root)[^\s,'")}]*/g, "[path]")
      .replace(/[A-Za-z]:\\[^\s,'")}]*/g, "[path]")
      .split("\n", 1)[0] ?? "Unexpected error";
  }

  private summarizeError(error: unknown): Pick<LogEvent, "error_name" | "message"> {
    if (error instanceof Error) {
      return {
        error_name: error.name,
        message: error.message.split("\n", 1)[0] ?? "Unexpected error"
      };
    }

    return {
      message: String(error)
    };
  }

  private sendResponse(id: JsonRpcId, result: unknown): void {
    this.writeMessage({
      jsonrpc: "2.0",
      id,
      result
    });
  }

  private sendError(id: JsonRpcId | null, code: number, message: string, data?: unknown): void {
    this.writeMessage({
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        ...(data === undefined ? {} : { data })
      }
    });
  }

  private sendNotification(method: string, params?: Record<string, unknown>): void {
    this.writeMessage({
      jsonrpc: "2.0",
      method,
      ...(params === undefined ? {} : { params })
    });
  }

  private async handleIncomingLine(line: string): Promise<void> {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch (error) {
      await this.log("warning", {
        event_type: "rpc.parse_error",
        outcome: "failed",
        ...this.summarizeError(error)
      });
      this.sendError(null, -32700, "Parse error", {
        detail: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        await this.handleMessage(item as JsonRpcMessage);
      }
      return;
    }

    await this.handleMessage(parsed as JsonRpcMessage);
  }

  private resolvePending(message: JsonRpcSuccess | JsonRpcError): boolean {
    if (message.id === null) {
      return false;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return false;
    }

    this.pending.delete(message.id);
    if ("error" in message) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result);
    }
    return true;
  }

  private async handleMessage(message: JsonRpcMessage): Promise<void> {
    if ("id" in message && ("result" in message || "error" in message)) {
      this.resolvePending(message);
      return;
    }

    if (!("method" in message)) {
      await this.log("warning", {
        event_type: "rpc.invalid_request",
        outcome: "failed",
        message: "Received JSON-RPC message without method"
      });
      this.sendError(null, -32600, "Invalid Request");
      return;
    }

    if (!("id" in message)) {
      this.handleNotification(message);
      return;
    }

    try {
      await this.handleRequest(message);
    } catch (error) {
      await this.log("error", {
        event_type: "rpc.unhandled_error",
        outcome: "failed",
        request_id: this.getRequestId(message.id),
        rpc_method: message.method,
        ...this.summarizeError(error)
      });
      this.sendError(
        message.id,
        -32603,
        error instanceof Error ? this.sanitizeErrorMessage(error.message) : "Internal error"
      );
    }
  }

  private handleNotification(message: JsonRpcNotification): void {
    if (message.method === "notifications/initialized") {
      this.initialized = true;
      return;
    }

    if (message.method === "notifications/cancelled") {
      return;
    }
  }

  private async handleRequest(request: JsonRpcRequest): Promise<void> {
    switch (request.method) {
      case "initialize":
        this.handleInitialize(request);
        return;
      case "ping":
        this.sendResponse(request.id, {});
        return;
      case "logging/setLevel":
        this.handleSetLogLevel(request);
        return;
      case "tools/list":
        this.handleToolsList(request);
        return;
      case "tools/call":
        await this.handleToolsCall(request);
        return;
      case "prompts/list":
        this.handlePromptsList(request);
        return;
      case "prompts/get":
        this.handlePromptGet(request);
        return;
      case "resources/list":
        this.handleResourcesList(request);
        return;
      case "resources/read":
        await this.handleResourcesRead(request);
        return;
      default:
        this.sendError(request.id, -32601, `Method not found: ${request.method}`);
    }
  }

  private handleInitialize(request: JsonRpcRequest): void {
    const params = request.params ?? {};
    this.clientCapabilities =
      typeof params.capabilities === "object" && params.capabilities !== null
        ? (params.capabilities as Record<string, unknown>)
        : {};
    const packageMetadata = loadPackageMetadata();

    this.sendResponse(request.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        logging: {},
        prompts: {
          listChanged: false
        },
        resources: {
          subscribe: false,
          listChanged: false
        },
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: "sbd-toe-mcp-poc",
        version: packageMetadata.version
      },
      instructions:
        "⛳ START HERE — FIRST CALL, ALWAYS: read resource sbd://toe/agent-guide (or call\n" +
        "read_sbd_toe_resource(uri=\"sbd://toe/agent-guide\")); THEN setup_sbd_toe_agent(riskLevel,\n" +
        "projectRole). Um agente virgem NÃO deve precisar de sorte: se não sabes que tool chamar,\n" +
        "é esta a ordem.\n" +
        "\n" +
        "You are connected to the SbD-ToE MCP server (Security by Design — Theory of Everything).\n" +
        "Chapters 00–14. Security guidance only — does not override project rules or development standards.\n" +
        "Always respond in the user's language regardless of the manual content language.\n" +
        "\n" +
        "ENTRY POINT: read resource sbd://toe/agent-guide, then call setup_sbd_toe_agent(riskLevel, projectRole).\n" +
        "\n" +
        "At session start, identify the server: read resource sbd://toe/version — or call the\n" +
        "read_sbd_toe_resource tool with that URI on clients without resource support — to learn\n" +
        "the server version and the served knowledge (manual/kg/ontology, from the verified pin).\n" +
        "\n" +
        "BEFORE answering any SbD-ToE question, read resource sbd://toe/agent-guide — it contains\n" +
        "operating modes, routing by phase/domain, tool selection, epistemic standards, and chapter map.\n" +
        "\n" +
        "Then run setup_sbd_toe_agent(riskLevel, projectRole) for risk-level specific active chapters.\n" +
        "\n" +
        "To create a skill or instructions file for an AI client, use generate_sbd_toe_skill(clientType).\n" +
        "For a per-role configuration, use generate_sbd_toe_skill(role, format=skill|subagent, flavour=harnessed|skilled) " +
        "— or read resource sbd://toe/skill/{role} / sbd://toe/subagent/{role}."
    });
  }

  private handleSetLogLevel(request: JsonRpcRequest): void {
    const previousLevel = this.logLevel;
    const level = this.normalizeLogLevel(request.params?.level);
    this.logLevel = level;
    this.sendResponse(request.id, {});
    void this.log("notice", {
      event_type: "logging.level_changed",
      outcome: "succeeded",
      request_id: this.getRequestId(request.id),
      rpc_method: request.method,
      previous_level: previousLevel,
      new_level: level,
      message: "Updated runtime log level"
    });
  }

  private async log(level: LogLevel, event: LogEvent): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    this.sendNotification("notifications/message", {
      level,
      logger: "sbd-toe-mcp-poc",
      data: {
        timestamp: new Date().toISOString(),
        component: "mcp-runtime",
        ...event
      }
    });
  }

  private handleToolsList(request: JsonRpcRequest): void {
    this.sendResponse(request.id, {
      tools: [
        {
          name: "search_sbd_toe_manual",
          title: "Search SbD-ToE Manual",
          description:
            "NÃO-NORMATIVO — leitura e orientação, NUNCA caminho para um conjunto de requisitos. Pesquisa semântica sobre os chunks publicados do manual: serve para LER e localizar passagens (e para tu, LLM, formares a tua leitura), não para decidir âmbito. O conjunto de requisitos vem de select_sbd_toe_requirements com activadores DECLARADOS (vocabulário em sbd://toe/activation-vocabulary) — o que aqui sai não selecciona nada e não deve ser citado como se fosse selecção.",
          inputSchema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Natural-language question about the manual."
              },
              debug: {
                type: "boolean",
                description: "When true, appends full retrieval debug information."
              },
              topK: {
                type: "integer",
                minimum: 1,
                maximum: 15,
                description: "Maximum number of records used as context."
              },
              useVectorRecall: {
                type: "boolean",
                description:
                  "When true, enables optional vector-skin recall as a secondary grounding layer after structured MCP retrieval."
              }
            },
            required: ["question"],
            additionalProperties: false
          },
          annotations: {
            readOnlyHint: true
          }
        },
        {
          name: "answer_sbd_toe_manual",
          title: "Answer SbD-ToE Manual",
          description:
            "Retrieves SbD-ToE manual context and requests the final answer from the client's model via MCP sampling. " +
            "Requires sampling support from the MCP client. " +
            "Without sampling, falls back to formatted retrieval output (same as search_sbd_toe_manual). " +
            "Prefer search_sbd_toe_manual for clients without sampling support.",
          inputSchema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Natural-language question about the manual."
              },
              debug: {
                type: "boolean",
                description: "When true, appends full debug information."
              },
              topK: {
                type: "integer",
                minimum: 1,
                maximum: 15,
                description: "Maximum number of records used as context."
              },
              useVectorRecall: {
                type: "boolean",
                description:
                  "When true, enables optional vector-skin recall as a secondary grounding layer after structured MCP retrieval."
              }
            },
            required: ["question"],
            additionalProperties: false
          },
          annotations: {
            readOnlyHint: true
          }
        },
        {
          name: "inspect_sbd_toe_retrieval",
          title: "Inspect SbD-ToE Retrieval",
          description:
            "Inspects retrieval, context selection and final prompt without requesting an answer from the client model.",
          inputSchema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Question to use for the retrieval inspection."
              },
              topK: {
                type: "integer",
                minimum: 1,
                maximum: 15,
                description: "Maximum number of records selected for the prompt."
              },
              useVectorRecall: {
                type: "boolean",
                description:
                  "When true, enables optional vector-skin recall as a secondary grounding layer after structured MCP retrieval."
              }
            },
            required: ["question"],
            additionalProperties: false
          },
          annotations: {
            readOnlyHint: true
          }
        },
        {
          name: "list_sbd_toe_chapters",
          title: "List SbD-ToE Chapters",
          description:
            "Lists SbD-ToE manual chapters with id, canonical title, a clean readableTitle, graduated applicability (all levels true) and derived demand_by_level (0.14.0 — the binary minLevel theory is retired).",
          inputSchema: {
            type: "object",
            properties: {
              riskLevel: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Filter by risk level."
              }
            },
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "query_sbd_toe_entities",
          title: "Query SbD-ToE Entities",
          description: "Queries manual entities by text, entity type, chapter or risk level.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", minLength: 1, maxLength: 200, description: "Free text, or an exact entity id (resolved directly: match=exact_id)." },
              entityType: { type: "string", description: "Filter chunks by the entity type they mention: Requirement | UserStory | Metric | Threat (aliases accepted, e.g. requirements, us, kpi). Structured records (controls, control objectives, mechanisms, artifacts) are queried with resolve_entities instead." },
              chapterId: { type: "string", description: "Filter by chapter bundle id (e.g. 06-desenvolvimento-seguro) or its numeric prefix." },
              riskLevel: { type: "string", enum: ["L1", "L2", "L3"], description: "Filter by the chunk's published risk facet; chunks without a facet are not returned (declared in the `filters` field of the result)." },
              topK: { type: "integer", minimum: 1, maximum: 15 }
            },
            required: ["query"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "get_sbd_toe_chapter_brief",
          title: "Get SbD-ToE Chapter Brief",
          description:
            "Returns an operational summary of a chapter: title, objective, role, phases, artefacts (fields are present when the substrate carries them).",
          inputSchema: {
            type: "object",
            properties: {
              chapterId: { type: "string", minLength: 1 }
            },
            required: ["chapterId"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "plan_sbd_toe_repo_governance",
          title: "List SbD-ToE Manual Artefacts",
          description:
            "Returns the list of artefacts/documents identified in the SbD-ToE manual, " +
            "grouped by chapter, with risk level applicability. " +
            "Optionally filter by riskLevel (L1/L2/L3). " +
            "All data comes from the manual indices — nothing is invented. " +
            "The manual does not provide templates; ask the LLM to generate one if needed.",
          inputSchema: {
            type: "object",
            properties: {
              riskLevel: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Optional. If provided, only artefacts applicable at this risk level are returned."
              },
              offset: {
                type: "integer",
                minimum: 0,
                description: "Optional. 0-based chapter offset for coverage-preserving pagination of byChapter. Follow `coverage.nextOffset`; o DEFAULT devolve a 1ª página de 5 capítulos (0.15.0) — coverage/size_estimate declaram o resto."
              },
              limit: {
                type: "integer",
                minimum: 1,
                description: "Optional. Max chapters per page. Use with `offset` to keep the response within a size budget; see `coverage` and `size_estimate` in the result."
              }
            },
            required: [],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "generate_sbd_toe_skill",
          title: "Generate SbD-ToE Skill Content",
          description:
            "Use this tool when asked to 'create a skill for SbD-ToE', 'set up instructions', " +
            "'configure this client/agent to use SbD-ToE', 'configure yourself for role X', or 'integrate SbD-ToE'. " +
            "Without arguments returns the canonical skill content from sbd://toe/agent-guide. " +
            "With role= returns a role-specialised skill (format=skill) or an installable sub-agent " +
            "definition (format=subagent) grounded on the role's manual slice — flavour=harnessed grants " +
            "the mcp__sbd-toe__* tools (queries live); flavour=skilled embeds the frozen slice with no MCP tools. " +
            "Save the returned content to suggested_path (or the client equivalent).",
          inputSchema: {
            type: "object",
            properties: {
              role: {
                type: "string",
                description:
                  "Canonical role_id or natural alias (e.g. devops-sre, sre, developer, appsec, qa). " +
                  "Unknown roles error with the canonical list — nothing is invented."
              },
              risk_level: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Risk level the skill is scoped to. Default L2."
              },
              format: {
                type: "string",
                enum: ["skill", "subagent"],
                description: "skill = role-specialised guidance file (default); subagent = installable agent definition."
              },
              flavour: {
                type: "string",
                enum: ["harnessed", "skilled"],
                description:
                  "Subagent flavour. harnessed (default) grants mcp__sbd-toe__* and queries live; " +
                  "skilled embeds the frozen skill and carries no MCP tools."
              },
              include_detail: {
                type: "boolean",
                description:
                  "Embed the full DoD checklist items in the slice (heavy payload — coverage declares the size). Default false: titles + counts."
              },
              phase: {
                type: "string",
                description: "Optional lifecycle phase to narrow the slice (canonical resolution as in get_guide_by_role)."
              },
              tool_prefix: { type: "string", description: "0.15.0: prefixo das tools MCP no frontmatter dos subagentes harnessed (default mcp__sbd-toe__) — o prefixo real depende do deployment do cliente." },
              clientType: {
                type: "string",
                description: "Optional client hint (claude, copilot, cursor) — affects suggested_path only."
              }
            },
            required: [],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "map_sbd_toe_review_scope",
          title: "Map SbD-ToE Review Scope",
          description:
            "Given a set of changed files, maps which SbD-ToE knowledge bundles should be reviewed, with explicit reasoning per path.",
          inputSchema: {
            type: "object",
            properties: {
              changedFiles: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
                description: "List of paths relative to the repository root."
              },
              riskLevel: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Project risk level."
              },
              projectContext: {
                type: "object",
                description: "Additional project context (optional).",
                properties: {
                  repoRole:          { type: "string" },
                  runtimeModel:      { type: "string" },
                  distributionModel: { type: "string" },
                  hasCi:             { type: "boolean" }
                },
                additionalProperties: false
              },
              diffSummary: {
                type: "string",
                description: "Diff summary (truncated to 500 chars)."
              }
            },
            required: ["changedFiles", "riskLevel"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "get_sbd_toe_chapter_implementation_checklist",
          title: "Get SbD-ToE Chapter Implementation Checklist",
          description:
            "The canon/20 'how to implement chapter NN' checklist — retrieval-grounded prose from the " +
            "implementation profile (the operational 'Aplicação no Ciclo de Vida' guidance). Use to answer " +
            "'how do I implement chapter NN / this area?'. Coverage-preserving; cites chunk ids; nothing invented. " +
            "For the level-sharp structured Definition-of-Done use get_guide_by_role(include_detail=true).",
          inputSchema: {
            type: "object",
            properties: {
              chapter: { type: "string", description: "Chapter id (08-iac-infraestrutura) or number (8)." },
              risk_level: { type: "string", enum: ["L1", "L2", "L3"], description: "Informational; the level-sharp DoD is in get_guide_by_role." },
              offset: { type: "number" },
              limit: { type: "number" }
            },
            required: ["chapter"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "get_sbd_toe_operating_model",
          title: "Get SbD-ToE Operating Model",
          description:
            "The operating model — RACI, decision-rights, governance cadences, org-model — from the rollout " +
            "playbook (implementation profile). Retrieval-grounded prose; coverage-preserving; nothing invented. " +
            "Use to answer 'who is responsible / how do we govern the SbD rollout?'.",
          inputSchema: {
            type: "object",
            properties: {
              orgScope: { type: "string", description: "Optional filter (e.g. an org example/tier keyword)." },
              offset: { type: "number" },
              limit: { type: "number" }
            },
            required: [],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "get_sbd_toe_verification_matrix",
          title: "Get SbD-ToE Verification Matrix",
          description:
            "The EXPECTED side of verification: per requirement/control at a risk level, the validation method " +
            "+ expected evidence + EvidencePattern reference (the published patterns — totals declared per response). The deterministic " +
            "complement of the auditor's expectation and the test-plan. Cited per row; coverage-preserving — " +
            "declares the requirements with no EvidencePattern. Use to answer 'how do I prove chapter/level X?' — or 'how do I prove THESE requirements?' via requirement_ids (o fecho requisito→prova a partir do select).",
          inputSchema: {
            type: "object",
            properties: {
              risk_level: { type: "string", enum: ["L1", "L2", "L3"], description: "Risk level (filters via the pattern's risk_level_hint; unhinted patterns apply broadly)." },
              requirement_ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50, description: "Máx. 50 por chamada (tecto imposto 0.19.3; ~190 tk/id por medição — pagina por lotes). 0.17.0: «como provo ESTES?» — filtra a matriz pelos requisitos concretos (ex.: os selected do select_sbd_toe_requirements); ids sem EvidencePattern vêm DECLARADOS em unknown_requirement_ids." },
              offset: { type: "number" },
              limit: { type: "number" }
            },
            required: ["risk_level"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "assess_sbd_toe_implementation",
          title: "Assess SbD-ToE Implementation",
          description:
            "Progress / 'how implemented am I': compares submitted KPI values against the published per-level " +
            "thresholds (metrics.json) → posture (below/at/above) + gaps per KPI. Stateless self-report — values " +
            "in, posture out, nothing stored; thresholds never invented; an applicable KPI with no value is " +
            "not_reported (never a pass). Use to answer 'am I compliant at L2 / where are my gaps?'.",
          inputSchema: {
            type: "object",
            properties: {
              kpi_values: {
                type: "object",
                description: "Map of metric_id → numeric value (e.g. {\"ARC-K01\": 85}). Non-numeric values ignored.",
                additionalProperties: { type: "number" }
              },
              risk_level: { type: "string", enum: ["L1", "L2", "L3"], description: "Target/'compliant' band." },
              offset: { type: "number", description: "Coverage-preserving page offset over per_kpi." },
              limit: { type: "number", description: "Max per_kpi rows per page (default 15; follow coverage.nextOffset)." }
              ,gaps_offset: { type: "number", description: "0.15.1: paginação própria dos gaps (highlight severity-first); ver gaps_coverage." },
              gaps_limit: { type: "number", description: "Máx. gaps por página (default 10)." }
            },
            required: ["kpi_values", "risk_level"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "plan_sbd_toe_rollout",
          title: "Plan SbD-ToE Rollout (MVP)",
          description:
            "A phased rollout roadmap: the canonical lifecycle phases (phase-order) mapped to manual chapters. " +
            "MVP — phase-ordered, the dependency DAG is deferred (declared, not faked). Grounded in the published " +
            "runtime; nothing invented. Use to answer 'in what order do we roll out SbD?'.",
          inputSchema: {
            type: "object",
            properties: {
              orgProfile: { type: "string", description: "Optional org profile hint (informational in the MVP)." },
              horizon: { type: "number", description: "Optional cap on how many phases the roadmap spans." },
              offset: { type: "number" },
              limit: { type: "number" }
            },
            required: [],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "map_sbd_toe_regulatory_activation",
          title: "Map SbD-ToE Regulatory Activation",
          description:
            "Regulatory lens (reverse of provenance): given a framework (DORA, NIS2, CRA, RGPD), " +
            "returns which SbD-ToE manual areas/chapters it activates, grouped with mapping + obligation " +
            "counts per chapter (coverage-preserving — never a blind dump). Data from the published overlay " +
            "mappings; nothing invented. Use to answer 'framework X → what do I need to implement?'.",
          inputSchema: {
            type: "object",
            properties: {
              framework: {
                type: "string",
                description: "Framework short code or id (DORA, NIS2, CRA, RGPD; or EXT-DORA …)."
              },
              offset: { type: "number", description: "Coverage-preserving page offset over activated areas." },
              limit: { type: "number", description: "Max activated areas per page (follow coverage.nextOffset)." }
            },
            required: ["framework"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "map_sbd_toe_applicability",
          title: "Map SbD-ToE Applicability",
          description:
            "GRADUATED applicability (0.14.0): every chapter applies at every level — returns per-chapter authored demand (obrigatório/recomendado/opcional/specific) derived from the bundle, anchored on the chapter-01 canonical matrix; plus context-conditional bundles for the given technologies. projectRole adds a per-role view. Nothing is excluded by level.",
          inputSchema: {
            type: "object",
            properties: {
              riskLevel: { type: "string", enum: ["L1", "L2", "L3"] },
              technologies: {
                type: "array",
                items: {
                  type: "string",
                  enum: [
                    "containers", "serverless", "kubernetes", "ci-cd", "iac", "api-gateway",
                    "mobile", "spa", "microservices", "legacy-integration", "ml-ai", "data-pipeline",
                    "sca-sbom", "sast", "dast", "secrets-management", "monitoring", "iam",
                    "network-segmentation", "cryptography"
                  ]
                },
                description: "Technologies used in the project."
              },
              hasPersonalData: {
                type: "boolean",
                description:
                  "Does the project process personal data? Informational only — does not affect the returned scope (chapter/control activation derives from riskLevel and technologies)."
              },
              isPublicFacing: {
                type: "boolean",
                description:
                  "Does the project have public-facing exposure? Informational only — does not affect the returned scope (chapter/control activation derives from riskLevel and technologies)."
              },
              projectRole: {
                type: "string",
                enum: ["developer", "architect", "security", "devops", "manager"],
                description:
                  "User role in the project. Informational only — does not affect the returned scope."
              }
            },
            required: ["riskLevel"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "read_sbd_toe_resource",
          title: "Read SbD-ToE Resource (mirror)",
          description:
            "Mirror of resources/read for clients without MCP resource support (e.g. Claude Desktop): " +
            "returns the content of any server resource by URI — including templated ones with the value " +
            "in the URI (e.g. sbd://toe/codegen-instructions/codegen). Makes the codegen_instructions_ref " +
            "of dieted prepare payloads resolvable on ANY client, and sbd://toe/version readable as a tool. " +
            `Valid URIs: ${validResourceUris()}. ` +
            "Unknown URI returns a declared error listing the valid set (never silent).",
          inputSchema: {
            type: "object",
            properties: {
              uri: { type: "string", minLength: 1, description: "Resource URI (see the valid list in the tool description; templated URIs take the concrete value in place of {…})." },
              slot: { type: "string", description: "0.15.0: para recursos JSON com slots (codegen-instructions): devolve só o slot pedido; slot desconhecido ⇒ erro com a lista de slots." },
              char_offset: { type: "number", description: "0.15.0: paginação por caracteres sobre o texto do recurso (coverage + size_estimate sempre)." },
              char_limit: { type: "number", description: "Máx. caracteres por página (default: texto completo)." }
            },
            required: ["uri"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "trace_sbd_toe_requirement_sources",
          title: "Trace SbD-ToE Requirement Sources (estação 3)",
          description:
            "Onde está a FONTE de cada requisito: fontes DIRECTAS (source_anchors — autoria do Manual, marcador «Fontes») " +
            "e cadeia COMPENSADA REQ→CTRL→ACO→fontes com tipo/confiança por salto (rótulo coverage_compensated — " +
            "COBERTURA por correspondência entre modelos, NÃO autoria; related não cobre). Servida verbatim da superfície " +
            "publicada (contrato v1.17 §1.24); os sem-fonte-declarada vêm DECLARADOS; ids desconhecidos idem.",
          inputSchema: {
            type: "object",
            properties: {
              requirement_ids: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50, description: "Ids concretos (ex.: os selected do select)." },
              include_chains: { type: "boolean", description: "default true; false devolve contagens + ref (dieta)." },
              offset: { type: "number" },
              limit: { type: "number", description: "default 20 (pagina sobre os ids pedidos; G1)." }
            },
            required: ["requirement_ids"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "select_sbd_toe_requirements",
          title: "Select SbD-ToE Requirements (MP1)",
          description:
            "START HERE — para qualquer tarefa concreta esta é a 1ª tool. Arranque: lê sbd://toe/agent-guide (read_sbd_toe_resource); setup_sbd_toe_agent é um PROMPT MCP — clientes sem prompts (p.ex. Desktop) não o expõem: segue directo por aqui. DECLARATIVO PRIMEIRO (contrato v1.18-beta, linha 0.20): TU tens o contexto — lê o pedido, o código e a conversa e DECLARA o que interpretaste (risk_level, concerns, exposure, data_sensitivity, technologies, changed_files). EU NÃO INTERPRETO PROSA: respondo com o que o KG sabe sobre o declarado, mais as adjacências do grafo, de forma reproduzível. Vocabulário fechado em sbd://toe/activation-vocabulary. O `task` fica REGISTADO para auditoria e NÃO influencia o resultado; sem nenhuma declaração devolvo needs_input com o vocabulário e candidatos A CONFIRMAR (nunca adivinho, nunca devolvo zero em silêncio); a baseline do nível pede-se explicitamente (mode='baseline'); o motor inferencial antigo fica em mode='discover' (exploratório). The MP1 selection operation (Classificar → Seleccionar): which requirements apply to THIS task in THIS " +
            "context. Composes the reference semantics the published ontology declares — baseline (cap. 02 base " +
            "catalogue, by risk level) ∪ domain chapters activated by the DECLARED activators (concerns, exposure, " +
            "data_sensitivity, technologies, changed_files) ∪ the categories the published vocabulary promises " +
            "⊕ regulatory overlay (extend) — then narrows deterministically by those same declarations. The task " +
            "text is NEVER an activator in declarative mode (it is recorded context; it is only an engine in " +
            "mode='discover'). Returns the bands: selected[] (each with its selection_trace: source/trigger/score), " +
            "narrowed_out[] (eligible-without-signal, grouped by category, with reason), excluded_by_level[] and " +
            "out_of_scope_chapters (what no declaration activated, by chapter and count, with how to bring it in) — " +
            "never silent, and the SCOPE of that promise is the universe, not just the baseline. Paginated. " +
            "All data from the published deterministic runtime bundle — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              risk_level: { type: "string", enum: ["L1", "L2", "L3"], description: "Application risk level (drives the baseline)." },
              detail: {
                type: "string",
                enum: ["full", "standard", "minimal"],
                description:
                  "Nível de SERIALIZAÇÃO da resposta (0.20.0-beta.26; default `full` = comportamento anterior, byte-idêntico). `standard` e `minimal` movem as justificações DISTINTAS do `selection_trace` para `selection_trace_legend` e deixam cada item a referi-las em `trace` — medido: −40% e −48% de payload numa selecção de 115 requisitos (12 justificações distintas para 115 entradas), com o MESMO conjunto de ids. Dieta de serialização, nunca de conteúdo: nenhum id e nenhuma justificação se perdem. `minimal` elide ainda `type` e `source_chapter` (deriváveis)."
              },
              task_context: { type: "string", description: "CONTEXTO REGISTADO (auditoria): o enunciado da tarefa. NOME CANÓNICO desde 0.20.0-beta.24 — um campo chamado `task` convidava a ser o motor, e não é: NÃO influencia a selecção no modo declarativo. Alias `task` continua aceite (aditivo, nunca renomeámos nada); em mode='discover' o texto é motor e `task` é o nome a usar." },
              task: { type: "string", description: "ALIAS de `task_context` (compatibilidade). Em mode='discover' é o MOTOR (casamento lexical, exploratório); no modo declarativo é apenas contexto registado." },
              mode: { type: "string", enum: ["declarative", "baseline", "discover"], description: "declarative (default): responde ao DECLARADO; sem declarações devolve needs_input com vocabulário e candidatos a confirmar. baseline: baseline completa do nível, por pedido EXPLÍCITO (nunca fallback). discover: motor inferencial histórico (casamento lexical da prosa), exploratório — investigação e estudo de paráfrase." },
              stack: { type: "string", description: "Texto livre da stack. No modo declarativo só conta quando traz, como TOKEN EXACTO, um valor de `technologies` (normalizar o declarado é legítimo; adivinhar prosa não). Preferir `technologies`." },
              exposure: { type: "string", enum: ["local", "internal", "authenticated", "public"], description: "Declared activator: authenticated/public activate auth+logging (+api/validation/architecture for public)." },
              data_sensitivity: { type: "string", enum: ["low", "personal", "regulated", "secrets"], description: "Declared activator: personal/regulated activate encryption+validation+logging." },
              concerns: {
                type: "array",
                items: { type: "string", enum: DECLARED_CONCERNS },
                description: `DECLARADOS por ti a partir da tua leitura do pedido. ${CONCERNS_VOCABULARY_NOTE} Somam activação, não restringem.`
              },
              changed_files: { type: "array", items: { type: "string" }, description: "Caminhos reais do repositório — activam capítulos pela TABELA de padrões de path publicada (sbd://toe/activation-vocabulary), não por interpretação do nome." },
              technologies: { type: "array", items: { type: "string" }, description: "Conjunto FECHADO (containers, kubernetes, iac, ci-cd, sca-sbom, sast, dast, monitoring, jwt) — activação por TABELA publicada, não por semelhança de texto; `jwt` aciona a regra nomeada SES-008. Ver sbd://toe/activation-vocabulary." },
              regulatory_frameworks: { type: "array", items: { type: "string" }, description: "Overlay frameworks to EXTEND with (e.g. 'EXT-AI-ACT')." },
              include_regulatory_overlay: { type: "boolean", description: "When true, resolves overlay obligations (operator extend; replace awaits ADR 0014)." },
              offset: { type: "integer", minimum: 0, description: "Pagination offset over selected[]." },
              limit: { type: "integer", minimum: 1, description: "Page size over selected[] (default 100)." }
            },
            required: ["risk_level"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "consult_security_requirements",
          title: "Consult SbD-ToE Security Requirements",
          description:
            "Deterministic resolution of security requirements, controls and artifacts for a given application context. " +
            "Filters requirements by risk level, optionally narrows by concern domains (auth, logging, api, etc.), " +
            "then resolves controls via the published runtime bundle, complementing with ontology domain_mapping when needed. " +
            "Requirements with no published control link are served and declared in coverage_gaps (never omitted). " +
            "Os corpos devolvidos são PROJECÇÕES (id/name/category/type) — detalhe completo via resolve_entities; ≤3 concerns por chamada (âmbito recomendado; maxItems no schema). " +
            "All data comes from the published SbD-ToE deterministic runtime bundle — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              risk_level: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Application risk level. Controls which requirements are active."
              },
              concerns: {
                type: "array",
                items: {
                  type: "string",
                  enum: DECLARED_CONCERNS
                },
                // 0.15.1 (item 7): re-avaliado POR MEDIÇÃO — 5 concerns ≈4,3k tk (payload manda,
                // não a contagem); recomendação de ensino continua ≤3; sem corte no servidor.
                // 0.20.0-beta.22 (P1-C): o enum passou a ser GERADO do vocabulário (eram 13 de 24);
                // o maxItems mantém-se — é um limite de PAYLOAD medido, não do vocabulário — e é
                // declarado como tal na descrição, para não se confundir com o conjunto fechado.
                maxItems: 5,
                description: `Concern domains DECLARADOS (intersecta com o filtro de nível, não o substitui). ${CONCERNS_VOCABULARY_NOTE} O \`maxItems: 5\` NÃO é um limite do vocabulário: é um tecto de PAYLOAD medido (5 concerns ≈4,3k tk) — o ensino recomenda ≤3.`
              },
              exposure: {
                type: "string",
                enum: ["local", "internal", "authenticated", "public"],
                description: "Application exposure level (informational — not yet used in filtering)."
              },
              data_sensitivity: {
                type: "string",
                enum: ["low", "personal", "regulated", "secrets"],
                description: "Data sensitivity level (informational here — used as a declared activator by select_sbd_toe_requirements/prepare)."
              },
              mode: {
                type: "string",
                enum: ["full", "index"],
                description: "Optional. 'index' (additive opt-in) devolve só ids por categoria (+counts). O default 'full' devolve PROJECÇÕES (id/name/category/type — ver projection_note); corpos completos via resolve_entities. Mesmos filtros e totais nos dois modos."
              }
            },
            required: ["risk_level"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "get_threat_landscape",
          title: "Get SbD-ToE Threat Landscape",
          description:
            `COBERTURA DECLARADA (0.20.0-beta.26): este mapa resolve ${threatConcernSupport().supported.length} dos ${DECLARED_CONCERNS.length} concerns do vocabulário — ` +
            `${threatConcernSupport().supported.join(", ")}. ` +
            "Qualquer outro concern é VÁLIDO e tem requisitos, mas não é roteável AQUI: vem declarado em `unsupported_concerns`, e se TODOS os declarados forem não-roteáveis a resposta é `needs_input` em vez de um payload cheio de ameaças de governação sem relação com o pedido. " +
            "Deterministic threat resolution for an application context using the SbD-ToE ontology threats pipeline. " +
            "Returns threats from the published runtime bundle relevant to the active requirement/chapter scope " +
            "(the defining chapters of activated controls count as in-scope), with structural mitigation confidence, " +
            "antipattern enrichment, per-threat associated_control_ids (structural CTRL-* ids with declared " +
            "derivation) and associated_control_names (readable control names, 233/233 since contract v1.16). " +
            "Optionally narrowed by concern domains. " +
            "All data comes from the published SbD-ToE deterministic runtime bundle — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              detail: {
                type: "string",
                enum: ["full", "standard", "minimal"],
                description:
                  "Nível de SERIALIZAÇÃO (0.20.0-beta.28; default `full` = byte-idêntico ao anterior, mantém `associated_control_ids`/`associated_control_names` como o contrato v1.14 §1.21 os publica). `standard`/`minimal` trocam-nos por referências + `associated_control_legend` — medido −50% do payload (os mesmos 13 nomes vinham repetidos verbatim em cada ameaça). Dedup de serialização: nada se perde."
              },
              risk_level: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Application risk level."
              },
              concerns: {
                type: "array",
                items: {
                  type: "string",
                  enum: DECLARED_CONCERNS
                },
                description: "Optional concern domains to narrow which chapters are in scope ('agents' = AI-agent governance, harmonizado com consult; enum gerado do vocabulário)."
              },
              offset: { type: "number", description: "Página de threats (0.15.0): índice inicial; ver coverage.nextOffset." },
              limit: { type: "number", description: "Máx. threats por página (default 25). coverage{total,hasMore} + size_estimate sempre presentes." }
            },
            required: ["risk_level"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "get_guide_by_role",
          title: "Get SbD-ToE Guide by Role",
          description:
            "Returns runtime-grounded practices, assignments and user stories for a given risk level, " +
            "optionally filtered by role and/or lifecycle phase. " +
            "Each assignment carries its required ARTIFACTS (the requirement→evidence link, served from the bundle since contract v1.16). Roles are resolved via canonical aliases (e.g. 'appsec' → 'appsec-engineer', 'sre' → 'devops-sre', 'security-engineer' → 'appsec-engineer'). " +
            "Results grouped by role and phase. All data from the published SbD-ToE deterministic runtime bundle — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              risk_level: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Application risk level."
              },
              role: {
                type: "string",
                description: "Role to filter by (supports canonical IDs and aliases, e.g. 'developer', 'security-champion', 'devops', 'appsec')."
              },
              phase: {
                type: "string",
                description: "Lifecycle phase to filter by (canonical: e.g. 'design', 'develop', 'test', 'operate'; alias aceite: implement→develop). Fase desconhecida devolve phase_warning com knownPhases."
              },
              include_detail: {
                type: "boolean",
                description: "When true and a role is given, surfaces each user story's full Definition-of-Done detail (checklist_items, BDD, proportionality, sdlc_integration) and returns role_checklist — the aggregated DoD checklist of the role's user stories in one response. Off by default (heavier payload)."
              }
            },
            required: ["risk_level"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "resolve_entities",
          title: "Resolve SbD-ToE Entities",
          description:
            "Low-level entity resolver over the published SbD-ToE deterministic artefacts. " +
            "Three sources are routed by record_type, each with its own provenance: " +
            "(1) runtime v0 (data/publish/runtime/*.json) for requirement / control / threat / artifact " +
            "and related links; " +
            "(2) AppSec Core v1 (data/publish/runtime/v1/*) for appsec_slice, control_objective, mechanism, " +
            "appsec_practice, appsec_artifact and appsec_relation; " +
            "(3) regulatory overlay (data/publish/overlay/*) for regulatory_framework, regulatory_obligation, " +
            "regulatory_mapping and regulatory_playbook. " +
            "Query any entity type by record_type with optional field filters. " +
            "Supports dot-notation for nested fields (e.g. 'applicable_levels.L2'), " +
            "comparison operators ({gte, lte} for numbers, {in: [...]} for set membership), " +
            "and array membership checks. " +
            "If the regulatory overlay is not published in this deployment, regulatory record types " +
            "return total: 0 with an absent-reason note instead of throwing. " +
            "Use this when the high-level tools (consult_security_requirements, get_threat_landscape, " +
            "get_guide_by_role) do not cover your specific query. " +
            "All data from the published SbD-ToE deterministic artefacts — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              record_type: {
                type: "string",
                description:
                  "Entity type to query. " +
                  "Runtime v0 (data/publish/runtime/*.json): requirement, control, practice, threat, " +
                  "user_story, assignment, role, phase, artifact, evidence_pattern, signal, antipattern, " +
                  "requirement_control_link, signal_evidence_link, antipattern_requirement_link, " +
                  "antipattern_threat_link. " +
                  "AppSec Core v1 (data/publish/runtime/v1/*): appsec_slice, control_objective, mechanism, " +
                  "appsec_practice, appsec_artifact, appsec_relation. " +
                  "Regulatory overlay (data/publish/overlay/*): regulatory_framework, regulatory_obligation, " +
                  "regulatory_mapping, regulatory_playbook. " +
                  "Read sbd://toe/ontology to see the schemas.",
                enum: [
                  "requirement",
                  "control",
                  "practice",
                  "threat",
                  "user_story",
                  "assignment",
                  "role",
                  "phase",
                  "artifact",
                  "evidence_pattern",
                  "signal",
                  "antipattern",
                  "requirement_control_link",
                  "signal_evidence_link",
                  "antipattern_requirement_link",
                  "antipattern_threat_link",
                  "appsec_slice",
                  "control_objective",
                  "mechanism",
                  "appsec_practice",
                  "appsec_artifact",
                  "appsec_relation",
                  "regulatory_framework",
                  "regulatory_obligation",
                  "regulatory_mapping",
                  "regulatory_playbook"
                ]
              },
              filters: {
                type: "object",
                description:
                  "Key-value filters on entity fields. " +
                  "Dot-notation for nested fields: {\"applicable_levels.L2\": true}. " +
                  "Comparison ops: {cvss_score: {gte: 7.0}} or {risk_level: {in: [\"L2\",\"L3\"]}}. " +
                  "Array fields: {roles_normalized: \"developer\"} checks membership.",
                additionalProperties: true
              },
              limit: {
                type: "number",
                description: "Max results to return. Default: 50, max: 200."
              }
            },
            required: ["record_type"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "trace_sbd_toe_graph",
          title: "Trace SbD-ToE Ontology Graph",
          description:
            "Curated multi-hop traversal over the AppSec Core v1 relation graph (slices, control " +
            "objectives, mechanisms, practices). Answers traceability questions the high-level tools " +
            "do not expose directly. Pick a `lens`: " +
            "'slice_implementation' (a slice -> its control objectives -> the mechanisms that implement " +
            "and practices that realize them); " +
            "'objective_realization' (a control objective -> its mechanisms + practices); " +
            "'mechanism_provenance' (a mechanism/practice -> the objectives it serves -> their slices). " +
            "Optionally scope with `anchor` (an entity id). Results are deterministic and paginated " +
            "(total + cursor; never silently truncated). All edges from the published deterministic " +
            "runtime — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              lens: {
                type: "string",
                description:
                  "Traversal lens. slice_implementation: slice -> objectives -> mechanisms/practices. " +
                  "objective_realization: objective -> mechanisms/practices. " +
                  "mechanism_provenance: mechanism/practice -> objectives -> slices.",
                enum: ["slice_implementation", "objective_realization", "mechanism_provenance"]
              },
              anchor: {
                type: "string",
                description:
                  "Optional entity id to scope the traversal (a slice id for slice_implementation, a " +
                  "control objective id for objective_realization, a mechanism/practice id for " +
                  "mechanism_provenance). Omit to traverse the whole graph."
              },
              page: { type: "number", description: "0-based page index. Default: 0." },
              pageSize: { type: "number", description: "Rows per page. Default: 50, max: 200." }
            },
            required: ["lens"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        },
        {
          name: "prepare_sbd_toe_codegen_context",
          title: "Prepare SbD-ToE Grounded Codegen Context",
          description:
            "Prepares deterministic, bite-sized grounded context for a downstream LLM to generate, " +
            "review or plan tests for code. This tool DOES NOT generate code and DOES NOT edit files. " +
            "It runs a scope gate (rejecting vague or overly broad asks), an auditable semantic " +
            "activation step (explicit concerns, single-token lexicon, compound phrases such as " +
            "'endpoint seguro', PT/EN alias expansion via the semantic gateway, and a whole-word intent " +
            "classifier — every activation carries a deterministic score in [0,1]), and deterministic " +
            "resolution against runtime v0, runtime v1 and the regulatory overlay. " +
            "Returns one of four statuses: ready_for_codegen, needs_clarification, needs_decomposition, " +
            "unsupported_scope. On ready_for_codegen the output carries activation_trace (with score, " +
            "source and reason), activated_scope, g2_context, manual_grounding, regulatory_overlay, " +
            "citation_map, completeness_report (incl. evidence-pattern relevance-cap metrics), " +
            "llm_codegen_instructions and security_rationale_template — with provenance for each section. " +
            "Evidence patterns are ordered by MEMBERSHIP of the activated scope — first those whose "
            + "`maps_to_requirement_id` is a requirement of the activated scope, then those of a direct "
            + "control, then of a derived control; WITHIN each tier the order is by id, which is NOT a "
            + "ranking: two patterns of the same tier are equally in scope and the id only makes the cut "
            + "deterministic. Capped (default 25) so " +
            "the LLM context stays manageable; the dropped patterns are listed in debug.rejected_candidates " +
            "when debug=true. No canonical IDs are ever invented; names are surfaced only when " +
            "manual_rastreabilidade publishes them.",
          inputSchema: {
            type: "object",
            properties: {
              task: {
                type: "string",
                description:
                  "Concrete task to ground (e.g. 'Add payload validation to PATCH /users/:id/email'). Required."
              },
              risk_level: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Application risk level. Filters runtime v0 requirements when provided."
              },
              mode: {
                type: "string",
                enum: ["codegen", "review", "test-plan"],
                description: "Defaults to 'codegen'. Changes llm_codegen_instructions flavor."
              },
              stack: {
                type: "string",
                description: "Free-text stack hint (e.g. 'Node.js/Express'). Informational only at WP5."
              },
              exposure: {
                type: "string",
                enum: ["local", "internal", "authenticated", "public"],
                description: "Application exposure level. Informational only at WP5."
              },
              data_sensitivity: {
                type: "string",
                enum: ["low", "personal", "regulated", "secrets"],
                description: "Data sensitivity level. Informational only at WP5."
              },
              concerns: {
                type: "array",
                items: { type: "string", enum: DECLARED_CONCERNS },
                description: `Concerns DECLARADOS. ${CONCERNS_VOCABULARY_NOTE}`
              },
              changed_files: {
                type: "array",
                items: { type: "string" },
                description: "Optional file paths. Path-based heuristics may add concerns (visible in activation_trace)."
              },
              regulatory_frameworks: {
                type: "array",
                items: { type: "string" },
                description:
                  "Optional regulatory framework IDs or short codes (e.g. 'EXT-DORA', 'CRA'). " +
                  "Resolved via the overlay loader. If the overlay is absent, returns unsupported_scope."
              },
              include_regulatory_overlay: {
                type: "boolean",
                description:
                  "When true (and overlay is published), enriches the response with regulatory_overlay context."
              },
              technologies: {
                type: "array",
                items: { type: "string" },
                description:
                  "Tecnologias DECLARADAS do vocabulário fechado (containers, kubernetes, iac, ci-cd, sca-sbom, sast, dast, monitoring, jwt) — activam capítulos por TABELA publicada em sbd://toe/activation-vocabulary. Preferir a `stack` em texto livre."
              },
              selection_mode: {
                type: "string",
                enum: ["declarative", "discover"],
                description:
                  "Semântica da SELECÇÃO (não confundir com `mode`, que é codegen/review/test-plan). declarative (default, contrato v1.18-beta): o conjunto vem do que DECLARASTE (concerns/exposure/data_sensitivity/technologies/changed_files) — sem declarações devolvo needs_input com o vocabulário; o `task` serve para grounding/citações e auditoria, não para escolher requisitos. discover: motor inferencial histórico (a prosa activa), exploratório."
              },
              detail: {
                type: "string",
                enum: ["ultrathin", "minimal", "standard", "full"],
                description:
                  "Response encoding level (v2 token diet). 'full' (default) returns the classic payload, " +
                  "Níveis dieted têm TECTO de requisitos por chamada — minimal 78, standard 81, " +
                  "ultrathin 86 (derivados da medição ~68/~68/~29 tk/req vs promessas " +
                  "8450/9200/4840 tk); acima ⇒ needs_decomposition c/ requirement_ceiling e divisão " +
                  "ensinada; 'full' sem tecto (promessa = completude). " +
                  "byte-identical to previous releases. 'standard'/'minimal' return the SAME citable ID set " +
                  "with a deduplicated encoding: inverted `citations` (run-length source_data + ids_from " +
                  "payload paths) replaces `citation_map`, `manual_grounding` is grouped, per-item `source` " +
                  "and other derivable fields (requirement category, entity_type/slice_family, " +
                  "relevance_score) are elided per the `provenance_legend`/resource legend, and " +
                  "`g2_context.relations` is replaced by `g2_context.relations_ref` — executable " +
                  "trace_sbd_toe_graph {lens, anchor} calls (set include_relations=true to keep relations " +
                  "inline instead). Additionally at 'standard'/'minimal': evidence_patterns are capped " +
                  "(deterministic prefix; counts + rest-reference in completeness_report), " +
                  "llm_codegen_instructions + security_rationale_template move to the MCP resource " +
                  "sbd://toe/codegen-instructions/{mode} (see codegen_instructions_ref), activation_trace is " +
                  "included only with debug=true (activation_trace_ref keeps the count), and requirements + " +
                  "direct controls carry the verbatim published `description`. Nothing is silently dropped. " +
                  "'minimal' keeps the SAME complete activated scope as 'standard' (no ranking/subsetting) " +
                  "and trims only traceability serialization: evidence_patterns cap 5 (vs 10) and " +
                  "manual_grounding as counts + shared manual_commit_sha + executable groups_ref " +
                  "(same input, detail='standard'). 'ultrathin' goes one level below 'minimal' with the same " +
                  "rules (complete activated set, nothing id-only, never silent): requirements/controls keep " +
                  "id+name(+type/domain/control_type/confidence) but drop the published description " +
                  "(executable activated_scope.descriptions_ref, detail='minimal'), evidence_patterns are 0 " +
                  "inline (counts + rest-ref to detail='minimal'), manual_grounding is " +
                  "{total_entries, manual_commit_sha, groups_ref} and completeness_report diagnostics become " +
                  "exact counts (+ executable ref)."
              },
              include_relations: {
                type: "boolean",
                description:
                  "Escape hatch for clients that cannot make a second call (v2 token diet). When true at " +
                  "detail='standard'/'minimal', keeps g2_context.relations inline (dieted: no per-item source) " +
                  "instead of the relations_ref reference. Default false. Ignored at detail='full' (full always " +
                  "carries relations inline, byte-identical to previous releases)."
              },
              debug: {
                type: "boolean",
                description: "When true, includes rejected_candidates and trace notes in the output."
              }
            },
            required: ["task"],
            additionalProperties: false
          },
          annotations: { readOnlyHint: true }
        }
      ]
    });
  }

  private getPromptDefinition(): Record<string, unknown> {
    return PROMPT_CATALOG[0] as Record<string, unknown>;
  }

  private handlePromptsList(request: JsonRpcRequest): void {
    this.sendResponse(request.id, { prompts: [...PROMPT_CATALOG] });
  }

  private handlePromptGet(request: JsonRpcRequest): void {
    const name = typeof request.params?.name === "string" ? request.params.name : "";
    const args =
      typeof request.params?.arguments === "object" && request.params.arguments !== null
        ? (request.params.arguments as Record<string, unknown>)
        : {};

    if (name === "ask_sbd_toe_manual") {
      const question = typeof args.question === "string" ? args.question : "";
      const promptText =
        `${loadSystemPromptTemplate()}\n\n` +
        "Use the `search_sbd_toe_manual` tool before answering.\n" +
        `Question: ${question}`;
      this.sendResponse(request.id, {
        description: "Grounded prompt for questions about the SbD-ToE manual.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      });
      return;
    }

    if (name === "prepare_grounded_codegen") {
      const taskArg = args["task"];
      if (typeof taskArg !== "string" || taskArg.trim().length === 0) {
        this.sendError(request.id, -32602, 'The "task" argument is required and must be a non-empty string.');
        return;
      }
      const modeArg = typeof args["mode"] === "string" ? args["mode"] : undefined;
      const riskLevelArg = typeof args["riskLevel"] === "string" ? args["riskLevel"] : undefined;
      const stackArg = typeof args["stack"] === "string" ? args["stack"] : undefined;
      const concerns = this.parseStringListArg(args["concerns"]);
      const regulatoryFrameworks = this.parseStringListArg(args["regulatoryFrameworks"]);
      const includeRegulatoryOverlay =
        args["includeRegulatoryOverlay"] === true ||
        args["includeRegulatoryOverlay"] === "true";
      let promptText: string;
      try {
        promptText = buildGroundedCodegenPrompt({
          task: taskArg,
          ...(modeArg ? { mode: modeArg } : {}),
          ...(riskLevelArg ? { riskLevel: riskLevelArg } : {}),
          ...(stackArg ? { stack: stackArg } : {}),
          ...(concerns ? { concerns } : {}),
          ...(regulatoryFrameworks ? { regulatoryFrameworks } : {}),
          ...(includeRegulatoryOverlay ? { includeRegulatoryOverlay: true } : {})
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.sendError(request.id, -32603, `Could not build grounded codegen prompt: ${message}`);
        return;
      }
      this.sendResponse(request.id, {
        description:
          "Bundled SbD-ToE grounded codegen prompt — instructs the agent to call prepare_sbd_toe_codegen_context first, branch on status, cite citation_map and avoid compliance claims.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      });
      return;
    }

    if (name === "setup_sbd_toe_agent") {
      const riskLevel = args["riskLevel"];
      if (typeof riskLevel !== "string" || !["L1", "L2", "L3"].includes(riskLevel)) {
        this.sendError(
          request.id,
          -32602,
          'The "riskLevel" argument is required and must be L1, L2 or L3.'
        );
        return;
      }
      const projectRole =
        typeof args["projectRole"] === "string" ? args["projectRole"] : undefined;
      const promptText = buildSetupAgentPrompt(riskLevel, projectRole);
      this.sendResponse(request.id, {
        description: "Prompt to configure an agent with SbD-ToE context.",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      });
      return;
    }

    this.sendError(request.id, -32602, `Unknown prompt: ${name}`);
  }

  private handleResourcesList(request: JsonRpcRequest): void {
    this.sendResponse(request.id, { resources: RESOURCE_CATALOG });
  }

  private async handleResourcesRead(request: JsonRpcRequest): Promise<void> {
    const uri = typeof request.params?.uri === "string" ? request.params.uri : "";
    try {
      const { mimeType, text } = await materializeResource(uri);
      this.sendResponse(request.id, { contents: [{ uri, mimeType, text }] });
    } catch (error) {
      if (error instanceof ResourceReadError) {
        this.sendError(request.id, error.code, error.message);
        return;
      }
      this.sendError(request.id, -32603, error instanceof Error ? error.message : "Could not read resource.");
    }
  }

  private parseStringListArg(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
      const filtered = value.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
      );
      return filtered.length > 0 ? filtered : undefined;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parts = value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return parts.length > 0 ? parts : undefined;
    }
    return undefined;
  }

  private getStringArg(args: Record<string, unknown>, key: string): string {
    const value = args[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`The "${key}" argument is required.`);
    }
    return value;
  }

  private getOptionalBooleanArg(args: Record<string, unknown>, key: string): boolean | undefined {
    const value = args[key];
    return typeof value === "boolean" ? value : undefined;
  }

  private getOptionalIntegerArg(args: Record<string, unknown>, key: string): number | undefined {
    const value = args[key];
    return typeof value === "number" && Number.isInteger(value) ? value : undefined;
  }

  private supportsSampling(): boolean {
    return Boolean(
      this.clientCapabilities.sampling &&
        typeof this.clientCapabilities.sampling === "object"
    );
  }

  private async requestSampling(systemPrompt: string, userPrompt: string): Promise<{
    model?: string | undefined;
    text: string;
  }> {
    if (!this.supportsSampling()) {
      throw new Error("The current MCP client has not declared sampling support.");
    }

    const startedAt = Date.now();
    await this.log("debug", {
      event_type: "sampling.request",
      outcome: "started",
      sampling_max_tokens: getConfig().prompt.samplingMaxTokens,
      message: "Requesting client-side sampling"
    });

    const id = this.nextRequestId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.writeMessage({
      jsonrpc: "2.0",
      id,
      method: "sampling/createMessage",
      params: {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: userPrompt
            }
          }
        ],
        systemPrompt,
        temperature: 0.1,
        maxTokens: getConfig().prompt.samplingMaxTokens
      }
    });

    const result = (await promise) as Record<string, unknown>;
    const content = result.content;
    const text = this.extractSamplingText(content);
    const model = typeof result.model === "string" ? result.model : undefined;

    await this.log("debug", {
      event_type: "sampling.request",
      outcome: "succeeded",
      duration_ms: Date.now() - startedAt,
      sampling_max_tokens: getConfig().prompt.samplingMaxTokens,
      message: "Client-side sampling completed"
    });

    return model === undefined ? { text } : { model, text };
  }

  private extractSamplingText(content: unknown): string {
    if (typeof content === "string") {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const parts = content
        .map((item) => {
          if (!item || typeof item !== "object") {
            return undefined;
          }
          const typed = item as Record<string, unknown>;
          return typeof typed.text === "string" ? typed.text : undefined;
        })
        .filter((item): item is string => Boolean(item));

      if (parts.length > 0) {
        return parts.join("\n").trim();
      }
    }

    if (content && typeof content === "object") {
      const typed = content as Record<string, unknown>;
      if (typeof typed.text === "string") {
        return typed.text.trim();
      }
    }

    return JSON.stringify(content, null, 2);
  }

  private async handleToolsCall(request: JsonRpcRequest): Promise<void> {
    const params = request.params ?? {};
    const name = typeof params.name === "string" ? params.name : "";
    const args =
      typeof params.arguments === "object" && params.arguments !== null
        ? (params.arguments as Record<string, unknown>)
        : {};
      // 0.15.0 (P2-1): aliases ADITIVOS risk_level↔riskLevel (convenção no guide; nunca renomear).
      if (args && typeof args === "object") {
        const aliasBag = args as Record<string, unknown>;
        if (aliasBag["riskLevel"] === undefined && typeof aliasBag["risk_level"] === "string") aliasBag["riskLevel"] = aliasBag["risk_level"];
        if (aliasBag["risk_level"] === undefined && typeof aliasBag["riskLevel"] === "string") aliasBag["risk_level"] = aliasBag["riskLevel"];
      }
    const requestId = this.getRequestId(request.id);
    const startedAt = Date.now();
    const metadata = {
      request_id: requestId,
      rpc_method: request.method,
      tool_name: name,
      ...this.getQuestionMetadata(args),
      ...(typeof args.debug === "boolean" ? { debug_enabled: args.debug } : {}),
      ...(typeof args.topK === "number" && Number.isInteger(args.topK)
        ? { top_k: args.topK }
        : {})
    };

    await this.log("info", {
      event_type: "tool.call",
      outcome: "started",
      ...metadata,
      message: "Tool invocation started"
    });

    try {
      switch (name) {
        case "search_sbd_toe_manual": {
          const question = this.getStringArg(args, "question");
          const debug = this.getOptionalBooleanArg(args, "debug");
          const topK = this.getOptionalIntegerArg(args, "topK");
          const useVectorRecall = this.getOptionalBooleanArg(args, "useVectorRecall");
          const result = await searchManualQuestion(question, debug, topK, {
            vectorMode: useVectorRecall ? "prefer" : "off"
          });
          this.sendResponse(request.id, {
            content: [{ type: "text", text: result.text }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "inspect_sbd_toe_retrieval": {
          const question = this.getStringArg(args, "question");
          const topK = this.getOptionalIntegerArg(args, "topK");
          const useVectorRecall = this.getOptionalBooleanArg(args, "useVectorRecall");
          const result = await inspectManualRetrieval(question, topK, {
            vectorMode: useVectorRecall ? "prefer" : "off"
          });
          this.sendResponse(request.id, {
            content: [{ type: "text", text: result.text }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "answer_sbd_toe_manual": {
          const question = this.getStringArg(args, "question");
          const debug = this.getOptionalBooleanArg(args, "debug");
          const topK = this.getOptionalIntegerArg(args, "topK");
          const useVectorRecall = this.getOptionalBooleanArg(args, "useVectorRecall");

          if (!this.supportsSampling()) {
            // Graceful fallback: delegate to searchManualQuestion (same retrieval, formatted output)
            const fallback = await searchManualQuestion(question, debug, topK ?? 3, {
              vectorMode: useVectorRecall ? "prefer" : "off"
            });
            const fallbackText =
              "**Note: MCP sampling not available in this client — returning formatted retrieval results. " +
              "For a synthesised answer, use `search_sbd_toe_manual` directly.**\n\n" +
              fallback.text;
            this.sendResponse(request.id, {
              content: [{ type: "text", text: fallbackText }]
            });
            await this.log("info", {
              event_type: "tool.call",
              outcome: "succeeded",
              duration_ms: Date.now() - startedAt,
              ...metadata,
              message: "Tool invocation completed (sampling fallback)"
            });
            return;
          }

          const prepared = await prepareManualAnsweringContext(question, topK, {
            vectorMode: useVectorRecall ? "prefer" : "off"
          });
          const sampled = await this.requestSampling(
            prepared.prompt.systemPrompt,
            prepared.prompt.userPrompt
          );
          const result = formatSampledAnswerResult(
            question,
            prepared,
            sampled.text,
            sampled.model,
            debug
          );
          this.sendResponse(request.id, {
            content: [{ type: "text", text: result.text }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "list_sbd_toe_chapters": {
          const result = handleListSbdToeChapters(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "query_sbd_toe_entities": {
          const result = await handleQuerySbdToeEntities(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "get_sbd_toe_chapter_brief": {
          const result = handleGetSbdToeChapterBrief(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "plan_sbd_toe_repo_governance": {
          const result = handlePlanRepoGovernance(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "generate_sbd_toe_skill": {
          const result = handleGenerateSbdToeSkill(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "map_sbd_toe_review_scope": {
          const result = handleMapSbdToeReviewScope(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "get_sbd_toe_chapter_implementation_checklist": {
          const result = handleGetChapterImplementationChecklist(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "get_sbd_toe_operating_model": {
          const result = handleGetOperatingModel(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "get_sbd_toe_verification_matrix": {
          const result = handleGetVerificationMatrix(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "assess_sbd_toe_implementation": {
          const result = handleAssessImplementation(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "plan_sbd_toe_rollout": {
          const result = handlePlanRollout(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "map_sbd_toe_regulatory_activation": {
          const result = handleMapRegulatoryActivation(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "map_sbd_toe_applicability": {
          const result = handleMapSbdToeApplicability(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "read_sbd_toe_resource": {
          const uriArg = typeof args?.uri === "string" ? args.uri.trim() : "";
          if (uriArg.length === 0) {
            this.sendError(request.id, -32602, `read_sbd_toe_resource requires "uri". Valid URIs: ${validResourceUris()}.`);
            return;
          }
          try {
            const { mimeType, text: fullText } = await materializeResource(uriArg);
            // 0.15.0: slot picker (JSON com slots) + paginação por caracteres, declaradas.
            let text = fullText;
            const slotArg = typeof args?.slot === "string" ? args.slot.trim() : "";
            if (slotArg) {
              let parsed: unknown;
              try { parsed = JSON.parse(fullText); } catch { parsed = undefined; }
              const slots = (parsed as { llm_codegen_instructions?: { slots?: Array<{ id?: string }> } })?.llm_codegen_instructions?.slots;
              if (!Array.isArray(slots)) {
                this.sendError(request.id, -32602, `O recurso ${uriArg} não tem slots pedíveis (slot aplica-se a sbd://toe/codegen-instructions/{mode}).`);
                return;
              }
              // 0.19.0 (ronda 3c): slots são {when,text} SEM id — endereçam-se por ÍNDICE;
              // a lista de válidos é REAL e derivada (never-silent aplicado a casa).
              const idx = /^\d+$/.test(slotArg) ? Number(slotArg) : -1;
              const hit = idx >= 0 && idx < slots.length ? slots[idx] : undefined;
              if (!hit) {
                const catalog = slots.map((x, i) => `${i} (when=${(x as { when?: string })?.when ?? "?"})`).join(", ");
                this.sendError(request.id, -32602, `Slot desconhecido: "${slotArg}". Os slots endereçam-se por índice. Slots válidos: ${catalog}.`);
                return;
              }
              text = JSON.stringify(hit, null, 2);
            }
            const co = typeof args?.char_offset === "number" ? Math.max(0, Math.floor(args.char_offset)) : 0;
            const cl = typeof args?.char_limit === "number" ? Math.max(1, Math.floor(args.char_limit)) : undefined;
            const totalChars = text.length;
            if (co > 0 || cl !== undefined) text = text.slice(co, cl !== undefined ? co + cl : undefined);
            const payload = {
              coverage: { total_chars: totalChars, returned_chars: text.length, char_offset: co, next_char_offset: co + text.length < totalChars ? co + text.length : null, hasMore: co + text.length < totalChars },
              size_estimate: { chars: text.length, approx_tokens: Math.ceil(text.length / 4) },
              provenance: {
                kg: servedKgReleaseTag(),
      server: servingServerVersion(),
                content_type: "canonical" as const,
                produced_by: "resources_read_mirror",
                source_data: uriArg,
                note:
                  "Verbatim mirror of resources/read for clients without resource support — same materialization, no drift. " +
                  "Motivation: codegen_instructions_ref of dieted payloads is resolvable on any client."
              },
              uri: uriArg,
              mimeType,
              content: text
            };
            this.sendResponse(request.id, {
              content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
            });
          } catch (error) {
            if (error instanceof ResourceReadError) {
              this.sendError(request.id, error.code, error.message);
              return;
            }
            this.sendError(request.id, -32603, error instanceof Error ? error.message : "Could not read resource.");
          }
          return;
        }
        case "trace_sbd_toe_requirement_sources": {
          try {
            const result = handleTraceRequirementSources(args ?? {});
            this.sendResponse(request.id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
          } catch (error) {
            const rpc = (error as { rpcError?: { code: number; message: string } }).rpcError;
            this.sendError(request.id, rpc?.code ?? -32603, error instanceof Error ? error.message : "trace failed");
          }
          return;
        }
        case "select_sbd_toe_requirements": {
          const result = handleSelectRequirements(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "consult_security_requirements": {
          const result = handleConsultSecurityRequirements(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "get_threat_landscape": {
          const result = handleGetThreatLandscape(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "get_guide_by_role": {
          const result = handleGetGuideByRole(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "resolve_entities": {
          const result = handleResolveEntities(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "trace_sbd_toe_graph": {
          const result = handleTraceGraph(args);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        case "prepare_sbd_toe_codegen_context": {
          const result = handlePrepareCodegenContext(
            args as unknown as Parameters<typeof handlePrepareCodegenContext>[0]
          );
          this.sendResponse(request.id, {
            content: [{ type: "text", text: JSON.stringify(result) }]
          });
          await this.log("info", {
            event_type: "tool.call",
            outcome: "succeeded",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            message: "Tool invocation completed"
          });
          return;
        }
        default:
          await this.log("warning", {
            event_type: "tool.call",
            outcome: "failed",
            duration_ms: Date.now() - startedAt,
            ...metadata,
            error_code: -32602,
            message: "Unknown tool requested"
          });
          this.sendError(request.id, -32602, `Unknown tool: ${name}`);
      }
    } catch (error) {
      // Errors with rpcError emit JSON-RPC error (e.g. -32602 for invalid input)
      if (
        error instanceof Error &&
        "rpcError" in error &&
        error.rpcError !== null &&
        typeof error.rpcError === "object"
      ) {
        const rpcError = error.rpcError as { code: number; message: string; data?: unknown };
        await this.log("warning", {
          event_type: "tool.call",
          outcome: "failed",
          duration_ms: Date.now() - startedAt,
          ...metadata,
          error_code: rpcError.code,
          message: rpcError.message
        });
        this.sendError(request.id, rpcError.code, rpcError.message, rpcError.data);
        return;
      }

      const rawMessage = error instanceof Error ? error.message : "Unexpected error.";
      await this.log("error", {
        event_type: "tool.call",
        outcome: "failed",
        duration_ms: Date.now() - startedAt,
        ...metadata,
        ...this.summarizeError(error)
      });
      this.sendResponse(request.id, {
        isError: true,
        content: [{ type: "text", text: this.sanitizeErrorMessage(rawMessage) }]
      });
    }
  }
}

function verifyArtifactIntegrity(): void {
  const manifestPath = resolveAppPath("data/publish/artifact-manifest.json");
  let manifestText: string;
  try {
    manifestText = readFileSync(manifestPath, "utf-8");
  } catch {
    // Manifest absent — acceptable in dev/source mode; warn and continue
    process.stderr.write(
      "[sbd-toe-mcp] WARN: artifact-manifest.json not found — integrity check skipped (dev mode?)\n"
    );
    return;
  }

  const manifest = JSON.parse(manifestText) as {
    artifact_version?: string;
    files?: Record<string, string>;
  };

  if (!manifest.files || typeof manifest.files !== "object") {
    throw new Error("artifact-manifest.json is malformed — missing 'files' field");
  }

  const publishDir = resolveAppPath("data/publish");
  for (const [filename, expectedHash] of Object.entries(manifest.files)) {
    const filePath = `${publishDir}/${filename}`;
    let contents: Buffer;
    try {
      contents = readFileSync(filePath);
    } catch {
      throw new Error(`Artifact integrity check failed: missing file data/publish/${filename}`);
    }
    const actualHash = createHash("sha256").update(contents).digest("hex");
    if (actualHash !== expectedHash) {
      throw new Error(
        `Artifact integrity check failed: data/publish/${filename} hash mismatch — artifact may have been tampered with`
      );
    }
  }

  process.stderr.write(
    `[sbd-toe-mcp] Artifact integrity OK (${Object.keys(manifest.files).length} files, version ${manifest.artifact_version ?? "unknown"})\n`
  );
}

function main(): void {
  verifyArtifactIntegrity();
  new McpRuntime();
}

main();
