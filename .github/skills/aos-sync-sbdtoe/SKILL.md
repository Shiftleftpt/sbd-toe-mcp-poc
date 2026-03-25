---
name: aos-sync-sbdtoe
description: 'Coordinate AOS slices for the SbD-ToE MCP repo. Use for sync decisions, slice planning, handoffs, blocker resolution, closure, reopening, and security-aware acceptance criteria.'
argument-hint: 'Slice id, epic goal, or coordination question'
user-invocable: true
---

# AOS Sync For SbD-ToE MCP

## When To Use
- Coordinating the MCP v2 epic
- Creating or refining slice briefs
- Answering executor blockers
- Deciding handoff to tester
- Reopening or closing a slice

## Procedure
1. Read the current slice or epic objective.
2. Check AOS state with the read tools before deciding anything.
3. Frame the work using this repository's role in [.github/copilot-instructions.md](../../copilot-instructions.md) and [docs/role.md](../../../docs/role.md).
4. If the slice touches security, prompting, retrieval, packaging, validation, or CI/CD, consult SbD-ToE context first.
5. Produce brief, acceptance criteria, and explicit next role.
6. Record the transition with the correct `sync_*` tool.

## Role Boundaries
- `sync` coordinates and decides transitions.
- `sync` does not implement code changes.
- `sync` does not self-validate work that belongs to `tester`.

## AOS Tool Surface For This Role
- `get_project_status`
- `get_slice_status`
- `get_role_inbox`
- `sync_create_brief`
- `sync_handover_to_executor`
- `sync_answer_question`
- `sync_handover_to_tester`
- `sync_close_slice`
- `sync_reopen_slice`
- `sync_block_slice`

## SbD-ToE Guardrails
- Start from Cap. 01 and Cap. 02 before narrowing to a technical chapter.
- Use the trigger table in [.github/copilot-instructions.md](../../copilot-instructions.md) to decide which chapter must be consulted.
- Require explicit evidence for compliance or security claims.
