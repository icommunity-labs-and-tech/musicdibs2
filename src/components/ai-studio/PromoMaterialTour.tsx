import { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const TOUR_KEY = 'musicdibs_promo_material_tour_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

function useSteps(): Step[] {
  const { t } = useTranslation();
  const pm = (key: string, fb: string) => String(t(`promoMaterialTour.${key}`, { defaultValue: fb }));

  return useMemo(() => [
    {
      target: 'body',
      placement: 'center' as const,
      title: pm('step1Title', 'Crea contenido visual profesional 🎨'),
      content: pm('step1Content', 'Genera portadas, creatividades, videos y carteles para promocionar tu música con IA.\n\nHerramientas disponibles:\n• Portadas para Spotify/Apple Music\n• Creatividades para Instagram y YouTube\n• Videos para redes sociales\n• Carteles para eventos y conciertos\n\nTodo el contenido se genera en segundos con calidad profesional.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="pm-covers-tab"]',
      title: pm('step2Title', 'Portadas para tus obras'),
      content: pm('step2Content', 'Genera portadas profesionales optimizadas para:\n✓ Spotify\n✓ YouTube Music\n✓ Apple Music\n✓ Amazon Music\n\n4 modos de creación:\n• Sin imagen (IA genera todo)\n• Solo foto del artista\n• Portada de referencia\n• Fotomontaje (combina foto + inspiración)\n\nCoste: 2 créditos por portada'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="pm-creatives-tab"]',
      title: pm('step3Title', 'Creatividades para Instagram y YouTube'),
      content: pm('step3Content', 'Genera contenido optimizado para cada plataforma:\n\n📱 Instagram\n• Feed Post (1:1) → imagen + copy + hashtags\n• Story (9:16) → imagen + copy + hashtags\n\n🎬 YouTube\n• Miniatura (16:9) → imagen llamativa con texto\n\nLa IA genera tanto la imagen como el texto de acompañamiento automáticamente.\n\nCoste: 1 crédito por creatividad'),
      disableBeacon: true,
    },
    {
      target: 'body',
      placement: 'center' as const,
      title: pm('step4Title', 'Diferencia entre formatos Instagram'),
      content: pm('step4Content', '📸 Feed Post (cuadrado 1:1)\nPara el feed principal de Instagram\nIdeal para: anuncios de singles, portadas, fotos artísticas\n\n📱 Story (vertical 9:16)\nPara historias de Instagram\nIdeal para: teasers, behind the scenes, anuncios temporales\n\nAmbos incluyen:\n✓ Imagen optimizada\n✓ Copy personalizado\n✓ Hashtags relevantes'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="pm-videos-tab"]',
      title: pm('step5Title', 'Videos promocionales'),
      content: pm('step5Content', 'Genera videos cortos (3-5 segundos) optimizados para:\n• TikTok\n• Instagram Reels\n• YouTube Shorts\n\nDos formas de crear:\n1️⃣ Texto → Video (describe el concepto)\n2️⃣ Imagen → Video (anima una portada o foto)\n\nPerfecto para promocionar lanzamientos de forma dinámica.\n\nCoste: 10 créditos por video'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="pm-posters-tab"]',
      title: pm('step6Title', 'Carteles y posters'),
      content: pm('step6Content', 'Crea carteles profesionales para:\n\n🎪 Eventos y conciertos\n• Flyer (A5) → tamaño bolsillo\n• Poster (A4) → tamaño estándar\n• Poster grande (A3) → impacto visual\n\n🌐 Redes sociales\n• Facebook Event Cover (1920x1080)\n• Twitter/X Header (1500x500)\n\nIncluye: fecha, lugar, hora, logo y foto del artista.\n\nCoste: 1 crédito por cartel'),
      disableBeacon: true,
    },
    {
      target: 'body',
      placement: 'center' as const,
      title: pm('step7Title', 'Sube archivos fácilmente'),
      content: pm('step7Content', 'En todas las secciones puedes subir archivos de dos formas:\n\n🖱️ Click para seleccionar\nHaz click en la zona de upload y selecciona el archivo\n\n📂 Arrastra y suelta\nArrastra la imagen/foto directamente desde tu ordenador\n\nFormatos aceptados:\n• Imágenes: JPG, PNG, WEBP (máx. 10MB)\n• Audio: MP3, WAV (solo para videos)'),
      disableBeacon: true,
    },
    {
      target: 'body',
      placement: 'center' as const,
      title: pm('step8Title', 'Descarga y usa tu contenido'),
      content: pm('step8Content', 'Una vez generado el contenido:\n\n✓ Preview en pantalla\n✓ Botón de descarga directo\n✓ Copia automática de textos (copy/hashtags)\n✓ Archivos optimizados para cada plataforma\n\nTodo el contenido se guarda en tu cuenta y puedes descargarlo cuando quieras.\n\n💡 Consejo: Genera múltiples versiones para A/B testing en redes sociales.'),
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
              {String(t('dashboard.tour.skip', { defaultValue: 'Saltar' }))}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs" {...backProps}>
              {String(t('dashboard.tour.back', { defaultValue: 'Atrás' }))}
            </Button>
          )}

          {isLastStep ? (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...closeProps}
            >
              {String(t('promoMaterialTour.finish', { defaultValue: '¡Empezar!' }))}
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...primaryProps}
            >
              {String(t('dashboard.tour.next', { defaultValue: 'Siguiente' }))}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PromoMaterialTour() {
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
    window.addEventListener('musicdibs:start-promo-tour', handler);
    return () => window.removeEventListener('musicdibs:start-promo-tour', handler);
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
