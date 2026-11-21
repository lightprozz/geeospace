import { expect, it } from "vitest";
import { parseAssignedCampuses } from "@/features/lms/types/user";

it("ignores unnamed lookups and prefers a complete match over a longer prefix", () => {
  expect(parseAssignedCampuses("A, B, C", [null, "A, B", "A", "B, C", ""])).toEqual({
    values: ["A", "B, C"],
    needsReview: false,
  });
});

it("marks multiple complete legacy matches for review, but accepts explicit IDs", () => {
  const names = ["Austin", "TX", "Austin, TX"];
  const assignment = parseAssignedCampuses("Austin, TX", names);
  expect(assignment.needsReview).toBe(true);
  expect(new Set(assignment.values)).toEqual(new Set(names));
  expect(parseAssignedCampuses('["austin","tx"]', names)).toEqual({ values: ["austin", "tx"], needsReview: false });
});

it("retains a legacy name missing from the lookup without treating it as a resolved assignment", () => {
  expect(parseAssignedCampuses("North, Closed Campus", ["North"])).toEqual({
    values: ["North", "Closed Campus"],
    needsReview: true,
  });
});
