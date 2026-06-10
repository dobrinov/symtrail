# Symtrail — Rails Backend + Sync API Design

**Date:** 2026-06-10
**Status:** Approved for planning
**Sub-project:** A of 4 (A: backend, B: iOS app, C: landing page, D: Android app)

## Context

Symtrail (prototype name "Symptio") is a family health/symptom tracker geared
toward PFAPA (periodic fever syndrome in children). A complete React/JSX visual
prototype exists (`Symptio Health Tracker.zip`) defining the design system,
domain model, and all screens. The product plan:

1. **A — Rails backend + Sync API** (this spec)
2. **B — iOS app**: React Native (Expo), offline-first, on-device SQLite
3. **C — Landing page**: lives inside the Rails app
4. **D — Android app**: from the shared RN codebase

Confirmed product decisions:

- **Offline-first + sync**: devices own a local DB and work fully offline; the
  backend enables multi-device sync and backup.
- **One account per family, multi-device**: parents share one login across
  phones. Caregiver invites/roles are v2.
- **Auth**: email/password + Sign in with Apple (Google added with Android).
- **v1 feature scope** (app-side, informs the data model): core logging
  (symptoms/temperature/meds/notes), flare detection & prediction, doctor PDF
  report, medication reminders, multi-device sync.
- **Catalogues**: both symptoms and medications are user-customizable.
- **Hosting**: Fly.io or Render, container + persistent volume.

## Architecture

One Rails 8 application serving two faces:

- `/api/v1/*` — JSON API for the mobile apps
- `/` — marketing landing page (sub-project C; same deploy)

Stack:

- **Rails 8**, API controllers under an `Api::V1` namespace; normal controllers
  for the landing page.
- **SQLite** in WAL mode, database file on a mounted persistent volume.
- **Solid Queue** and **Solid Cache** (SQLite-backed) — no Redis, no Postgres.
- **Minitest** (Rails default) for tests.
- **Litestream** for continuous SQLite replication to object storage (S3/R2).
- Default Rails 8 Dockerfile; deployable to Fly.io or Render.
- One external service: a transactional email provider (Resend or Postmark)
  for password reset emails.

The backend has **no report or push-notification responsibilities in v1**:
PDF reports are generated on-device (devices hold all data locally), and
medication reminders are local notifications (`reminder_at` is just synced
data).

## Data model

### Server-owned tables (not synced)

```
accounts
  id                integer PK
  email             string, unique, present
  password_digest   string (bcrypt; null allowed if Apple-only account)
  apple_user_id     string, unique, nullable
  settings          json (e.g. { "temp_unit": "c" })
  sync_version      bigint, default 0  — per-account monotonic counter
  timestamps

sessions
  id                integer PK
  account_id        FK
  token_digest      string (SHA-256 of opaque bearer token), unique
  device_name       string
  last_used_at      datetime
  timestamps
```

### Syncable tables

All syncable tables share four sync columns:

```
id                 uuid PK (client-minted)
server_version     bigint — stamped from accounts.sync_version on every accepted write
client_updated_at  datetime — device wall clock of the edit; LWW tiebreaker
deleted_at         datetime, nullable — tombstone
```

plus `account_id` (FK, scoping) and timestamps. Index on
`(account_id, server_version)` for pull queries.

```
profiles
  name         string, present
  sex          string, nullable ('male'|'female')
  color        string (hex)
  birth_date   date, nullable
  condition    string, nullable (e.g. 'PFAPA')

symptom_types
  label        string, present
  icon         string (icon key from the app's icon set)
  group_name   string ('PFAPA'|'Infection'|'General'|custom)
  builtin      boolean, default false

medication_types
  label        string, present
  brand        string, nullable
  form         string ('syrup'|'tablet'|'drops'|…)
  strength     string, nullable (e.g. '100mg/5ml')
  default_dose string, nullable (e.g. '5 ml')
  color        string (hex)
  kind         string, nullable (e.g. 'Pain / fever')
  builtin      boolean, default false

entries
  profile_id          FK uuid, present
  entry_type          string, present ('symptom'|'temp'|'med'|'note')
  recorded_at         datetime, present
  symptom_type_id     FK uuid, nullable — required when entry_type='symptom'
  severity            string, nullable ('mild'|'moderate'|'high'|'severe')
  temp_c              decimal(3,1), nullable — required when entry_type='temp'
  medication_type_id  FK uuid, nullable — required when entry_type='med'
  dose                string, nullable
  reminder_at         datetime, nullable
  note                text, nullable
```

### Deliberate choices

1. **Catalogues seeded per account.** On signup, the prototype's 28 built-in
   symptoms and 5 built-in medications are copied into the new account's
   `symptom_types` / `medication_types` (flagged `builtin: true`). Custom items
   are just more rows. Everything is uniform, account-scoped, and syncs
   identically — no special-casing in entries or sync.
