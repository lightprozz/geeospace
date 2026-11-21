import { afterEach, expect, it, vi } from "vitest";
import { observeLmsTheme, readLmsTheme, resolveLmsPortalContainer } from "@/components/ui/lms-ui-environment";

afterEach(() => vi.unstubAllGlobals());

it("resolves the nearest OS root, falling back to the owning body and handling SSR", () => {
  const root = {} as Element, body = {} as HTMLElement;
  const closest = vi.fn(() => root);
  const element = { closest, ownerDocument: { body } } as unknown as Element;
  expect(resolveLmsPortalContainer(element)).toBe(root);
  expect(closest).toHaveBeenCalledWith(".geeospace-os");
  closest.mockReturnValue(null as unknown as Element);
  expect(resolveLmsPortalContainer(element)).toBe(body);
  expect(resolveLmsPortalContainer(null)).toBeUndefined();
  vi.stubGlobal("document", { body });
  expect(resolveLmsPortalContainer(null)).toBe(body);
});

it("reads explicit root themes, never system preference or unrelated attributes", () => {
  let theme: string | null = "dark";
  const root = { getAttribute: () => theme };
  const element = { closest: () => root } as unknown as Element;
  expect(readLmsTheme(element)).toBe("dark");
  for (const value of ["light", "system", "invalid", null]) {
    theme = value;
    expect(readLmsTheme(element)).toBe("light");
  }
  expect(readLmsTheme(undefined)).toBe("light");
  expect(readLmsTheme({ closest: () => null } as unknown as Element)).toBe("light");
});

it("observes root theme changes and disconnects on cleanup", () => {
  const observe = vi.fn(), disconnect = vi.fn(), notify = vi.fn();
  let callback: (() => void) | undefined;
  vi.stubGlobal("MutationObserver", class {
    constructor(fn: () => void) { callback = fn; }
    observe = observe;
    disconnect = disconnect;
  });
  const root = {};
  const cleanup = observeLmsTheme({ closest: () => root } as unknown as Element, notify);
  expect(observe).toHaveBeenCalledWith(root, { attributes: true, attributeFilter: ["data-theme"] });
  callback!();
  expect(notify).toHaveBeenCalledOnce();
  cleanup();
  expect(disconnect).toHaveBeenCalledOnce();
  observeLmsTheme(undefined, notify)();
});
