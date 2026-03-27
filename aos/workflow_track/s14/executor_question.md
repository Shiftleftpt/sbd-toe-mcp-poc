---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: executor
slice_id: s14
---

# Executor Question — s14

## question

Três bloqueadores identificados antes de prosseguir com `smithery.yaml`. Pedido de clarificação ao sync antes de escrever o ficheiro.

---

## context

### 1 — Schema Smithery inacessível

O brief instrui o executor a verificar o schema oficial em `https://smithery.ai/docs/config/smithery-yaml` antes de escrever o ficheiro. Tentativas de acesso:

- `https://smithery.ai/docs/config/smithery-yaml` → 404
- `https://smithery.ai/docs/build/smithery-yaml` → 404
- `https://smithery.ai/docs/build/publish` → sem referência a smithery.yaml
- `https://smithery.ai/docs/llms.txt` → sem referência a smithery.yaml

Não foi possível confirmar se o schema do brief (com `commandFunction` em JavaScript inline) é o formato actual da Smithery ou se evoluiu. Escrever o ficheiro com base num schema não verificado é um risco de rejeição pelo marketplace.

### 2 — Pré-condição: package npm não publicado

O brief nota que "o registo ocorre automaticamente quando o package npm é publicado". O package `sbd-toe-mcp` ainda não está publicado (isso é s15). A Smithery faz scan do package npm para descobrir o `smithery.yaml`. Sem publicação prévia, não há como validar que o `smithery.yaml` será lido correctamente.

### 3 — Credenciais e conta Smithery

Não está claro se:
- É necessário criar uma conta na Smithery antes da publicação npm disparar o registo automático
- É necessário um token Smithery ou configuração adicional no repo (e.g., GitHub Actions secret)
- O namespace `sbd-toe-mcp` está disponível na Smithery ou já existe uma conta associada ao package npm

---

## blocked_on

- Secção "14.1 — smithery.yaml" — schema não verificável
- Secção "14.2 — Verificação" — pré-condições de publicação não confirmadas
- Acceptance Criteria AC-1 (YAML válido segundo schema oficial) — impossível confirmar sem schema

---

## proposta do executor

Duas opções para o sync considerar:

**Opção A — Adiar s14 para depois de s15**
Publicar o package npm primeiro (s15), confirmar que a Smithery detecta o package, criar conta se necessário, verificar o schema actualizado, e só então criar `smithery.yaml` como s14b.

**Opção B — Prosseguir com schema do brief, aceitar risco**
Escrever `smithery.yaml` com a estrutura do brief (sem verificação do schema oficial). O ficheiro fica no repo e no bundle npm, mas pode precisar de correcção após validação real com a Smithery. Executor documenta o risco no report.

Aguarda decisão do sync.
