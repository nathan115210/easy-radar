/**
 * Enforces a hard timeout via Promise.race, so a slow or hanging adapter
 * can't stall the run even if it never checks the AbortSignal itself.
 * Cooperative adapters can still use the signal to cancel their own
 * in-flight fetch as soon as the timeout fires.
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;

  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(controller.signal), timedOut]);
  } finally {
    clearTimeout(timer!);
  }
}
