import { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const TOUR_KEY = 'musicdibs_music_creator_tour_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

interface ExtendedStep extends Step {
  bullets?: string[];
  highlight?: string;
  warning?: string;
  closing?: string;
}

function useSteps(): ExtendedStep[] {
  const { t } = useTranslation();
  return useMemo(() => [
    {
      target: 'body',
      placement: 'center' as const,
      title: t('aiCreate.tour.s1Title', 'Crea música completa con IA 🎵'),
      content: t('aiCreate.tour.s1Content', 'Esta herramienta genera canciones completas a partir de una descripción.'),
      bullets: [
        t('aiCreate.tour.s1B1', 'Canciones originales con letra'),
        t('aiCreate.tour.s1B2', 'Bases instrumentales'),
        t('aiCreate.tour.s1B3', 'Cualquier género musical'),
      ],
      closing: t('aiCreate.tour.s1Closing', 'Te mostramos cómo obtener los mejores resultados en pocos pasos.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-description"]',
      title: t('aiCreate.tour.s2Title', 'Describe tu canción ✍️'),
      content: t('aiCreate.tour.s2Content', 'Escribe cómo quieres que suene tu canción. Cuanto más detalle incluyas, mejores serán los resultados.'),
      highlight: t('aiCreate.tour.s2Highlight', '"Una canción pop sobre un amor de verano, voz femenina, estilo Aitana"'),
      warning: t('aiCreate.tour.s2Warning', 'No pongas textos contradictorios en la descripción y el campo de letra. En ese caso la IA elegirá uno de los dos de forma aleatoria.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-lyrics"]',
      title: t('aiCreate.tour.s3Title', 'Añade tu letra (opcional) 🎤'),
      content: t('aiCreate.tour.s3Content', 'Si tienes una letra escrita, pégala en el campo correspondiente. La IA la usará como base para la canción.'),
      warning: t('aiCreate.tour.s3Warning', 'La IA puede modificar la letra para adaptarla a la descripción musical.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-settings"]',
      title: t('aiCreate.tour.s4Title', 'Ajusta el estilo musical 🎧'),
      content: t('aiCreate.tour.s4Content', 'Selecciona una voz del catálogo o elige un artista virtual guardado para personalizar el estilo vocal de tu canción.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-generate"]',
      title: t('aiCreate.tour.s5Title', 'Genera tu canción ⚡'),
      content: t('aiCreate.tour.s5Content', 'Cuando tengas todo listo, pulsa el botón para que la IA cree tu canción. El proceso puede tardar unos segundos.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-results"]',
      title: t('aiCreate.tour.s6Title', 'Explora tus resultados 🎶'),
      content: t('aiCreate.tour.s6Content', 'Aquí verás todas las canciones generadas.'),
      bullets: [
        t('aiCreate.tour.s6B1', 'Escuchar cada versión'),
        t('aiCreate.tour.s6B2', 'Guardarlas como favoritas'),
        t('aiCreate.tour.s6B3', 'Descargar tus canciones'),
      ],
      closing: t('aiCreate.tour.s6Closing', 'Prueba varias hasta encontrar la que mejor encaje contigo.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-tab-lyrics"]',
      title: t('aiCreate.tour.s7Title', 'Crea letras con IA 📝'),
      content: t('aiCreate.tour.s7Content', 'En el tab "Compositor de Letras" puedes generar letras automáticamente describiendo:'),
      bullets: [
        t('aiCreate.tour.s7B1', 'Tema de la canción'),
        t('aiCreate.tour.s7B2', 'Estilo musical'),
        t('aiCreate.tour.s7B3', 'Emoción que quieres transmitir'),
      ],
      closing: t('aiCreate.tour.s7Closing', 'La IA generará una letra lista para usar en tu canción.'),
      disableBeacon: true,
    },
    {
      target: 'body',
      placement: 'center' as const,
      title: t('aiCreate.tour.s8Title', 'Todo listo para crear 🚀'),
      content: t('aiCreate.tour.s8Content', 'Ya conoces las funciones principales del AI Music Studio.'),
      closing: t('aiCreate.tour.s8Closing', 'Empieza ahora a crear tu primera canción y explora todas las posibilidades. Cuanto más pruebes, mejores resultados obtendrás.'),
      disableBeacon: true,
    },
  ], [t]);
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
  const { t } = useTranslation();
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

      {ext.warning && (
        <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
          <p className="text-xs text-foreground/90 leading-relaxed">
            <span className="mr-1">⚠️</span>{ext.warning}
          </p>
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
            {t('aiCreate.tour.skip', 'Saltar tutorial')}
          </Button>

          {index > 0 && !isLastStep && (
            <Button variant="ghost" size="sm" className="text-xs" {...backProps}>
              {t('dashboard.tour.back', 'Atrás')}
            </Button>
          )}

          <Button
            size="sm"
            className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
            {...primaryProps}
          >
            {isLastStep
              ? t('aiCreate.tour.createFirst', 'Crear mi primera canción')
              : `${t('dashboard.tour.next', 'Siguiente')} →`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MusicCreatorTour() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useSteps();

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(getTourKey(user.id));
    if (!seen) {
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setRun(true);
    };
    window.addEventListener('musicdibs:start-music-tour', handler);
    return () => window.removeEventListener('musicdibs:start-music-tour', handler);
  }, []);

  const finishTour = useCallback((focusDescription: boolean) => {
    setRun(false);
    setStepIndex(0);
    if (user) {
      localStorage.setItem(getTourKey(user.id), 'true');
    }
    if (focusDescription) {
      // Wait for overlay to disappear, then focus the description textarea
      setTimeout(() => {
        const el = document.getElementById('mc-description-textarea') as HTMLTextAreaElement | null;
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
        // Last step "Crear mi primera canción" → focus description
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
