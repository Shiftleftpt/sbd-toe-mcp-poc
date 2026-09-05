/**
 * generate_sbd_toe_skill
 *
 * Without arguments: returns the canonical SbD-ToE agent guide content ready to
 * be saved as a skill or instructions file for any AI client (original behaviour).
 *
 * With a role (RF-S, Stage 1): returns a role-specialised skill or an installable
 * sub-agent definition, grounded on the same deterministic pipeline as
 * get_guide_by_role — the content is a structural projection of the role's manual
 * slice (chapters, user stories, DoD counts). Nothing is invented; the coverage
 * block always declares what the slice covers and how to reach the rest.
 *
 * Sub-agent flavours:
 *   - harnessed — grants mcp__sbd-toe__* tools; the agent queries the manual live.
 *   - skilled   — embeds the frozen skill; carries NO MCP tools (offline-usable).
 *
 * Contract: agentic/em-curso/2026-06-12-pontifex-rfs-stage1-contract.md
 */

import { servedKgReleaseTag, servingServerVersion } from "../version-info.js";
import { buildAgentGuide } from "../serving/agent-guide.js";
import { readFileSync } from "node:fs";
import { resolveAppPath } from "../config.js";
import { getOntologyData } from "./ontology-loader.js";
import { handleGetGuideByRole, type GetGuideByRoleOutput, type RoleChecklistEntry } from "./get-guide-by-role.js";
import { handleListSbdToeChapters } from "./structured-tools.js";
import type { Affordance } from "../serving/protocol-envelope.js";
import { generateSkillAffordances } from "../serving/affordances.js";

const VALID_FORMATS = ["skill", "subagent"] as const;
const VALID_FLAVOURS = ["harnessed", "skilled"] as const;

type SkillFormat = (typeof VALID_FORMATS)[number];
type SubagentFlavour = (typeof VALID_FLAVOURS)[number];

const CLIENT_LOCAL_TOOLS = "Read, Write, Edit, Grep, Glob, Bash";
const DEFAULT_TOOL_PREFIX = "mcp__sbd-toe__";
const HARNESSED_MCP_TOOLS = [
  "mcp__sbd-toe__get_guide_by_role",
  "mcp__sbd-toe__consult_security_requirements",
  "mcp__sbd-toe__select_sbd_toe_requirements",
  "mcp__sbd-toe__get_threat_landscape",
  "mcp__sbd-toe__query_sbd_toe_entities",
  "mcp__sbd-toe__resolve_entities",
  "mcp__sbd-toe__get_sbd_toe_chapter_brief",
  "mcp__sbd-toe__list_sbd_toe_chapters",
  "mcp__sbd-toe__search_sbd_toe_manual"
];

export interface GenerateSkillCoverage {
  chapters: number;
  of_total_chapters: number;
  assignments: number;
  user_stories: number;
  checklist_items: number;
}

export interface GenerateSkillOutput {
  content: string;
  /** RF-H advisory band — adjacent tools the caller likely needs next. */
  next?: Affordance[];
  suggested_path?: string;
  meta?: {
    role: string;
    canonical_role: string;
    risk_level: string;
    format: SkillFormat;
    flavour?: SubagentFlavour;
    include_detail: boolean;
    coverage: GenerateSkillCoverage;
    provenance: {
      kg: string;
      server: string;
      content_type: "derived";
      produced_by: string;
      source_data: string;
      note: string;
    };
  };
}

