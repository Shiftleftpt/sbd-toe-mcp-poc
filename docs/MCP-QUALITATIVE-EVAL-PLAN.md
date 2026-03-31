# MCP Qualitative Eval Plan

## Objective

Run the V2 MCP evaluation in two layers:

1. an automated smoke layer that validates the runtime contract and the main
   resolution paths still behave coherently
2. the manual qualitative checklist for usefulness, correctness, provenance and
   noise

This plan is the operational companion to
[`MCP-QUALITATIVE-EVAL-CHECKLIST.md`](./MCP-QUALITATIVE-EVAL-CHECKLIST.md).

## Execution Order

### 1. Build and automated smoke validation

Run:

```bash
npm run build
npm run test:qualitative-smoke
```

What this smoke layer validates:

- the server still reads the published V2 substrate
- chapter discovery and chapter briefs still work
- applicability routing is coherent
- retrieval still returns `M*` citations with `traceability`
- consult mode is deterministic-first and concern scoping still narrows results
- guide mode still joins controls -> practices -> assignments -> user stories
- threat mode still returns scoped threats with `direct|derived|heuristic`
- review-scope heuristics still map changed files to the right bundles
- review primitives (`evidence_pattern`, `signal`) still exist in the runtime

What it does **not** validate:

- whether the final natural-language answer is genuinely useful
- whether provenance is the best possible provenance, only that it exists
- whether the response is too long, too noisy, or insufficiently focused
- subtle semantic mistakes in review mode

So this is an initial validation layer, not a replacement for the qualitative checklist.

### 2. Prompt-driven harness over the checklist

Run:

```bash
npm run eval:qualitative
```

This harness executes the checklist cases locally against the current runtime
and prints, for each case:

- the prompt
- the expected profile/shape
- the tool path used
- an automatic `pass|warn|fail` heuristic
- the observed chapters, citations and consulted indices
- a compact result excerpt

This is still not the final qualitative judgment. It is a repeatable first pass
that makes the manual review faster and makes regressions easier to diff.

Interactive mode is also available:

```bash
npm run eval:qualitative:interactive -- --md-out data/reports/qualitative-eval/latest.md --json-out data/reports/qualitative-eval/latest.json --triage-prompt-out data/reports/qualitative-eval/triage-prompt.md
```

In interactive mode you can record:

- `pass|warn|fail`
- whether the answer felt `deterministic first`
- whether provenance was useful
- the failure taxonomy bucket
- a free-form note such as "expected more detail in ..." or "policy was treated as evidence"

The same run can also emit a triage prompt for a second-pass analysis that
tries to separate likely `mcp` issues from likely `graph` issues.

### 3. Local MCP runtime check in a client

Run the MCP locally from this repo, not from published npm:

```json
{
  "servers": {
    "sbdToeLocal": {
      "type": "stdio",
      "command": "node",
      "args": ["/Volumes/G-DRIVE/Shared/Manual-SbD-ToE/sbd-toe-mcp-poc/dist/index.js"],
      "env": {
        "DEBUG_MODE": "true"
      }
    }
  }
}
```

Before the 16 qualitative prompts, do 4 smoke interactions in the client:

1. `list_sbd_toe_chapters`
2. `get_sbd_toe_chapter_brief(chapterId="07-cicd-seguro")`
3. `map_sbd_toe_applicability(riskLevel="L2", technologies=["ci-cd","containers","iac"])`
4. `inspect_sbd_toe_retrieval(question="How should I secure a CI/CD pipeline for an L2 project?")`

These 4 checks are useful because they expose the exact runtime shape the user will see.

### 4. Manual qualitative checklist

Then run the 16 prompts in
[`MCP-QUALITATIVE-EVAL-CHECKLIST.md`](./MCP-QUALITATIVE-EVAL-CHECKLIST.md).

Keep the original rubric from that checklist:

- `deterministic first`
- `chapter scoping`
- `provenance`
- semantic correctness
- noise / over-retrieval

## Recommended Tool Path Per Profile

### Consult

Primary path:

- `consult_security_requirements`

Grounding/debug path:

- `search_sbd_toe_manual`
- `inspect_sbd_toe_retrieval`

Checklist prompts:

- `C1`
- `C2`
- `C3`
- `C4`

### Guide

Primary path:

- `get_guide_by_role`

Support path:

- `get_sbd_toe_chapter_brief`
- `search_sbd_toe_manual`

Checklist prompts:

- `G1`
- `G2`
- `G3`
- `G4`

### Review

There is no single dedicated top-level `review engine` tool in this repo today.
So the practical path is composed:

- `search_sbd_toe_manual` or `answer_sbd_toe_manual`
- `resolve_entities(record_type="evidence_pattern")`
- `resolve_entities(record_type="signal")`
- `inspect_sbd_toe_retrieval`

Use `map_sbd_toe_review_scope` only when the question is about changed files or repo deltas.

Checklist prompts:

- `R1`
- `R2`
- `R3`
- `R4`

### Threats

Primary path:

- `get_threat_landscape`

Support path:

- `search_sbd_toe_manual`
- `inspect_sbd_toe_retrieval`

Checklist prompts:

- `T1`
- `T2`
- `T3`
- `T4`

## Acceptance Gate

Recommended gate:

1. `npm run test:qualitative-smoke` must pass
2. `npm run eval:qualitative` must not show structural `fail` cases unless already understood
3. the 4 client smoke interactions must pass
4. the manual checklist must meet the acceptance criteria already defined in
   [`MCP-QUALITATIVE-EVAL-CHECKLIST.md`](./MCP-QUALITATIVE-EVAL-CHECKLIST.md)

In practice:

- do not start the manual qualitative run if the smoke layer fails
- treat smoke failures as `loader_contract`, `deterministic_resolution`,
  `profile_routing` or `grounding` regressions until proven otherwise

## Current Automated Coverage

The current automated smoke suite lives at
[`src/qualitative-eval-smoke.test.ts`](../src/qualitative-eval-smoke.test.ts).

It intentionally checks structural expectations only, using the current
published runtime bundle. That keeps it stable enough for repeated local use
while still catching obvious regressions before the human evaluation starts.

The checklist harness lives at
[`src/qualitative-eval-harness.ts`](../src/qualitative-eval-harness.ts) with
CLI entrypoint
[`scripts/run-qualitative-eval.mjs`](../scripts/run-qualitative-eval.mjs).

## Next Automation Step

If this first harness proves useful, the next step should be a richer eval
layer that compares runs over time and emits deltas with:

- `prompt_id`
- tool path used
- observed citation ids
- observed chapter scope
- pass/warn/fail heuristic

That would still not replace human judgment, but it would make the qualitative
run much faster and more repeatable.
