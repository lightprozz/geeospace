'use client'
// ---------------------------------------------------------------------------
// _components/request-process-stepper.tsx
// Displays the request's approval workflow as a horizontal stepper.
//
// FOUR states per step: completed / denied / current / pending. The states are
// derived by `deriveStepStates` from the SERVER's own signals — an index-only
// comparison cannot tell a rejected step from an approved one, and the server
// records a rejection of the FINAL step under the same `stageStatus` as an
// approval. See `lib/requests/stepper.ts` for the full derivation.
// ---------------------------------------------------------------------------

import { Check, X } from "lucide-react"

import { deriveStepStates, type StepState } from "@/features/lms/lib/requests/stepper"
import { cn } from "@/lib/utils"
import type { StepDto } from "@/features/lms/types/request"

/** The accessible reading of each state. */
const STATE_LABEL: Record<StepState, string> = {
  completed: "completed",
  denied: "rejected",
  current: "in progress",
  pending: "not started",
}

interface RequestProcessStepperProps {
  processes: StepDto[]
  currentStepIndex: number
  formStatus: number
}

export function RequestProcessStepper({
  processes,
  currentStepIndex,
  formStatus,
}: RequestProcessStepperProps) {
  if (!processes.length) return null

  const stepStates = deriveStepStates(
    processes,
    currentStepIndex,
    formStatus
  )

  return (
    <div className="flex flex-col gap-0" role="list" aria-label="Request process steps">
      {/* Steps */}
      <div className="flex items-start gap-0">
        {processes.map((step, i) => {
          const { state, actor } = stepStates[i]
          const isCompleted = state === "completed"
          const isDenied = state === "denied"
          const isCurrent = state === "current"
          const isPending = state === "pending"

          return (
            <div
              key={step.id}
              className="flex flex-1 flex-col items-center"
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* The bubble is decorative: the step's meaning is announced by
                  the text below, so a screen reader hears the STATE and not
                  just a number that a tick or a cross replaced. */}
              <div
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  isDenied && "border-red-500 bg-red-500 text-white",
                  isCurrent && "border-blue-600 bg-white text-blue-600",
                  isPending && "border-muted-foreground/30 bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isDenied ? (
                  <X className="h-4 w-4" />
                ) : isCurrent ? (
                  <span className="absolute -inset-0.5 animate-ping rounded-full border border-blue-400 bg-blue-400/20 opacity-75" />
                ) : null}
                {!(isCompleted || isDenied) && <span>{i + 1}</span>}
              </div>

              {/* Step label */}
              <div className="mt-2 flex flex-col items-center text-center">
                <span
                  className={cn(
                    "text-xs font-medium",
                    isCurrent && "text-blue-600",
                    isCompleted && "text-green-600",
                    isDenied && "text-red-600",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.processName}
                </span>
                <span className="sr-only">
                  {` — step ${i + 1} of ${processes.length}, ${STATE_LABEL[state]}`}
                </span>
                {actor && (
                  <span className="text-xs text-muted-foreground">{actor}</span>
                )}
                {isCurrent && step.description && (
                  <span className="mt-0.5 max-w-24 text-xs text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </div>

              {/* Connector line (not after last step) */}
              {i < processes.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[calc(50%+1rem)] top-4 h-0.5 w-[calc(100%-2rem)]",
                    isCompleted && "bg-green-500",
                    isDenied && "bg-red-500",
                    !isCompleted && !isDenied && "bg-muted-foreground/20"
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
