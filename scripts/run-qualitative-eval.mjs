import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import process from "node:process";

function parseArgs(argv) {
  const options = {
    profiles: [],
    caseIds: [],
    interactive: false,
    mdOut: undefined,
    jsonOut: undefined,
    triagePromptOut: undefined,
    printTriagePrompt: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    switch (token) {
      case "--profile":
        if (!next) throw new Error("--profile requires a value");
        options.profiles.push(next);
        index += 1;
        break;
      case "--case":
        if (!next) throw new Error("--case requires a value");
        options.caseIds.push(next);
        index += 1;
        break;
      case "--interactive":
        options.interactive = true;
        break;
      case "--md-out":
        if (!next) throw new Error("--md-out requires a value");
        options.mdOut = next;
        index += 1;
        break;
      case "--json-out":
        if (!next) throw new Error("--json-out requires a value");
        options.jsonOut = next;
        index += 1;
        break;
      case "--triage-prompt-out":
        if (!next) throw new Error("--triage-prompt-out requires a value");
        options.triagePromptOut = next;
        index += 1;
        break;
      case "--print-triage-prompt":
        options.printTriagePrompt = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return options;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/run-qualitative-eval.mjs [options]",
      "",
      "Options:",
      "  --profile <consult|guide|review|threats>  Filter by profile; repeatable",
      "  --case <C1|...|T4>                        Filter by case id; repeatable",
      "  --interactive                             Ask for human evaluation after each case",
      "  --md-out <path>                           Write markdown report to path",
      "  --json-out <path>                         Write JSON report to path",
      "  --triage-prompt-out <path>                Write triage prompt to path",
      "  --print-triage-prompt                     Print triage prompt to stdout",
      "  --help                                    Show this message",
      "",
      "Run `npm run build` first so dist/qualitative-eval-harness.js exists.",
    ].join("\n")
  );
}

async function loadHarness() {
  try {
    return await import("../dist/qualitative-eval-harness.js");
  } catch (error) {
    throw new Error(
      "Missing dist/qualitative-eval-harness.js. Run `npm run build` before running the qualitative eval harness."
    );
  }
}

function ensureParentDir(pathname) {
  mkdirSync(dirname(resolve(pathname)), { recursive: true });
}

function normalizeOutcome(value, fallback) {
  if (!value) return fallback;
  if (["pass", "warn", "fail"].includes(value)) {
    return value;
  }
  return fallback;
}

function normalizeBoolean(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["y", "yes", "true"].includes(normalized)) return true;
  if (["n", "no", "false"].includes(normalized)) return false;
  return undefined;
}

async function captureManualEvaluations(initialReport) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const manualEvaluations = {};
  try {
    for (const result of initialReport.cases) {
      process.stdout.write(
        [
          "",
          `### ${result.id} (${result.profile})`,
          `Prompt: ${result.prompt}`,
          `Tool path: ${result.toolPath.join(" -> ")}`,
          `Auto result: ${result.observed.autoOutcome}`,
          `Summary: ${result.observed.summary.join(" | ")}`,
          `Citations: ${result.observed.citations.join(", ") || "none"}`,
          `Chapters: ${result.observed.chapters.join(", ") || "none"}`,
        ].join("\n") + "\n"
      );

      const outcome = normalizeOutcome(
        (await rl.question(`Result [${result.observed.autoOutcome}]: `)).trim(),
        result.observed.autoOutcome
      );

      const defaultDeterministic =
        result.observed.deterministicFirst === null
          ? ""
          : result.observed.deterministicFirst
            ? "yes"
            : "no";
      const deterministicFirst = normalizeBoolean(
        await rl.question(`Deterministic first [${defaultDeterministic || "skip"}]: `)
      );

      const defaultProvenance =
        result.observed.provenanceUseful === null
          ? ""
          : result.observed.provenanceUseful
            ? "yes"
            : "no";
      const provenanceUseful = normalizeBoolean(
        await rl.question(`Provenance useful [${defaultProvenance || "skip"}]: `)
      );

      const issueType = (
        await rl.question(
          `Issue type [${result.observed.failureHints.join(", ") || "skip"}]: `
        )
      ).trim();
      const note = (await rl.question("Note [optional]: ")).trim();

      manualEvaluations[result.id] = {
        outcome,
        ...(deterministicFirst !== undefined ? { deterministicFirst } : {}),
        ...(provenanceUseful !== undefined ? { provenanceUseful } : {}),
        ...(issueType ? { issueType } : {}),
        ...(note ? { note } : {}),
      };
    }
  } finally {
    rl.close();
  }

  return manualEvaluations;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const harness = await loadHarness();

  let manualEvaluations;
  let report = await harness.runQualitativeEval({
    ...(args.profiles.length > 0 ? { profiles: args.profiles } : {}),
    ...(args.caseIds.length > 0 ? { caseIds: args.caseIds } : {}),
  });

  if (args.interactive) {
    manualEvaluations = await captureManualEvaluations(report);
    report = await harness.runQualitativeEval({
      ...(args.profiles.length > 0 ? { profiles: args.profiles } : {}),
      ...(args.caseIds.length > 0 ? { caseIds: args.caseIds } : {}),
      manualEvaluations,
    });
  }

  const markdown = harness.renderQualitativeEvalMarkdown(report);
  process.stdout.write(`${markdown}\n`);

  if (args.mdOut) {
    ensureParentDir(args.mdOut);
    writeFileSync(resolve(args.mdOut), markdown, "utf8");
  }

  if (args.jsonOut) {
    ensureParentDir(args.jsonOut);
    writeFileSync(resolve(args.jsonOut), JSON.stringify(report, null, 2), "utf8");
  }

  const triagePrompt = harness.buildQualitativeEvalTriagePrompt(report);
  if (args.triagePromptOut) {
    ensureParentDir(args.triagePromptOut);
    writeFileSync(resolve(args.triagePromptOut), triagePrompt, "utf8");
  }
  if (args.printTriagePrompt) {
    process.stdout.write(`\n\n${triagePrompt}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
