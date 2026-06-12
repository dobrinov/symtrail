import { AuthResponse, PullResponse, PushChanges, PushResponse, AccountJson } from "./types";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export class ApiClient {
  constructor(
    private baseUrl: string,
    private getToken: () => string | null,
    private fetchFn: typeof fetch = fetch,
  ) {}

  signup(email: string, password: string, deviceName?: string): Promise<AuthResponse> {
    return this.req("POST", "/api/v1/auth/signup", { email, password, device_name: deviceName });
  }
  signin(email: string, password: string, deviceName?: string): Promise<AuthResponse> {
    return this.req("POST", "/api/v1/auth/signin", { email, password, device_name: deviceName });
  }
  signinApple(identityToken: string, deviceName?: string): Promise<AuthResponse> {
    return this.req("POST", "/api/v1/auth/apple", { identity_token: identityToken, device_name: deviceName });
  }
  signout(): Promise<void> { return this.req("DELETE", "/api/v1/auth/session"); }
  requestPasswordReset(email: string): Promise<void> {
    return this.req("POST", "/api/v1/auth/password_reset", { email });
  }
  confirmPasswordReset(token: string, password: string): Promise<void> {
    return this.req("POST", "/api/v1/auth/password_reset/confirm", { token, password });
  }
  getAccount(): Promise<{ account: AccountJson }> { return this.req("GET", "/api/v1/account"); }
  updateSettings(settings: { temp_unit: "c" | "f" }): Promise<{ account: AccountJson }> {
    return this.req("PATCH", "/api/v1/account", { settings });
  }
  deleteAccount(): Promise<void> { return this.req("DELETE", "/api/v1/account"); }
  syncPull(since: number): Promise<PullResponse> { return this.req("GET", `/api/v1/sync/pull?since=${since}`); }
  syncPush(changes: PushChanges): Promise<PushResponse> { return this.req("POST", "/api/v1/sync/push", { changes }); }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError("network_error", "Could not reach the server", 0);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const code = json?.error?.code ?? "unknown_error";
      const message = json?.error?.message ?? `Request failed (${res.status})`;
      throw new ApiError(code, message, res.status);
    }
    return json as T;
  }
}
