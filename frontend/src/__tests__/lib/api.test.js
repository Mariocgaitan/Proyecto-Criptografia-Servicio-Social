import { apiUrl, fetchWithAuth, formatApiError } from "@/lib/api";

beforeEach(() => {
  vi.restoreAllMocks();
  // Reset window.location so redirect tests work cleanly
  delete window.location;
  window.location = { href: "" };
});

// ---------------------------------------------------------------------------
// apiUrl
// ---------------------------------------------------------------------------
describe("apiUrl", () => {
  it("prepends base URL to path", () => {
    // VITE_API_BASE_URL is "" in test env, so result is just the path
    expect(apiUrl("/api/v1/test")).toBe("/api/v1/test");
  });

  it("adds leading slash if missing", () => {
    expect(apiUrl("api/v1/test")).toBe("/api/v1/test");
  });
});

// ---------------------------------------------------------------------------
// fetchWithAuth
// ---------------------------------------------------------------------------
describe("fetchWithAuth", () => {
  it("returns response on success", async () => {
    const mockResponse = { ok: true, status: 200 };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await fetchWithAuth("/api/v1/some-endpoint");

    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 401 after successful refresh", async () => {
    const unauthorizedResponse = { ok: false, status: 401 };
    const refreshResponse = { ok: true, status: 200 };
    const retryResponse = { ok: true, status: 200 };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(unauthorizedResponse) // original request → 401
      .mockResolvedValueOnce(refreshResponse)       // POST /auth/refresh → 200
      .mockResolvedValueOnce(retryResponse);        // retry original → 200

    const result = await fetchWithAuth("/api/v1/some-endpoint");

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toBe(retryResponse);
  });

  it("redirects to /login?expired=true on failed refresh", async () => {
    const unauthorizedResponse = { ok: false, status: 401 };
    const failedRefreshResponse = { ok: false, status: 401 };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(unauthorizedResponse)  // original request → 401
      .mockResolvedValueOnce(failedRefreshResponse); // POST /auth/refresh → 401

    await fetchWithAuth("/api/v1/some-endpoint");

    expect(window.location.href).toBe("/login?expired=true");
  });
});

// ---------------------------------------------------------------------------
// formatApiError
// ---------------------------------------------------------------------------
describe("formatApiError", () => {
  it("extracts detail from JSON response", async () => {
    const mockResponse = {
      status: 400,
      headers: { get: () => null },
      json: vi.fn().mockResolvedValue({ detail: "Bad input" }),
    };

    const message = await formatApiError(mockResponse);
    expect(message).toBe("Bad input");
  });

  it("includes request ID for 500 errors", async () => {
    const requestId = "abc12345-0000-0000-0000-000000000000";
    const mockResponse = {
      status: 500,
      headers: { get: (header) => (header === "X-Request-ID" ? requestId : null) },
      json: vi.fn().mockResolvedValue({ detail: "Internal error" }),
    };

    const message = await formatApiError(mockResponse);
    expect(message).toContain("ref: abc12345");
  });

  it("uses fallback when JSON parsing fails", async () => {
    const mockResponse = {
      status: 400,
      headers: { get: () => null },
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    };

    const fallback = "Something went wrong";
    const message = await formatApiError(mockResponse, fallback);
    expect(message).toBe(fallback);
  });
});
