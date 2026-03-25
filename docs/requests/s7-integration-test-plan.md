---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: integration-test
reasoning: Integration test scenarios for s7 self-contained bundle validation with enriched snapshot requirements
review_status: approved-by-tester
---

# s7 — Integration Test Plan: Self-Contained Release Bundle

Slice: s7
Status: ready-for-testing
Date: 2026-03-24

## Scope

Valida que o bundle de release é auto-suficiente para runtime local stdio, trata os snapshots enriched como artefactos primários obrigatórios e mantém um comportamento failsafe quando o utilitário zip não existe.

---

## T1 — Build limpo

Purpose: confirmar que a alteração de packaging não quebrou o build base.

Steps:

```bash
npm run build
```

Expected: exit 0, sem erros TypeScript.

---

## T2 — Packaging em diretório limpo gera tarball e checksum

Purpose: garantir que o bundle principal é gerado sem depender de rede nem de checkout adicional.

Steps:

```bash
tmpdir="$(mktemp -d)"
npm run build
node scripts/package-release.mjs --version vX --output-dir "$tmpdir"
ls "$tmpdir"
```

Expected:

- existe `sbd-toe-mcp-poc-vX-bundle.tar.gz`
- existe `sbd-toe-mcp-poc-vX-bundle.sha256`
- stdout lista `asset=` para o tarball e `checksum=` para o ficheiro sha256

---

## T3 — zip opcional com aviso controlado

Purpose: validar o caminho com e sem utilitário zip instalado.

Steps:

```bash
tmpdir="$(mktemp -d)"
node scripts/package-release.mjs --version vX --output-dir "$tmpdir" 1>"$tmpdir/stdout.log" 2>"$tmpdir/stderr.log"
```

Expected when `zip` exists:

- existe `sbd-toe-mcp-poc-vX-bundle.zip`
- o `.sha256` contém uma linha para `.tar.gz` e outra para `.zip`

Expected when `zip` does not exist:

- não existe `.zip`
- stderr contém `Aviso: comando 'zip' não disponível; bundle .zip não foi gerado.`
- o `.tar.gz` e o `.sha256` continuam válidos

---

## T4 — Failsafe ao remover snapshot enriched

Purpose: confirmar erro claro e auditável quando falta um artefacto enriched obrigatório.

Steps:

```bash
backup="$(mktemp)"
mv data/publish/algolia_docs_records_enriched.json "$backup"
node scripts/package-release.mjs --version vX >/tmp/s7.stdout 2>/tmp/s7.stderr || true
mv "$backup" data/publish/algolia_docs_records_enriched.json
cat /tmp/s7.stderr
```

Expected:

- processo termina com exit non-zero
- stderr contém `Falta o artefacto publish obrigatório: data/publish/algolia_docs_records_enriched.json`
- nenhum artefacto de bundle é publicado como sucesso

Repetir o mesmo cenário para `data/publish/algolia_entities_records_enriched.json`.

---

## T5 — Inspeção do bundle confirma presença dos snapshots enriched

Purpose: verificar que os snapshots enriched seguem no bundle final.

Steps:

```bash
tar -tzf release/sbd-toe-mcp-poc-vX-bundle.tar.gz | grep 'algolia_docs_records_enriched.json\|algolia_entities_records_enriched.json'
```

Expected:

- a listagem contém `data/publish/algolia_docs_records_enriched.json`
- a listagem contém `data/publish/algolia_entities_records_enriched.json`

---

## T6 — Inspeção de auto-suficiência do bundle

Purpose: confirmar que o bundle contém tudo o que o runtime local stdio precisa.

Steps:

```bash
tar -tzf release/sbd-toe-mcp-poc-vX-bundle.tar.gz | grep 'dist/\|prompts/\|data/publish/\|data/reports/run_manifest.json\|.vscode/mcp.json\|.env.example'
```

Expected:

- contém `dist/`
- contém `prompts/`
- contém `data/publish/`
- contém `data/reports/run_manifest.json`
- contém `.vscode/mcp.json`
- contém `.env.example`

---

## Notes

- O teste não deve depender de rede; qualquer tentativa de download é falha de slice.
- Se forem gerados artefactos em diretórios temporários, removê-los no fim da validação.
- O tester deve registar se o host tem `zip` disponível, para interpretar corretamente T3.