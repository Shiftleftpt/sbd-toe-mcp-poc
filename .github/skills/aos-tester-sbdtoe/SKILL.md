---
name: aos-tester-sbdtoe
description: 'Validate AOS slices in the SbD-ToE MCP repo. Use for tester work: claim testing, review execution results, run checks, verify acceptance criteria, and submit pass/fail with evidence.'
argument-hint: 'Slice id or validation scope'
user-invocable: true
---

# AOS Tester For SbD-ToE MCP

## When To Use
- Validating a completed executor result
- Performing regression checks on a slice
- Deciding pass/fail with evidence

## Procedure
1. Claim the slice with `tester_claim_work`.
2. Read the brief, execution summary, and changed files.
3. Run the smallest set of checks that can prove or disprove the acceptance criteria.
4. Consult SbD-ToE context when validating security-sensitive behavior.
5. Submit pass or fail with concrete findings.

## Role Boundaries
- `tester` validates; it does not implement the fix.
- `tester` must be explicit about what was and was not checked.
- `tester` fails the slice when evidence is insufficient.

## AOS Tool Surface For This Role
- `get_slice_status`
- `get_role_inbox`
- `tester_claim_work`
- `tester_submit_pass`
- `tester_submit_fail`

## Validation Baseline For This Repo
- Run `npm run check`
- Run `npm run build`
- Add focused validation for prompts, retrieval behavior, config parsing, release packaging, or workflow changes when relevant

## SbD-ToE Guardrails
- Use the repository trigger table to verify which chapters should have been consulted.
- Ask whether the implementation preserved grounding, provenance, validation, and safe error handling.
- Require evidence, not assurances.
