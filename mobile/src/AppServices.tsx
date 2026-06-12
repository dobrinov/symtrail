import React, { createContext, useContext, useMemo } from "react";
import Constants from "expo-constants";
import { getRepo } from "./db/appDb";
import { Repo } from "./db/repo";
import { ApiClient } from "./api/client";
import { SyncClient } from "./sync/client";
import { SessionStore, expoSecureKV } from "./session/store";

export interface Services {
  repo: Repo;
  api: ApiClient;
  sync: SyncClient;
  session: SessionStore;
}

const Ctx = createContext<Services | null>(null);

let cachedToken: string | null = null;
export function setCachedToken(t: string | null) { cachedToken = t; }
export function getCachedToken() { return cachedToken; }

export function AppServicesProvider({ children }: { children: React.ReactNode }) {
  const services = useMemo<Services>(() => {
    const repo = getRepo();
    const apiUrl: string = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000";
    const api = new ApiClient(apiUrl, () => cachedToken);
    const session = new SessionStore(repo, expoSecureKV());
    // 401 from sync = revoked/expired token: drop it; the auth gate (root
    // layout) sees the cleared token on its next check and routes to sign-in.
    const sync = new SyncClient(repo, api, () => {
      cachedToken = null;
      session.signedOut();
    });
    return { repo, api, sync, session };
  }, []);
  return <Ctx.Provider value={services}>{children}</Ctx.Provider>;
}

export function useServices(): Services {
  const s = useContext(Ctx);
  if (!s) throw new Error("useServices outside AppServicesProvider");
  return s;
}
