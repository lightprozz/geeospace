import { QueryClient, useQuery } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { useClassListForHolidays } from "@/features/lms/hooks/holidays/use-holidays";
import { classKeys } from "@/features/lms/lib/classes/query-keys";
import { configureLmsTransport } from "@/features/lms/lib/transport";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: vi.fn(),
}));

it("allows holiday exceptions for active classes past the first page", async () => {
  const active = Array.from({ length: 24 }, (_, i) => ({ id: `class-${i + 1}` }));
  const request = vi.fn().mockResolvedValue(active);
  const cleanup = configureLmsTransport({ request, resolveUrl: (path) => path });
  const client = new QueryClient();
  try {
    useClassListForHolidays("");
    expect(useQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));

    useClassListForHolidays("staff-id");
    const options = vi.mocked(useQuery).mock.lastCall?.[0];
    expect(options).toMatchObject({ queryKey: classKeys.listAll(0), enabled: true });
    await expect(client.fetchQuery(options!)).resolves.toEqual(active);
    expect(request).toHaveBeenCalledWith("/api/v2/class/classes/all?includeFinished=false", {
      method: "GET",
    });
  } finally {
    client.clear();
    cleanup();
  }
});
