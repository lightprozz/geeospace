import { expect, it } from "vitest";
import { parseAssignedCampuses } from "@/features/lms/types/user";

it("ignores unnamed lookups and prefers a complete match over a longer prefix", () => {
  expect(parseAssignedCampuses("A, B, C", [null, "A, B", "A", "B, C", ""])).toEqual({
    kind: "names",
    values: ["A", "B, C"],
    needsReview: false,
  });
});

it("marks multiple complete legacy matches for review, but accepts explicit IDs", () => {
  const names = ["Austin", "TX", "Austin, TX"];
  const assignment = parseAssignedCampuses("Austin, TX", names);
  expect(assignment.needsReview).toBe(true);
  expect(new Set(assignment.values)).toEqual(new Set(names));
  expect(parseAssignedCampuses('["austin","tx"]', names)).toEqual({ kind: "ids", values: ["austin", "tx"], needsReview: false });
});

it("retains a legacy name missing from the lookup without treating it as a resolved assignment", () => {
  expect(parseAssignedCampuses("North, Closed Campus", ["North"])).toEqual({
    kind: "names",
    values: ["North", "Closed Campus"],
    needsReview: true,
  });
});

it("prefers an exact campus name but does not guess between equally matching lookups", () => {
  const names = ["West Campus", "WEST CAMPUS"];
  expect(parseAssignedCampuses("West Campus", names)).toEqual({
    kind: "names",
    values: ["West Campus"],
    needsReview: false,
  });
  expect(parseAssignedCampuses("west campus", names).needsReview).toBe(true);
  expect(parseAssignedCampuses("West Campus", ["West Campus", "West Campus"]).needsReview).toBe(true);
  expect(parseAssignedCampuses("west campus", ["West Campus"]).values).toEqual(["West Campus"]);
});
