# Política de Segurança

O `sbd-toe-mcp-poc` segue um processo de divulgação responsável.

## Versões suportadas

| Versão | Suporte |
| --- | --- |
| `master` | ativo |
| release tag mais recente | ativo |
| releases antigas | sem garantia |

## Como reportar uma vulnerabilidade

1. Não abras uma issue pública.
2. Envia email para `security@shiftleft.pt`.
3. Inclui, quando possível:
   - versão ou tag afetada
   - sistema operativo e versão de Node.js
   - passos para reproduzir
   - impacto esperado
   - logs ou artefactos relevantes
   - checksum do release asset, se o problema envolver a distribuição do bundle

Receberás uma resposta inicial em até **72 horas**.

## Âmbito desta policy

Estão dentro do âmbito:

- runtime do servidor MCP
- validação de inputs MCP
- leitura local de ficheiros e snapshots
- prompts e composição de contexto
- packaging e integridade do release bundle
- workflows GitHub Actions, dependências e cadeia de release
- segurança associada aos snapshots embutidos enquanto artefactos distribuídos por este repo

## Fora de âmbito

Não são vulnerabilidades de segurança, por defeito:

- gaps editoriais ou dúvidas sobre o conteúdo do manual
- pedidos de funcionalidade
- problemas de instalação sem impacto de segurança
- vulnerabilidades que pertençam exclusivamente ao `SbD-ToE/sbd-toe-manual` ou ao `SbD-ToE/sbd-toe-knowledge-graph`

Se tiveres dúvida sobre o repositório correto, reporta na mesma em privado e triamos internamente.

## Processo esperado

| Etapa | Prazo alvo |
| --- | --- |
| triagem inicial | 72 horas |
| plano de mitigação | 14 dias |
| correção e divulgação coordenada | após correção ou mitigação aceitável |

## Boas práticas adicionais

- Ativar **Private vulnerability reporting** no GitHub UI.
- Ativar **Dependabot alerts**, **Dependabot security updates**, **Secret scanning** e **Push protection**.
- Manter `master` protegido com checks obrigatórios.

Mais detalhes de configuração operacional estão em `GITHUB-CONFIG.md`.
