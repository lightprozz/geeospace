export type SourceResult<T> =
  | { status: "ready"; data: T; observedAt: string }
  | { status: "unavailable"; reason: "timeout" | "failed"; observedAt: string };

/** Read-only/idempotent sources only. Adapters must pass the signal to fetch.
 * Cancellation cannot undo a mutation; writes need receipt/idempotency contracts. */
export async function loadReadOnlySource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<SourceResult<T>> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("Invalid timeout");
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("Source timeout")); }, timeoutMs);
  });
  try {
    const data = await Promise.race([Promise.resolve().then(() => load(controller.signal)), deadline]);
    return { status: "ready", data, observedAt: new Date().toISOString() };
  } catch {
    return { status: "unavailable", reason: controller.signal.aborted ? "timeout" : "failed", observedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timer);
  }
}
