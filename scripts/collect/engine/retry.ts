export type RetryOptions = {
  retries: number;
  baseDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Retries `fn` with exponential backoff. Throws the last error once retries are exhausted. */
export async function withRetries<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < options.retries) {
        await sleep(options.baseDelayMs * 2 ** attempt);
      }
    }
  }

  throw lastError;
}
