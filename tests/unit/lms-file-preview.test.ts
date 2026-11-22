// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { FilePreview } from "@/features/lms/materials/_components/file-preview";
import { MaterialPreviewDialog } from "@/features/lms/materials/_components/material-preview-dialog";
import { getValidToken } from "@/lib/auth/token";

vi.mock("@/lib/env", () => ({ API_URL: "https://api.geeo.test" }));
vi.mock("@/lib/auth/token", () => ({ getValidToken: vi.fn(async () => "mock-access") }));
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["test"]) })));
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:preview");
    static revokeObjectURL = vi.fn();
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it("authenticates files on the configured API origin", async () => {
  render(h(FilePreview, { url: "https://api.geeo.test/file", name: "image.png" }));
  await screen.findByTitle("Preview: image.png");
  expect(fetch).toHaveBeenCalledWith("https://api.geeo.test/file", expect.objectContaining({ redirect: "error", headers: { Authorization: "Bearer mock-access" } }));
});
it.each(["https://external.test/file", ""]) ("rejects untrusted or empty URL %s before requesting a token", async (url) => {
  render(h(FilePreview, { url, name: "file.pdf" }));
  await screen.findByRole("alert");
  expect(getValidToken).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("reports API fetch failures", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  render(h(FilePreview, { url: "https://api.geeo.test/file", name: "file.pdf" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Unable to load preview");
});
it("never authenticates VideoLink previews even with a filename", async () => {
  render(h(MaterialPreviewDialog, { open: true, onClose: vi.fn(), material: { id: "video", name: "Video", materialFormat: 4, fileName: "video.pdf", url: "https://external.test/video", description: null, materialFormatText: "Video", materialCategories: "", approved: true, teacherId: null, teacherName: null } }));
  await waitFor(() => expect(screen.getByTitle("Preview: Video").getAttribute("src")).toBe("https://external.test/video"));
  expect(fetch).not.toHaveBeenCalled();
  expect(getValidToken).not.toHaveBeenCalled();
});
