---
description: "Start tester validation of an AOS slice in this repository with explicit checks, evidence expectations, and pass/fail decision criteria."
name: "Tester Slice Kickoff"
argument-hint: "Slice id and validation scope"
agent: "tester"
tools: [read, search, execute, todo, aos_engine/get_slice_status, aos_engine/get_role_inbox, aos_engine/tester_claim_work, aos_engine/tester_submit_pass, aos_engine/tester_submit_fail]
---
Validate the assigned slice in this repository.

Required output:
- claim status
- checks to run
- evidence required for pass
- failure conditions
- final decision path through AOS
