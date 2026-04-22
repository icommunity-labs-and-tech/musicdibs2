import { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const TOUR_KEY = 'virtual_artists_tutorial_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

interface ExtendedStep extends Step {
  bullets?: string[];
  highlight?: string;
  closing?: string;
}

function useSteps(): ExtendedStep[] {
  return useMemo(() => [
    {
      target: '[data-tour="va-name"]',
      title: 'Nombra tu artista 📝',
      content: 'Dale un nombre a tu artista o proyecto musical. Este nombre te ayudará a identificar fácilmente el estilo que estás creando.',
      highlight: '"Luna Electrónica" o "Trap Nights"',
      disableBeacon: true,
    },
    {
      target: '[data-tour="va-voice"]',
      title: 'Elige la voz 🎙️',
      content: 'Selecciona el tipo de voz que mejor encaje con tu artista.',
      bullets: [
        'Voces femeninas o masculinas',
        'Estilos urbanos, pop, rock...',
      ],
      closing: 'Esto definirá cómo sonarán tus canciones.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="va-genre"]',
      title: 'Define el género 🎧',
      content: 'Selecciona uno o varios géneros musicales. Esto ayudará a la IA a mantener coherencia en todas tus canciones.',
      closing: 'Puedes combinar estilos para crear algo único.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="va-mood"]',
      title: 'Ajusta el mood ✨',
      content: 'Elige la emoción o energía de tu artista.',
      bullets: ['Alegre', 'Melancólico', 'Energético', 'Oscuro'],
      closing: 'Esto influirá en el tono de las canciones.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="va-notes"]',
      title: 'Describe tu estilo ✍️',
      content: 'Añade detalles sobre tu artista para afinar los resultados.',
      bullets: [
        'Temáticas habituales',
        'Referencias musicales',
        'Idioma o estilo de letras',
      ],
      closing: 'Cuanto más detalle, mejor resultado.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="va-save"]',
      title: 'Guarda tu artista 🚀',
      content: 'Cuando tengas todo listo, guarda tu perfil. Después podrás usarlo para generar canciones de forma rápida y coherente.',
      closing: 'También puedes marcarlo como perfil por defecto.',
      disableBeacon: true,
    },
  ], []);
}

function CustomTooltip({
  index,
  step,
  backProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
  skipProps,
}: TooltipRenderProps) {
  const ext = step as ExtendedStep;

  return (
    <div
      {...tooltipProps}
      className="w-[360px] max-w-[92vw] rounded-2xl border border-border/40 bg-background p-5 shadow-2xl"
      style={{ zIndex: 10002 }}
    >
      {step.title && (
        <h3 className="text-base font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {step.title as string}
        </h3>
      )}

      {step.content && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {step.content as string}
        </p>
      )}

      {ext.bullets && ext.bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {ext.bullets.map((b, i) => (
            <li key={i} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
              <span className="text-primary">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {ext.highlight && (
        <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
          <p className="text-sm italic text-foreground/90">{ext.highlight}</p>
        </div>
      )}

      {ext.closing && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {ext.closing}
        </p>
      )}

      <div className="flex items-center justify-between mt-5">
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
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" {...skipProps}>
            Saltar tutorial
          </Button>

          {index > 0 && !isLastStep && (
            <Button variant="ghost" size="sm" className="text-xs" {...backProps}>
              Atrás
            </Button>
          )}

          <Button
            size="sm"
            className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
            {...primaryProps}
          >
            {isLastStep ? 'Crear perfil' : 'Siguiente →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** When true, ensures the tour will run automatically the first time. */
  autoStart?: boolean;
}

export function VirtualArtistsTour({ autoStart = true }: Props) {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useSteps();

  useEffect(() => {
    if (!user || !autoStart) return;
    const seen = localStorage.getItem(getTourKey(user.id));
    if (!seen) {
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user, autoStart]);

  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setRun(true);
    };
    window.addEventListener('musicdibs:start-virtual-artists-tour', handler);
    return () => window.removeEventListener('musicdibs:start-virtual-artists-tour', handler);
  }, []);

  const finishTour = useCallback((focusName: boolean) => {
    setRun(false);
    setStepIndex(0);
    if (user) {
      localStorage.setItem(getTourKey(user.id), 'true');
    }
    if (focusName) {
      setTimeout(() => {
        const el = document.querySelector('[data-tour="va-name"] input') as HTMLInputElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus({ preventScroll: true });
        }
      }, 200);
    }
  }, [user]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      if (status === STATUS.SKIPPED || action === ACTIONS.SKIP) {
        finishTour(false);
        return;
      }

      if (status === STATUS.FINISHED) {
        finishTour(true);
        return;
      }

      if (type === 'step:after') {
        if (action === ACTIONS.PREV) {
          setStepIndex(index - 1);
        } else if (action === ACTIONS.NEXT) {
          setStepIndex(index + 1);
        } else if (action === ACTIONS.CLOSE) {
          finishTour(false);
        }
      }
    },
    [finishTour],
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
