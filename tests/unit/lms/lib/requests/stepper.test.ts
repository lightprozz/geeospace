// ---------------------------------------------------------------------------
// lib/requests/stepper.test.ts
// Pins the stepper's state derivation against the SERVER's real transitions
// (see RequestFormService.cs). The regressions these guard against are not
// hypothetical: an index-only rule paints a REJECTED step green, and a
// stageStatus-only rule paints a REJECTED FINAL step green too, because the
// server records both an approval and a rejection of the last step as
// `stageStatus = Done(4)`.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"

import { RequestFormStatus, WorkFlowStatus, type StepDto } from "@/features/lms/types/request"

import { deriveStepStates, type StepState } from "@/features/lms/lib/requests/stepper"

// --- builders ---------------------------------------------------------------

let counter = 0

function makeStep(overrides: Partial<StepDto> = {}): StepDto {
  counter += 1
  return {
    id: `step-${counter}`,
    processName: `Step ${counter}`,
    description: null,
    processOrder: counter,
    processStatus: WorkFlowStatus.Processing,
    processAction: 0,
    typeApprovalId: 0,
    stageStatus: null,
    needToDo: false,
    worklogTemplateId: null,
    processById: null,
    processByName: null,
    processAt: null,
    workLogById: null,
    workLogByName: null,
    workLogAt: null,
    note: null,
    approvers: [],
    ...overrides,
  }
}

function states(
  steps: StepDto[],
  currentStepIndex: number,
  formStatus: number
): StepState[] {
  return deriveStepStates(steps, currentStepIndex, formStatus).map(
    (info) => info.state
  )
}

function actorOf(
  steps: StepDto[],
  currentStepIndex: number,
  formStatus: number,
  index: number
): string | null {
  return deriveStepStates(steps, currentStepIndex, formStatus)[index].actor
}

// --- tests ------------------------------------------------------------------

describe("deriveStepStates", () => {
  it("marks approved steps completed and the ones ahead pending", () => {
    const steps = [
      makeStep({ stageStatus: WorkFlowStatus.Solve, processByName: "A" }),
      makeStep({ stageStatus: WorkFlowStatus.Processing }),
      makeStep(),
    ]

    expect(states(steps, 1, RequestFormStatus.Processing)).toEqual([
      "completed",
      "current",
      "pending",
    ])
  })

  it("marks a routing denial rejected and keeps the request in flight", () => {
    // A deny on a step that defines nextProcessIfDeniedId keeps the request
    // alive: the denied step is Denied(3) and a NEW workflow row is created
    // for the step it routes back to.
    const steps = [
      makeStep({ stageStatus: WorkFlowStatus.Solve, processByName: "A" }),
      makeStep({ stageStatus: WorkFlowStatus.Denied, processByName: "B" }),
      makeStep({ stageStatus: WorkFlowStatus.Processing }),
    ]

    expect(states(steps, 2, RequestFormStatus.Processing)).toEqual([
      "completed",
      "denied",
      "current",
    ])
  })

  it("marks a terminal denial rejected even on the final step", () => {
    // THE TRAP: a deny on the last step records stageStatus = Done(4) — the
    // same value an approval records — and only the request's formStatus
    // (DoneDenied) reveals that it was a rejection.
    const steps = [
      makeStep({ stageStatus: WorkFlowStatus.Solve, processByName: "A" }),
      makeStep({ stageStatus: WorkFlowStatus.Done, processByName: "B" }),
    ]

    expect(states(steps, -1, RequestFormStatus.DoneDenied)).toEqual([
      "completed",
      "denied",
    ])
  })

  it("marks a final approval completed", () => {
    const steps = [
      makeStep({ stageStatus: WorkFlowStatus.Solve, processByName: "A" }),
      makeStep({ stageStatus: WorkFlowStatus.Done, processByName: "B" }),
    ]

    expect(states(steps, -1, RequestFormStatus.DoneApproved)).toEqual([
      "completed",
      "completed",
    ])
  })

  it("keeps the live step current while the request is in flight", () => {
    const steps = [
      makeStep({ stageStatus: WorkFlowStatus.Solve, processByName: "A" }),
      makeStep({ stageStatus: WorkFlowStatus.Processing }),
      makeStep(),
    ]

    expect(states(steps, 1, RequestFormStatus.Processing)).toEqual([
      "completed",
      "current",
      "pending",
    ])
  })

  it("treats a brand new request's first step as current", () => {
    const steps = [makeStep({ stageStatus: WorkFlowStatus.Processing }), makeStep()]

    expect(states(steps, 0, RequestFormStatus.New)).toEqual([
      "current",
      "pending",
    ])
  })

  it("has no current step once the request reached a terminal status", () => {
    const steps = [
      makeStep({ stageStatus: WorkFlowStatus.Solve, processByName: "A" }),
      makeStep({ stageStatus: WorkFlowStatus.Processing }),
    ]

    expect(states(steps, 1, RequestFormStatus.Closed)).toEqual([
      "completed",
      "pending",
    ])
    expect(states(steps, 1, RequestFormStatus.Expired)).toEqual([
      "completed",
      "pending",
    ])
  })

  it("has no current step when currentStepIndex is -1", () => {
    const steps = [makeStep(), makeStep({ stageStatus: WorkFlowStatus.Processing })]

    expect(states(steps, -1, RequestFormStatus.Processing)).toEqual([
      "pending",
      "current",
    ])
  })

  it("falls back to currentStepIndex when a step has no stage status", () => {
    const steps = [makeStep(), makeStep()]

    expect(states(steps, 1, RequestFormStatus.Processing)).toEqual([
      "pending",
      "current",
    ])
  })

  it("names the person who decided a decided step", () => {
    const steps = [
      makeStep({ stageStatus: WorkFlowStatus.Solve, processByName: "A" }),
      makeStep({ stageStatus: WorkFlowStatus.Denied, processByName: "B" }),
    ]

    const result = deriveStepStates(steps, -1, RequestFormStatus.DoneDenied)
    expect(result[0].actor).toBe("A")
    expect(result[1].actor).toBe("B")
  })

  it("names the approvers of an undecided step", () => {
    const steps = [
      makeStep({
        stageStatus: WorkFlowStatus.Processing,
        approvers: [
          { id: "u1", fullName: "A", email: null },
          { id: "u2", fullName: "B", email: null },
        ],
      }),
    ]

    expect(actorOf(steps, 0, RequestFormStatus.Processing, 0)).toBe("A, B")
  })

  it("falls back to no actor when nobody is known", () => {
    const steps = [makeStep({ stageStatus: WorkFlowStatus.Processing })]

    expect(actorOf(steps, 0, RequestFormStatus.Processing, 0)).toBeNull()
  })
})
