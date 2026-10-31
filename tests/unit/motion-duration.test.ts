import { expect, it } from "vitest";
import { durationInMilliseconds } from "@/lib/desktop/motion";

it("preserves timing when production CSS converts milliseconds to seconds", () => {
  expect(durationInMilliseconds("400ms", 120)).toBe(400);
  expect(durationInMilliseconds(" .4s ", 120)).toBe(400);
  expect(durationInMilliseconds("0.16s", 120)).toBe(160);
  expect(durationInMilliseconds("0s", 120)).toBe(0);
  expect(durationInMilliseconds("invalid", 120)).toBe(120);
});
