# Demo do Cliente - 07/05/2026

Roteiro para apresentar o MeuMostruario rodando em ambiente local/rede.

## URLs

```txt
Showroom local:  http://localhost:3002
Admin local:     http://localhost:3002/admin/login
Showroom rede:   http://192.168.0.233:3002
Backend/API:     http://localhost:8000
```

> O IP de rede pode mudar ao trocar de Wi-Fi. Antes da demo, confirmar com `ipconfig`.

## Credenciais

Admin tenant:

```txt
Slug:   demo
Email:  admin@demo.com
Senha:  password123
```

Lojista:

```txt
CPF:    529.982.247-25
Senha:  password123
```

## O que mostrar

1. Showroom B2B
   - Home com branding e catálogo.
   - Catálogo com filtros, grade editorial e tabela wholesale.
   - Produto com fotos, variações, tamanhos, MOQ e WhatsApp.
   - Carrinho lateral e fluxo de pedido.
   - Login de lojista.

2. Painel Admin
   - Login admin com slug `demo`.
   - Dashboard.
   - Produtos e coleções.
   - Lojistas: clicar em qualquer linha para editar dados.
   - Pedidos: clicar em qualquer parte da linha para abrir o detalhe.
   - Configurações do tenant.

3. Mobile/rede
   - Abrir `http://192.168.0.233:3002` no celular na mesma rede.
   - Testar login de lojista e visual do catálogo.
   - Confirmar que senha fica visível em localhost/IP para facilitar teste.

## O que nao prometer ainda

- Lookbook/Looks está fora do escopo deste projeto.
- Produção/deploy ainda não é a demo principal; o foco é produto rodando local/rede.
- Lint web ainda precisa ajuste de configuração do ESLint 9.
- Existem avisos de bundle grande no Vite; não bloqueiam a demo.

## Checklist antes da demo

```bash
docker compose up postgres redis api web -d
```

Validar:

```txt
http://localhost:3002
http://localhost:3002/admin/login
http://localhost:3002/api/v1/tenant/config
```

Rodar, se houver tempo:

```bash
cd web
npx tsc --noEmit
npm run build
```

```bash
docker compose exec api bundle exec rspec
```

## Narrativa sugerida

MeuMostruario e uma plataforma SaaS white-label para marcas e boutiques venderem B2B com catálogo profissional, área de lojista, carrinho de pedido e painel administrativo. A demo mostra o ciclo completo: cliente entra no showroom, monta pedido, e o admin acompanha produtos, lojistas e pedidos.
