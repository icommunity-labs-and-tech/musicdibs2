import { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const TOUR_KEY = 'musicdibs_music_creator_tour_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

function useSteps(): Step[] {
  const { t } = useTranslation();
  return useMemo(() => [
    {
      target: 'body',
      placement: 'center' as const,
      title: t('aiCreate.tour.welcomeTitle', 'Crea música completa con IA 🎵'),
      content: t('aiCreate.tour.welcomeContent', 'Esta herramienta genera canciones completas a partir de una descripción.\n\nPuedes crear:\n• Canciones originales con letra\n• Bases instrumentales\n• Cualquier género musical\n\nTe mostramos cómo obtener los mejores resultados.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-description"]',
      title: t('aiCreate.tour.descTitle', 'Describe tu canción (lo más importante)'),
      content: t('aiCreate.tour.descContent', 'Cuanto más detallado seas, mejor será el resultado.\n\nIncluye en tu descripción:\n✓ Género (ej: pop, rock, reggaeton)\n✓ Mood/ambiente (ej: romántico, energético)\n✓ Idioma (ej: en español, in English)\n✓ Tema de la letra (ej: amor, fiesta)\n✓ Tipo de voz (ej: voz femenina suave)\n\n💡 Usa "Mejorar con IA" para enriquecer tu descripción automáticamente.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-lyrics"]',
      title: t('aiCreate.tour.lyricsTitle', 'Letra de la canción (opcional)'),
      content: t('aiCreate.tour.lyricsContent', 'Puedes:\n• Dejar que la IA genere la letra automáticamente\n• Escribir tu propia letra aquí\n\nSi escribes tu letra:\n✓ La IA la adaptará musicalmente\n✓ Mantiene tu contenido exacto\n✓ Mejor control creativo'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-voice"]',
      title: t('aiCreate.tour.voiceTitle', 'Elige la voz 🎤'),
      content: t('aiCreate.tour.voiceContent', 'Selecciona entre voces predefinidas o usa tu propia voz clonada.\n\n🎤 Predefinidas: variedad de estilos y géneros\n🎙️ Mi voz: usa un clon de tu voz\n\nSi eliges "Solo instrumental", no se aplicará ninguna voz.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="mc-duration"]',
      title: t('aiCreate.tour.durationTitle', 'Duración de la pista ⏱️'),
      content: t('aiCreate.tour.durationContent', 'Elige la duración de tu canción:\n\n• 30s — Ideal para previews y reels\n• 60s — Formato corto perfecto\n• 120s — Canción completa\n\n💡 Consejo: Empieza con 60s para probar tu idea.'),
      disableBeacon: true,
    },
  ], [t]);
}

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
  const { t } = useTranslation();
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
              {t('dashboard.tour.skip', 'Saltar')}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs" {...backProps}>
              {t('dashboard.tour.back', 'Atrás')}
            </Button>
          )}

          {isLastStep ? (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...closeProps}
            >
              {t('dashboard.tour.start', '¡Empezar!')}
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...primaryProps}
            >
              {t('dashboard.tour.next', 'Siguiente')}
            </Button>
          )}
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
