// ---------------------------------------------------------------------------
// lib/requests/stepper.ts
// Derives the request stepper's per-step state from the SERVER's own signals.
//
// WHY THIS EXISTS. The old stepper compared the step index against
// `currentStepIndex` alone, which cannot express a rejected step: a denied
// step is BEHIND the current one, so an index-only rule paints it "completed"
// and a reviewer sees a green tick on a step somebody rejected.
//
// THE SIGNALS. Per step the server sends `stageStatus` (the state of the
// step's own handle-workflow row) and `processByName` (who acted on it); the
// request sends `formStatus` and `currentStepIndex`. `processAction` /
// `processStatus` are copied from the TEMPLATE and are NOT mutated during the
// v1 runtime, so they cannot drive a live stepper — `stageStatus` is the only
// per-step live signal.
//
// ⚠️ THE FINAL-STEP DENIAL TRAP. A deny on the FINAL step sets
// `stageStatus = Done(4)` — the same value an approval sets — and the request
// ends `DoneDenied(4)`. So `stageStatus` alone cannot tell approval from
// rejection there; the REQUEST's `formStatus` is the only thing that can. See
// `RequestFormService.cs` (Solve branch → Done + DoneApproved; Denied branch
// on the last step → Done + DoneDenied).
//
// ⚠️ A DENY THAT ROUTES BACK. When the denied step defines
// `nextProcessIfDeniedId`, the request stays in flight: the denied step keeps
// `stageStatus = Denied(3)` and a NEW workflow row is created for the
// routed-back step with `stageStatus = Processing(1)`. The routed-back step
// is therefore 'current' even though it sits BEHIND the denied one in the
// step order — a pure index comparison would get this wrong too.
// ---------------------------------------------------------------------------

import {
  RequestFormStatus,
  WorkFlowStatus,
  type StepDto,
} from "@/features/lms/types/request"

/** The four states a step bubble can be in. */
export type StepState = "completed" | "denied" | "current" | "pending"

export interface StepStateInfo {
  state: StepState
  /**
   * Who acted on the step — `null` when nobody did.
   * A decided step names the person who decided it; an undecided step names
   * the people who can act on it.
   */
  actor: string | null
}

/**
 * True while the request is still in flight — a step can only be 'current'
 * then. A finished request (approved, denied, closed, expired) has no live
 * step, even though its last workflow row may still say `Processing`.
 */
function isInFlight(formStatus: number): boolean {
  return (
    formStatus === RequestFormStatus.New ||
    formStatus === RequestFormStatus.Processing
  )
}

/** The person who acted on a decided step. */
function decidedActor(step: StepDto): string | null {
  const name = step.processByName?.trim()
  return name ? name : null
}

/** The people who can act on an undecided step. */
function pendingActor(step: StepDto): string | null {
  const names = step.approvers
    .map((approver) => approver.fullName?.trim() ?? "")
    .filter((name) => name.length > 0)
  return names.length > 0 ? names.join(", ") : null
}

/**
 * Derive the state of every step, in the order given.
 *
 * `steps` must be the server's order (by `processOrder`) — the returned array
 * is index-aligned with it, so `result[i]` describes `steps[i]`.
 *
 * `currentStepIndex` is the server's own pointer at the step in flight. It is
 * a FALLBACK only: a step whose own `stageStatus` says `Processing` is
 * 'current' regardless of the index, because a routed-back denial moves the
 * live step behind the denied one.
 */
export function deriveStepStates(
  steps: StepDto[],
  currentStepIndex: number,
  formStatus: number
): StepStateInfo[] {
  const live = isInFlight(formStatus)

  return steps.map((step, index) => {
    const stage = step.stageStatus ?? null

    // ── Decided steps ────────────────────────────────────────────────
    if (stage === WorkFlowStatus.Done) {
      // Done(4) is BOTH "the last step was approved" and "the last step was
      // denied". Only the request's own status separates them.
      const denied = formStatus === RequestFormStatus.DoneDenied
      return {
        state: denied ? "denied" : "completed",
        actor: decidedActor(step),
      }
    }

    if (stage === WorkFlowStatus.Denied) {
      return { state: "denied", actor: decidedActor(step) }
    }

    if (stage === WorkFlowStatus.Solve) {
      return { state: "completed", actor: decidedActor(step) }
    }

    // ── Undecided steps ───────────────────────────────────────────────
    if (stage === WorkFlowStatus.Expired) {
      // The request expired under this step: it was never decided.
      return { state: "pending", actor: pendingActor(step) }
    }

    if (
      live &&
      (stage === WorkFlowStatus.Processing || index === currentStepIndex)
    ) {
      return { state: "current", actor: pendingActor(step) }
    }

    return { state: "pending", actor: pendingActor(step) }
  })
}
