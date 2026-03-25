---
ai_assisted: true
model: Claude Haiku 4.5
date: 2026-03-24
purpose: documentation
reasoning: Feature request for repository change-driven SbD-ToE review scope mapping tool
review_status: pending-human-review
---

# Mapear o review SbD-ToE necessário a partir das alterações do repositório

## Contexto

Durante a iteração com o Copilot apoiado por este MCP, surgiu uma necessidade adicional: não basta decidir que validação técnica correr (`check`, `build`, `package:release`). Também é útil determinar, segundo o manual SbD-ToE, o que deve ser revisto em função das áreas alteradas.

Exemplos:

- se mudar `src/`, pode ser necessário rever Cap. 06 e, conforme o caso, Cap. 02, 04 ou 12
- se mudar `.github/workflows/*.yml`, pode ser necessário rever Cap. 07, 10 e 11
- se mudar `package.json` ou lockfiles, pode ser necessário rever Cap. 05
- se mudar `src/config.ts` ou `.env.example`, pode ser necessário rever Cap. 02 com foco `CFG-*`

O repositório já tem uma base inicial para isso em:

- `.github/copilot-instructions.md`
- `docs/sbd-toe-applicability.md`

Mas hoje essa lógica está dispersa em documentação. Ainda não existe uma tool estruturada nem um mecanismo consistente para produzir um "review scope" acionável a partir do diff.

## Pedido

Desenhar uma abordagem para mapear, a partir das alterações feitas no repositório, que capítulos, temas, artefactos e evidências do manual SbD-ToE devem ser revistos.

Quero avaliar duas camadas complementares:

1. uma camada simples e imediata, baseada em paths/diff local
2. uma camada MCP mais estruturada, orientada a consulta semântica e checklist

Tool candidata do lado do MCP:

- `map_sbd_toe_review_scope`

Input provável:

- `changedFiles`
- `riskLevel` opcional
- `projectContext` opcional
- `diffSummary` opcional

Output desejado:

- capítulos a rever
- temas `Txx` e domínios relevantes
- razão da aplicabilidade
- artefactos/evidência esperada a confirmar
- próximos passos recomendados

## Artefactos relevantes

- `.github/copilot-instructions.md`
- `docs/sbd-toe-applicability.md`
- `src/index.ts`
- `src/orchestrator/ask-manual.ts`
- `src/backend/semantic-index-gateway.ts`
- `data/publish/algolia_docs_records.json`
- `data/publish/algolia_entities_records.json`

## Restrições

- Não implementar agora leitura arbitrária do workspace como capacidade genérica do MCP.
- Não transformar esta tool num executor de shell ou num editor do repositório.
- Não assumir que o diff por paths consegue inferir sozinho toda a intenção arquitetural.
- Uma v1 pode ser advisory, não necessariamente bloqueante.
- Se a lista de artefactos por capítulo / risco / papel não existir ainda de forma robusta, explicitar isso como gap de índice.

## Resultado esperado

Quero no fim:

1. proposta de desenho para a capability de "review scope"
2. decisão sobre o que pode ser feito já com regras locais por path
3. decisão sobre o que deve ser uma tool MCP
4. avaliação se o manual/artigos semânticos devem expor um novo índice ou catálogo de artefactos
5. plano incremental para sair de guidance documental e passar a guidance estruturada

## Resumo operacional

- partir da tabela atual em `.github/copilot-instructions.md`
- identificar que mapeamentos já são estáveis por path/contexto
- separar o que é "hook local advisory" do que deve ser "tool MCP"
- avaliar necessidade de um catálogo de artefactos esperado no upstream
- propor um caminho incremental sem misturar o MCP com capacidades genéricas de repo
