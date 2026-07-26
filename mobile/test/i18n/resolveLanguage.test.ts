// Language resolution: explicit preference wins, else first supported device
// locale (expo-localization), else English.
jest.mock("expo-localization", () => ({ getLocales: jest.fn(() => []) }));

import { getLocales } from "expo-localization";
import { resolveLanguage, detectDeviceLanguage } from "../../src/i18n";

const mockLocales = (...codes: (string | null)[]) =>
  (getLocales as jest.Mock).mockReturnValue(codes.map((languageCode) => ({ languageCode })));

test("stored preference wins over device locale", () => {
  mockLocales("de");
  expect(resolveLanguage("bg")).toBe("bg");
});

test("unset preference falls back to first supported device locale", () => {
  mockLocales("de", "fr");
  expect(resolveLanguage(null)).toBe("de");
});

test("skips unsupported device locales", () => {
  mockLocales("da", null, "fr");
  expect(resolveLanguage(null)).toBe("fr");
});

test("no supported device locale falls back to English", () => {
  mockLocales("da", "fi");
  expect(resolveLanguage(null)).toBe("en");
});

test("invalid stored code resolves like unset", () => {
  mockLocales("ja");
  expect(resolveLanguage("xx")).toBe("ja");
});

test("detectDeviceLanguage survives a throwing native module", () => {
  (getLocales as jest.Mock).mockImplementation(() => {
    throw new Error("native module unavailable");
  });
  expect(detectDeviceLanguage()).toBe("en");
});
