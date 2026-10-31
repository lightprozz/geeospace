export type ConnectionState =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable"; retryable: boolean }
  | { status: "ready" };
