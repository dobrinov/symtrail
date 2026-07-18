import { Repo } from "../db/repo";
import { emitTableChange } from "../db/events";
import { AccountJson } from "../api/types";

export interface SecureKV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

const TOKEN_KEY = "auth_token";

export class SessionStore {
  constructor(private repo: Repo, private secure: SecureKV) {}

  async getToken(): Promise<string | null> { return this.secure.get(TOKEN_KEY); }

  async signedIn(token: string, account: AccountJson): Promise<void> {
    const prevAccountId = this.repo.getMeta("account_id");
    if (prevAccountId && prevAccountId !== String(account.id)) {
      this.repo.wipeAll(); // different family: clear and re-sync from since=0
    }
    this.repo.setMeta("account_id", String(account.id));
    this.repo.setMeta("account_email", account.email);
    this.repo.setMeta("temp_unit", account.settings.temp_unit);
    await this.secure.set(TOKEN_KEY, token);
  }

  async signedOut(): Promise<void> {
    await this.secure.delete(TOKEN_KEY); // local data intentionally preserved
  }

  tempUnit(): "c" | "f" { return (this.repo.getMeta("temp_unit") as "c" | "f") ?? "c"; }
  setTempUnit(u: "c" | "f"): void {
    this.repo.setMeta("temp_unit", u);
    // setMeta doesn't emit, so notify subscribers to re-render temp surfaces.
    emitTableChange("sync_meta");
  }
  // Appearance preference is device-local (not part of account settings).
  themePreference(): "light" | "dark" | "system" {
    const v = this.repo.getMeta("theme_pref");
    return v === "light" || v === "dark" ? v : "system";
  }
  setThemePreference(p: "light" | "dark" | "system"): void {
    this.repo.setMeta("theme_pref", p);
    emitTableChange("sync_meta");
  }

  // UI language, device-local. Stored as a code from i18n LOCALES; callers
  // validate via isLanguageCode. Default "en".
  language(): string {
    return this.repo.getMeta("language") ?? "en";
  }
  setLanguage(code: string): void {
    this.repo.setMeta("language", code);
    emitTableChange("sync_meta");
  }

  accountEmail(): string | null { return this.repo.getMeta("account_email"); }
}

// Production SecureKV backed by expo-secure-store:
export function expoSecureKV(): SecureKV {
  const SecureStore = require("expo-secure-store");
  return {
    get: (k) => SecureStore.getItemAsync(k),
    set: (k, v) => SecureStore.setItemAsync(k, v),
    delete: (k) => SecureStore.deleteItemAsync(k),
  };
}
