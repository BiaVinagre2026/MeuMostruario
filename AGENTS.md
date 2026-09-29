# AGENTS.md

Regras obrigatórias para qualquer agente de IA neste repositório — Claude, Codex ou outro.

**Este arquivo é a fonte única de verdade sobre arquitetura, fronteiras e processo.**
`CLAUDE.md` cobre o contexto de produto e aponta para cá; onde os dois divergirem, vale este.

---

## 1. O que este repositório é

Um **white-label multitenant** com dois modos de venda:

- **Atacado** — link tokenizado, pedido mínimo, grade por tamanho, sem login.
- **Varejo** — carrinho, reserva de estoque, frete, checkout.

Cada tenant é uma operação comercial que liga um ou ambos os modos. Hoje:

| Tenant | Modo | Frontend |
|---|---|---|
| BEFIT | atacado | `web/` (neste repo) |
| Maré Coral | varejo | `C:\dev\Fitness Oceanica\MareCoral` (repo separado) |
| demo, acme | demonstração | `web/` |

`whitelabelcomsubdominios` foi um Core anterior, **abandonado**. Não é referência.

### Onde cada camada vive

| Camada | Caminho |
|---|---|
| Core (multitenancy, auth, gateway, catálogo, pedidos) | `api/app/` |
| Frontend BEFIT + admin | `web/src/` |
| DDL por tenant | `api/app/services/tenant_schema_sql.rb` |

---

## 2. Fronteira Core ↔ tenant

### A regra

> **Nenhum arquivo em `api/app/` pode citar o nome de um tenant.**

Comportamento diferente por tenant é **capacidade**, nunca identidade:

```ruby
# errado — o Core passa a conhecer um cliente pelo nome
unless current_tenant&.slug == "mare-coral"

# certo — o Core conhece uma capacidade
unless current_tenant.feature?(:retail_storefront)
```

### Por que isso importa mais do que parece

Slug de tenant no Core não é só feio. Ele **força os testes a usarem aquele slug exato**, o que faz specs diferentes colidirem no mesmo registro. Foi a origem do `Slug já está em uso`, que passou dias parecendo poluição entre specs.

Também impede que o produto seja vendido: cada cliente novo de varejo exigiria um deploy do Core em vez de uma flag.

### Dívida conhecida

`"mare-coral"` está hardcoded em 6 lugares (3 controllers, 2 services). Os serviços `mare_coral_cart`, `mare_coral_inventory`, `mare_coral_order` e `mare_coral_shipping_quote` são varejo genérico com nome de cliente. **Não amplie esse padrão.** Código novo usa capacidade.

---

## 3. Git

- **Uma branch por tarefa.** Nunca commitar direto na `main`.
- **Um worktree por agente**, quando houver trabalho paralelo:

  ```bash
  git worktree add C:/dev/worktrees/<tarefa> -b feature/<tarefa>
  ```

- **Nunca criar worktree dentro do OneDrive** ou de qualquer pasta sincronizada. A sincronização trava arquivos `.git` e corrompe objetos — já produziu `Permission denied` ao escrever objetos neste repositório.
- **Nunca usar `git add -A` ou `git add .`** Dois agentes dividem esta árvore de trabalho; adicionar tudo varre o trabalho do outro para dentro do seu commit. Liste os arquivos: `git add -- caminho/um caminho/dois`.
- Antes de commitar, `git status` e conferir que só os seus arquivos entraram.
- Commits pequenos, com o **porquê** no corpo — não só o quê.
- **Nunca** `push --force`, rebase de histórico publicado ou reescrita de histórico.

---

## 4. Docker

- Um projeto Compose por grupo, com `name:` explícito: `meumostruario`, `befit`, `marecoral`.
- Worktree paralelo usa **stack própria** (postgres e redis próprios), nunca a do checkout principal.
- Portas em uso: `3000` befit · `4311` marecoral · `8000` api · `5432` postgres · `6379` redis.
- **Não** subir banco, Redis ou API dentro dos grupos de tenant. Eles usam a API compartilhada, com isolamento por tenant.
- Antes de mudar porta ou binding em compose de outro grupo, avisar.

