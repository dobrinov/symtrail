// Locale-table integrity: the Strings type enforces top-level keys at compile
// time, but catalogue keys and {placeholders} inside values are only checkable
// at runtime — a missing placeholder would silently print "{n}" to users.
import { en } from "../../src/i18n/en";
import { LOCALES, LANGUAGE_CODES, fmt } from "../../src/i18n";

const placeholders = (s: string): string[] => (s.match(/\{(\w+)\}/g) ?? []).sort();

test("every language code is registered exactly once", () => {
  expect(new Set(LANGUAGE_CODES).size).toBe(LANGUAGE_CODES.length);
  expect(LANGUAGE_CODES.length).toBe(Object.keys(LOCALES).length);
});

for (const code of Object.keys(LOCALES) as (keyof typeof LOCALES)[]) {
  const loc = LOCALES[code];

  test(`${code}: locale tag and language name are set`, () => {
    expect(loc.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    expect(loc.languageName.length).toBeGreaterThan(0);
  });

  test(`${code}: catalogue covers exactly the built-in keys`, () => {
    expect(Object.keys(loc.catalogue).sort()).toEqual(Object.keys(en.catalogue).sort());
    for (const v of Object.values(loc.catalogue)) expect(v.trim().length).toBeGreaterThan(0);
  });

  test(`${code}: placeholders survive translation`, () => {
    for (const [key, value] of Object.entries(en)) {
      if (typeof value !== "string") continue;
      const got = (loc as Record<string, unknown>)[key];
      expect(typeof got).toBe("string");
      expect((got as string).trim().length).toBeGreaterThan(0);
      expect(placeholders(got as string)).toEqual(placeholders(value));
    }
    for (const [key, value] of Object.entries(en.severity)) {
      expect((loc.severity as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0);
      void value;
    }
  });
}

test("fmt fills placeholders", () => {
  expect(fmt("{n} results for {name}", { n: 3, name: "Leo" })).toBe("3 results for Leo");
  expect(fmt("no vars", {})).toBe("no vars");
});

// Provider wiring: components read the selected table, defaulting to English.
import React from "react";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";
import { I18nProvider, useT } from "../../src/i18n";

function Probe() {
  const s = useT();
  return React.createElement(Text, null, `${s.languageName}:${s.tabToday}`);
}

test("I18nProvider serves the selected language; default is English", async () => {
  await render(React.createElement(Probe));
  expect(screen.getByText(`English:${en.tabToday}`)).toBeTruthy();
  await render(React.createElement(I18nProvider, { language: "bg", children: React.createElement(Probe) }));
  expect(screen.getByText(`${LOCALES.bg.languageName}:${LOCALES.bg.tabToday}`)).toBeTruthy();
});
