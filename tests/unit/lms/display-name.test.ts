import { expect, it } from "vitest";
import { shortenName } from "@/features/lms/lib/attendance/display-name";

it("preserves short names and abbreviates only middle words in long names", () => {
  expect(shortenName("  Tran Minh Anh  ")).toBe("Tran Minh Anh");
  expect(shortenName("Nguyễn Phạm Nhật Vượng")).toBe("Nguyễn P. N. Vượng");
  expect(shortenName("Tran   Minh   Anh", 5)).toBe("Tran M. Anh");
  expect(shortenName("A Verylongsurname", 3)).toBe("A Verylongsurname");
});
it("accepts missing, empty and whitespace-only names", () => {
  for (const name of [null, undefined, "", "   "]) expect(shortenName(name)).toBe("");
});
