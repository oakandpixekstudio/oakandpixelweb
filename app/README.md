# Oak & Pixel Workspace (CRM)

Internal CRM for Oak & Pixel Studio. A separate Vercel project from the public
website; its Root Directory is `app`.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

## Password gate

Every page is behind a shared password (`proxy.ts`). Set these environment
variables locally in `.env.local` and in Vercel (Settings > Environment Variables):

- `ADMIN_GATE_USER`
- `ADMIN_GATE_PASSWORD`

If either is missing in production, the app refuses every request.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Demo data only: records are stored in the visitor's browser and no email is sent.
