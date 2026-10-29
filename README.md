# Repertô Admin

Painel de operação do Repertô: contas, assinantes, grupos, uso e custo da
separação de faixas e saúde do servidor. Só leitura. Usa o mesmo
`reperto-backend` e o mesmo login (Firebase) do app.

## Quem entra

O servidor decide. Só e-mails **confirmados** listados em `admins` no
`apps.config.json` do backend:

```json
"reperto": {
  "...": "...",
  "admins": ["seu-email@exemplo.com"],
  "origins": ["https://repertoapp.com.br", "https://admin.repertoapp.com.br"]
}
```

A URL onde o painel for publicado também precisa estar em `origins` (CORS).

> Faça o deploy do backend **antes** de colocar `admins` na configuração de
> produção: a versão antiga não conhece o campo e recusa o arquivo.

## Rodar

```bash
npm install
cp .env.example .env.local   # preencha com a config web do Firebase do app
npm run dev                  # http://localhost:5174
```

Para ver as telas sem backend e sem login, com dados fictícios:

```bash
npm run dev:demo
```

## Publicar (Netlify)

- Build: `npm run build` · Publicar: `dist`
- Variáveis: as de `.env.example` (`VITE_API_BASE_URL` = URL do backend em produção)
- `public/_redirects` já manda todas as rotas para o `index.html`.

## De onde vêm os números

`GET /v1/reperto/admin/*` no backend (`src/routes/admin.ts`,
`src/services/adminStats.ts`). O servidor lê Auth + Firestore e guarda o
retrato por 1 minuto; **Atualizar** pede um novo.

- **Último acesso**: última renovação de sessão no Firebase Auth (acontece
  sozinha quando a pessoa usa o app).
- **Plano**: mesma regra do backend (`deriveStatus`): pago, teste grátis,
  cortesia (`grandfathered`) ou sem plano.
- **Custo das faixas**: tempo de GPU × preço por segundo configurado em `stems`.
