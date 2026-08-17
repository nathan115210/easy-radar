import type { z } from "zod";
import { vi } from "vitest";

/**
 * Builds a `Response` whose body is validated against the same Zod schema
 * the real client parses it with (issue #31's "fixtures cannot drift from
 * the real contract" requirement) — an invalid fixture throws at test-setup
 * time instead of silently producing a response the component would never
 * actually receive from the real server.
 */
export function jsonResponse<Schema extends z.ZodType>(
  schema: Schema,
  data: z.infer<Schema>,
  init?: ResponseInit,
): Response {
  const parsed: unknown = schema.parse(data);
  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

export function errorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export type FetchRoute = (input: string, init: RequestInit | undefined) => Response | undefined;

/**
 * Installs `global.fetch` as a router over a list of handlers, tried in
 * order; the first handler to return a `Response` (rather than `undefined`)
 * wins. Restored per-test by the caller (`vi.unstubAllGlobals` in an
 * `afterEach`, or letting `vi.stubGlobal` in the next test overwrite it).
 */
export function installFetchMock(...routes: FetchRoute[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const route of routes) {
      const response = route(url, init);
      if (response) return Promise.resolve(response);
    }
    throw new Error(`No mock route matched fetch("${url}")`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
