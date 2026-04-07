# MCP External Overlay Note

Use `data/publish/overlay/*` only when the user explicitly asks for an external-framework or regulatory reading, for example:

- `DORA`
- `NIS2`
- `CRA`
- `RGPD`

Load order:

1. `data/publish/ontology/sbdtoe-ontology.yaml`
2. `data/publish/runtime/deterministic_manifest.json`
3. normal runtime bundle
4. `data/publish/overlay/framework_overlay_index.json`
5. `overlay_mappings.jsonl` and `overlay_playbooks.json` only for grounding/explanation

Preferred entrypoint:

- `framework_overlay_index.json`

Use it to scope the normal deterministic profiles to:

- `target_bundle_ids`
- `target_requirement_ids`
- `target_control_ids`
- `target_practice_ids`
- `target_evidence_pattern_ids`

Then run the usual profiles on that restricted universe:

- `consult`
- `guide`
- `review`
- `threats`

Do not:

- treat overlay as a replacement for the ontology or runtime bundle
- activate requirements only from playbook text
- give the same weight to curated cross-check playbooks and `exemplo-playbook`

Weighting:

- curated framework playbooks: `external_normative_overlay`
- `exemplo-playbook`: `illustrative_overlay`
