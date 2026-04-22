import { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const TOUR_KEY = 'musicdibs_tour_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

function useSteps(): Step[] {
  const { t } = useTranslation();
  return useMemo(() => [
    {
      target: 'body',
      placement: 'center' as const,
      title: t('dashboard.tour.welcome', 'Bienvenido a MusicDibs'),
      content: t('dashboard.tour.welcomeContent', 'Este es tu panel de control. Desde aquí tienes una visión general y puedes acceder a todas las herramientas para músicos.\n\nTe mostramos rápidamente cómo funciona.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="account-summary"]',
      title: t('dashboard.tour.accountTitle', 'Resumen de la cuenta'),
      content: t('dashboard.tour.accountContent', 'Aquí puedes ver un resumen de tu actividad:\n• Obras registradas\n• Registros pendientes\n• Créditos disponibles\n\nLos créditos son los que utilizas para usar cada herramienta: registros, promociones, distribución, creación con IA MusicDibs Studio.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="ai-studio"]',
      title: t('dashboard.tour.aiStudioTitle', 'AI Music Studio'),
      content: t('dashboard.tour.aiStudioContent', 'Crea música, voces y contenido visual con IA\n\n🎵 Música: Genera canciones completas\n🎤 Voces: Clona voces o usa 29 idiomas\n🎨 Imágenes: Portadas, creatividades, carteles\n🎬 Videos: Clips para redes sociales\n\nTodo en un solo lugar.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="register-work"]',
      title: t('dashboard.tour.registerTitle', 'Registrar obra'),
      content: t('dashboard.tour.registerContent', 'Aquí puedes registrar una nueva obra. Solo tienes que introducir los datos y subir el archivo original.\n\nCada registro utiliza 1 crédito y genera una prueba de autoría verificable.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="distribute"]',
      title: t('dashboard.tour.distributeTitle', 'Distribuir tu música'),
      content: t('dashboard.tour.distributeContent', 'Lleva tu música a todas las plataformas digitales: Spotify, Apple Music, Amazon y más.\n\n💰 Recibe el 95% de tus royalties.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="promotion"]',
      title: t('dashboard.tour.promotionTitle', 'Promoción RRSS'),
      content: t('dashboard.tour.promotionContent', 'Da visibilidad a tu música:\n\n📱 Promoción en redes\nPublica en TikTok e Instagram con +200K seguidores\n\n📰 Prensa y medios\nGenera notas de prensa con IA y distribúyelas en medios'),
      disableBeacon: true,
      placement: 'right' as const,
    },
    {
      target: '[data-tour="virtual-artists"]',
      title: t('dashboard.tour.virtualArtistsTitle', 'Mis Artistas Virtuales'),
      content: t('dashboard.tour.virtualArtistsContent', 'Crea artistas completos y escala tu catálogo musical:\n\n🎤 Crea múltiples artistas virtuales\n🎶 Genera canciones con IA\n🔒 Registra automáticamente\n🌍 Distribuye y monetiza\n\nPor primera vez, cualquiera puede crear y escalar artistas sin estudio, sin equipo y sin barreras.'),
      disableBeacon: true,
      placement: 'right' as const,
    },
    {
      target: '[data-tour="credit-store"]',
      title: t('dashboard.tour.creditsTitle', 'Créditos'),
      content: t('dashboard.tour.creditsContent', 'Los créditos te permiten usar todas las herramientas de la plataforma. Cada herramienta utiliza una cantidad de créditos diferente.\n\nPuedes comprar créditos individuales o usar una suscripción para reducir el coste por registro.'),
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

export function DashboardTour() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useSteps();

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(getTourKey(user.id));
    if (!seen) {
      const timer = setTimeout(() => setRun(true), 600);
      return () => clearTimeout(timer);
    }
  }, [user]);

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
