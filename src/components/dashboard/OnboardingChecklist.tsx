import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Upload, Award, Search, Radio, Sparkles, Check, PartyPopper, X } from 'lucide-react';

const steps = [
  {
    key: 'registerWork' as const,
    label: 'Registrar tu primera obra',
    description: 'Sube tu archivo y registra su autoría.',
    icon: Upload,
    path: '/dashboard/register',
    tour: true,
  },
  {
    key: 'getCertificate' as const,
    label: 'Obtener tu primer certificado',
    description: 'Descarga el certificado generado tras el registro.',
    icon: Award,
    path: '/dashboard/blockchain',
  },
  {
    key: 'verifyRegistration' as const,
    label: 'Verificar un registro',
    description: 'Comprueba si una obra ya está registrada.',
    icon: Search,
    path: '/dashboard/verify',
  },
  {
    key: 'distributeMusic' as const,
    label: 'Distribuir tu música',
    description: 'Envía tu música a plataformas de streaming.',
    icon: Radio,
    path: '/distribution',
  },
  {
    key: 'exploreAiStudio' as const,
    label: 'Explorar AI MusicDibs Studio',
    description: 'Utiliza IA para inspirarte o mejorar composiciones.',
    icon: Sparkles,
    path: '/ai-studio',
  },
];

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { state, completedCount, totalSteps, allComplete, completeStep, startTour, dismiss } = useOnboarding();

  if (state.dismissed && !allComplete) return null;

  const progressPercent = (completedCount / totalSteps) * 100;

  if (allComplete) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <PartyPopper className="h-10 w-10 text-primary" />
          <p className="text-base font-semibold">¡Perfecto! Ya estás usando MusicDibs al completo.</p>
          <p className="text-sm text-muted-foreground">Has completado todos los pasos iniciales.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-sm relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
        title="Ocultar checklist"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Primeros pasos en MusicDibs
        </CardTitle>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>{completedCount} / {totalSteps} pasos</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {steps.map((step) => {
          const done = state.steps[step.key];
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              onClick={() => {
                if (step.tour && !done) {
                  startTour();
                }
                if (step.key === 'verifyRegistration') completeStep('verifyRegistration');
                if (step.key === 'distributeMusic') completeStep('distributeMusic');
                if (step.key === 'exploreAiStudio') completeStep('exploreAiStudio');
                navigate(step.path);
              }}
              className={`w-full flex items-start gap-3 rounded-lg p-3 text-left transition-colors ${
                done
                  ? 'bg-primary/5 opacity-70'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                done
                  ? 'bg-primary text-primary-foreground'
                  : 'border-2 border-muted-foreground/30'
              }`}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3 w-3 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
