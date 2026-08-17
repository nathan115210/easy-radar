/**
 * Runs `worker` over `items` with at most `limit` in flight at once,
 * preserving output order regardless of completion order. A worker
 * rejecting does not cancel the others — that's the caller's job (each
 * source's runtime failure is isolated at the call site, PRD §11.2).
 */
export async function runWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex++;
    if (index >= items.length) {
      return;
    }
    results[index] = await worker(items[index] as T);
    await runNext();
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runNext()));

  return results;
}
