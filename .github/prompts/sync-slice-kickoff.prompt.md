---
description: "Start a sync-led AOS slice for this repository with explicit briefing, acceptance criteria, handoff, and SbD-ToE review scope."
name: "Sync Slice Kickoff"
argument-hint: "Slice goal or epic delta to coordinate"
agent: "sync"
tools: [read, search, todo, agent, aos_engine/get_project_status, aos_engine/get_slice_status, aos_engine/get_role_inbox, aos_engine/sync_create_brief, aos_engine/sync_handover_to_executor, aos_engine/sync_answer_question, aos_engine/sync_handover_to_tester, aos_engine/sync_close_slice, aos_engine/sync_reopen_slice, aos_engine/sync_block_slice]
---
Coordinate a slice for this repository.

Required output:
- proposed slice id
- short brief
- acceptance criteria
- relevant SbD-ToE chapters or controls to consult
- next role and why
