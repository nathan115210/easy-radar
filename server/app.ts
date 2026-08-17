import express, { type Express, type NextFunction, type Request, type Response } from "express";
import {
  sources as realSources,
  referenceSources as realReferenceSources,
} from "../config/sources/index.js";
import {
  NewsQuerySchema,
  SetNewsStateRequestSchema,
  type ReferenceSource,
  type SourceConfig,
} from "../shared/schemas/index.js";
import { getCollectionStatusSummary } from "./queries/collection-status-query.js";
import { getNewsPage } from "./queries/news-query.js";
import { getSourcesGroupedByCategory } from "./queries/sources-query.js";
import { setNewsState } from "./mutations/set-news-state.js";
import { finishReading } from "./mutations/finish-reading.js";
import { defaultWorktreeDir } from "./storage/paths.js";

export type CreateAppOptions = {
  dataDir: string;
  /** The git worktree root `dataDir` lives inside (PRD §15.1); defaults to `.data`. */
  worktreeDir?: string;
  now?: () => Date;
  /** Defaults to the real config/sources module; overridable for tests. */
  sources?: readonly SourceConfig[];
  referenceSources?: readonly ReferenceSource[];
};

/**
 * The local Express + Zod server (PRD §14.3): three read endpoints and two
 * mutations (reading state, finish reading), all request/response shapes
 * validated against shared/schemas/api.ts. No database, no auth layer, no
 * arbitrary shell execution — every route reads through server/storage
 * (#6), which is the only path that touches the `.data/` worktree's data
 * files; `POST /api/finish-reading` additionally drives #20's
 * git-workflow scripts to commit and push that worktree.
 */
export function createApp(options: CreateAppOptions): Express {
  const now = options.now ?? ((): Date => new Date());
  const sources = options.sources ?? realSources;
  const referenceSources = options.referenceSources ?? realReferenceSources;
  const worktreeDir = options.worktreeDir ?? defaultWorktreeDir();

  const app = express();
  app.use(express.json());

  // Process-lifetime only, not persisted (see SetNewsStateResponseSchema's
  // doc comment for what this does and doesn't track).
  let hasUncommittedChanges = false;

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

  app.patch("/api/news/:id/state", async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const parsed = SetNewsStateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid state value", details: parsed.error.issues });
      return;
    }

    const outcome = await setNewsState(options.dataDir, id, parsed.data.state, now());
    if (!outcome.found) {
      res.status(404).json({ error: `No active news item with id "${id}"` });
      return;
    }

    hasUncommittedChanges = true;
    res.json({ id, state: parsed.data.state, hasUncommittedChanges });
  });

  app.post("/api/finish-reading", async (_req: Request, res: Response) => {
    const outcome = await finishReading(worktreeDir, options.dataDir, now());

    if (outcome.outcome === "invalid") {
      res.status(422).json({ error: outcome.message });
      return;
    }
    if (outcome.outcome === "diverged") {
      res.status(409).json({ error: outcome.message });
      return;
    }
    if (outcome.outcome === "push-aborted") {
      res.status(502).json({ error: outcome.message });
      return;
    }

    hasUncommittedChanges = false;
    res.json({ committed: outcome.committed, pushed: outcome.pushed, hasUncommittedChanges });
  });

  // Express 5 forwards a rejected promise from any async handler above to
  // this error middleware automatically — no manual try/catch needed there.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
