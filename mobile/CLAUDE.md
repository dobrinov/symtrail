@AGENTS.md

# Local-only mode (no backend) — temporary

The iOS app currently runs WITHOUT the backend server, on local storage only,
to make early testing easy. The backend will be wired back in later.

This is controlled by `LOCAL_ONLY` in `mobile/src/config.ts` (currently `true`).
While it's `true`:

- The auth/sign-in gate is bypassed — the user is treated as signed in and goes
  straight to onboarding (add first person) → tabs. No email/password needed.
- `SyncClient.syncNow()` is a no-op, so nothing is pushed/pulled and no network
  calls are made for sync.
- Built-in symptom/medication catalogues are seeded locally on startup via
  `seedBuiltinCatalogues` (`mobile/src/db/builtinCatalogue.ts`), mirroring the
  server's `backend/app/services/catalogue.rb`, because they normally arrive on
  the first sync pull.

When restoring the backend: set `LOCAL_ONLY = false`, and note the locally
seeded built-in rows may need clearing so the server's catalogue pull doesn't
duplicate them. Keep `builtinCatalogue.ts` in sync with `catalogue.rb`.

# Analytics (PostHog, per-environment)

`src/analytics/index.ts` wraps PostHog behind the `Analytics` interface,
injected via AppServices. Each environment (development/staging/production)
uses its own PostHog project; the key arrives at build time through
`EXPO_PUBLIC_POSTHOG_API_KEY` — from the matching profile's `env` block in
`eas.json` for EAS builds, or from `.env` (see `.env.example`) for local
`expo start`. `EXPO_PUBLIC_APP_ENV` names the environment (`APP_ENV` in
`src/config.ts`) and is stamped on every event as `app_env`. No key → no-op
client (tests, keyless dev runs). The PostHog project keys in `eas.json` are
client-side/public — fill them in per environment.

Event taxonomy (keep names/properties consistent when adding more):
`symptom_logged` / `temperature_logged` / `medication_logged`,
`log_edited` / `log_deleted` (`log_type`), `medication_reminder_set`,
`person_added` (`source: onboarding|profile`) / `person_edited` /
`person_deleted` / `person_switched`, `onboarding_completed`,
`settings_changed` (`setting`, `value`), `report_exported`, `flare_viewed`,
`history_view_changed` (`view`), `history_filter_applied`, plus automatic
`$screen` and app lifecycle events. `LOG_TYPE_NAMES` in `src/analytics`
maps `Entry.entryType` to the friendly names used in events.

Privacy rule: users stay anonymous (no `identify`), and events carry only
coarse properties (e.g. `log_type`) — never symptom names, temperatures,
notes, or other health data.
