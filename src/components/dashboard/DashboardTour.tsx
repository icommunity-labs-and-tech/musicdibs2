import { useState, useEffect, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const TOUR_KEY = 'musicdibs_tour_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

const steps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Bienvenido a MusicDibs',
    content:
      'Este es tu panel de control. Desde aquí puedes registrar tus obras, verificar registros, gestionar créditos y acceder a herramientas para músicos.\n\nTe mostramos rápidamente cómo funciona.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="account-summary"]',
    title: 'Resumen de la cuenta',
    content:
      'Aquí puedes ver un resumen de tu actividad:\n\n• Obras registradas\n• Registros pendientes\n• Créditos disponibles\n\nLos créditos son los que utilizas para registrar nuevas obras.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="register-work"]',
    title: 'Registrar obra',
    content:
      'Aquí puedes registrar una nueva obra.\nSolo tienes que introducir los datos y subir el archivo original.\n\nCada registro utiliza 1 crédito y genera una prueba de autoría verificable.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="credit-store"]',
    title: 'Créditos',
    content:
      'Los créditos te permiten registrar obras.\n\nPuedes comprar créditos individuales o usar una suscripción para reducir el coste por registro.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="verify-registration"]',
    title: 'Verificar registro',
    content: 'Esta herramienta permite comprobar si una obra ya ha sido registrada en MusicDibs.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="recent-registrations"]',
    title: 'Registros recientes',
    content: 'Aquí puedes ver tus últimas obras registradas y acceder a su certificado.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="ai-studio"]',
    title: 'AI MusicDibs Studio',
    content:
      'Aquí encontrarás herramientas de IA para inspirarte, generar ideas musicales o mejorar composiciones.',
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    title: 'Todo listo',
    content: 'Ahora ya sabes cómo usar el panel de MusicDibs.\n\nPuedes empezar registrando tu primera obra.',
    disableBeacon: true,
  },
];

function CustomTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
  skipProps,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="w-80 rounded-2xl border border-border/40 bg-background p-5 shadow-2xl"
      style={{ zIndex: 10002 }}
    >
      {step.title && (
        <h3 className="text-base font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {step.title as string}
        </h3>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
        {step.content as string}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {index === 0 ? (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" {...skipProps}>
              Saltar tutorial
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs" {...backProps}>
              Atrás
            </Button>
          )}

          {isLastStep ? (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...closeProps}
            >
              Empezar
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...primaryProps}
            >
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardTour() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(getTourKey(user.id));
    if (!seen) {
      // Small delay to let dashboard render
      const timer = setTimeout(() => setRun(true), 600);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Listen for manual restart
  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setRun(true);
    };
    window.addEventListener('musicdibs:start-tour', handler);
    return () => window.removeEventListener('musicdibs:start-tour', handler);
  }, []);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        setStepIndex(0);
        if (user) {
          localStorage.setItem(getTourKey(user.id), 'true');
        }
        return;
      }

      if (type === 'step:after') {
        if (action === ACTIONS.PREV) {
          setStepIndex(index - 1);
        } else {
          setStepIndex(index + 1);
        }
      }
    },
    [user],
  );

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      showSkipButton
      disableOverlayClose
      disableCloseOnEsc={false}
      callback={handleCallback}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          zIndex: 10001,
          arrowColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.45)',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
      floaterProps={{
        styles: {
          arrow: {
            length: 8,
            spread: 14,
          },
        },
      }}
    />
  );
}
