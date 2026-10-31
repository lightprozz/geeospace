export function problemResponse(status: number, code: string, title: string, retryable = [408, 429, 502, 503, 504].includes(status)) {
  const requestId = crypto.randomUUID();
  return Response.json(
    { type: "about:blank", title, status, code, requestId, retryable },
    { status, headers: {
      "Content-Type": "application/problem+json",
      "Cache-Control": "private, no-store",
      "X-Request-ID": requestId
    } }
  );
}
