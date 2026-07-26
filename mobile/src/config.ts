// Feature flags + environment.
//
// APP_ENV: which environment this binary belongs to. Set per build profile via
// EXPO_PUBLIC_APP_ENV (eas.json / .env — inlined at build time); anything else
// falls back to "development" for dev-server runs and "production" for release
// builds. Analytics keys are also supplied per environment (see src/analytics).
export type AppEnv = "development" | "staging" | "production";
const rawEnv = process.env.EXPO_PUBLIC_APP_ENV;
export const APP_ENV: AppEnv =
  rawEnv === "development" || rawEnv === "staging" || rawEnv === "production"
    ? rawEnv
    : __DEV__
      ? "development"
      : "production";

//
// LOCAL_ONLY: run the app entirely on-device with no backend dependency. While
// true the auth/sign-in gate is bypassed (the user is treated as signed in),
// all sync is a no-op, and the built-in symptom/medication catalogues are
// seeded locally instead of pulled from the server. This is a temporary aid for
// early UI testing — set back to false (and re-seed from the server) when the
// backend is wired up again.
export const LOCAL_ONLY = true;
