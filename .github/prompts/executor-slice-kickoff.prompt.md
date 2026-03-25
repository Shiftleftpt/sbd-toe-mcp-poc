---
description: "Start executor work on an AOS slice in this repository with explicit implementation scope, validation plan, and blocker handling."
name: "Executor Slice Kickoff"
argument-hint: "Slice id and implementation objective"
agent: "executor"
tools: [read, search, edit, execute, todo, aos_engine/get_slice_status, aos_engine/get_role_inbox, aos_engine/executor_claim_work, aos_engine/executor_raise_question, aos_engine/executor_submit_result]
---
Implement the assigned slice in this repository.

Required output:
- claim status
- implementation plan
- files likely to change
- validation commands to run
- blocker protocol if the brief is insufficient
