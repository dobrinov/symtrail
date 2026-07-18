// Feature flags.
//
// LOCAL_ONLY: run the app entirely on-device with no backend dependency. While
// true the auth/sign-in gate is bypassed (the user is treated as signed in),
// all sync is a no-op, and the built-in symptom/medication catalogues are
// seeded locally instead of pulled from the server. This is a temporary aid for
// early UI testing — set back to false (and re-seed from the server) when the
// backend is wired up again.
export const LOCAL_ONLY = true;
