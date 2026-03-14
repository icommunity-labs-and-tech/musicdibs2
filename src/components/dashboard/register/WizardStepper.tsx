import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1 w-full mb-8">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-gradient-to-r from-purple-500 to-pink-500 text-white ring-2 ring-purple-500/30 ring-offset-2 ring-offset-background',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium text-center leading-tight max-w-[72px] truncate',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mx-2 transition-colors',
                  i < currentStep ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
