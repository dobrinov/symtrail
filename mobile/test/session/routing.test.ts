import { resolveRoute } from "../../src/session/routing";

test("unauthenticated users are sent to sign-in unless already in auth", () => {
  expect(resolveRoute(false, 0, "(tabs)")).toBe("/(auth)/sign-in");
  expect(resolveRoute(false, 3, "(onboarding)")).toBe("/(auth)/sign-in");
  expect(resolveRoute(false, 0, "(auth)")).toBeNull(); // already there
});

test("authenticated users with zero profiles are forced into onboarding", () => {
  expect(resolveRoute(true, 0, "(tabs)")).toBe("/(onboarding)");
  expect(resolveRoute(true, 0, "(auth)")).toBe("/(onboarding)");
  expect(resolveRoute(true, 0, "(onboarding)")).toBeNull(); // already there
});

test("authenticated users with at least one profile land on the tabs", () => {
  expect(resolveRoute(true, 1, "(auth)")).toBe("/(tabs)");
  expect(resolveRoute(true, 2, "(onboarding)")).toBe("/(tabs)"); // first profile just added
  expect(resolveRoute(true, 1, "(tabs)")).toBeNull(); // already there, stay
});
