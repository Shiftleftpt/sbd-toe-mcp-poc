#!/usr/bin/env node

import readline from "node:readline";

import { getConfig } from "./config.js";
import {
  formatSampledAnswerResult,
  inspectManualRetrieval,
  prepareManualAnsweringContext,
  searchManualQuestion
} from "./orchestrator/ask-manual.js";
import { loadSystemPromptTemplate } from "./prompt/system-prompt.js";

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

type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcError;

const PROTOCOL_VERSION = "2025-03-26";

class McpRuntime {
  private nextRequestId = 10_000;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private clientCapabilities: Record<string, unknown> = {};
  private initialized = false;
  private logLevel = "info";

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
      this.sendError(
        message.id,
        -32603,
        error instanceof Error ? error.message : "Internal error"
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

    this.sendResponse(request.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        logging: {},
        prompts: {
          listChanged: false
        },
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: "sbd-toe-mcp-poc",
        version: "0.1.0"
      },
      instructions:
        "Use search_sbd_toe_manual to retrieve grounded SbD-ToE context before answering."
    });
  }

  private handleSetLogLevel(request: JsonRpcRequest): void {
    const level =
      typeof request.params?.level === "string" ? request.params.level : "info";
    this.logLevel = level;
    this.sendResponse(request.id, {});
  }

  private async log(level: string, data: string): Promise<void> {
    const levels = [
      "debug",
      "info",
      "notice",
      "warning",
      "error",
      "critical",
      "alert",
      "emergency"
    ];

    if (levels.indexOf(level) < levels.indexOf(this.logLevel)) {
      return;
    }

    this.sendNotification("notifications/message", {
      level,
      logger: "sbd-toe-mcp-poc",
      data
    });
  }

  private handleToolsList(request: JsonRpcRequest): void {
    this.sendResponse(request.id, {
      tools: [
        {
          name: "search_sbd_toe_manual",
          title: "Search SbD-ToE Manual",
          description:
            "Recupera contexto grounded do manual SbD-ToE a partir do snapshot semântico local embutido.",
          inputSchema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Pergunta em linguagem natural sobre o manual."
              },
              debug: {
                type: "boolean",
                description: "Quando true, anexa o debug completo do retrieval."
              },
              topK: {
                type: "integer",
                minimum: 1,
                maximum: 15,
                description: "Número máximo de records usados como contexto."
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
            "Faz retrieval do manual SbD-ToE e pede a resposta final ao modelo configurado no cliente via sampling MCP.",
          inputSchema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Pergunta em linguagem natural sobre o manual."
              },
              debug: {
                type: "boolean",
                description: "Quando true, anexa o debug completo."
              },
              topK: {
                type: "integer",
                minimum: 1,
                maximum: 15,
                description: "Número máximo de records usados como contexto."
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
            "Inspeciona retrieval, seleção de contexto e prompt final sem pedir resposta ao modelo do cliente.",
          inputSchema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Pergunta a usar na inspeção do retrieval."
              },
              topK: {
                type: "integer",
                minimum: 1,
                maximum: 15,
                description: "Número máximo de records selecionados para o prompt."
              }
            },
            required: ["question"],
            additionalProperties: false
          },
          annotations: {
            readOnlyHint: true
          }
        }
      ]
    });
  }

  private getPromptDefinition(): Record<string, unknown> {
    return {
      name: "ask_sbd_toe_manual",
      title: "Ask SbD-ToE Manual",
      description:
        "Prompt MCP para orientar o chat do VS Code a responder perguntas sobre o manual SbD-ToE com grounding.",
      arguments: [
        {
          name: "question",
          description: "Pergunta sobre o manual SbD-ToE.",
          required: true
        }
      ]
    };
  }

  private handlePromptsList(request: JsonRpcRequest): void {
    this.sendResponse(request.id, {
      prompts: [this.getPromptDefinition()]
    });
  }

  private handlePromptGet(request: JsonRpcRequest): void {
    const name = typeof request.params?.name === "string" ? request.params.name : "";
    if (name !== "ask_sbd_toe_manual") {
      this.sendError(request.id, -32602, `Prompt desconhecida: ${name}`);
      return;
    }

    const args =
      typeof request.params?.arguments === "object" && request.params.arguments !== null
        ? (request.params.arguments as Record<string, unknown>)
        : {};
    const question = typeof args.question === "string" ? args.question : "";
    const promptText =
      `${loadSystemPromptTemplate()}\n\n` +
      "Use a ferramenta `search_sbd_toe_manual` antes de responder.\n" +
      `Question: ${question}`;

    this.sendResponse(request.id, {
      description: "Prompt grounded para perguntas sobre o manual SbD-ToE.",
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
  }

  private getStringArg(args: Record<string, unknown>, key: string): string {
    const value = args[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`O argumento "${key}" é obrigatório.`);
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
      throw new Error("O cliente MCP atual não declarou suporte para sampling.");
    }

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

    try {
      switch (name) {
        case "search_sbd_toe_manual": {
          const question = this.getStringArg(args, "question");
          const debug = this.getOptionalBooleanArg(args, "debug");
          const topK = this.getOptionalIntegerArg(args, "topK");
          await this.log("info", `search_sbd_toe_manual: "${question}"`);
          const result = await searchManualQuestion(question, debug, topK);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: result.text }]
          });
          return;
        }
        case "inspect_sbd_toe_retrieval": {
          const question = this.getStringArg(args, "question");
          const topK = this.getOptionalIntegerArg(args, "topK");
          await this.log("info", `inspect_sbd_toe_retrieval: "${question}"`);
          const result = await inspectManualRetrieval(question, topK);
          this.sendResponse(request.id, {
            content: [{ type: "text", text: result.text }]
          });
          return;
        }
        case "answer_sbd_toe_manual": {
          const question = this.getStringArg(args, "question");
          const debug = this.getOptionalBooleanArg(args, "debug");
          const topK = this.getOptionalIntegerArg(args, "topK");
          await this.log("info", `answer_sbd_toe_manual: "${question}"`);
          const prepared = await prepareManualAnsweringContext(question, topK);
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
          return;
        }
        default:
          this.sendError(request.id, -32602, `Tool desconhecida: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado.";
      await this.log("error", message);
      this.sendResponse(request.id, {
        isError: true,
        content: [{ type: "text", text: message }]
      });
    }
  }
}

function main(): void {
  new McpRuntime();
}

main();