/** Extracts a `## <heading>` section from the agent guide, verbatim (manual-grounded). */
function extractGuideSection(guide: string, heading: string): string {
  const start = guide.indexOf(`## ${heading}`);
  if (start < 0) return "";
  const rest = guide.slice(start);
  const next = rest.slice(2).search(/\n## |\n---\n/);
  return (next >= 0 ? rest.slice(0, next + 2) : rest).trim();
}

function readAgentGuide(): string {
  // 0.20.0-beta.24: a skill gerada leva o guia DERIVADO, não o template. Servir o
  // template aqui reintroduziria pela porta das traseiras a lista escrita à mão.
  try {
    return buildAgentGuide();
  } catch {
    throw new Error("Could not read SbD-ToE agent guide from assets/agent-guide.md.");
  }
}

function suggestedPathFor(clientType: string | undefined, format: SkillFormat, name: string): string {
  const client = (clientType ?? "").toLowerCase();
  if (format === "subagent") {
    return `.claude/agents/${name}.md`;
  }
  if (client.includes("copilot")) return ".github/copilot-instructions.md";
  if (client.includes("cursor")) return ".cursorrules";
  return `.claude/skills/${name}.md`;
}

interface ChapterInfo {
  id: string;
  readableTitle: string;
}

function chapterIndex(): Map<string, ChapterInfo> {
  const out = handleListSbdToeChapters({}) as { chapters?: ChapterInfo[] };
  const list = Array.isArray(out.chapters) ? out.chapters : [];
  return new Map(list.map((c) => [c.id, c]));
}

/** Groups the role's user stories by chapter, preserving bundle order. */
function sliceByChapter(checklist: RoleChecklistEntry[]): Map<string, RoleChecklistEntry[]> {
  const byChapter = new Map<string, RoleChecklistEntry[]>();
  for (const entry of checklist) {
    const ch = entry.chapter_id ?? "unknown";
    const bucket = byChapter.get(ch) ?? [];
    bucket.push(entry);
    byChapter.set(ch, bucket);
  }
  return byChapter;
}

function renderSlice(
  guide: GetGuideByRoleOutput,
  chapters: Map<string, ChapterInfo>,
  includeDetail: boolean
): string {
  const byChapter = sliceByChapter(guide.role_checklist ?? []);
  const lines: string[] = [];
  for (const [chapterId, entries] of [...byChapter.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const title = chapters.get(chapterId)?.readableTitle ?? chapterId;
    lines.push(`### ${chapterId} — ${title}`);
    for (const us of entries) {
      const id = us.us_id ?? us.id ?? "";
      const count = us.checklist_items.length;
      lines.push(`- ${id ? `**${id}** — ` : ""}${us.title} (${count} checklist item${count === 1 ? "" : "s"})`);
      if (includeDetail) {
        for (const item of us.checklist_items) {
          lines.push(`  - [ ] ${item}`);
        }
      }
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function coverageOf(guide: GetGuideByRoleOutput, totalChapters: number): GenerateSkillCoverage {
  const checklist = guide.role_checklist ?? [];
  const chapterIds = new Set(checklist.map((e) => e.chapter_id).filter(Boolean));
  return {
    chapters: chapterIds.size,
    of_total_chapters: totalChapters,
    assignments: guide.meta.assignmentCount,
    user_stories: checklist.length,
    checklist_items: checklist.reduce((n, e) => n + e.checklist_items.length, 0)
  };
}

function renderCoverageBlock(
  canonicalRole: string,
  riskLevel: string,
  coverage: GenerateSkillCoverage,
  harnessed: boolean
): string {
  const pathToRest = harnessed
    ? `For the full Definition-of-Done call \`get_guide_by_role(risk_level="${riskLevel}", role="${canonicalRole}", include_detail=true)\`; ` +
      `for *which requirements apply to a concrete task* use \`select_sbd_toe_requirements\` ` +
      `(selected[] is the recommendation; narrowed_out[] lists what left and why — re-call with the missing signal to recover it); ` +
      `for the catalogue at a level use \`consult_security_requirements\` (mode="index" for a compact id map); for threats \`get_threat_landscape\`; ` +
      `for the chapters outside your slice \`list_sbd_toe_chapters\` + \`get_sbd_toe_chapter_brief\`.`
    : `To reach beyond it, re-generate via the SbD-ToE MCP (\`generate_sbd_toe_skill\`) or consult the manual ` +
      `chapters listed by \`list_sbd_toe_chapters\` on a connected client — where ` +
      `\`select_sbd_toe_requirements\` narrows the requirements to a concrete task ` +
      `(selected[] recommendation + narrowed_out[] with reasons, never silent).`;
  return (
    `## Coverage (declared — nothing hidden)\n` +
    `This is the **${canonicalRole}** slice at **${riskLevel}**: ${coverage.assignments} assignments, ` +
    `${coverage.user_stories} user stories, ${coverage.checklist_items} checklist items across ` +
    `${coverage.chapters} of the manual's ${coverage.of_total_chapters} chapters. ` +
    `It is **not** the whole manual. ${pathToRest}`
  );
}

function renderCoreBlock(guide: string): string {
  const epistemic = extractGuideSection(guide, "Epistemic standards");
  const identifiers = extractGuideSection(guide, "Identifier conventions");
  return [
    "## SbD-ToE core (always apply)",
    "- Ground every claim: cite chapter ids, `CTRL-…`, `MT-…`, `US-…` identifiers from the manual — never invent IDs.",
    "- Traceability chain: Risk → Requirement → Control → Validation → Evidence. Tests/scan reports are evidence; config alone is not.",
    "",
    epistemic,
    "",
    identifiers
  ]
    .join("\n")
    .trim();
}

function buildRoleContent(args: {
  roleArg: string;
  canonicalRole: string;
  riskLevel: string;
  format: SkillFormat;
  flavour: SubagentFlavour;
  includeDetail: boolean;
  guideOutput: GetGuideByRoleOutput;
  chapters: Map<string, ChapterInfo>;
  coverage: GenerateSkillCoverage;
},
  toolPrefix: string,
  prefixProvided: boolean): string {
  const { canonicalRole, riskLevel, format, flavour, includeDetail, guideOutput, chapters, coverage } = args;
  const name = `sbd-${canonicalRole}`;
  const harnessed = format === "subagent" && flavour === "harnessed";
  const agentGuide = readAgentGuide();

  const chapterIds = [...new Set((guideOutput.role_checklist ?? []).map((e) => e.chapter_id).filter(Boolean))].sort();
  const chapterTitles = chapterIds
    .map((id) => chapters.get(id as string)?.readableTitle ?? id)
    .join(", ");

  const flavourNote =
    format === "subagent"
      ? harnessed
        ? "Queries the SbD-ToE MCP live."
        : "Frozen manual slice — no live MCP."
      : "Role-specialised SbD-ToE skill.";
  const description = `SbD-ToE ${canonicalRole} (${riskLevel}) — ${chapterTitles}. ${flavourNote}`;

  const tools =
    format === "subagent"
      ? harnessed
        ? `${CLIENT_LOCAL_TOOLS}, ${HARNESSED_MCP_TOOLS.map((t) => t.replace(DEFAULT_TOOL_PREFIX, toolPrefix)).join(", ")}`
        : CLIENT_LOCAL_TOOLS
      : undefined;

  const frontmatter = [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    ...(tools ? [`tools: ${tools}`] : []),
    "---"
  ].join("\n");

  const mission = harnessed
    ? `You are the **${canonicalRole}** on a Security-by-Design team. You query the SbD-ToE manual **live** ` +
      `through the MCP tools — the slice below is your index; the MCP is the source of truth. ` +
      `Start with \`get_guide_by_role(risk_level="${riskLevel}", role="${canonicalRole}", include_detail=true)\`.`
    : `You are the **${canonicalRole}** on a Security-by-Design team. You carry the SbD-ToE manual's ` +
      `${canonicalRole} slice (below) **implicitly**.`;

  const sliceHeading = `## Your manual slice (${riskLevel} — grounded on the published bundle, nothing invented)`;
  // The harnessed flavour stays light: chapter index only, the MCP serves the detail.
  const slice = harnessed
    ? chapterIds.map((id) => `- ${id} — ${chapters.get(id as string)?.readableTitle ?? id}`).join("\n")
    : renderSlice(guideOutput, chapters, includeDetail);

  const prefixInstruction =
    format === "subagent" && harnessed && !prefixProvided
      ? "> ⚠️ **SUBSTITUI `<MCP_TOOL_PREFIX>` no frontmatter `tools:` acima** pelo prefixo real das " +
        "tools SbD-ToE no TEU cliente (ex.: `mcp__sbd-toe__` no Claude Code local; confirma via a " +
        "lista de tools do cliente). Sem substituição este subagente instala-se SEM tools — o " +
        "placeholder é deliberadamente visível para nunca falhar em silêncio. Alternativa: gera de " +
        "novo com `generate_sbd_toe_skill(..., tool_prefix=\"<prefixo>\")`."
      : null;

  return [
    frontmatter,
    ...(prefixInstruction ? ["", prefixInstruction] : []),
    "",
    mission,
    "",
    renderCoreBlock(agentGuide),
    "",
    sliceHeading,
    slice,
    "",
    renderCoverageBlock(canonicalRole, riskLevel, coverage, harnessed)
  ].join("\n");
}

export function handleGenerateSbdToeSkill(args: Record<string, unknown> = {}): GenerateSkillOutput {
  const toolPrefixArg = args && typeof (args as Record<string, unknown>)["tool_prefix"] === "string" ? String((args as Record<string, unknown>)["tool_prefix"]).trim() : "";
  // 0.15.1 (P0-4, decisão (c)): o servidor NÃO observa o prefixo do cliente. Sem
  // parâmetro → PLACEHOLDER visível + instrução de substituição — nunca uma instalação
  // silenciosa com tools erradas (b) nem um erro que quebre o fluxo comum (a).
  const prefixProvided = toolPrefixArg.length > 0;
  const toolPrefix = prefixProvided ? toolPrefixArg : "<MCP_TOOL_PREFIX>";
  const roleArg = typeof args["role"] === "string" ? args["role"].trim() : "";

  // No role → original behaviour: the generic agent guide, unchanged.
  if (!roleArg) {
    const content =
      `<!-- SbD-ToE skill content — source: sbd://toe/agent-guide (@shiftleftpt/sbd-toe-mcp) -->\n` +
      `<!-- Re-run generate_sbd_toe_skill to refresh. -->\n\n` +
      readAgentGuide();
    return { content, next: generateSkillAffordances() };
  }

  const riskLevel = typeof args["risk_level"] === "string" ? args["risk_level"] : "L2";
  if (!["L1", "L2", "L3"].includes(riskLevel)) {
    throw new Error(`Invalid risk_level: "${riskLevel}". Allowed values: L1, L2, L3.`);
  }

  const formatArg = typeof args["format"] === "string" ? args["format"] : "skill";
  if (!(VALID_FORMATS as readonly string[]).includes(formatArg)) {
    throw new Error(`Invalid format: "${formatArg}". Allowed values: skill, subagent.`);
  }
  const format = formatArg as SkillFormat;

  const flavourArg = typeof args["flavour"] === "string" ? args["flavour"] : "harnessed";
  if (!(VALID_FLAVOURS as readonly string[]).includes(flavourArg)) {
    throw new Error(`Invalid flavour: "${flavourArg}". Allowed values: harnessed, skilled.`);
  }
  const flavour = flavourArg as SubagentFlavour;

  const includeDetail = args["include_detail"] === true;
  const clientType = typeof args["clientType"] === "string" ? args["clientType"] : undefined;

  // Ground the slice on the same pipeline as get_guide_by_role — always with
  // detail so the projection (titles + counts) is computed from the real DoD.
  const guideArgs: Record<string, unknown> = {
    risk_level: riskLevel,
    role: roleArg,
    include_detail: true,
    ...(typeof args["phase"] === "string" ? { phase: args["phase"] } : {}),
    ...(args["concerns"] !== undefined ? { concerns: args["concerns"] } : {})
  };
  const guideOutput = handleGetGuideByRole(guideArgs);

  // Validate against the canonical roles — never serve a skill for an unknown role.
  const canonicalRoles = getOntologyData().roles.map((r) => r.role_id);
  const canonicalRole = guideOutput.canonicalRole ?? "";
  if (!canonicalRoles.includes(canonicalRole)) {
    throw new Error(
      `Unknown role: "${roleArg}". Canonical roles: ${canonicalRoles.sort().join(", ")}.`
    );
  }

  const chapters = chapterIndex();
  const coverage = coverageOf(guideOutput, chapters.size);
  const content = buildRoleContent({
    roleArg,
    canonicalRole,
    riskLevel,
    format,
    flavour,
    includeDetail,
    guideOutput,
    chapters,
    coverage
  }, toolPrefix, prefixProvided);

  return {
    content,
    suggested_path: suggestedPathFor(clientType, format, `sbd-${canonicalRole}`),
    meta: {
      role: roleArg,
      canonical_role: canonicalRole,
      risk_level: riskLevel,
      format,
      ...(format === "subagent" ? { flavour } : {}),
      include_detail: includeDetail,
      coverage,
      provenance: {
        kg: servedKgReleaseTag(),
      server: servingServerVersion(),
        content_type: "derived",
        produced_by: "role_skill_projection",
        source_data:
          "get_guide_by_role pipeline (runtime/{controls,practices,assignments,user_stories,roles,phases}.json) + list_sbd_toe_chapters + assets/agent-guide.md",
        note:
          "Role skill is a structural projection of the role's manual slice — every chapter, user story and checklist item exists in the published bundle. Coverage is declared; nothing silently truncated."
      }
    }
  };
}
