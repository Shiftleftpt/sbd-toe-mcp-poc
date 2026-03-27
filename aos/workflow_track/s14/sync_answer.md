---
ai_assisted: true
model: Claude Sonnet 4.6
date: 2026-03-27
purpose: governance-doc
produced_by: sync
target: executor
slice_id: s14
---

# Sync Answer — s14

## Decisão: Opção B — prosseguir, com correcções ao brief

### Bloqueador 1 — Schema inacessível

O schema do brief é baseado no formato real usado por servidores MCP públicos registados
na Smithery (padrão `commandFunction` com JavaScript inline). A URL de docs pode ter mudado
mas o formato é consistente com dezenas de servidores reais no GitHub.

**Acção:** prosseguir com o schema do brief. AC-1 valida apenas sintaxe YAML — não requer
validação semântica contra o schema oficial. O executor documenta no report que a validação
semântica final ocorrerá no momento do registo manual.

### Bloqueador 2 — Package não publicado

**Correcção ao brief:** o registo na Smithery NÃO é automático a partir do npm. Requer
submissão manual (PR ao registry da Smithery ou formulário no site). A afirmação do brief
era incorrecta — peço desculpa pela imprecisão.

**Implicação:** `smithery.yaml` pode e deve ser criado agora, antes da publicação npm.
O ficheiro fica pronto no repo. O operador submete à Smithery separadamente após s15.
Não há dependência de ordem com s15 para este deliverable.

### Bloqueador 3 — Conta e credenciais Smithery

Fora do scope deste slice e desta epic. A criação de conta e submissão à Smithery são
operações manuais do operador (Pedro), não automatizáveis via código. O deliverable deste
slice é apenas o ficheiro `smithery.yaml` correcto no repo.

---

## Instruções para o executor

1. Escrever `smithery.yaml` com a estrutura do brief (secção 14.1)
2. Se durante a escrita encontrar razões para ajustar a estrutura (ex: `commandFunction`
   substituído por `command`/`args` directos), adaptar e documentar no report
3. AC-1: validar YAML com `python3 -c "import yaml; yaml.safe_load(open('smithery.yaml')); print('OK')"`
4. Mencionar no report que validação semântica contra o schema Smithery fica pendente
   para o momento do registo manual
5. Prosseguir normalmente com os restantes ACs (AC-2 a AC-6)
