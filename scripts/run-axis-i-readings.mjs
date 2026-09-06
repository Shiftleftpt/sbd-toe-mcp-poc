#!/usr/bin/env node
/**
 * run-axis-i-readings — Eixo I: medição das LEITURAS do Manual contra o oráculo do lead
 * (golden-reading-cases.md v1, ratificado 2026-09-06 «adjudico»).
 *
 * Medição, nunca portão: o Axis E continua a ser o único gate de promoção, e este runner
 * sai sempre com 0 excepto se não conseguir correr de todo. A evolução mede-se por
 * MIGRAÇÃO DE ESTADO entre corridas (SERVIDO / SERVIDO-MAL / NÃO SERVIDO), não por
 * percentagem — por isso o registo guarda o veredicto E a evidência por peça.
 *
 * Uso: node scripts/run-axis-i-readings.mjs [--out <dir>] [--stamp <slug>]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startClient } from "./acceptance/client.mjs";
import { readingCases, runReadingCase, ORACLE_VERSION, ORACLE_PATH, VERDICTS } from "./acceptance/axis-i.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const outDir = path.resolve(repoRoot, opt("--out") ?? "docs/acceptance-runs");
const stamp = opt("--stamp") ?? new Date().toISOString().slice(0, 10);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const pin = JSON.parse(readFileSync(path.join(repoRoot, "consumed-bundle.json"), "utf8"));

const client = await startClient();
const results = [];
for (const rc of readingCases) {
  const r = await runReadingCase(client, rc);
  results.push(r);
  process.stderr.write(`${r.verdict.padEnd(12)} ${r.case} (${r.reading})  ${r.title}\n`);
  for (const m of r.missing) process.stderr.write(`             falta: ${m}\n`);
}
client.stop();

const counts = Object.fromEntries(
  Object.values(VERDICTS).map((v) => [v, results.filter((r) => r.verdict === v).length])
);

const md = [];
md.push(`# Eixo I — LEITURAS vs oráculo do lead — ${stamp} — @shiftleftpt/sbd-toe-mcp@${pkg.version}`, "");
md.push(`Oráculo: \`${ORACLE_PATH}\` — ${ORACLE_VERSION}. **Os casos são do programme lead: transcritos, nunca emendados, e as expectativas NÃO se ajustam ao comportamento observado.**`, "");
md.push(`Bundle servido: KG \`${pin?.kg_bundle?.release_tag ?? "?"}\`.`, "");
md.push(`**Medição, não portão** — o Eixo E continua a ser o único gate de promoção. A evolução mede-se por MIGRAÇÃO DE ESTADO, não por percentagem.`, "");
md.push(`Veredictos: **${counts["SERVIDO"]} SERVIDO · ${counts["SERVIDO-MAL"]} SERVIDO-MAL · ${counts["NÃO SERVIDO"]} NÃO SERVIDO** (de ${results.length}).`, "");
md.push("| Caso | Leitura | Veredicto | Peças servidas | Superfícies usadas |", "|---|---|---|---|---|");
for (const r of results) {
  const served = r.pieces.filter((p) => p.found && !p.nonNormative).length;
  md.push(`| ${r.case} | ${r.reading} | **${r.verdict}** | ${served}/${r.pieces.length} | ${r.used.join(", ")} |`);
}
md.push("");
md.push("## Por caso — evidência e o que falta para SUBIR DE ESTADO", "");
for (const r of results) {
  md.push(`### ${r.case} — ${r.reading}: ${r.title}`, "");
  md.push(`> ${r.question}`, "");
  md.push(`**Veredicto: ${r.verdict}**`, "");
  md.push("| Peça do must-have | Servida | Evidência |", "|---|---|---|");
  for (const p of r.pieces)
    md.push(`| ${p.name} | ${p.found ? (p.nonNormative ? "só NÃO-NORMATIVA" : "sim") : "**não**"} | ${p.evidence} |`);
  md.push("");
  if (r.mustNotViolations.length > 0) {
    md.push("**must-NOT violado:**", "");
    for (const v of r.mustNotViolations) md.push(`- ${v}`);
    md.push("");
  }
  if (r.missing.length > 0) {
    md.push("**O que falta para subir de estado:**", "");
    for (const m of r.missing) md.push(`- ${m}`);
    md.push("");
  }
  for (const n of r.notes) md.push(`> ${n}`, "");
}

mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `${stamp}-axis-i-readings-v${pkg.version}`);
writeFileSync(`${base}.md`, md.join("\n"));
writeFileSync(
  `${base}.json`,
  JSON.stringify({ stamp, version: pkg.version, oracle: { path: ORACLE_PATH, version: ORACLE_VERSION }, counts, results }, null, 2)
);
process.stdout.write(JSON.stringify({ counts, report: `${base}.md` }, null, 1) + "\n");
