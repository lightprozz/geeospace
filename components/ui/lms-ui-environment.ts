export function resolveLmsPortalContainer(element: Element | null): Element | undefined {
  return element?.closest(".geeospace-os") ?? element?.ownerDocument.body ?? (typeof document === "undefined" ? undefined : document.body);
}

export function readLmsTheme(container: Element | undefined): "light" | "dark" {
  return container?.closest(".geeospace-os")?.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function observeLmsTheme(container: Element | undefined, notify: () => void) {
  const root = container?.closest(".geeospace-os");
  if (!root) return () => {};
  const observer = new MutationObserver(notify);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
