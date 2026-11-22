export type RequestsRoute =
  | { screen: "inbox" }
  | { screen: "new" }
  | { screen: "submit"; templateId: string }
  | { screen: "detail"; id: string }
  | { screen: "not-found" }

export function resolveRequestsRoute(path: string): RequestsRoute {
  const segments = path.split("?")[0].replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
  if (!segments.length) return { screen: "inbox" }
  if (segments[0] === "new") {
    if (segments.length === 1) return { screen: "new" }
    if (segments.length === 2) return { screen: "submit", templateId: segments[1] }
  } else if (segments.length === 1) {
    return { screen: "detail", id: segments[0] }
  }
  return { screen: "not-found" }
}