---

## 5. Banco de dados

- `app_development` é o banco de **trabalho**. Tem os tenants e catálogos reais.
- `app_test` é o banco da suíte. É recriado à vontade.

> **Suíte automatizada nunca roda contra banco de desenvolvimento ou produção.**

`spec/rails_helper.rb` tem duas travas: força `RAILS_ENV=test` e aborta se o nome do banco conectado não terminar em `_test`. **Não afrouxe nenhuma das duas.** Elas existem porque a suíte rodou por dias contra `app_development` — 13 falhas que não eram falhas de código, e risco real de apagar dados de trabalho.

Migrations: adicionar tabela de domínio em `TenantSchemaSql` **e** migrar para os schemas existentes.

---

## 6. Testes

- Cada spec independente. Rodar em qualquer ordem, dar o mesmo resultado.
- **Slug e identificadores únicos por spec.** `provision_test_tenant` já gera slug aleatório — usar o padrão. Slug fixo só quando o Core obrigar, e isso é dívida a eliminar, não padrão a seguir.
- Limpeza por transação (`use_transactional_fixtures = true`). Não introduzir `DatabaseCleaner` com truncate sem discutir.
- Estado global (registros de ouvintes, cache, mocks, `ENV`) restaurado no `after`/`around`.
- **Proibido**: `sleep`, retry arbitrário, ou reordenar testes para esconder falha.

### Nunca alterar regra de negócio para o teste passar

Se uma validação de unicidade acusa duplicata, o teste está criando duplicata. Corrigir o teste — ou a fronteira que obriga o teste a duplicar. **Nunca remover a validação.**

### Antes de considerar uma tarefa concluída

```bash
docker compose exec api bundle exec rspec
cd web && npx tsc --noEmit && npm run lint && npm test
```

Os três limpos. Rodar a suíte com **duas sementes diferentes** quando mexer em estado compartilhado. Passar uma vez não é prova.

---

## 7. Componentes compartilhados

Alterou algo em `api/app/` (Core), `web/src/lib/`, `web/src/providers/`, `config/routes.rb`, `TenantSchemaSql`, gateway de pagamento ou contrato público da API?

**Diga no relatório final, explicitamente, quais tenants isso afeta.** Uma mudança no Core que ninguém anunciou é como uma mudança da Maré Coral chega quebrada na BEFIT.

---

## 8. Pare e pergunte antes de

- apagar volume, resetar banco, excluir dados;
- alterar migration existente ou schema;
- mudar contrato público da API ou do gateway;
- mover blocos grandes de código entre arquivos;
- `push --force` ou reescrever histórico;
- alterar arquivo de outro grupo Docker ou de outro tenant;
- afrouxar validação, trava de ambiente ou verificação de segurança.

---

## 9. Regras de produto

- Link público nunca mostra preço; registra apenas interesse.
- Link de atacado pode mostrar preço, pedido e pagamento.
- **Valor vem sempre do banco.** Preço, subtotal, desconto e total nunca são aceitos da requisição — já houve furo que fechava pedido de R$ 318 por R$ 1,00.
- Preço pertence ao produto.
- Foto pode existir sem produto; várias fotos podem ser o mesmo produto.
- Tamanhos: `P/M`, `M/G`, `Unico`, `Plus 1`, `Plus 2`.
- IA nunca publica sozinha; admin aprova.
- Dados de cartão nunca são armazenados.
- Link que cobra exige CPF ou CNPJ.
- Falha ao emitir cobrança não invalida o pedido.

---

## 10. O que não implementar no MVP

Remoção do schema-per-tenant · login obrigatório no link de atacado · lookbook como fluxo principal · ERP · migração para Next.js.
