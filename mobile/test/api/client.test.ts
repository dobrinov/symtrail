import { ApiClient } from "../../src/api/client";

function mockFetch(status: number, body: unknown): typeof fetch {
  return jest.fn(async () => new Response(JSON.stringify(body), { status })) as never;
}

test("signup posts credentials and returns account + token", async () => {
  const f = mockFetch(201, { account: { id: 1, email: "a@b.com", settings: { temp_unit: "c" } }, token: "tok" });
  const api = new ApiClient("http://x", () => null, f);
  const res = await api.signup("a@b.com", "secret123", "iPhone");
  expect(res.token).toBe("tok");
  const [url, init] = (f as jest.Mock).mock.calls[0];
  expect(url).toBe("http://x/api/v1/auth/signup");
  expect(JSON.parse(init.body)).toEqual({ email: "a@b.com", password: "secret123", device_name: "iPhone" });
});

test("authorized calls send the bearer token", async () => {
  const f = mockFetch(200, { changes: {}, cursor: 5 });
  const api = new ApiClient("http://x", () => "tok", f);
  await api.syncPull(0);
  const [url, init] = (f as jest.Mock).mock.calls[0];
  expect(url).toBe("http://x/api/v1/sync/pull?since=0");
  expect(init.headers["Authorization"]).toBe("Bearer tok");
});

test("error envelope becomes a typed ApiError", async () => {
  const f = mockFetch(401, { error: { code: "invalid_credentials", message: "Invalid email or password" } });
  const api = new ApiClient("http://x", () => null, f);
  await expect(api.signin("a@b.com", "bad")).rejects.toMatchObject({ code: "invalid_credentials", status: 401 });
});

test("network failure throws ApiError with code network_error", async () => {
  const f = jest.fn(async () => { throw new TypeError("Network request failed"); }) as never;
  const api = new ApiClient("http://x", () => null, f);
  await expect(api.signin("a@b.com", "x")).rejects.toMatchObject({ code: "network_error" });
});

test("204 responses resolve to undefined", async () => {
  const f = jest.fn(async () => new Response(null, { status: 204 })) as never;
  const api = new ApiClient("http://x", () => "tok", f);
  await expect(api.signout()).resolves.toBeUndefined();
});
