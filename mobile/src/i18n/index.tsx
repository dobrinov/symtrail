// i18n runtime — provider + hooks around the locale string tables.
// The language preference is device-local (sync_meta "language", default en).
// Dates/times format through each table's `locale` BCP-47 tag.
import React, { createContext, useContext } from "react";
import { en, Strings } from "./en";
import { bg } from "./locales/bg";
import { cs } from "./locales/cs";
import { de } from "./locales/de";
import { el } from "./locales/el";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { hi } from "./locales/hi";
import { it } from "./locales/it";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { nl } from "./locales/nl";
import { pl } from "./locales/pl";
import { pt } from "./locales/pt";
import { ro } from "./locales/ro";
import { ru } from "./locales/ru";
import { sv } from "./locales/sv";
import { tr } from "./locales/tr";
import { uk } from "./locales/uk";
import { zh } from "./locales/zh";

export type { Strings };

export const LOCALES = { en, bg, cs, de, el, es, fr, hi, it, ja, ko, nl, pl, pt, ro, ru, sv, tr, uk, zh } as const;
export type LanguageCode = keyof typeof LOCALES;

// Picker order: English first, then alphabetical by native name.
export const LANGUAGE_CODES: LanguageCode[] = [
  "en", "bg", "cs", "de", "el", "es", "fr", "hi", "it", "ja",
  "ko", "nl", "pl", "pt", "ro", "ru", "sv", "tr", "uk", "zh",
];

export function isLanguageCode(v: string | null | undefined): v is LanguageCode {
  return !!v && v in LOCALES;
}

const Ctx = createContext<Strings>(en);

export function I18nProvider({
  language,
  children,
}: {
  language: LanguageCode;
  children: React.ReactNode;
}): React.JSX.Element {
  return <Ctx.Provider value={LOCALES[language] ?? en}>{children}</Ctx.Provider>;
}

/** The active string table. Defaults to English outside a provider (tests). */
export function useT(): Strings {
  return useContext(Ctx);
}

/** Fill {placeholders} in a translated template. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Built-in catalogue labels are stored in English; translate at display time. */
export function catLabel(label: string, s: Strings): string {
  return s.catalogue[label] ?? label;
}

/** Locale-aware time. English keeps the app's original "3:04 pm" style. */
export function fmtClock(iso: string, s: Strings): string {
  const d = new Date(iso);
  if (s.locale === "en-GB") {
    let h = d.getHours();
    const m = d.getMinutes();
    const am = h < 12 ? "am" : "pm";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, "0")} ${am}`;
  }
  return d.toLocaleTimeString(s.locale, { hour: "numeric", minute: "2-digit" });
}

/** Mon-first short weekday names for the active locale (2024-01-01 is a Monday). */
export function weekdayShortNames(s: Strings): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(s.locale, { weekday: "short", timeZone: "UTC" }),
  );
}

/** Full month name for a 0-based month index in the active locale. */
export function monthLongName(month: number, s: Strings): string {
  return new Date(Date.UTC(2024, month, 1)).toLocaleDateString(s.locale, { month: "long", timeZone: "UTC" });
}

/** Age label ("3 yrs" / "7 mo") in the active locale. */
export function ageLabelI18n(birthDateIso: string | null, s: Strings, today = new Date()): string {
  if (!birthDateIso) return "";
  const birth = new Date(birthDateIso);
  let years = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  if (years >= 1) return years === 1 ? s.yearShort : fmt(s.yearsShort, { n: years });
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months--;
  return fmt(s.monthsShort, { n: Math.max(0, months) });
}
