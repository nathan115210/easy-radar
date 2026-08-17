import {
  DataBranchDivergedError,
  GitPushAbortedError,
  finishDataBranchWrite,
} from "../git-workflow/index.js";
import { runCollectPipeline, type CollectPipelineOptions } from "../collect/pipeline.js";

export type CollectAndPushOptions = CollectPipelineOptions & {
  /** The git worktree root `dataDir` lives inside (PRD §15.1). */
  worktreeDir: string;
};

export type CollectAndPushResult =
  | { outcome: "config-invalid"; summary: string }
  | { outcome: "rejected"; summary: string; rejection: { reason: string; detail: string } }
  | { outcome: "diverged"; summary: string; message: string }
  | { outcome: "push-aborted"; summary: string; message: string }
  | { outcome: "pushed"; summary: string; committed: boolean; pushed: boolean };

/**
 * The one function both the AGY Skill (#34) and a human running `pnpm
 * collect` by hand can share for "collect, then commit and push" — it
 * calls #12's `runCollectPipeline` exactly as-is (no reimplemented
 * collector) and, only if that produced something to write, hands off to
 * #20's `finishDataBranchWrite` for the git side. A config-invalid run or
 * a guard/validation rejection never reaches git at all — there is
 * nothing to commit, and PRD §18.5 step 7b already means "no data write"
 * covers that case. A diverged branch or a push rejection surviving its
 * retry is reported back rather than resolved automatically, matching
 * PRD §16's fail-closed rule and the Skill's "stop and report, don't fix"
 * contract.
 */
export async function collectAndPush(
  options: CollectAndPushOptions,
): Promise<CollectAndPushResult> {
  const collectResult = await runCollectPipeline(options);

  if (!collectResult.wroteDataFiles) {
    if (collectResult.rejection) {
      return {
        outcome: "rejected",
        summary: collectResult.summary,
        rejection: collectResult.rejection,
      };
    }
    return { outcome: "config-invalid", summary: collectResult.summary };
  }

  const now = options.now ?? ((): Date => new Date());
  try {
    const pushResult = await finishDataBranchWrite(
      options.worktreeDir,
      `Collect: ${now().toISOString()}`,
    );
    return {
      outcome: "pushed",
      summary: collectResult.summary,
      committed: pushResult.committed,
      pushed: pushResult.pushed,
    };
  } catch (error) {
    if (error instanceof DataBranchDivergedError) {
      return { outcome: "diverged", summary: collectResult.summary, message: error.message };
    }
    if (error instanceof GitPushAbortedError) {
      return { outcome: "push-aborted", summary: collectResult.summary, message: error.message };
    }
    throw error;
  }
}
