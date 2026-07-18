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
