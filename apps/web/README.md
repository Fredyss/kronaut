# @kronaut/web

The Kronaut single-page app: React 19, Vite, TanStack Router and Query, Tailwind v4, Paraglide (en, sk, cs). It talks to the API only through `@kronaut/sdk`.

## Run it locally

1. Start Postgres and the server. Follow the project `CLAUDE.md` for the local Postgres, run `kronaut migrate`, then start the API with the dev server's origin as the public URL so the session cookie and the `Origin` check line up:

   ```bash
   KRONAUT_PUBLIC_URL=http://localhost:5173 \
   KRONAUT_MEDIA_URL=http://127.0.0.1:3001 \
   KRONAUT_DATABASE_URL=postgres://… \
   KRONAUT_INSTANCE_ID=… KRONAUT_SECRET=… KRONAUT_KEK_1=… \
   pnpm --filter @kronaut/server start -- --role=all
   ```

2. Create the owner and open the one-time link it prints to set a password:

   ```bash
   pnpm --filter @kronaut/server cli user create --owner \
     --email you@example.com --name You --workspace Studio --timezone Europe/Bratislava
   ```

3. Start the dev server. It proxies `/v1` and `/oauth` to `http://localhost:3000`; set `KRONAUT_DEV_API` to point it elsewhere.

   ```bash
   pnpm --filter @kronaut/web dev
   ```

## Build

`pnpm --filter @kronaut/web build` writes `dist/web`. The server serves it when `KRONAUT_WEB_DIR` points there. `pnpm --filter @kronaut/web size` checks the bundle budgets.

## Messages

Catalogs live in `packages/i18n/messages/{en,sk,cs}.json`, with terms in `packages/i18n/messages/glossary.md`. The compiled output in `packages/i18n/src/paraglide` is committed; after editing a catalog run `pnpm --filter @kronaut/web i18n` (dev and build also recompile it).
