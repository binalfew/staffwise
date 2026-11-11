# Staffwise Improvement Plan: Business Request of 14.04.2026

**Source:** *Request for improvement for operation and update on the Staffwise system 14.04.2026.docx*
**Plan created:** 2026-11-10
**Status key:** ⬜ Not started · 🟨 In progress · ✅ Done · ⏸ Blocked / awaiting decision

---

## 1. Summary

The business request has 14 items. Mapped against the current codebase, they fall into four groups:

| Group | Items | Nature |
|---|---|---|
| **A. Quick code fixes** | Reporter name, middle name optional, PHP duty-station fields | Small, low-risk code changes |
| **B. New features** | Incident status tracking and escalation, critical-incident alerts | Schema and UI work |
| **C. Reference data** | Offices/organs, departments, regional offices, incident types, office admins | Data import, plus one design decision (office-scoped admins) |
| **D. Access and operations** | Non-AU email domains, "link inactive" complaints | Azure configuration and infrastructure, little code |

### Tracking overview

| # | Item | Group | Phase | Size | Status |
|---|---|---|---|---|---|
| 0 | Database change strategy: backups, local DB, Prisma Migrate baseline | Prereq | 0 | M | 🟨 |
| 1 | Show incident reporter to admins (+ fix `lastName` bug) | A | 1 | S | 🟨 |
| 2 | Make Middle Name optional (Staff, Spouse, Dependant) | A | 1 | S–M | 🟨 |
| 3 | PHP form: building/floor/office number for regional offices | A | 1 | S | 🟨 |
| 4 | Add new incident types | C | 1 | S | ✅ |
| 5 | Add missing organs/offices, regional offices, specialised agencies | C | 1 | M | ✅ (unclear organs left for the business) |
| 6 | Update renamed/restructured departments; departments for regional offices | C | 1 | M | ⏸ waiting on old → new mapping (Q3) |
| 7 | Incident status tracking, assignment and escalation | B | 2 | L | ✅ |
| 8 | Critical-incident notifications to admins | B | 2 | M | ✅ email (SMS/Push spike in 3.5) |
| 9 | Designate office system administrators | C | 3 | M–L | ⏸ design decision |
| 10 | Support staff with non-AU email domains | D | 3 | M | ⏸ Azure AD admin |
| 11 | "Staffwise link inactive" / no response | D | 1 (investigate) | S | 🟨 |

Sizes: **S** ≤ 1 day · **M** 1–3 days · **L** 3+ days (rough estimates, excluding UAT).

---

## 1a. Database change strategy (Phase 0, before any schema change)

The application is live in production. Nothing in Phases 1–3 that touches `prisma/schema.prisma` starts until this section is done.

### Current situation (findings, 2026-11-10)

| Finding | Impact |
|---|---|
| CI (`.github/workflows/main_austaffwise.yml`) only builds and deploys code. It never touches the database. | A schema change pushed to `main` deploys a Prisma client that expects columns production doesn't have yet. Queries on those columns fail until someone runs `db push` by hand. |
| No `prisma/migrations` directory. Changes go out with `prisma db push`. | No history of what was applied to production, no SQL to review, and nothing to replay on a test copy. |
| Local `.env` uses the **production** `DATABASE_URL` (`audbs.postgres.database.azure.com`), switched on by commenting/uncommenting. | Local development and testing read and write production data. Any experiment or Prisma command run locally hits production. |
| The host is Azure Database for PostgreSQL (Flexible Server, since Single Server was retired in 2025). | Automatic backups and point-in-time restore exist, but retention and geo-redundancy aren't verified. |
| Data was edited by hand in production (for example the `phpAdmin` role). | The production schema may differ from `schema.prisma`. A drift check is needed. |

### Rules from now on

1. **Production schema changes go only through reviewed migration files** applied with `prisma migrate deploy`.
2. **Never run against production:** `prisma db push`, `prisma migrate dev`, `prisma migrate reset`, `prisma db seed`. They can drop data or reset the database.
3. **Only additive changes** in a release: new tables, new nullable or defaulted columns, dropping `NOT NULL`. Nothing is dropped, renamed or retyped. Any later cleanup gets its own release, after a backup.
4. **Order: back up → migrate the database → deploy the code.** Because changes are additive, the code already in production keeps working against the new schema.
5. **The owner (Binalfew) runs every production migration by hand.** Claude prepares the migration and the commands but doesn't run them against production.
6. **Local development uses a local database**, never production.

### Step 0.1: Verify backups (Azure portal)

Azure portal → **Azure Database for PostgreSQL flexible servers** → `audbs` → **Settings → Backup and restore** (or **Overview** for the summary).

