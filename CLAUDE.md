# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # Express server (server.js) with Vite dev middleware, http://localhost:3000
npm run build        # remix vite:build -> build/server, build/client
npm start            # production server (NODE_ENV=production serves ./build)
npm run typecheck    # tsc
npm run lint         # eslint
npm run format       # prettier (tabs, single quotes, no semicolons)
npm run build:icons  # regenerate SVG sprite from config/svgs into app/components/ui/icons

npx prisma generate  # after editing prisma/schema.prisma
npx prisma migrate dev --create-only --name <name>   # LOCAL DB ONLY: generate a migration, review the SQL
npx prisma migrate dev                              # LOCAL DB ONLY: apply it locally
```

### Database and schema changes (the app is live in production)

- Local `DATABASE_URL` points to a Docker copy of production: container `staffwise-db`, postgres:16, `localhost:5433/staffwise`, restored from a `pg_dump`. Before running any Prisma or DB command, check that `DATABASE_URL` is the localhost one. The production URL is kept only as a commented line in `.env`.
- Schema changes go through Prisma Migrate (`prisma/migrations/`, baseline `0_init`). **Never** run `prisma db push`, `migrate dev`, `migrate reset` or `db seed` against production.
- **The user applies production migrations** (`prisma migrate deploy`). Prepare the migration and the commands, but don't run anything that writes to production.
- Migrations must be additive: new tables, nullable or defaulted columns, dropping NOT NULL. No drops, renames or type changes in the same release. Release order: backup → `migrate deploy` on prod → merge to `main` (CI deploys code only and never migrates).
- Production runs on a shared Azure PG Flexible Server (`audbs`, PG 16). Target only the `staffwise` database. The prod password contains `@`, which libpq tools need encoded as `%40`.
- Full runbook: `docs/improvement-plan-2026-04.md` §1a.

**Never run the seed** (`npx prisma db seed`, `prisma/seed.ts`, `prisma migrate reset`). It deletes all roles and permissions before recreating them, and the database holds data the seed doesn't recreate. If seeding seems necessary, ask the user.

There is no test suite. CI (`.github/workflows/main_austaffwise.yml`) builds on every push to `main` and deploys to the Azure Web App `austaffwise`, so pushing to `main` ships to production.

`build:groq` in package.json points to a `groq/` directory that doesn't exist.

## Environment

Required env vars are checked at startup by `app/utils/env.server.ts` (zod schema): `DATABASE_URL` (PostgreSQL), `SESSION_SECRET`, `HONEYPOT_SECRET`, GitHub OAuth, Azure AD (`AZURE_CLIENT_ID/SECRET/TENANT_ID`), `EMAIL_CONNECTION_STRING` (Azure Communication Email), and `AZURE_STORAGE_CONNECTION_STRING` (Azure Blob Storage, used for attachments and employee photos). When you add a variable, add it to this schema. Anything returned from `getEnv()` is exposed to the client.

## Architecture

Remix v2 (Vite) on a custom Express server (`server.js`: compression, rate limiting with a stricter limit on `/signup`, static assets). The structure follows the Epic Stack conventions: Prisma, Conform + Zod forms, CSRF and honeypot from remix-utils, toast cookies, and shadcn/ui components.

### Routing

`remix-flat-routes` with `+` folders (configured in `vite.config.ts`). Files matching `__*` or `*.server.*` / `*.client.*` are ignored as routes, which is how editors are colocated:
- `__x-editor.tsx` holds the form component and Zod schemas (shared by client and server).
- `__x-editor.server.tsx` holds the shared `action`, which `new.tsx`, `$id_.edit.tsx` and `$id_.delete.tsx` re-export. Delete goes through the same action with `intent=delete`.

Top-level areas:
- `_auth+/`: login, signup, onboarding, password reset, email verification, OAuth (`auth.$provider.*`). The providers are Microsoft (custom strategy in `app/strategies/microsoft.ts`) and GitHub, both configured in `app/utils/auth.server.ts`.
- `settings+/`: admin CRUD for reference data (users, roles, permissions, organs, departments, locations, floors, countries, officers, relationships, incident types). Navigation comes from `settingsNavigation` in `app/utils/constants.ts`.
- `dashboard+/`: admin processing of employee profiles (`php`), incidents, ID requests, car pass requests and access requests.
- `profile+/$userId_+/`: the user's own submissions (dependants, spouses, vehicles, incidents, ID, car pass and access requests). `profile+/resources+/` serves files and exports (attachments, employee photos, employee exports).

### Authorization

The parent layout route's loader checks the role for page loads:
- `settings.tsx` calls `requireUserWithRole(request, 'admin')`.
- `dashboard.tsx` calls `requireUserWithRoles(request, ['admin', 'phpAdmin', 'idRequestAdmin', 'incidentAdmin', 'accessRequestAdmin', 'carPassAdmin'])`.

**Parent loaders don't run for actions** (or for direct `_data` requests to a child loader). Every action, and every loader that returns protected data, must call the auth helper itself. Routes under `profile+/$userId_+` skip the `$userId.tsx` layout, so they must also check that the signed-in user owns the record.

Incident admins can be limited to offices (`OrganAdmin`, set in Settings → Users). Admin incident routes use `requireIncidentAdmin` / `scopeWhere` from `app/utils/incident-scope.server.ts`; `admin` users and incident admins with no offices see everything.

The helpers live in `app/utils/permission.server.ts`. There is also permission-based checking (`requireUserWithPermission` with strings like `read:user:any`, parsed in `app/utils/user.ts`). On the client, use `userHasRole` / `userHasRoles` / `userHasPermission` with the user loaded in `root.tsx`. Roles and permissions are created in `prisma/seed.ts`, except `phpAdmin`, which was added directly in the database.

### Data layer (`app/utils/db.server.ts`)

- `prisma` is a singleton (via `remember`) that logs slow queries. Restart the dev server after changing it.
- `filterAndPaginate({ request, model, searchFields, filterFields, where, orderBy, select | include })` is the standard list-page loader helper. It reads `search`, `page`, `pageSize` (where `All` means no limit) and filter params from the URL, and supports nested and dot-path fields, enums, and date operators. A filter value of `all` disables that filter. Pair it with `SearchBar` and `Paginator` in `app/components`.
- `generateSerialNumber(CounterType)` increments a `Counter` row inside a transaction to produce request numbers. The counter rows must exist, and the seed creates them.

### Domain model notes

`IdRequest` and `CarPassRequest` are base records with a `type` enum and one optional 1:1 subtype relation per type (`employeeIdRequest`, `dependantIdRequest`, `spouseIdRequest`, …). Read or write the subtype that matches `type`. Requests and incidents have status enums and `Attachment`s stored in Azure Blob (`app/utils/storage.server.ts`). `Employee` is the central profile, with dependants, spouses and vehicles. Record mutations with `insertAuditLog` (`app/utils/audit.server.ts`).

### Action conventions

Actions start with `checkHoneypot(formData)` and `await validateCSRF(formData, request.headers)`, then `parseWithZod` (with `async: true` when there are DB uniqueness checks in `superRefine`). On validation failure they return `json({ result: submission.reply() })`; on success they `redirectWithToast(...)`.

### UI

shadcn/ui primitives are in `app/components/ui` (alias `~/components`, `cn` from `~/utils/misc.tsx`). Catalyst components are in `app/components/catalyst`, and Conform-bound inputs are in `app/components/conform`. The path alias `~/*` maps to `app/*`. Icons are an SVG sprite: add SVGs to `config/svgs` and run `npm run build:icons`.
