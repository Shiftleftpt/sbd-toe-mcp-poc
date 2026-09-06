#!/usr/bin/env node
/**
 * run-acceptance-scenarios — executes the 94 acceptance scenarios of
 * DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md against the built
 * server (dist/index.js) over stdio and writes a verdict report.
 *
 * Usage: node scripts/run-acceptance-scenarios.mjs [--out <dir>] [--only TC-E] [--stamp YYYY-MM-DD]
 *   --out   report directory (default: acceptance-reports/)
 *   --only  prefix filter (e.g. TC-E, TC-D-1)
 * Exit code: 1 when any Axis-E (promotion gate) scenario FAILs; 0 otherwise.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startClient } from "./acceptance/client.mjs";
import { scenarios } from "./acceptance/scenarios.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const outDir = path.resolve(repoRoot, opt("--out") ?? "acceptance-reports");
const only = opt("--only");

const readJson = (rel) => { const p = path.join(repoRoot, rel); if (!existsSync(p)) return []; const j = JSON.parse(readFileSync(p, "utf8")); return Array.isArray(j) ? j : (Object.values(j).find(Array.isArray) ?? []); };
const knownIds = new Set([
  ...readJson("data/publish/runtime/requirements.json").map((x) => x.requirement_id),
  ...readJson("data/publish/runtime/controls.json").map((x) => x.control_id),
  ...readJson("data/publish/runtime/artifacts.json").map((x) => x.artifact_type_id),
  ...readJson("data/publish/runtime/v1/slices.json").map((x) => x.slice_id ?? x.id),
  ...["control_objectives", "mechanisms", "practices", "artifacts"].flatMap((f) => readJson(`data/publish/runtime/v1/${f}.json`).map((x) => x.entity_id ?? x.id)),
  ...readJson("data/publish/overlay/external_obligations.json").map((x) => x.obligation_id),
].filter(Boolean));
const pin = JSON.parse(readFileSync(path.join(repoRoot, "consumed-bundle.json"), "utf8"));
const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

const client = await startClient();
const chapters = new Set(((await client.tool("list_sbd_toe_chapters", {})).data?.chapters ?? []).map((c) => c.id));
const linkRecords = readJson("data/publish/runtime/requirement_control_links.json");
const curationByCurator = {};
for (const l of linkRecords) if (l.curation?.curator) curationByCurator[l.curation.curator] = (curationByCurator[l.curation.curator] ?? 0) + 1;
const ctx = {
  knownIds,
  chapters,
  links: {
    total: linkRecords.length,
    curationByCurator,
    justifications: [...new Set(linkRecords.flatMap((l) => String(l.justification ?? "").split(",").map((x) => x.trim()).filter(Boolean)))].sort(),
    targetsOf: (id) => linkRecords.filter((l) => l.source_id === id).map((l) => l.target_id),
  },
};

const results = [];
for (const sc of scenarios) {
  if (only && !sc.id.startsWith(only)) continue;
  const t0 = Date.now();
  let v;
  try { v = await sc.run(client, ctx); } catch (e) { v = { status: "FAIL", note: `runner error: ${e.message}`, owner: "mcp" }; }
  results.push({ id: sc.id, axis: sc.axis, title: sc.title, tool: sc.tool, ...v, ms: Date.now() - t0 });
  process.stderr.write(`${v.status.padEnd(4)} ${sc.id}  ${sc.title}\n       ${v.note}\n`);
}
const exposedTools = client.tools.map((t) => t.name).sort();
const exercisedTools = [...client.calls.keys()].sort();
const unexercisedTools = exposedTools.filter((t) => !client.calls.has(t));
client.stop();

// ---- rollup -----------------------------------------------------------------
const axes = ["A", "B", "C", "D", "E", "F", "G", "H"];
const axisName = { A: "Tool coverage", B: "By role", C: "By surface (AC)", D: "Negatives / invariants", E: "Regression (gate)", F: "0.10.0 tools + G1 (added 2026-08-29)", G: "Beta-line tools (added 2026-09-01)", H: "Selection vs golden oracle (measurement, not gate; added 2026-08-31)" };
const count = (rs, s) => rs.filter((r) => r.status === s).length;
const rollup = axes.map((a) => { const rs = results.filter((r) => r.axis === a); return { axis: a, name: axisName[a], total: rs.length, PASS: count(rs, "PASS"), PART: count(rs, "PART"), FAIL: count(rs, "FAIL"), SKIP: count(rs, "SKIP") }; });
const totals = { total: results.length, PASS: count(results, "PASS"), PART: count(results, "PART"), FAIL: count(results, "FAIL"), SKIP: count(results, "SKIP") };
const executed = totals.total - totals.SKIP;
const gateFails = results.filter((r) => r.axis === "E" && r.status === "FAIL");

// Coverage of the surface catalogue (what the 94 touch, beyond pass/fail)
const acCovered = results.filter((r) => r.axis === "C" && r.status !== "SKIP").map((r) => r.id.replace("TC-C-", "AC-"));
const acSkipped = results.filter((r) => r.axis === "C" && r.status === "SKIP").map((r) => r.id.replace("TC-C-", "AC-"));
const roleRuns = results.filter((r) => r.axis === "B").map((r) => r.title.replace(/^guide by role /, ""));
const coverage = {
  scenarios: { total: totals.total, executed, skipped: totals.SKIP, executed_pct: Math.round((executed / totals.total) * 100) },
  tools: { exposed: exposedTools.length, exercised: exercisedTools.length, unexercised: unexercisedTools, calls: Object.fromEntries([...client.calls.entries()].sort()) },
  acceptance_cases: { total: 28, covered_oss: acCovered, commercial_roadmap: acSkipped },
  roles_x_phases: roleRuns,
};

const stamp = opt("--stamp") ?? new Date().toISOString().slice(0, 10);
mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${stamp}-v${pkg.version}-acceptance`);
const report = { generated_at: new Date().toISOString(), server: client.serverInfo, package_version: pkg.version, consumed_bundle: { release_tag: pin.kg_bundle.release_tag, source: pin.kg_bundle.source, sha256: pin.kg_bundle.release_sha256, contract: pin.consumer_contract_version, manual: pin.inputs.manual.tag }, totals, executed, rollup, coverage, results };
writeFileSync(`${base}.json`, JSON.stringify(report, null, 2) + "\n");

// Markdown table cell: escape backslashes first, then pipes; flatten line breaks.
const mdCell = (v) => String(v).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const md = [];
md.push(`# MCP acceptance scenarios — run ${stamp} — @shiftleftpt/sbd-toe-mcp@${pkg.version}`, "");
md.push(`Source: \`DevelopmentGovernance/docs/mcp-acceptance-test-scenarios.md\` (94 scenarios, 5 axes). Runner: \`npm run eval:acceptance\` (\`scripts/run-acceptance-scenarios.mjs\`, live stdio server \`dist/index.js\`).`);
md.push(`Served bundle: **${pin.kg_bundle.release_tag}** (\`${pin.kg_bundle.source}\`, sha256 \`${pin.kg_bundle.release_sha256}\`, contract ${pin.consumer_contract_version}, Manual ${pin.inputs.manual.tag}).`, "");
md.push(`Statuses: PASS = meets verdict · PART = partially / documented gap confirmed · FAIL = contradicts verdict · SKIP = not executable here (commercial/stateful surface or needs a client LLM).`, "");
md.push("## Rollup", "", "| Axis | Scenarios | PASS | PART | FAIL | SKIP | Executed | PASS+PART of executed |", "|---|---|---|---|---|---|---|---|");
for (const r of rollup) { const ex = r.total - r.SKIP; md.push(`| ${r.axis} — ${r.name} | ${r.total} | ${r.PASS} | ${r.PART} | ${r.FAIL} | ${r.SKIP} | ${ex} | ${ex ? Math.round(((r.PASS + r.PART) / ex) * 100) : 0}% |`); }
md.push(`| **Total** | **${totals.total}** | **${totals.PASS}** | **${totals.PART}** | **${totals.FAIL}** | **${totals.SKIP}** | **${executed}** | **${Math.round(((totals.PASS + totals.PART) / executed) * 100)}%** |`, "");
md.push(`Promotion gate (Axis E): ${gateFails.length === 0 ? "**PASS**" : `**FAIL** (${gateFails.map((r) => r.id).join(", ")})`}. Axis H (selecção) e Axis I (leituras) são MEDIÇÃO e nunca entram no gate — relatórios próprios via \`npm run eval:axis-h\` e \`npm run eval:axis-i\`.`, "");
md.push("## Coverage", "");
md.push(`- **Scenarios:** ${executed}/${totals.total} executed (${coverage.scenarios.executed_pct}%); ${totals.SKIP} skipped — ${acSkipped.length} commercial/stateful ACs + ${totals.SKIP - acSkipped.length} needing a client LLM.`);
md.push(`- **Tools:** ${exercisedTools.length}/${exposedTools.length} exposed tools exercised${unexercisedTools.length ? ` — not exercised: \`${unexercisedTools.join("`, `")}\`` : ""}.`);
md.push(`- **Acceptance cases (28):** OSS-testable covered: ${acCovered.join(", ")}; commercial roadmap (documented, not run): ${acSkipped.length}.`);
md.push(`- **Roles × phases (Axis B):** ${roleRuns.join("; ")}.`, "");
md.push("Call counts per tool: " + Object.entries(coverage.tools.calls).map(([k, v]) => `\`${k}\`×${v}`).join(", ") + ".", "");
for (const a of axes) { md.push(`## Axis ${a} — ${axisName[a]}`, "", "| ID | Status | Tool | Verdict note | Owner |", "|---|---|---|---|---|");
  for (const r of results.filter((r) => r.axis === a)) md.push(`| ${r.id} | ${r.status} | \`${r.tool}\` | ${mdCell(r.note)} | ${r.owner ?? ""} |`); md.push(""); }
writeFileSync(`${base}.md`, md.join("\n") + "\n");

console.log(JSON.stringify({ totals, executed, rollup, gate: gateFails.length ? "FAIL" : "PASS", report: `${base}.md` }, null, 1));
process.exit(gateFails.length ? 1 : 0);