**Verified 2026-11-10:** Flexible Server confirmed. Daily automated backups are completing (#1–#7). Retention is **7 days**, and the earliest restore point is 2026-11-04 09:04 UTC. Each backup row has a "Fast restore" option, and the **Backup** toolbar button takes an on-demand full backup. Long-term retention (vaulted backups) is available but not reviewed. Server details (Overview): **PostgreSQL 16.15**, West Europe, General Purpose D4ds_v5 (4 vCores, 16 GiB, 128 GiB storage), **High availability enabled** (zone 3). Resource group `shared`, tag `dbs: shared`.

> **The server is shared.** The `shared` resource group and tag suggest `audbs` hosts databases for other applications as well. As a result:
> - `pg_dump` and every Prisma command must target **only the Staffwise database**, through the database name in the URL. Never use `pg_dumpall` or connect to the `postgres` database.
> - Point-in-time restore restores the **whole server** (all databases) into a new server. That's safe, but the restored server holds other apps' data too.
> - Changing backup retention applies to every database on the server. Tell the other app owners.
> - `prisma migrate dev` creates a temporary "shadow" database. Running it against this server would create databases on shared infrastructure, which is one more reason it runs only locally.
>
> High availability keeps a standby replica in another zone. It protects against server or zone failure, **not** against a bad migration: a mistake replicates to the standby immediately. Backups remain the protection against bad changes.

Still to check: geo-redundant backup.

Record:
- [x] Backup retention period (days): 7. **Recommend increasing to 35**: use the slider on the Backup and restore page, then **Save**.
- [ ] Geo-redundant backup: Enabled/Disabled. This can only be set when the server is created; record it anyway.
- [x] "Earliest restore point" shown on the Backup and restore page: 2026-11-04 09:04 UTC (rolling 7-day window).
- [ ] Before each production migration, click **Backup** (on-demand) on this page in addition to the `pg_dump` in Step 0.2.
- [x] Server PostgreSQL version: 16.15. Local `pg_dump` 17.9 can dump a 16 server.
- [ ] (Optional) Practice a point-in-time restore into a **new** server, for example `audbs-restore-test`. A restore never overwrites the source server. Delete the test server afterwards to stop the cost.

Equivalent CLI after `brew install azure-cli && az login`:

```sh
az postgres flexible-server list -o table
az postgres flexible-server show -g <resource-group> -n audbs \
  --query "{version:version, retentionDays:backup.backupRetentionDays, geoRedundant:backup.geoRedundantBackup, earliestRestore:backup.earliestRestoreDate}"
```

### Step 0.2: Manual backup before every migration

The point-in-time backups are Azure's safety net. A manual dump gives an independent copy you control. It holds personal data, so store it encrypted and outside the repo.

> **The production password contains `@`.** `pg_dump`/`psql` (libpq) treat the first `@` as the end of the credentials, so the unencoded URL fails and leaves a 0-byte dump. Prisma tolerates it. Always load the URL with every `@` except the last one encoded as `%40`.

```sh
export PROD_DATABASE_URL="$(grep 'audbs.postgres' .env | sed -E 's/^# *DATABASE_URL=//; s/^"//; s/"$//' | perl -pe 's/@(?=.*@)/%40/g')"
echo "$PROD_DATABASE_URL" | sed -E 's#//[^@]*@#//***@#'   # expect ***@audbs.postgres.database.azure.com/staffwise
psql "$PROD_DATABASE_URL" -c 'select current_database();'  # read-only connection test
mkdir -p ~/staffwise-backups
pg_dump "$PROD_DATABASE_URL" -Fc --no-owner --no-acl \
  -f ~/staffwise-backups/staffwise-$(date +%Y%m%d-%H%M).dump
pg_restore --list ~/staffwise-backups/staffwise-*.dump | head   # sanity check the file is readable
```

### Step 0.3: Local database (copy of production)

Use a restored copy of production. It already contains roles, permissions, counters and reference data, so **the seed is never needed**.

```sh
# Port 5433, because 5432 is already used by another project's container (accreditationadmin-db-1)
docker run -d --name staffwise-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=staffwise \
  -p 5433:5432 -v staffwise-pg:/var/lib/postgresql/data postgres:16
pg_restore -d postgresql://postgres:postgres@localhost:5433/staffwise --no-owner --no-acl \
  ~/staffwise-backups/<latest>.dump
# One error about "transaction_timeout" is expected and harmless (pg_restore 17 → server 16)
```

- [ ] Local `.env`: `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/staffwise`. Keep the production URL **only as a commented line** (`# DATABASE_URL=…audbs…`). The `PROD_DATABASE_URL` export in Step 0.2 reads it from there. `.env` is gitignored. Never uncomment it again.
- [ ] Note: this copy contains real staff data. It stays on the local machine and isn't shared. Emails sent from local testing use the real email connection string, so test with your own accounts.

### Step 0.4: Drift check (read-only on production)

```sh
npx prisma migrate diff \
  --from-url "$PROD_DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

- **Empty output, or only a comment:** production matches `schema.prisma`. Continue.
- **SQL output:** production differs from the schema file. Review each difference and decide which side is correct. Update `schema.prisma` to match production, **not** the other way round, before baselining.

### Step 0.5: Baseline Prisma Migrate (one-time)

The baseline is generated **from production itself**, so it records reality.

```sh
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-url "$PROD_DATABASE_URL" --script \
  > prisma/migrations/0_init/migration.sql
```

1. [x] Review `0_init/migration.sql` and commit it, along with `prisma/migrations/migration_lock.toml` (provider `postgresql`).
2. [x] Check locally: on a fresh empty local database, `npx prisma migrate deploy` must succeed, and the drift check against that database must be empty.
3. [x] Mark the baseline as applied on production. This **only** creates and writes the `_prisma_migrations` bookkeeping table and runs none of the baseline SQL:
   ```sh
   DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate resolve --applied 0_init
   DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate status   # expect: "Database schema is up to date"
   ```
4. [x] On the local copy, run the same `migrate resolve --applied 0_init`.
5. [x] Update `CLAUDE.md`: replace the `npx prisma db push` guidance with the migration workflow below.

### Release runbook for each schema change

**Prepare (developer or Claude, local database only)**
1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --create-only --name <short_description>`. This generates SQL without applying it. It needs the local Docker database, which also serves as the shadow database.
3. Review `prisma/migrations/<timestamp>_<name>/migration.sql`. Confirm there's no `DROP`, no `ALTER … TYPE`, and no `NOT NULL` added to an existing column without a default.
4. `npx prisma migrate dev` (local only), then run the app and test the feature against the local copy.
5. Commit the migration together with the code on a feature branch. **Don't merge to `main` yet.**

**Apply to production (owner)**
1. Take a backup (Step 0.2).
2. `DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate status` → shows exactly one pending migration, the expected one.
3. `DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate deploy`
4. `migrate status` again → "up to date".
5. Smoke-test the **currently deployed** site (old code against the new schema should work unchanged).
6. Merge to `main`. CI deploys the new code.
7. Smoke-test the new feature in production.

**Rollback**
- Code problem: revert the commit on `main` and redeploy. The additive schema stays in place, which is harmless.
- Migration failed halfway: `migrate status` shows it as failed. Fix the cause, then use `prisma migrate resolve --rolled-back <name>` and re-deploy. Only as a last resort, point-in-time restore into a new server and switch `DATABASE_URL`.

### Planned migrations and their risk

| Release | Migration | SQL effect | Risk | Notes |
|---|---|---|---|---|
| P1 | `middle_name_optional` | `ALTER TABLE "Employee"/"Dependant"/"Spouse" ALTER COLUMN "middleName" DROP NOT NULL` | Very low | Metadata only, instant. Old code unaffected |
| P1 | `duty_station_free_text` | Drop NOT NULL on `Employee.locationId` and `floorId`; add nullable `buildingName`, `floorName` | Low | New code must handle a missing location or floor |
| P1 (opt.) | `incident_type_category`, `organ_city` | Add nullable columns | Very low | |
| P2 | `incident_status` | `CREATE TYPE "IncidentStatus"`; `ADD COLUMN "status" … NOT NULL DEFAULT 'SUBMITTED'`; `CREATE TABLE "IncidentStatusHistory"` | Low | Postgres 11+ adds a column with a constant default without rewriting the table |
| P3 | `organ_admin` | `CREATE TABLE "OrganAdmin"` + FKs + unique index | Very low | |

Data imports (organs, departments, incident types, admins) are **not** migrations. They're idempotent scripts in `prisma/scripts/` that only insert and update, are rehearsed on the local copy first, and are run by the owner against production after a backup.

### Phase 0 checklist

- [x] 0.1 Backups verified (7 days; raising to 35 recommended, pending owner)
- [x] 0.2 First manual `pg_dump` taken and verified (2026-11-10 23:31, `staffwise-20261110-2331.dump`, 3.2 MB, 42 tables = 40 models + 2 join tables; no `_prisma_migrations` table yet)
- [x] 0.3 Local Docker database `staffwise-db` (postgres:16, port 5433) restored from the dump; `.env` points at localhost (2026-11-10)
- [x] 0.4 Drift check run: **no drift** between production (fresh dump) and `schema.prisma`
- [x] 0.5 Baseline created (✅ `prisma/migrations/0_init`, verified on an empty DB) — committed and merged to `main` ✅ — marked applied on production ✅ (owner, 2026-11-10)
- [x] `CLAUDE.md` updated with the new workflow
- [x] `.gitignore` includes `*.dump` (safety net in case a dump ends up in the repo folder)

---

## 2. Findings, recommendations and implementation breakdown

### Item 1: Admins can't see who reported an incident

**Request:** In the incident portal, administrators can't identify who reported an incident.

**Findings**
- `app/routes/dashboard+/incidents+/index.tsx` (loader around line 32) selects incident fields only. The `employee` relation is never loaded, so the list has no reporter column.
- Search covers `incidentNumber` only.
- Bug: `app/routes/dashboard+/incidents+/$incidentId_.tsx:298` renders `activity.officer.employee.lastName`. That field doesn't exist (the field is `familyName`), so officer names in the activity table end in "undefined".

**Recommendation:** Show reporter name, email and organ in the admin list and on the detail page. Let admins search by reporter name.

**Tasks**
- [x] Add `employee: { select: { firstName, middleName, familyName, email, organ: { select: { name } } } }` to the list loader.
- [x] Add a "Reported by" column to the admin incident table.
- [x] Add `employee.firstName`, `employee.familyName` and `employee.email` to `searchFields`.
- [x] Show a reporter details block on `$incidentId_.tsx` (name, email, phone, organ, department).
- [x] Fix `lastName` → `familyName` at `$incidentId_.tsx:298`.
- [x] Order the list by newest first (`createdAt: 'desc'`) instead of `incidentNumber: 'asc'`. *(Recommended, confirm with business.)*

**Acceptance:** An incident admin can see and search for the reporter of every incident in the list and on the detail page.

---

### Item 2: Make Middle Name optional

**Request:** Middle Name for Staff, Spouse and Dependant should be optional.

**Findings**
- `prisma/schema.prisma`: `middleName String` (required) on `Employee`, `Dependant` and `Spouse`.
- The Zod schemas mark it required in `__personal-info-editor.tsx:31`, `__profile-editor.tsx:41`, `dependants_+/__dependant-editor.tsx` and `spouses_+/__spouse-editor.tsx`.
- Names are joined as `` `${first} ${middle} ${family}` `` in about 20 route files (dashboards, exports, officers, ID requests, access requests). An empty middle name would leave double spaces or print `null`.

**Recommendation:** Make the column optional (`String?`). Add a single `formatFullName()` helper in `app/utils/misc.tsx` and use it everywhere names are displayed or exported.

**Tasks**
- [x] Schema: `middleName String?` on `Employee`, `Dependant` and `Spouse`. Migration `20261110205433_middle_name_optional` (3× `DROP NOT NULL`), applied locally. Production via `migrate deploy` (owner), not `db push`.
- [x] Zod: `middleName: z.string().optional().transform(v => v ?? null)` in the four editors (labels had no asterisk).
- [x] Check that the server actions write `null`/`undefined` correctly. Empty input parses to `null`, so clearing the field on edit clears it (a bare `undefined` would have been skipped by Prisma).
- [x] Add a `formatFullName({ firstName, middleName, familyName })` helper.
- [x] Replace manual name concatenation in all files that use `middleName` (list in Appendix D). Officer and access-request lists/dropdowns now show the family name too. Separate-column tables render `null` as blank and were left as is.
- [x] Employee exports (`profile+/resources+/employees.tsx`, `employees.$employeeId.tsx`): output empty or the existing default value instead of `null`. (Already handled: `?? '-'` and `|| ''`.)
- [ ] *(Follow-up, needs business OK)* Data cleanup: about 200 existing records have placeholder middle names entered when the field was required (`-` ×111, `.` ×23, `/` ×11, `..`, `)))`, `x`, a few phone numbers). Optional idempotent script in `prisma/scripts/` to set pure-punctuation values to `NULL`; single letters are likely real initials and stay.

**Acceptance:** Staff, spouse and dependant records can be saved without a middle name, and names display cleanly throughout the app and in exports.

---

### Item 3: PHP form building/floor/office for regional offices

**Request:** Building name, office number and floor are mandatory dropdowns. Regional offices have no options to pick, so they can't complete the form.

**Findings**
- `app/routes/profile+/$userId_+/__duty-station-editor.tsx`: `locationId` and `floorId` are required selects, filtered by the chosen organ and location. `officeNumber` is required.
- `Employee.locationId` and `Employee.floorId` are required foreign keys in the schema. If an organ has no `Location` or `Floor` rows, the form can't be submitted.

**Options**
- **A (recommended):** Make `locationId` and `floorId` optional in the schema. Add free-text `buildingName` and `floorName` fields that appear when the selected organ has no locations or floors set up. Headquarters keeps the dropdowns.
- **B:** Create a placeholder "Main Building / Ground Floor" location and floor for every organ in the data import. This is quick, but the data is less accurate.

**Tasks (Option A)**
- [x] Schema: `locationId String?`, `floorId String?`, plus new `buildingName String?` and `floorName String?` on `Employee`. Migration `20261110210815_duty_station_free_text`; FKs pinned to `onDelete: Restrict` so Prisma doesn't recreate them as `SET NULL`.
- [x] Editor: if `filteredLocations` is empty, show a text input for the building instead of the select. Do the same for floors. Shared `__duty-station-place-fields.tsx`, used by both the first-time profile form (`ProfileEditor`, which now also filters locations by organ) and the duty-station editor. A location with no floors also gets a typed floor.
- [x] Zod: require either `locationId` or `buildingName` (`superRefine`), and either `floorId` or `floorName`. Server (`utils/duty-station.server.ts`) also checks the location belongs to the organ and the floor to the location, and that organs with locations can't use free text; saves either the picked IDs or the typed names, never both.
- [x] Update the PHP dashboard detail, list and exports to show `location?.name ?? buildingName` (`formatBuilding` / `formatFloor` in `utils/misc.tsx`).
- [x] Audit all `employee.location.name` and `employee.floor.name` usages for null safety (profile page, PHP detail, PDF + Excel exports, access-request requestor).
- [x] Department dead end (found in local testing): 34 of 49 organs have no departments, so the filtered dropdown was empty. When an organ has none, both forms now list all departments with a hint to pick the parent department (what existing regional staff already did). Server requires organs that do have departments to pick one of their own. Real per-organ departments still come in 1.5.
- [x] Decide whether `officeNumber` stays required: **not mandatory** (Q8, 2026-11-11).
- [ ] Make `officeNumber` optional: `DROP NOT NULL` migration, Zod `optional()`, null-safe display and exports.
- [ ] *(Follow-up, data)* 177 of 1,776 employees have a location belonging to another organ (65 of them in organs with no locations), from the old unfiltered first-time form. They'll be asked to correct it the next time they edit their duty station; a cleanup script could move them to `buildingName` instead.

**Acceptance:** A regional-office employee whose organ has no configured buildings can submit the PHP form.

---

### Item 4: New incident types

**Request:** Add about 60 incident types (cleaned list in Appendix A).

**Findings**
- `IncidentType` has `name` and `code` only. There's no category or unique constraint.
- Types can be added one by one in **Settings → Incident Types**.
- Several entries in the source document are broken across lines and needed fixing (see Appendix A notes).

**Recommendation:** Load the list with an idempotent import script (`prisma/scripts/import-incident-types.ts`) that creates only types whose name doesn't exist yet. **The seed must not be used** (it wipes roles and permissions). You could also add a `category` field (Security, Safety & Health, Natural Hazard, Occupational, Near Miss) to make the dropdown easier to scan. *(Optional, confirm with business.)*

**Tasks**
- [ ] Business confirms the cleaned list in Appendix A (especially the flagged entries).
- [ ] (Optional) Add `category String?` to `IncidentType`, show it in the settings editor, and group the incident form dropdown by category.
- [x] Write the idempotent import script: `prisma/scripts/import-incident-types.ts`, data in `prisma/scripts/data/incident-types.json` (draft from Appendix A). It only inserts types whose name doesn't exist yet (ignoring case, spacing and dash style) and uses the name as the code, like the existing types. It's a dry run unless `--apply` is passed, and won't write to a non-local DB without `--remote`.
- [x] **Existing types stay as they are** (owner decision, 2026-11-11). New types that duplicate an existing one are left out of the upload list: Burglary, Robbery and Vandalism (exact), Break-in (= Burglary), Road Safety Accident (RSA) (= Traffic Accident), and Harassment/Intimidation/Threat of Violence (= Intimidation). That leaves **53 types to add**. The three Near Miss types are kept, as more specific options beside the existing "Near miss incidents".
- [x] Rehearsed on a fresh restore of the 2026-11-10 prod dump (`staffwise_rehearsal`): 53 created, and a second run created nothing.
- [x] (2026-11-11) Owner ran it on production after a backup; a dry run afterwards reports nothing left to create.
- [x] Sort the incident type dropdown alphabetically (all five incident forms).

**Acceptance:** All approved types are selectable when reporting an incident, with no duplicates.

---

### Item 5: Missing organs, regional offices and specialised agencies

**Request:** Add the missing offices (for example AU SARO, AIMEC Tunis, AFRICOM, the AU Liaison Office in Libya, and WGYD). The list must include all regional offices, specialised agencies and organs (Appendix B).

**Findings**
- `Organ` requires `name`, `code`, `address` and `countryId`, and has no `city` field. The source table gives a country and city for each duty station.
- The organs can be entered through **Settings → Organs**, but there are 70+ rows.
- Data quality problems in the source:
  - "Alegria" should be Algeria.
  - The "Department/Commission" column contains phone dialling codes (+220, +223…) for many rows.
  - Duplicates: ACHPR, AUDA-NEPAD, APRM, PAP, IBAR, ACALAN, the Libya and Chad liaison offices, and IAPSC versus the Sport Council (merged in one cell).
  - The second half of the table has no country or city.
  - The document breaks off at "CAR".
  - Some names conflict, for example "African Union Mission to Western Sahara" with New York as its city.
- WGYD is a **department** of the AU Commission, not an organ. It belongs under Item 6.

**Recommendation**
1. Turn the list into a clean spreadsheet (Appendix B is the working draft) and send it back to the business for confirmation.
2. Optionally add `city String?` to `Organ`. Duty station city is useful for reporting.
3. Import with an idempotent script that matches existing organs by name or code and never deletes anything.

**Tasks**
- [ ] Clean the organ list and send it to the business for confirmation (name, code/acronym, country, city, parent department).
- [ ] Check that every referenced country exists in `Country`.
- [ ] (Optional) Add `city String?` to `Organ` and to the organ settings editor.
- [x] Write `prisma/scripts/import-organs.ts` (idempotent; reads `prisma/scripts/data/organs.json`, a draft built from Appendix B **and** the current Organ table).
  - Findings: most Appendix B organs **already exist** (49 organs). Many use a phone dialling code as their code, and several are duplicates.
  - **Owner decision (2026-11-11):** anything unclear is left out of the list, so the database row stays exactly as it is. Left out: ACSRT vs AUCTC; the two League of Arab States offices; CIEFFA (two names); IPED (two names); the Madagascar liaison office (name); the Somalia mission (location); and AfrAA, ATU, PAU, AU Sports Council, AMEC/AIMEC, AFRICOM, Centre for Migration.
  - What the script does with the remaining 37 entries:
    - Creates 13 missing organs: Liberia, Guinea Bissau, South Sudan and Sudan liaison offices, AU-STRC, AU-SARO, Geneva, AIR, AFRIPOL, MNJTF, AfCAC, Africa CDC, STATAFRIC.
    - Changes 24 existing codes from phone dialling codes to acronyms (codes are only shown in Settings). No names change.
    - With `--merge`, merges 5 unambiguous duplicates (ACHPR, ACALAN, MISAHEL, RPID-FDH, DRC Kinshasa liaison), moving 2 employees and deleting 5 empty duplicate organs. It only merges duplicates that have no departments or locations of their own.
    - Never changes addresses, countries or departments.
  - It's a dry run by default. `--apply` writes, `--merge` adds the merges, and `--remote` is required for a non-local DB.
  - Rehearsed on a fresh restore of the 2026-11-10 prod dump (`staffwise_rehearsal`): 49 → 57 organs; 1776 employees and 100 departments unchanged; no employee without an organ; a second run changed nothing.
  - **Merging deletes rows**, so it goes beyond the usual "insert and update only" rule for data imports. That's why it sits behind `--merge`.
- [ ] Later, with the business (Q2): the organs left out above. They stay as they are until someone confirms them.
- [x] (2026-11-11) Owner ran it on production with `--merge` after a backup; a dry run afterwards reports nothing left to create, update or merge.
- [ ] Export the current organs list first as a backup.

**Acceptance:** Every confirmed AU office, organ and specialised agency can be selected in the PHP form.

---

### Item 6: Departments outdated, or missing for regional offices

**Request:** Some departments have been renamed or restructured. Regional offices (liaison offices, AU IPED…) can't find any departments.

**Findings**
- `Department` belongs to exactly one `Organ`. An organ with no departments shows an empty dropdown, and `Employee.departmentId` is required.
- The source document doesn't include the current list of HQ departments or the renames.

**Recommendation**
- Ask the business for the current AUC structure (old name → new name). **Rename** existing departments rather than deleting them, so linked employees aren't affected.
- Give every organ with no departments a default department (for example "Office of the Head of Mission"). The business can then refine these.
- Add WGYD (Women, Gender and Youth Directorate) under the AU Commission.

**Tasks**
- [x] Q3 answered (2026-11-11): every organ without a department structure gets an **Admin & Finance** department. In the 2026-11-11 data that is 40 of 55 organs (66 staff, currently linked to HQ departments).
- [x] Import script `prisma/scripts/add-default-departments.ts`: adds "Admin and Finance" (same name and code style as AfCHPR's) and "Other" to each organ with no departments of its own. Idempotent, dry run by default. Rehearsed locally: 80 departments in 40 organs; a second run creates nothing.
- [x] Existing staff (65 in those organs, linked to HQ departments) move to their own organ's **Other** (owner, 2026-11-11). The script does this in the same transaction; they can change it on their duty-station form.
- [x] (2026-11-11) Owner ran it on production after a backup: `npx tsx prisma/scripts/add-default-departments.ts --apply --remote`.
- [ ] ⏸ Get the current HQ department list and the rename mapping from the business.
- [ ] Rename existing departments as mapped (a script or Settings → Departments).
- [ ] Add missing HQ departments, including WGYD.
- [ ] **Departments are not touched for now** (owner decision, 2026-11-11). The owner will get the old → new mapping from the business (Q3). Note for then: since `0f1b5b6`, an organ with no departments lets its staff pick any department, and regional staff are linked to their HQ parent department (for example PANVAC → Rural Economy & Agriculture). Giving such an organ its own department would force its staff to re-pick, so ask whether regional offices should get their own departments.
- [ ] Optional safeguard: if the selected organ has no departments, show a clear message instead of an empty dropdown.

**Acceptance:** Every organ has at least one department, and HQ departments match the current structure.

---

### Item 7: Incident status tracking, assignment and escalation

**Request:** Admins and managers should be able to assign or escalate incidents. Reporters should be able to track their report's status (Submitted → Under Review → In Progress → Resolved).

**Findings**
- `Incident` has **no status field**. `IncidentAssessment.status` is free text, entered only once an assessment exists.
- Assignment exists: `IncidentAssignment` links to `Officer` (`dashboard+/incidents+/$incidentId_.assignments.new.tsx`). `IncidentActivity` records officer activity.
- The reporter's pages (`profile+/$userId_+/incidents.tsx` and `incidents_+/`) show nothing about status or progress.
- No escalation concept or escalation level exists.

**Recommendation**
- Add an `IncidentStatus` enum: `SUBMITTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `ESCALATED`, `RESOLVED`, `CLOSED`.
- Add an `IncidentStatusHistory` table (from status, to status, changed by, remarks, timestamp). This gives a timeline that both admins and the reporter can see.
- Escalation sets the status to `ESCALATED`, records a reason, and assigns a higher-level officer or EOC. It also notifies the new assignee (ties in with Item 8).
- Reporters see the current status, a timeline, and remarks marked as reporter-visible. Internal notes stay hidden from them.
- Lock editing and deletion for reporters once the status has moved past `SUBMITTED`.

**Tasks**
- *Schema*
  - [x] Add `enum IncidentStatus` and `Incident.status IncidentStatus @default(SUBMITTED)`.
  - [x] Add `model IncidentStatusHistory { id, incidentId, fromStatus?, toStatus, changedById (User, nullable for system changes), remarks?, isVisibleToReporter Boolean, createdAt }`.
  - [x] Backfill existing incidents: `SUBMITTED` by default; incidents with an assessment become `UNDER_REVIEW` (Open) or `CLOSED` (Closed), with a hidden system history row.
- *Admin (dashboard)*
  - [x] Show a status badge and status filter on `dashboard+/incidents+/index.tsx` (validated `where`, not `filterFields`, so a bad URL value can't 500).
  - [x] Add a "Change status" action (`$incidentId_.status.tsx`: select, remarks, reporter-visible toggle), following the action conventions (honeypot, CSRF, Zod, audit log, toast).
  - [x] Add an "Escalate" action (`$incidentId_.escalate.tsx`: reason plus incident officer). It creates an assignment and a history row in one transaction. Blocked on resolved/closed incidents.
  - [x] Automatically move the status from `SUBMITTED` to `UNDER_REVIEW` when the first officer is assigned (assignments now also write an audit log).
  - [x] Show the status timeline on the detail page (internal remarks tagged).
- *Reporter (profile)*
  - [x] Show a status column on `profile+/$userId_+/incidents.tsx` (now newest first; edit/delete only while `SUBMITTED`).
  - [x] Add a read-only incident detail page (`incidents_+/$incidentId.tsx`) with the timeline. Reporters see every status change; remarks only when marked reporter-visible (filtered in the loader); admin names are not shown.
  - [x] Block edit and delete when the status isn't `SUBMITTED` (loaders and server action, `__incident-access.server.ts`).
  - [x] **Security fix found on the way:** the reporter edit/delete loaders had no auth and the action accepted any incident id (the `$userId_+` routes skip the `$userId.tsx` check). All reporter incident routes now check the signed-in user and incident ownership. Attachment cleanup on edit was also unscoped (matched every attachment in the DB); now limited to the incident.
- *Notifications (shared with Item 8)*
  - [x] Email the reporter when the status changes (release 2.4).
- [x] Record every status change in the audit log (`changeIncidentStatus` in `app/utils/incident-status.server.ts`).

**Acceptance:** Reporters can see where their incident stands at any time. Admins can change the status, escalate, and see the full history.

---

### Item 8: Critical-incident notifications

**Request:** Administrators need automated alerts (SMS, push or email) for critical incidents.

**Findings**
- Severity values are `minor`, `major` and `critical` (`profile+/$userId_+/incidents_+/__incident-editor.tsx:151`).
- Email already works through Azure Communication Email (`app/utils/email.server.ts`, used in signup and PHP approve/reject).
- Nothing is sent when an incident is created (`incidents_+/__incident-editor.server.tsx`).
- No SMS or push capability exists.

**Recommendation (phased)**
1. **Email (Phase 2):** When an incident is created with severity `critical` (and optionally `major`), email all users with the `incidentAdmin` or `admin` role, plus the office admins once Item 9 exists. The email includes the incident number, type, reporter, location and a link.
2. **SMS (later):** Azure Communication Services SMS needs a purchased phone number and a cost per message, and coverage across African countries must be checked. Admins would need a mobile number on their profile.
3. **Push (later):** Web Push needs a PWA or service worker and VAPID keys. This is larger. Email to phone mail apps covers most of the need for now.

**Tasks**
- [x] Add `sendCriticalIncidentAlert(incidentId, request)` in `app/utils/incident-notifications.server.ts`.
- [x] Look up recipients: users with the `incidentAdmin` role only (Q5). *(Office admins after Item 9.)*
- [x] Email body: inline HTML + plain text, matching the existing emails (no React email library in the project); user input is HTML-escaped.
- [x] Call the helper from both create actions (reporter and admin) and when a reporter edit raises severity to critical. Not awaited, never throws: `sendEmail` can poll for up to 3 minutes.
- [x] Trigger severities in the `ALERT_SEVERITIES` constant: `critical` only (Q5).
- [x] Email the reporter on every status change (change status, escalate, auto `UNDER_REVIEW` on first assignment): `sendIncidentStatusEmail(historyId, request)`; internal remarks left out.
- [ ] *(Later)* SMS spike: cost, coverage, and an admin mobile number field.
- [ ] *(Later)* Web Push spike.

**Acceptance:** When a critical incident is submitted, every incident admin receives an email within a minute.

---

### Item 9: Designated office system administrators

**Request:** Staff designated as system administrators should be given the role and notified to liaise with the AUHQ OSSS EOC Unit. The document lists named admins per office (Appendix C).

**Findings**
- Roles are **global** (`User.roles`). An `incidentAdmin` sees every incident from every office, and nothing links an admin to an organ.
- The users must exist (signed up or onboarded) before they can be given roles.
- Several listed admins use non-AU domains or Gmail, which ties into Item 10.

**Decision needed: global or office-scoped admins?**
- **Option A (quick):** Give the listed people the existing global roles. They would see **all** offices' data, which is probably not acceptable for incidents and personal data.
- **Option B (recommended):** Office-scoped admins. Add a link between `User` and `Organ` (for example `User.adminOrgans Organ[]`, or an `OrganAdmin` join table). Dashboard loaders then filter incidents, PHP profiles and requests by the admin's organs. HQ and EOC roles keep the global view.

**Tasks (Option B)**
- [x] Scoping model confirmed (Q4, 2026-11-11): office admins see only their own office's data (Option B).
- [x] Office admins manage **incidents only** (Q4, 2026-11-11). PHP, ID, car pass and access requests stay with the global admins.
- [ ] Schema: add an `OrganAdmin` (userId, organId) join table.
- [ ] Settings → Users: let an admin assign organs to a user.
- [ ] Add a `getAdminScope(user)` helper in `permission.server.ts` that returns `null` (global) or a list of organ IDs.
- [ ] Apply the scope to dashboard loaders through `filterAndPaginate`'s `where`: incidents, PHP, ID requests, car pass and access requests.
- [ ] Apply the scope to detail pages too, so a scoped admin can't open another office's record by URL.
- [ ] Onboarding: create or invite the listed admins, assign roles and organs, and send a welcome email that includes the EOC liaison instructions.
- [ ] Track onboarding per office in Appendix C.

**Acceptance:** Each listed admin can log in and sees only their office's records. HQ and EOC still see everything.

---

### Item 10: Offices with different email domains

**Request:** Offices on other email domains need access: African Court, Africa CDC, AfCAC, PAPU, PAP, AUDA-NEPAD, AfCFTA, APRM, among others.

**Findings**
- Microsoft login is set up with `tenantId: process.env.AZURE_TENANT_ID` (`app/utils/auth.server.ts:39`). Only accounts in the AU tenant can sign in with Microsoft.
- The observed domains are african-court.org, africacdc.org, afcac.org, papu.co.tz, panafricanparliament.org, auda-nepad.org, aprm-au.org, au-afcfta.com/.org, and gmail.com.
- Email and password signup exists (`_auth+/signup.tsx`) and has no domain restriction.

**Recommendation**
- **Short term:** Ask these users to sign up with email and password, with email verification. Publish short instructions.
- **Medium term:** Change the Azure app registration to multi-tenant (`organizations`). Set `tenantId` to `organizations` and restrict sign-in in the callback to an approved-domain list (environment variable `ALLOWED_EMAIL_DOMAINS`, added to the `env.server.ts` schema).
- Personal Gmail addresses: decide whether to allow them at all, or only for named admins. **Decided (Q7, 2026-11-11): allowed.** Some offices can't use any organisational domain, so there is no domain allowlist. Email and password signup (with verification) is the route for personal addresses; PHP approval by `phpAdmin` stays the check on who is real staff.

**Tasks**
- [ ] ⏸ Azure AD admin agrees to make the app registration multi-tenant.
- [ ] Make the Microsoft `tenantId` configurable (for example `AZURE_TENANT_ID=organizations`).
- [ ] ~~Add an `ALLOWED_EMAIL_DOMAINS` env var~~ and ~~enforce a domain allowlist~~: dropped, personal emails are allowed (Q7).
- [ ] Test with an account from each external domain.
- [ ] Write a user-facing login guide for non-AU-domain staff.

**Acceptance:** Staff from each listed organisation can sign in.

---

### Item 11: "Staffwise link is inactive" and support response

**Request:** Many staff report the link is inactive, and they don't get lasting responses.

**Findings**
- Nothing in the code suggests outages. The likely causes are in infrastructure:
  - The Azure Web App `austaffwise` may not have **Always On** enabled, so it sleeps when idle and the first request is slow or times out.
  - The plan tier may be too small.
  - Users may be blocked by the rate limiter in `server.js`, which is stricter on `/signup`, especially behind shared office NAT IPs where many users share one address.
  - Users may be on the wrong URL, or a firewall may block external offices.
- No uptime monitoring is configured.
- **Confirmed in code (2026-11-11):** `server.js` didn't set `trust proxy`. On App Service, every request reaches Node from Azure's front-end proxy, so `req.ip` was the proxy's address and **all users shared one rate-limit bucket**: 100 GET/min and 100 POST/min for the whole user base, and 10/min on `/signup`. Remix sends a GET per navigation and per data fetch, so a handful of active users could get `429 Too many requests` for everyone. This is the most likely cause of "link inactive". express-rate-limit should also have been logging `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` in the App Service log stream.

**Tasks**
- [x] (2026-11-11) Always On is **enabled**; plan is **P0v3** (Premium v3, 1 vCPU / 4 GB), which is adequate. Cold starts and a too-small tier are ruled out, which leaves the shared rate-limit bucket as the main cause.
- [ ] Optional: review restarts (Diagnose and solve problems → Web App Restarted / Web App Down) and the last 30 days of availability. Also check the log stream for `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` and HTTP 429s (Diagnose and solve problems → HTTP 4xx).
- [x] Review the `server.js` rate limits. Now `trust proxy` = 1 (one Azure front-end hop), keyed per client IP with the port stripped from `X-Forwarded-For`. The limits are 1000 GET/min, 100 POST/min, and 30/min on `/signup` per IP, generous for offices behind shared NAT. If Azure Front Door or Application Gateway is ever put in front, raise `trust proxy` to match the number of hops.
- [x] Added `GET /resources/healthcheck`, which runs `SELECT 1` against the DB and returns `200 OK`, or `500` if the DB is unreachable. The rate limiter skips it.
- [x] (2026-11-11) Application Insights standard availability test `staffwise-health` (App Insights `austaffwise`); alert rule `staffwise-health-austaffwise` emails action group `ag-staffwise-alerts`. Add the support mailbox to that action group once Q9 is answered. Original task: add uptime monitoring with alerts that targets `/resources/healthcheck`: an Application Insights availability test, or the App Service **Health check** setting (Monitoring → Health check, path `/resources/healthcheck`), plus an alert rule.
- [ ] Confirm and publish the official URL, and set up a custom domain if one is planned.
- [ ] Process side (business): name a support contact or mailbox and a response target. Add a "Help / Contact" link in the app.

**Acceptance:** Monitoring is in place, no cold-start timeouts occur, and users have a support channel.

---

## 3. Phasing

| Phase | Scope | Dependencies |
|---|---|---|
| **Phase 0: Database safety** | Section 1a: backups, local DB, drift check, migration baseline | Owner access to the Azure portal |
| **Phase 1: Quick wins and data** | Items 1, 2, 3, 4, 11 (investigation); Items 5 and 6 once data is confirmed | Business confirms the incident type list, organ list and department mapping |
| **Phase 2: Incident workflow** | Items 7, 8 (email) | None |
| **Phase 3: Access and admins** | Items 9, 10, plus SMS/Push spikes | Business decision on admin scoping; Azure AD admin for multi-tenant |

**Deployment note:** Pushing to `main` deploys code to production automatically, but CI does **not** migrate the database. Every schema change follows the release runbook in Section 1a: back up → `migrate deploy` (run by the owner) → merge to `main`. Never run the seed.

### How the phases are delivered

- Each phase is split into **releases**. A release is one branch, one review, one merge to `main`, and **at most one migration**. Small releases keep each production change easy to check and easy to roll back.
- Release types:
  - **Code only:** no schema change. Merging to `main` deploys it.
  - **Migration:** follow the Section 1a runbook. The owner backs up and runs `migrate deploy` **before** the merge.
  - **Data import:** an idempotent script in `prisma/scripts/` that only inserts and updates. It's rehearsed on the local copy, then the owner runs it on production after a backup. No code deploy is needed unless the release says otherwise.
- Branch naming: `phase-<n>-<short-name>`, branched from the latest `main`.
- A release counts as **done** when it's merged, deployed, smoke-tested in production, and its items are ticked in this document.

### Phase 0: Database safety 🟨

| Release | Type | Contents | Owner steps | Status |
|---|---|---|---|---|
| 0.1 | Ops | Verify Azure backups, first `pg_dump`, local Docker copy, drift check | Portal check, `pg_dump` | ✅ |
| 0.2 | Migration (baseline) | `prisma/migrations/0_init`, CLAUDE.md workflow, this plan | `migrate resolve --applied 0_init` on prod ✅ | ✅ |
| 0.3 | Ops | Raise backup retention 7 → 35 days | Portal (affects the shared server) | ⬜ |

**Exit criteria:** `migrate status` on production says "up to date", the baseline is merged to `main`, and local development uses the Docker copy.

### Phase 1: Quick wins and reference data

| Release | Type | Items | Contents | Migration | Depends on | Status |
|---|---|---|---|---|---|---|
| 1.1 | Code only | 1 | Reporter name/email/organ in admin incident list and detail; search by reporter; newest-first ordering; fix `lastName` → `familyName` | — | — | 🟨 merged to `main` (`aa56472`), awaiting push and prod smoke test |
| 1.2 | Migration | 2 | `middleName` optional on Employee/Dependant/Spouse; `formatFullName()` helper; update ~23 files and exports | `middle_name_optional` (DROP NOT NULL ×3) | 0.2 merged | 🟨 migrated on prod, merged to `main` (`2aebec8`), awaiting push and prod smoke test |
| 1.3 | Migration | 3 | Free-text building/floor when an organ has no locations or floors; null-safe display and exports | `duty_station_free_text` (DROP NOT NULL ×2, ADD `buildingName`, `floorName`) | Q8 | 🟨 migrated on prod, merged to `main` (`0f1b5b6`), awaiting push and prod smoke test |
| 1.4 | Data import (+ optional migration) | 4 | Import approved incident types; optional `category` column and grouped dropdown | `incident_type_category` (optional) | Q1 | ✅ 53 types imported on prod 2026-11-11 (`818f855`); dropdown sort pushed 2026-11-11 |
| 1.5 | Data import (+ optional migration) | 5, 6 | Import organs, departments and renames; at least one department per organ; optional `Organ.city`; empty-department guard in the PHP form | `organ_city` (optional) | Q2, Q3 | ✅ organs imported on prod 2026-11-11 (`bb4c965`): 13 new, 24 codes fixed, 5 duplicates merged; unclear organs left as they are. Departments (Item 6) ⏸ waiting on the Q3 mapping |
| 1.6 | Code + Ops | 11 | Code: `trust proxy` and per-client rate-limit keys, raised limits, `/resources/healthcheck`. Ops: Always On / plan tier / restarts, uptime monitor, publish URL and support contact | — | Q9 (support contact only) | 🟨 code live (`5139320`), monitor set up, Always On / P0v3 confirmed; waiting on Q9 (support contact, Help link) |
| 1.7 | Data import | 6 | "Admin and Finance" and "Other" departments for every organ with no departments; their staff default to "Other" (`add-default-departments.ts`) | — | Q3 ✅ | ✅ run on prod by owner 2026-11-11 (`f5f9fde`); rehearsed locally first (40 organs, 80 departments, 65 staff moved to Other) |

Suggested order: **1.1 → 1.2 → 1.3**, with 1.6 investigated in parallel. 1.4 and 1.5 start as soon as the business answers Q1–Q3.

**Exit criteria:** Admins see who reported each incident. Staff, spouses and dependants can be saved without a middle name. Regional-office staff can complete the PHP form. All approved incident types, organs and departments are selectable.

### Phase 2: Incident workflow

| Release | Type | Items | Contents | Migration | Depends on | Status |
|---|---|---|---|---|---|---|
| 2.1 | Migration | 7 | `IncidentStatus` enum, `Incident.status` (default `SUBMITTED`), `IncidentStatusHistory` table, backfill of existing incidents | `incident_status` | Phase 1 done | ✅ migrated on prod, pushed and smoke-tested 2026-11-11 (`4a65d3d`) |
| 2.2 | Code only | 7 | Admin: status badge and filter, change-status action, escalate action, auto `UNDER_REVIEW` on first assignment, timeline on detail page, audit log | — | 2.1 | ✅ pushed and smoke-tested 2026-11-11 (`4a65d3d`) |
| 2.3 | Code only | 7 | Reporter: status column, read-only detail page with reporter-visible timeline, block edit/delete after `SUBMITTED`; ownership checks on reporter routes | — | 2.2 | ✅ pushed and smoke-tested 2026-11-11 (`4a65d3d`) |
| 2.4 | Code only | 8 (+7) | Critical-incident email to incident admins; status-change email to the reporter; configurable trigger severities | — | Q5 ✅ | ✅ pushed and smoke-tested 2026-11-11 (`c8dd310`, sender fix `11c191d`) |

**Exit criteria:** Reporters can follow their incident's status. Admins can change the status and escalate, with a full history. Critical incidents email the admins within a minute.

### Phase 3: Access and office admins

| Release | Type | Items | Contents | Migration | Depends on | Status |
|---|---|---|---|---|---|---|
| 3.1 | Migration | 9 | `OrganAdmin` join table | `organ_admin` | Q4 ✅ | ⬜ ready to start |
| 3.2 | Code only | 9 | Assign organs to users in Settings → Users; `getAdminScope()`; scope the incident dashboard list and detail pages by organ (incidents only, Q4) | — | 3.1 | ⏸ |
| 3.3 | Code + Azure config | 10 | Multi-tenant Microsoft login (`organizations`); `ALLOWED_EMAIL_DOMAINS` env var and checks in OAuth callback and signup; login guide | — | Q7, Azure AD admin | ⏸ |
| 3.4 | Data / ops | 9 | Onboard listed office admins (Appendix C): accounts, roles, organs, welcome/EOC email | — | 3.2, 3.3 | ⏸ |
| 3.5 | Spike | 8 | SMS (Azure Communication Services) and Web Push: cost, coverage, effort; recommendation only | — | Q6 | ⏹ dropped for now (Q6: no SMS) |

**Exit criteria:** Each office admin can sign in (including from non-AU domains) and sees only their own office's records. HQ and EOC keep the global view.

### Release log

| Date | Release | Branch / commit | Prod migration run by owner | Notes |
|---|---|---|---|---|
| 2026-11-10 | 0.1 | — | — | Backups verified, dump taken, no drift |
| 2026-11-10 | 0.2 | `phase-0-db-migrations` (`770ef50`) | `migrate resolve --applied 0_init` ✅ | Merged to `main` |
| 2026-11-10 | 1.1 | `phase-1-incident-reporter` (`aa56472`) | — (code only) | Merged to `main`; awaiting push and prod smoke test |
| 2026-11-11 | 1.2 | `phase-1-middle-name-optional` (`2aebec8`) | `migrate deploy` `20261110205433_middle_name_optional` ✅ | Merged to `main`; awaiting push and prod smoke test |
| 2026-11-11 | 1.3 | `phase-1-duty-station-free-text` (`5a442cb`, `0f1b5b6`) | `migrate deploy` `20261110210815_duty_station_free_text` ✅ | Merged to `main`; awaiting push and prod smoke test. After employees save typed buildings, reverting the code would break their profile pages (old code assumes a location) |
| 2026-11-11 | 1.4 | `phase-1-incident-types` (`818f855`) | `import-incident-types.ts --apply --remote` ✅ | 53 incident types added; existing types unchanged |
| 2026-11-11 | 1.5 | `phase-1-organs` (`bb4c965`) | `import-organs.ts --apply --merge --remote` ✅ | 13 organs added, 24 codes fixed, 5 duplicates merged; departments not touched |
| 2026-11-11 | 1.7 | `phase-1-default-departments` (`7650a5d`, `f5f9fde`) | `add-default-departments.ts --apply --remote` ✅ | "Admin and Finance" and "Other" for organs without departments; their staff moved to "Other". Pushed |
| 2026-11-11 | 2.1–2.3 | `phase-2-incident-status` (`4a65d3d`) | `migrate deploy` `20261111050600_incident_status` ✅ | Pushed and smoke-tested. Includes the reporter-route auth fix |
| 2026-11-11 | 2.4 | `phase-2-incident-emails` (`c8dd310`) | — (code only) | Pushed and smoke-tested, together with the email sender fix (`11c191d`) |
| 2026-11-11 | 1.6 (code) | `phase-1-ops-rate-limit` (`5139320`) | — (code only) | Pushed and smoke-tested: healthcheck 200, `RateLimit-Limit: 1000`. Rate limiter fixed to key per client IP; healthcheck route. Uptime monitor and alert set up; Always On on, plan P0v3. Remaining: support contact (Q9) |

---

## 4. Open questions for the business

| # | Question | Blocks |
|---|---|---|
| Q1 | Confirm the cleaned incident type list (Appendix A), especially the flagged entries. Should types be grouped by category? | Item 4 |
| Q2 | Confirm the organ/office list (Appendix B): acronyms, countries, cities, parent department. Supply the rest of the list after "CAR". | Item 5 |
| Q3 | Provide the current AUC department structure and the old → new name mapping. Should regional offices get their own departments, or keep using the HQ parent department? **Answered 2026-11-11:** Yes, regional offices get their own departments where they have a structure. An office with no department structure gets an **Admin & Finance** department (usually the case), plus an **Other** option. Existing staff in those offices default to **Other**. HQ rename mapping still to come. | Item 6 |
| Q4 | Should office admins see only their own office's data (recommended) or all data? Which modules can they manage? **Answered 2026-11-11:** Office admins see **only their own office's** data, and manage **incidents only**. | Item 9 |
| Q5 | Should `major` incidents also trigger alerts, or only `critical`? Who besides incident admins should receive them (EOC mailbox)? **Answered 2026-11-11: only `critical`; `incidentAdmin` users only.** | Item 8 |
| Q6 | Is SMS required, or is email enough for now? Budget for SMS? **Answered 2026-11-11:** **No SMS for now**; email is enough. | Item 8 |
| Q7 | Which external domains are approved? Are Gmail accounts allowed? **Answered 2026-11-11:** Some offices can't use africanunion.org or their own domain, so users may sign in with **personal email addresses**. No domain allowlist. | Item 10 |
| Q8 | Should office number remain mandatory for regional offices? **Answered 2026-11-11:** Office number is **not mandatory**. | Item 3 |
| Q9 | Who is the support contact for staff, and what response time is expected? | Item 11 |

---

## Appendix A: Incident types (cleaned)

⚠ marks an entry rebuilt from text that was broken across lines in the source. Please confirm these.

**Security / Crime**
- Arrest/Detention
- Coup
- Imprisonment
- Missing
- Arson
- Facility Intrusion
- Takeover/Occupation of Offices
- Vandalism
- Harassment/Intimidation/Threat of Violence
- Hostile Surveillance/Reconnaissance
- Sexual Assault
- Sexual Exploitation and Abuse (SEA) ⚠ *(source: "Sexual / Exploitation and Abuse / (SEA)")*
- Sexual Violence in Conflict
- Attempted Sexual Assault at Workplace
- Armed Incident – Incidental
- Armed Incident – Targeted ⚠
- Accusation
- Blackmail/Extortion
- Break-in
- Burglary
- Carjacking/Hijacking
- Cyber Attack
- Fraud
- Looting
- Robbery
- Theft
- Abduction/Hostage Taking ⚠ *(source typo "Ho stage")*
- Assault

**Accidents / Health**
- Accident – Aircraft
- Accident – Other Transportation
- Illness
- Fire ⚠ *(source: "Natural Fire". Confirm whether this means "Fire" or "Natural Fire / Wildfire")*
- Road Safety Accident (RSA)
- Suicide

**Natural Hazards**
- Earthquake
- Flood
- Landslide/Mudslide/Avalanche ⚠
- Destructive Weather System ⚠
- Tsunami
- Volcanic Eruption
- Explosive Remnant of War
- Industrial Disaster

**Occupational Safety & Health**
- Fall from Height
- Struck by Object
- Caught In/Between
- Repetitive Strain Injury (RSI)
- Burns/Chemical Exposure
- Machinery Malfunction
- Electrical Incident
- Vehicle-Related Incident (Workplace) ⚠
- Slips, Trips, and Falls
- Heat/Cold Stress
- Confined Space Incident
- Noise-Induced Hearing Loss
- Occupational Illness
- Ergonomic Hazard

**Near Miss**
- Crime Near Miss
- Killed/Injured/Kidnapped Near Miss
- Occupational Near Miss

Total: 59 types (the source said 60). Before importing, compare against the existing types in Settings → Incident Types to avoid near-duplicates.

---

## Appendix B: Organs / duty stations (working draft)

### B.1 Rows with country and city given

| Organ / Office | Country | City | Parent (source) | Notes |
|---|---|---|---|---|
| AU Permanent Observer to the UN (New York Office) | USA | New York | Cabinet of Chairperson | |
| AU Permanent Representative to the US (Washington DC Office) | USA | Washington, DC | Cabinet of Chairperson | |
| African Union Mission to Western Sahara | USA (?) | New York (?) | Cabinet of Chairperson | ⚠ Location looks wrong; confirm |
| Permanent Delegation to the League of Arab States (Cairo) | Egypt | Cairo | Cabinet of Chairperson | |
| African Centre for the Study and Research on Terrorism (ACSRT / AfCTC) | Algeria | Algiers | PAPS | ⚠ "Alegria" in source; same as "African Center for Counter Terrorism"? |
| AU Liaison Office in Libya (AULO-Libya) | Libya | Tripoli | PAPS | Listed twice |
| African Commission on Human and Peoples' Rights (ACHPR) | Gambia | Banjul | — | Listed twice |
| AU Mission for Mali and Sahel (MISAHEL) | Mali | Bamako | PAPS | |
| African Academy of Languages (ACALAN) | Mali | Bamako | — | Listed twice |
| RPID-FDH (Fouta Djallon Highlands) | Guinea | Conakry | — | |
| AU Liaison Office in Côte d'Ivoire | Côte d'Ivoire | Abidjan | PAPS | |
| AU-CIEFFA | Burkina Faso | Ouagadougou | — | |
| AU-SAFGRAD | Burkina Faso | Ouagadougou | — | |
| AU-CELHTO | Niger | Niamey | — | |
| AU Liaison Office in Liberia | Liberia | Monrovia | PAPS | |
| AU-STRC | Nigeria | Abuja | — | |
| AU Liaison Office in N'Djamena (Chad) | Chad | N'Djamena | PAPS | Listed twice ("Tchad") |
| AU Liaison Office in Central African Republic | CAR | Bangui | PAPS | |
| Inter-African Phytosanitary Council (AU-IAPSC) | Cameroon | Yaoundé | — | |
| AU Liaison Office in Kinshasa (DR Congo) | DR Congo | Kinshasa | PAPS | Listed twice |
| AU Liaison Office in Guinea Bissau | Guinea Bissau | Bissau | PAPS | |
| AU Liaison Office in South Sudan | South Sudan | Juba | PAPS | |
| AU Liaison Office in Sudan | Sudan | Khartoum | PAPS | |
| AU-PANVAC | Ethiopia | Debre Zeyit | — | |
| AU Headquarters | Ethiopia | Addis Ababa | AU Commission | Probably exists already |
| African Union Mission in Somalia | Kenya | Nairobi | PAPS | |
| AU-IBAR | Kenya | Nairobi | — | Listed twice |
| African Court on Human and Peoples' Rights | Tanzania | Arusha | — | |
| AU Advisory Board on Corruption (AUABC) | Tanzania | Arusha | — | Listed twice |
| AU Mission in Burundi (AMIB) | Burundi | Bujumbura | PAPS | |
| AU/SADC Liaison Office in Madagascar | Madagascar | Antananarivo | PAPS | |
| AU Southern Africa Regional Office (AU-SARO) | Malawi | Lilongwe | Cabinet of Chairperson | |
| AU Liaison Office in Comoros | Comoros | Moroni | PAPS | City given as "Comoros" in source |
| Pan-African Parliament (PAP) | South Africa | Midrand (Gauteng) | — | Listed twice |
| AUDA-NEPAD | South Africa | Johannesburg | — | Listed 3 times |
| African Peer Review Mechanism (APRM) | South Africa | Johannesburg | — | Listed twice |
| Permanent Mission to the EU and ACP (Brussels) | Belgium | Brussels | Cabinet of Chairperson | |
| AU Permanent Representative to the UN and WTO (Geneva) | Switzerland | Geneva | Cabinet of Chairperson | |

### B.2 Rows with no location in the table (locations inferred from the admin list; confirm)

| Organ / Office | Country (inferred) | City (inferred) | Notes |
|---|---|---|---|
| AU-ECOSOCC | Zambia | Lusaka | |
| AU Centre for Post-Conflict Reconstruction & Development (PCRD) | Egypt | Cairo | ⚠ No admin listed |
| Pan African Postal Union (PAPU) | Tanzania | Arusha | |
| African Airlines Association (AfrAA) | Kenya | Nairobi | ⚠ Not an AU organ; confirm inclusion. No admin listed |
| Pan African University (PAU) | ? | ? | |
| African Telecommunications Union (ATU) | Kenya | Nairobi | ⚠ No admin listed |
| African Institute for Remittances (AIR) | Kenya | Nairobi | |
| AU Sports Council | Cameroon | Yaoundé | ⚠ Merged with IAPSC in the source |
| African Energy Commission (AFREC) | Algeria | Algiers | ⚠ No admin listed |
| AFRIPOL | Algeria | Algiers | |
| AfCFTA Secretariat | Ghana | Accra | |
| African Migration Observatory (AMO) | Morocco | Rabat | |
| Centre for Migration | Mali | Bamako | |
| MNJTF N'Djamena | Chad | N'Djamena | |
| AfCAC | Senegal | Dakar | |
| Africa CDC | Ethiopia | Addis Ababa | Not in table, but in admin list |
| STATAFRIC | Tunisia | Tunis | |
| AMEC / AIMEC | Tunisia | Tunis | ⚠ Request mentions "AU SARO AIMEC Tunis"; confirm name |
| AU IPED | ? | ? | ⚠ Location not given |
| AFRICOM | ? | ? | ⚠ Mentioned in the request only; confirm what it refers to |

---

## Appendix C: Office admins onboarding tracker

Contact emails are in the source document and aren't copied here. Status: ⬜ account not created · 🟨 account created · ✅ roles and organ assigned, notified.

| Office | Location | Admins | Status |
|---|---|---|---|
| AU-ECOSOCC | Lusaka, Zambia | Mohamoud Yusuf Said; Kouassi Eric Kramo | ⬜ |
| AU Mission to League of Arab States | Cairo, Egypt | Ghada Elsoly; Gehan Negm | ⬜ |
| AU PCRD Centre | Cairo, Egypt | *(none listed)* | ⏸ |
| African Court on Human and Peoples' Rights | Arusha, Tanzania | Martha Asante; Kwame Keddey | ⬜ |
| Pan African Postal Union | Arusha, Tanzania | Yonna Singogo; Lelo Michael | ⬜ |
| AUABC | Arusha, Tanzania | Christopher Katuu; Dorica Kgwadi | ⬜ |
| Pan-African Parliament | Johannesburg, South Africa | Kenneth Akibate; Mogomotsi Dingalo; Jacob Odada | ⬜ |
| AUDA-NEPAD | Johannesburg, South Africa | Solomon Makanye Bopape | ⬜ |
| APRM | Johannesburg, South Africa | Abubakr Siddig | ⬜ |
| AU-IBAR | Nairobi, Kenya | Francisca Mhuriro; Adeline Oduor; Derek Muaka | ⬜ |
| AfrAA | Nairobi, Kenya | *(none listed)* | ⏸ |
| PAU | — | Abdi Nedif Ahmed; Nicholas Juma (Gmail) | ⬜ |
| ATU | — | *(none listed)* | ⏸ |
| Africa CDC | — | Alex Kimondo; George Serem | ⬜ |
| AIR | — | Abia Sunday Udoh; Nzingoula Gildas Crepin | ⬜ |
| AU Sports Council | Yaoundé, Cameroon | Mulugeta Shume; Judith Ines Douanla Meli | ⬜ |
| AU-IAPSC / Sport Council ⚠ | Yaoundé, Cameroon | Pelagie Koffi; Innocent Kukangle Tita | ⬜ |
| Pan-African University | — | *(none listed)* | ⏸ |
| ACHPR | Banjul, Gambia | Daniel Mgabonihela Wiston; Reginald Mere; Zelalem Taye | ⬜ |
| AfCTC / ACSRT | Algiers, Algeria | Usman Hussain | ⬜ |
| AFREC | Algiers, Algeria | *(none listed)* | ⏸ |
| AFRIPOL | Algiers, Algeria | Amir Mohammed | ⬜ |
| AfCFTA | Accra, Ghana | Kwabena Osei-Sarfo; Nissem Bezzaouia; Fatimata Doucoure | ⬜ |
| AMO | Rabat, Morocco | Antenhe Tesfu; Mahamat Brahim Abdelsadick | ⬜ |
| MISAHEL | Bamako, Mali | Alfred N. Behiblo; Jean Paul Ombi | ⬜ |
| Centre for Migration | Bamako, Mali | Odile Nzirabatinya | ⬜ |
| ACALAN | Bamako, Mali | Modibo Diallo | ⬜ |
| SAFGRAD | Ouagadougou, Burkina Faso | Koanda Traore Djeneba; Issiaka Ouedraogo | ⬜ |
| AU-CIEFFA | Ouagadougou, Burkina Faso | Mariama Mahaman | ⬜ |
| AU Mission to the USA | Washington DC, USA | Adewale Olukunle Ogunsuyi; Gilles Makon | ⬜ |
| AU Permanent Observer to the UN | New York, USA | Seshime Dovlo; Simon Yorou Raphael | ⬜ |
| AU Liaison Office in Chad | N'Djamena, Chad | Dalitso Chinguwo | ⬜ |
| MNJTF N'Djamena | N'Djamena, Chad | Allangombaye Masra | ⬜ |
| AfCAC | Dakar, Senegal | Musa Magongo; Ndeye Fatou Diouf | ⬜ |
| AUDA-NEPAD (Senegal?) | Senegal | *(none listed)* | ⏸ |
| STATAFRIC | Tunis, Tunisia | Aminata Bundu; Fikirte Tsegaye | ⬜ |
| AULO-Libya | Tunis/Tripoli | George Zziwa; Asma Maissamarim (Gmail) | ⬜ |
| AMEC | Tunis, Tunisia | Olga Dessaond | ⬜ |
| AU-SARO | Lilongwe, Malawi | Chikumbutso Gangire; Abdul Fataw Dogbeda Abubakari | ⬜ |
| AU Liaison Office Madagascar | Antananarivo, Madagascar | James N. Kabyemera; Oscar Ralaimanantsoa | ⬜ |
| AU Liaison Office DR Congo | Kinshasa, DR Congo | Ruth Milolo Tshitambwe; Amir Idriss Abderamane | ⬜ |
| AU IPED | — | Hunbelew Gebretsadik | ⬜ |
| CAR | Bangui, CAR | *(source document truncated)* | ⏸ |

Notes:
- Daniel Wiston (ACHPR) is listed with a panafricanparliament.org address. Confirm this is correct.
- Admins on Gmail or non-AU domains depend on Item 10.

---

## Appendix D: Files affected by the middle name change (Item 2)

```
app/routes/dashboard+/access-requests+/index.tsx
app/routes/dashboard+/incidents+/$incidentId_.assignments.$assignmentId_.delete.tsx
app/routes/dashboard+/incidents+/$incidentId_.assignments.new.tsx
app/routes/dashboard+/incidents+/$incidentId_.tsx
app/routes/dashboard+/php+/$employeeId_.tsx
app/routes/dashboard+/php+/index.tsx
app/routes/profile+/$userId_+/__personal-info-editor.tsx
app/routes/profile+/$userId_+/__profile-editor.tsx
app/routes/profile+/$userId_+/access-requests_+/new.tsx
app/routes/profile+/$userId_+/dependants_+/__dependant-editor.tsx
app/routes/profile+/$userId_+/dependants.tsx
app/routes/profile+/$userId_+/edit.tsx
app/routes/profile+/$userId_+/id-requests_+/__id-request-editor.tsx
app/routes/profile+/$userId_+/id-requests_+/$idRequestId_.delete.tsx
app/routes/profile+/$userId_+/id-requests_+/$idRequestId_.edit.tsx
app/routes/profile+/$userId_+/id-requests_+/new.tsx
app/routes/profile+/$userId_+/spouses_+/__spouse-editor.tsx
app/routes/profile+/$userId_+/spouses.tsx
app/routes/profile+/$userId.tsx
app/routes/profile+/resources+/employees.$employeeId.tsx
app/routes/profile+/resources+/employees.tsx
app/routes/settings+/officers+/__officer-editor.tsx
app/routes/settings+/officers+/index.tsx
```

---

## Change log

| Date | Change |
|---|---|
| 2026-11-10 | Plan created from business request dated 14.04.2026 |
| 2026-11-10 | Added Section 1a (database change strategy, Phase 0) |
| 2026-11-10 | Expanded Section 3 into per-phase release breakdown and release log |
| 2026-11-10 | Release 0.2 marked done; release 1.1 (Item 1) merged to `main` |
| 2026-11-10 | Release 1.2 (Item 2) prepared on branch; migration awaiting production deploy |
| 2026-11-11 | Release 1.2 migration deployed on production by owner; merged to `main` |
| 2026-11-11 | Release 1.3 (Item 3) prepared on branch; migration awaiting production deploy |
| 2026-11-11 | Release 1.3 migration deployed on production by owner; merged to `main` (incl. department fallback) |
| 2026-11-11 | Release 1.6: rate limiter shared one bucket across all users (no `trust proxy`); fixed on branch, healthcheck added |
| 2026-11-11 | Release 1.6: uptime monitor (`staffwise-health`) and email alert set up |
| 2026-11-11 | Release 1.6: Always On confirmed enabled, plan P0v3; only Q9 (support contact) remains |
| 2026-11-11 | Release 1.4 prepared: import script and draft data (53 new types, duplicates of existing types removed), dropdown sort; waiting on Q1 |
| 2026-11-11 | Release 1.5 prepared: organ import (13 new, 24 code fixes, 5 merges); unclear organs left as they are; departments not touched until the Q3 mapping |
| 2026-11-11 | Releases 1.4 and 1.5 merged to `main`; production imports still to run by owner |
| 2026-11-11 | Releases 1.4 and 1.5: owner ran both imports on production; dry runs afterwards report nothing left to do |
| 2026-11-11 | Release 2.1 (Item 7) prepared on branch: `incident_status` migration with backfill; awaiting production deploy |
| 2026-11-11 | Release 2.2 (Item 7, admin side) built on the same branch; 2.1 and 2.2 ship together |
| 2026-11-11 | Release 2.3 (Item 7, reporter side) built on the same branch; also fixes missing auth/ownership checks on reporter incident routes. Open: `/profile/resources/attachments/:id` has no auth (all request types) |
| 2026-11-11 | Release 2.1 migration deployed on production by owner; 2.1–2.3 merged to `main` |
| 2026-11-11 | Releases 2.1–2.3 pushed and smoke-tested in production |
| 2026-11-11 | Q5 answered (critical only, incidentAdmin only); release 2.4 built on `phase-2-incident-emails` |
| 2026-11-11 | Release 2.4 merged to `main` |
| 2026-11-11 | Email fix: Azure rejected every email ("sender domain has not been linked": hardcoded `…azurecomm.net` sender). Sender changed to `DoNotReply@apps.africanunion.org` (overridable with optional `EMAIL_SENDER_ADDRESS`). Signup, password reset, PHP and incident emails were all failing silently; likely part of Item 11 |
| 2026-11-11 | Release 2.4 and the email sender fix pushed and smoke-tested in production; Phase 2 done |
| 2026-11-11 | Security fix (`fix-attachment-auth`): `/profile/resources/attachments/:id`, `/profile/resources/employees/:id` (personal-info PDF) and `/profile/resources/employees` (Excel of all staff) had no auth. Now: sign-in required; attachments and PDFs only for the owner or the matching admin roles (others get 404); bulk export `admin`/`phpAdmin` only; `cache-control: private, no-store`. Code only |
| 2026-11-11 | Attachment/export auth fix pushed and smoke-tested in production (`83840f3`) |
| 2026-11-11 | Business answered Q3 (Admin & Finance for offices without departments), Q4 (office admins scoped to own office), Q6 (no SMS), Q7 (personal emails allowed, no allowlist), Q8 (office number optional) |
| 2026-11-11 | Q3 follow-up: offices without departments also get "Other"; existing staff not moved. Q4 follow-up: office admins manage incidents only. Release 1.7 script prepared |
| 2026-11-11 | Release 1.7: existing staff in those organs default to "Other" (owner) |
| 2026-11-11 | Release 1.7 run on production by owner and pushed |