2. **Entries are a single table** with nullable type-specific columns (mirrors
   the prototype's union type). Logging data is append-mostly; one table keeps
   sync, calendar queries, and report data simple.
3. **Temperatures canonical in °C** (`temp_c`). °C/°F is a display preference
   in `accounts.settings`, synced so all the family's devices agree.
4. **Avatar initials are derived** client-side from `name`, not stored.

## Authentication

Opaque bearer tokens (not JWT): random tokens stored hashed in `sessions`,
sent as `Authorization: Bearer <token>`, long-lived, individually revocable.

```
POST   /api/v1/auth/signup           {email, password}  → 201 account + token
POST   /api/v1/auth/signin           {email, password}  → 200 token
POST   /api/v1/auth/apple            {identity_token}   → 200 token
DELETE /api/v1/auth/session                             → 204 (revoke this token)
POST   /api/v1/auth/password_reset   {email}            → 202 (always, no enumeration)
POST   /api/v1/auth/password_reset/confirm {token, password} → 200
DELETE /api/v1/account                                  → 204 (full deletion)
GET    /api/v1/account                                  → 200 account + settings
PATCH  /api/v1/account               {settings}         → 200
```

- **Sign in with Apple**: verify `identity_token` signature against Apple's
  JWKS, validate audience/issuer, then find-or-create the account by
  `apple_user_id` (linking to an existing account by verified email when
  present).
- **Account deletion** is in v1 — required by App Store review for any app
  with account creation. Deletes the account and all its data.
- **Password reset** is in v1 — email/password auth is a trap without it.
  Reset tokens are single-use, short-lived, stored hashed.
- Signup seeds the built-in catalogues (see data model) inside the same
  transaction.

## Sync protocol

Pull/push with per-account monotonic version cursor; per-record last-write-wins.

```
GET  /api/v1/sync/pull?since=<cursor>
  → 200 {
      changes: {
        profiles:         { updated: [records], deleted: [ids] },
        symptom_types:    { updated: [...],     deleted: [...] },
        medication_types: { updated: [...],     deleted: [...] },
        entries:          { updated: [...],     deleted: [...] }
      },
      cursor: <account.sync_version at response time>
    }

POST /api/v1/sync/push  { changes: { …same shape, created/updated merged… } }
  → 200 { accepted: [ids], rejected: [{id, reason}] }
```

Rules:

- Every accepted write bumps `accounts.sync_version` and stamps the row's
  `server_version`. Pull is `WHERE account_id = ? AND server_version > ?`.
- `since=0` returns the full dataset (initial sync / fresh install).
- Push applies the batch transactionally. Conflict resolution is per-record
  **LWW on `client_updated_at`**: an incoming record older than the stored row
  is discarded (rejected with `reason: "stale"`); the device receives the
  winning version on its next pull.
- Deletes are tombstones: `deleted_at` set, row content retained until purge.
  Pull returns deleted IDs in `deleted: [...]`. A recurring Solid Queue job
  purges tombstones older than 90 days; a device offline longer than 90 days
  must perform a full re-pull (`since=0`).
- Records are validated on push; invalid records are rejected individually
  with `reason` (the rest of the batch still applies).
- Referential ordering inside a batch: parents (profiles, catalogue types) are
  applied before children (entries).
- Client flow is always **push, then pull**. Both calls are idempotent and
  safe to retry on flaky connections.

## Error handling

- JSON envelope: `{ "error": { "code": "<machine_code>", "message": "…" } }`.
- 401 invalid/expired token; 422 validation failures; 404 cross-account access
  (scoped queries make other accounts' records invisible).
- No 409s: LWW absorbs all sync conflicts.
- `rack-attack` rate limiting on auth endpoints (login brute force, reset spam).

## Operations

- SQLite WAL mode; DB file on the platform's persistent volume.
- **Litestream** sidecar/process replicating continuously to S3-compatible
  storage — the volume must not be the only copy of families' medical data.
- Health check endpoint (`/up`, Rails default) for platform probes.
- Logs to stdout (platform-collected).

## Testing

Minitest, request specs as the backbone:

- **Auth**: signup (incl. catalogue seeding), signin, bad credentials, Apple
  token verification (JWKS mocked), sign-out revocation, password reset
  round-trip, account deletion cascades, settings update.
- **Sync** (priority): initial pull `since=0`; two-device convergence
  (push from A, pull on B); LWW conflict — older write rejected, newer wins;
  tombstone propagation and purge job; retry idempotency (same push twice);
  cross-account isolation; per-record rejection of invalid rows in a batch.
- **Models**: entry type-specific validation (symptom requires
  `symptom_type_id`, temp requires `temp_c`, etc.).

## Out of scope (v2+)

- Caregiver invites / multiple accounts per family, roles & permissions
- Google sign-in (arrives with the Android app, sub-project D)
- Server-side push notifications
- Server-side PDF generation
- Op-log/event-sourced sync, CRDTs
- Web app for viewing data (beyond the marketing landing page)
