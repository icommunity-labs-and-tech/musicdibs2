import { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const TOUR_KEY = 'musicdibs_voice_tools_tour_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

function useSteps(): Step[] {
  const { t } = useTranslation();
  const vt = (key: string, fb: string) => String(t(`voiceToolsTour.${key}`, { defaultValue: fb }));

  return useMemo(() => [
    {
      target: 'body',
      placement: 'center' as const,
      title: vt('step1Title', 'Tu estudio vocal con IA 🎤'),
      content: vt('step1Content', 'Clona tu voz, canta en 29 idiomas y crea versiones vocales profesionales de cualquier letra.\n\nFuncionalidades:\n• Clonar tu voz en segundos\n• Generar pistas vocales con tu voz clonada\n• Traducir audio a cualquier idioma\n• Cantar letras que tú escribas\n\nTe mostramos cómo funciona paso a paso.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="vt-clone-tab"]',
      title: vt('step2Title', 'Clona tu voz'),
      content: vt('step2Content', 'Para usar tu propia voz, primero necesitas clonarla.\n\nRequisitos del audio:\n✓ Mínimo 1 minuto de grabación\n✓ Solo tu voz (sin música de fondo)\n✓ Habla clara y natural\n✓ MP3, WAV o FLAC\n\nConsejo: Graba en un lugar silencioso y habla de forma natural, como si estuvieras contando una historia.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="vt-cloned-list"]',
      title: vt('step3Title', 'Tus voces clonadas'),
      content: vt('step3Content', 'Una vez clonada tu voz, aparecerá en esta lista.\n\nPuedes:\n• Ver todas tus voces clonadas\n• Escuchar previews de cada voz\n• Eliminar voces que no uses\n• Seleccionar una voz para usar en "Cantar"\n\nLa clonación toma ~2-3 minutos. Se te notificará cuando esté lista.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="vt-sing-tab"]',
      title: vt('step4Title', 'Genera pistas vocales'),
      content: vt('step4Content', 'Con tu voz clonada, puedes generar canciones completas:\n\n1️⃣ Selecciona una voz clonada\n2️⃣ Escribe o pega la letra\n3️⃣ Escoge género musical y mood\n4️⃣ Genera tu pista vocal\n\nLa IA cantará tu letra usando tu voz con calidad profesional.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="vt-lyrics-gen"]',
      title: vt('step5Title', '¿No tienes letra? Genérala aquí'),
      content: vt('step5Content', 'No necesitas escribir la letra tú mismo.\n\nClick en "Generación gratis" para:\n• Describir el tema de la canción\n• Seleccionar género y mood\n• Generar letra completa con IA\n• Usar la letra generada directamente\n\nLa letra se carga automáticamente en el campo de texto.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="vt-music-settings"]',
      title: vt('step6Title', 'Personaliza el estilo musical'),
      content: vt('step6Content', 'Ajusta cómo suena tu canción:\n\n🎵 Tema central\nAmor, Desamor, Fiesta, Superación, etc.\n\n🎸 Género musical\nPop, Rock, Reggaeton, Hip-Hop, y más\n\n🎭 Mood / Tono\nAlegre, Melancólico, Épico, Enérgico, etc.\n\nEstos parámetros definen el estilo de la pista vocal generada.'),
      disableBeacon: true,
    },
    {
      target: '[data-tour="vt-translate-tab"]',
      title: vt('step7Title', 'Traduce audio a cualquier idioma'),
      content: vt('step7Content', 'Convierte cualquier audio a otro idioma manteniendo la voz original:\n\n1️⃣ Sube un archivo de audio\n2️⃣ Selecciona idioma de destino (29 disponibles)\n3️⃣ La IA traduce y genera nueva versión\n\nPerfecto para crear versiones internacionales de tus canciones.\n\nCoste: 5 créditos por traducción'),
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
              {String(t('voiceToolsTour.finish', { defaultValue: '¡Empezar!' }))}
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

export function VoiceToolsTour() {
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
    window.addEventListener('musicdibs:start-voice-tour', handler);
    return () => window.removeEventListener('musicdibs:start-voice-tour', handler);
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
