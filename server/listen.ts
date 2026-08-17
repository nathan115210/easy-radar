import type { Server } from "node:http";
import type { Express } from "express";

const LOOPBACK_HOST = "127.0.0.1";

/**
 * Binds to the loopback interface only (PRD §14.3). There is deliberately
 * no `host` parameter — a caller cannot ask this to bind anywhere else,
 * not even via an environment variable.
 */
export function listen(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, LOOPBACK_HOST, () => {
      resolve(server);
    });
    server.once("error", reject);
  });
}
