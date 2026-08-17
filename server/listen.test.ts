import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import express from "express";
import { listen } from "./listen.js";

describe("listen", () => {
  it("binds only to the loopback interface, on an OS-assigned port", async () => {
    const app = express();
    const server = await listen(app, 0);
    try {
      const address = server.address() as AddressInfo;
      expect(address.address).toBe("127.0.0.1");
    } finally {
      server.close();
    }
  });
});
