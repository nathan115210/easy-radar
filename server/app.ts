import express, { type Express, type NextFunction, type Request, type Response } from "express";
import {
  sources as realSources,
  referenceSources as realReferenceSources,
} from "../config/sources/index.js";
import {
  NewsQuerySchema,
  type ReferenceSource,
  type SourceConfig,
} from "../shared/schemas/index.js";
import { getCollectionStatusSummary } from "./queries/collection-status-query.js";
import { getNewsPage } from "./queries/news-query.js";
import { getSourcesGroupedByCategory } from "./queries/sources-query.js";

export type CreateAppOptions = {
  dataDir: string;
  now?: () => Date;
  /** Defaults to the real config/sources module; overridable for tests. */
  sources?: readonly SourceConfig[];
  referenceSources?: readonly ReferenceSource[];
};

/**
 * The local Express + Zod server (PRD §14.3): three read endpoints, all
 * request/response shapes validated against shared/schemas/api.ts. No
 * database, no auth layer, no arbitrary shell execution — every route
 * reads through server/storage (#6), which is the only path that touches
 * the `.data/` worktree.
 */
export function createApp(options: CreateAppOptions): Express {
  const now = options.now ?? ((): Date => new Date());
  const sources = options.sources ?? realSources;
  const referenceSources = options.referenceSources ?? realReferenceSources;

  const app = express();

  app.get("/api/news", async (req: Request, res: Response) => {
    const parsed = NewsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query", details: parsed.error.issues });
      return;
    }
    const page = await getNewsPage(options.dataDir, parsed.data);
    res.json(page);
  });

  app.get("/api/sources", async (_req: Request, res: Response) => {
    const categories = await getSourcesGroupedByCategory(
      options.dataDir,
      sources,
      referenceSources,
    );
    res.json({ categories });
  });

  app.get("/api/collection-status", async (_req: Request, res: Response) => {
    const summary = await getCollectionStatusSummary(options.dataDir, now());
    res.json(summary);
  });

  // Express 5 forwards a rejected promise from any async handler above to
  // this error middleware automatically — no manual try/catch needed there.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
