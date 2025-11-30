import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Step {
  id: string
  label: string
  description?: string
}

interface ProgressStepsProps {
  steps: Step[]
  currentStep: number // 0-indexed
  completedSteps: number[] // Array of completed step indices
  className?: string
}

type StepState = 'completed' | 'current' | 'pending'

function getStepState(
  index: number,
  currentStep: number,
  completedSteps: number[]
): StepState {
  if (completedSteps.includes(index)) {
    return 'completed'
  }
  if (index === currentStep) {
    return 'current'
  }
  return 'pending'
}

export function ProgressSteps({
  steps,
  currentStep,
  completedSteps,
  className,
}: ProgressStepsProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const state = getStepState(index, currentStep, completedSteps)
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              {/* Step indicator */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  {
                    // Completed: green with checkmark
                    'bg-green-500 text-white': state === 'completed',
                    // Current: primary color with ring
                    'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2':
                      state === 'current',
                    // Pending: muted
                    'bg-muted text-muted-foreground': state === 'pending',
                  }
                )}
              >
                {state === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {/* Step label */}
              <span
                className={cn('text-xs mt-2 text-center max-w-[80px]', {
                  'text-green-600 font-medium': state === 'completed',
                  'text-primary font-medium': state === 'current',
                  'text-muted-foreground': state === 'pending',
                })}
              >
                {step.label}
              </span>
              {/* Optional description */}
              {step.description && (
                <span className="text-xs text-muted-foreground mt-0.5 text-center max-w-[100px]">
                  {step.description}
                </span>
              )}
            </div>
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn('flex-1 h-0.5 mx-2', {
                  // Solid line for completed connections
                  'bg-green-500':
                    state === 'completed' &&
                    getStepState(index + 1, currentStep, completedSteps) !== 'pending',
                  // Dashed line for pending connections
                  'bg-muted border-t border-dashed border-muted-foreground/30':
                    state === 'pending' ||
                    getStepState(index + 1, currentStep, completedSteps) === 'pending',
                  // Gradient for current to pending
                  'bg-gradient-to-r from-primary to-muted':
                    state === 'current' ||
                    (state === 'completed' &&
                      getStepState(index + 1, currentStep, completedSteps) === 'pending'),
                })}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
