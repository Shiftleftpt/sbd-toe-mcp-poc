---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: executor
slice_id: s14
---

# Executor Report — s14

## Metadata

- **slice_id:** s14
- **produced_by:** executor
- **date:** 2026-03-27

## Summary

Criado `smithery.yaml` na raiz do repositório com o schema do brief (Opção B conforme resposta do sync). O ficheiro configura o servidor `sbd-toe-mcp` para o directório Smithery com `commandFunction` npx, 6 env vars funcionais documentadas com defaults e descriptions, e sem qualquer referência a dead-code vars. O slice foi precedido de uma blocking question ao sync (q-s14-schema-preconditions) que clarificou: (a) o schema do brief é válido mesmo sem URL de docs funcional; (b) o registo na Smithery NÃO é automático — requer submissão manual pelo operador após s15; (c) credenciais são responsabilidade do operador, fora do scope deste slice.

## Deliverables Produced

| Ficheiro | Acção |
|---|---|
| `smithery.yaml` | Novo — configuração Smithery com 6 env vars funcionais, commandFunction npx |
| `package.json` | Verificado — `smithery.yaml` já estava em `files` (adicionado em s12) |

## Acceptance Criteria — Evidence

- **AC-1: smithery.yaml existe e é YAML válido**
  - status: PASS
  - evidence: `python3 -c "import yaml; yaml.safe_load(open('smithery.yaml')); print('YAML válido')"` → `YAML válido`
  - nota: validação semântica contra o schema oficial Smithery fica pendente para o momento do registo manual (URL de docs inacessível — documentado em executor_question.md e sync_answer.md)

- **AC-2: startCommand configurado com npx**
  - status: PASS
  - evidence: `grep "npx" smithery.yaml` → `command: "npx"` e `args: ["-y", "sbd-toe-mcp"]` presentes em `commandFunction`

- **AC-3: env vars funcionais documentadas**
  - status: PASS
  - evidence: 6 env vars presentes com `description` e `default` (onde aplicável): `DEBUG_MODE`, `MAX_CONTEXT_RECORDS`, `SITE_BASE_URL`, `MANUAL_BASE_URL`, `CROSS_CHECK_BASE_URL`, `SBD_TOE_APP_ROOT`

- **AC-4: dead-code vars ausentes**
  - status: PASS
  - evidence: `grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|...)" smithery.yaml` → output vazio

- **AC-5: referência em package.json confirmada**
  - status: PASS
  - evidence: `grep "smithery.yaml" package.json` → `"smithery.yaml"` presente no campo `files`

- **AC-6: qualidade**
  - status: PASS
  - evidence: `npm run check` → 42 valid, 0 invalid; `npm run build` limpo; `npm run test` → 247 passed (247), 0 failures

## Validation Run

```
$ python3 -c "import yaml; yaml.safe_load(open('smithery.yaml')); print('YAML válido')"
YAML válido

$ grep "npx" smithery.yaml
      command: "npx",

$ grep -E "(DEFAULT_LANGUAGE|DOCS_HITS|ENTITIES_HITS|SAMPLING_MAX_TOKENS|UPSTREAM_RELEASE_TAG)" smithery.yaml
(output vazio — clean)

$ grep "smithery.yaml" package.json
    "smithery.yaml"

$ npm run check && npm run build && npm run test 2>&1 | tail -5
[AI Disclosure Validation] 42 valid, 5 human-authored (skipped), 0 invalid
✅ All disclosed AI documents are valid
 Test Files  10 passed (10)
      Tests  247 passed (247)
   Duration  1.14s
```

## Notes

- **Registo Smithery é manual:** o brief dizia que o registo seria automático via npm — o sync corrigiu: requer submissão manual pelo operador (Pedro) após publicação npm (s15). Ver `sync_answer.md` para detalhe.
- **Validação semântica pendente:** o schema do `commandFunction` (JavaScript inline) é o padrão observado em servidores MCP públicos na Smithery, mas não foi possível confirmar contra a documentação oficial (URL 404). Se a Smithery rejeitar o formato, o campo pode ser substituído por `command`/`args` directos — mudança trivial.
- **Nota para o operador:** para submeter à Smithery após publicação npm, verificar https://smithery.ai para o processo de registo actual (pode ser PR a um registry público ou formulário no site).
