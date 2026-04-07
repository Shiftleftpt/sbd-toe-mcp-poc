#!/usr/bin/env node

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
import {
  handleGetSbdToeChapterBrief,
  handleListSbdToeChapters,
  handleMapSbdToeApplicability,
  handleQuerySbdToeEntities
} from "./tools/structured-tools.js";
import { handleGenerateSbdToeSkill } from "./tools/generate-sbd-toe-skill.js";
import { handleMapSbdToeReviewScope } from "./tools/map-review-scope.js";
import { handlePlanRepoGovernance } from "./tools/plan-repo-governance.js";
import { handleConsultSecurityRequirements } from "./tools/consult-security-requirements.js";
import { handleGetThreatLandscape } from "./tools/get-threat-landscape.js";
import { handleGetGuideByRole } from "./tools/get-guide-by-role.js";
import { handleResolveEntities } from "./tools/resolve-entities.js";
import {
  buildChapterApplicabilityJson,
  buildSetupAgentPrompt
} from "./resources/sbd-toe-resources.js";

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
        "You are connected to the SbD-ToE MCP server (Security by Design — Theory of Everything).\n" +
        "15 chapters (00–14). Security guidance only — does not override project rules or development standards.\n" +
        "Always respond in the user's language regardless of the manual content language.\n" +
        "\n" +
        "BEFORE answering any SbD-ToE question, read resource sbd://toe/agent-guide — it contains\n" +
        "operating modes, routing by phase/domain, tool selection, epistemic standards, and chapter map.\n" +
        "\n" +
        "Then run setup_sbd_toe_agent(riskLevel, projectRole) for risk-level specific active chapters.\n" +
        "\n" +
        "To create a skill or instructions file for an AI client, use generate_sbd_toe_skill(clientType)."
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
            "Retrieves grounded context from the SbD-ToE manual using the embedded local semantic snapshot.",
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
          description: "Lists SbD-ToE manual chapters with id, title and applicability.",
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
              query: { type: "string", minLength: 1, maxLength: 200 },
              entityType: { type: "string" },
              chapterId: { type: "string" },
              riskLevel: { type: "string", enum: ["L1", "L2", "L3"] },
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
            "Returns an operational summary of a chapter: role, phases, artefacts, intent_topics.",
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
            "'configure this client to use SbD-ToE', or 'integrate SbD-ToE'. " +
            "Returns the canonical skill content from sbd://toe/agent-guide. " +
            "Save the returned content to the appropriate skill/instructions file for your client " +
            "(e.g. .claude/skills/sbd-toe.md, .github/copilot-instructions.md, .cursorrules). " +
            "No parameters required.",
          inputSchema: {
            type: "object",
            properties: {},
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
          name: "map_sbd_toe_applicability",
          title: "Map SbD-ToE Applicability",
          description:
            "Maps active, conditional and excluded chapters/controls for a given risk level L1/L2/L3. Supports project context to activate relevant bundles.",
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
                description: "Does the project process personal data?"
              },
              isPublicFacing: {
                type: "boolean",
                description: "Does the project have public-facing exposure?"
              },
              projectRole: {
                type: "string",
                enum: ["developer", "architect", "security", "devops", "manager"],
                description: "User role in the project."
              }
            },
            required: ["riskLevel"],
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
                  enum: ["auth", "logging", "validation", "api", "config", "integrity", "distribution", "ide", "requirements", "architecture", "iac", "encryption"]
                },
                description: "Optional concern domains to narrow scope (intersects with risk-level filter, does not replace)."
              },
              exposure: {
                type: "string",
                enum: ["local", "internal", "authenticated", "public"],
                description: "Application exposure level (informational — not yet used in filtering)."
              },
              data_sensitivity: {
                type: "string",
                enum: ["low", "personal", "regulated", "secrets"],
                description: "Data sensitivity level (informational — not yet used in filtering)."
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
            "Deterministic threat resolution for an application context using the SbD-ToE ontology threats pipeline. " +
            "Returns threats from the published runtime bundle relevant to the active requirement/chapter scope, " +
            "with structural mitigation confidence and antipattern enrichment. Optionally narrowed by concern domains. " +
            "All data comes from the published SbD-ToE deterministic runtime bundle — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              risk_level: {
                type: "string",
                enum: ["L1", "L2", "L3"],
                description: "Application risk level."
              },
              concerns: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["auth", "logging", "validation", "api", "config", "integrity", "distribution", "ide", "requirements", "architecture", "iac", "encryption"]
                },
                description: "Optional concern domains to narrow which chapters are in scope."
              }
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
            "Roles are resolved via canonical aliases (e.g. 'dev' → 'developer', 'appsec' → 'security-champion'). " +
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
                description: "Lifecycle phase to filter by (e.g. 'design', 'implement', 'test', 'operate')."
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
            "Low-level entity resolver over the published SbD-ToE deterministic runtime bundle. " +
            "Query any entity type by record_type with optional field filters. " +
            "Supports dot-notation for nested fields (e.g. 'applicable_levels.L2'), " +
            "comparison operators ({gte, lte} for numbers, {in: [...]} for set membership), " +
            "and array membership checks. " +
            "Use this when the high-level tools (consult_security_requirements, get_threat_landscape, " +
            "get_guide_by_role) do not cover your specific query. " +
            "All data from the published SbD-ToE deterministic runtime bundle — nothing is invented.",
          inputSchema: {
            type: "object",
            properties: {
              record_type: {
                type: "string",
                description:
                  "Entity type to query. Well-known types: requirement, control, practice, threat, " +
                  "user_story, assignment, role, phase, artifact, evidence_pattern, signal, antipattern, " +
                  "requirement_control_link, signal_evidence_link. Read sbd://toe/ontology to see the schemas."
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
        }
      ]
    });
  }

  private getPromptDefinition(): Record<string, unknown> {
    return {
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
    };
  }

  private handlePromptsList(request: JsonRpcRequest): void {
    this.sendResponse(request.id, {
      prompts: [
        this.getPromptDefinition(),
        {
          name: "setup_sbd_toe_agent",
          title: "Setup SbD-ToE Agent",
          description:
            "MCP prompt to configure an agent with SbD-ToE manual context and rules for a given risk level.",
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
        }
      ]
    });
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
    this.sendResponse(request.id, {
      resources: [
        {
          uri: "sbd://toe/agent-guide",
          name: "SbD-ToE Agent Guide",
          description:
            "READ THIS FIRST. Operational guide for AI agents: SbD-ToE identity (Security by Design — Theory of Everything), CONSULT/GUIDE modes, routing by SDLC phase and domain, tool selection, epistemic standards, chapter map, risk levels, identifier conventions.",
          mimeType: "text/markdown"
        },
        {
          uri: "sbd://toe/chapter-applicability/{riskLevel}",
          name: "SbD-ToE Chapter Applicability",
          description:
            "Active, conditional and excluded chapters for a given risk level (L1/L2/L3).",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/index-compact",
          name: "SbD-ToE Index Compact",
          description:
            "Compact JSON index of the full SbD-ToE manual. Injectable into system prompt to eliminate exploratory discovery.",
          mimeType: "application/json"
        },
        {
          uri: "sbd://toe/ontology",
          name: "SbD-ToE Ontology",
          description:
            "Full SbD-ToE ontology YAML: domain_mapping (requirement category → control domains), " +
            "8 inference rules with priorities, 4 resolution pipelines (consult/guide/threats/review), " +
            "and entity schemas. Read once per session to understand the deterministic resolution model " +
            "before calling consult_security_requirements, get_threat_landscape or get_guide_by_role.",
          mimeType: "application/yaml"
        },
        {
          uri: "sbd://toe/version",
          name: "SbD-ToE MCP Version",
          description: "Current version of the running SbD-ToE MCP server (name, version, description).",
          mimeType: "application/json"
        }
      ]
    });
  }

  private async handleResourcesRead(request: JsonRpcRequest): Promise<void> {
    const uri = typeof request.params?.uri === "string" ? request.params.uri : "";

    const applicabilityMatch = /^\/\/toe\/chapter-applicability\/([^/]+)$/.exec(
      uri.startsWith("sbd:") ? uri.slice(4) : ""
    );
    if (applicabilityMatch !== null) {
      const riskLevel = applicabilityMatch[1] ?? "";
      if (!["L1", "L2", "L3"].includes(riskLevel)) {
        this.sendError(
          request.id,
          -32602,
          `Invalid riskLevel: "${riskLevel}". Allowed values: L1, L2, L3.`
        );
        return;
      }
      const data = buildChapterApplicabilityJson(riskLevel);
      this.sendResponse(request.id, {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }]
      });
      return;
    }

    if (uri === "sbd://toe/index-compact") {
      const indexPath = resolveAppPath("data/publish/sbd-toe-index-compact.json");
      let indexText: string;
      try {
        indexText = readFileSync(indexPath, "utf-8");
      } catch {
        this.sendError(request.id, -32603, "Could not read the SbD-ToE compact index.");
        return;
      }
      this.sendResponse(request.id, {
        contents: [{ uri, mimeType: "application/json", text: indexText }]
      });
      return;
    }

    if (uri === "sbd://toe/agent-guide") {
      const guidePath = resolveAppPath("assets/agent-guide.md");
      let guideText: string;
      try {
        guideText = readFileSync(guidePath, "utf-8");
      } catch {
        this.sendError(request.id, -32603, "Could not read SbD-ToE agent guide.");
        return;
      }
      this.sendResponse(request.id, {
        contents: [{ uri, mimeType: "text/markdown", text: guideText }]
      });
      return;
    }

    if (uri === "sbd://toe/ontology") {
      const ontologyPath = resolveAppPath("data/publish/ontology/sbdtoe-ontology.yaml");
      let ontologyText: string;
      try {
        ontologyText = readFileSync(ontologyPath, "utf-8");
      } catch {
        this.sendError(request.id, -32603, "Could not read SbD-ToE ontology YAML.");
        return;
      }
      this.sendResponse(request.id, {
        contents: [{ uri, mimeType: "application/yaml", text: ontologyText }]
      });
      return;
    }

    if (uri === "sbd://toe/version") {
      try {
        const pkg = loadPackageMetadata();
        const payload = JSON.stringify({
          name: pkg.name,
          version: pkg.version,
          description: pkg.description
        });
        this.sendResponse(request.id, {
          contents: [{ uri, mimeType: "application/json", text: payload }]
        });
      } catch {
        this.sendError(request.id, -32603, "Could not read package.json.");
      }
      return;
    }

    this.sendError(request.id, -32602, `Unknown resource URI: ${uri}`);
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
          const result = handleGenerateSbdToeSkill();
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
