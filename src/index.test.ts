import { describe, expect, test, mock } from "bun:test";
import worker, { generateShortCode } from "./index";

describe("Short URL Generator", () => {
  test("generateShortCode creates a string of correct length", () => {
    const code = generateShortCode(6);
    expect(code).toBeString();
    expect(code.length).toBe(6);
  });

  test("generateShortCode creates unique codes", () => {
    const code1 = generateShortCode();
    const code2 = generateShortCode();
    expect(code1).not.toBe(code2);
  });

  const mockEnv = {
    SHORT_URLS: {
      put: mock(async () => {}),
      get: mock(async (key: string) => {
        if (key === "testcode") return "https://example.com";
        if (key === "jsoncode") return JSON.stringify({ url: "https://example.org", createdAt: "2023-01-01" });
        return null;
      }),
    },
  };

  test("POST /api/shorten returns a short code", async () => {
    const request = new Request("http://localhost/api/shorten", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });

    const response = await worker.fetch(request, mockEnv as any, {} as any);
    expect(response.status).toBe(201);
    
    const body = await response.json();
    expect(body).toHaveProperty("code");
    expect(body).toHaveProperty("shortUrl");
    expect(body.shortUrl).toInclude(body.code);
  });

  test("GET /:code redirects to original URL", async () => {
    const request = new Request("http://localhost/testcode");
    const response = await worker.fetch(request, mockEnv as any, {} as any);
    
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://example.com");
  });

  test("GET /:code returns 404 for unknown code", async () => {
    const request = new Request("http://localhost/unknown");
    const response = await worker.fetch(request, mockEnv as any, {} as any);
    
    expect(response.status).toBe(404);
  });

  test("GET /:code handles JSON stored values", async () => {
    const request = new Request("http://localhost/jsoncode");
    const response = await worker.fetch(request, mockEnv as any, {} as any);
    
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://example.org");
  });
});
