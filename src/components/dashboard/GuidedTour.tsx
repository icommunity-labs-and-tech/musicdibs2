import { useEffect, useRef, useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

const tourSteps = [
  {
    title: 'Título de la obra',
    text: 'Introduce el título de tu obra para identificarla en el registro.',
    selector: 'input[name="title"]',
  },
  {
    title: 'Subir archivo',
    text: 'Sube el archivo original de tu obra para generar una prueba de autoría verificable.',
    selector: 'input[type="file"]',
    fallbackSelector: '[data-tour="file-upload"]',
  },
  {
    title: 'Confirmar registro',
    text: 'Acepta la declaración de autoría y haz clic en "Registrar" para completar el proceso.',
    selector: 'button[type="submit"]',
  },
];

export function GuidedTour() {
  const { state, nextTourStep, endTour } = useOnboarding();
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const rafRef = useRef<number>(0);

  const currentStep = state.tourActive ? tourSteps[state.tourStep] : null;

  useEffect(() => {
    if (!state.tourActive || !currentStep) return;

    const updatePosition = () => {
      const el = document.querySelector(currentStep.selector) ||
        (currentStep.fallbackSelector ? document.querySelector(currentStep.fallbackSelector) : null);
      
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setPos(null);
      }
    };

    // Delay to allow page to render
    const timer = setTimeout(updatePosition, 300);
    
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [state.tourActive, state.tourStep, currentStep]);

  if (!state.tourActive || !currentStep) return null;

  const isLast = state.tourStep >= tourSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100] bg-black/40 transition-opacity" onClick={endTour} />
      
      {/* Highlight ring */}
      {pos && (
        <div
          className="fixed z-[101] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none transition-all duration-300"
          style={{
            top: pos.top - 4,
            left: pos.left - 4,
            width: pos.width + 8,
            height: pos.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[102] w-72 rounded-xl border border-border/40 bg-background p-4 shadow-xl animate-scale-in"
        style={{
          top: pos ? pos.top + pos.height + 16 : '50%',
          left: pos ? Math.max(16, Math.min(pos.left, window.innerWidth - 304)) : '50%',
          transform: pos ? undefined : 'translate(-50%, -50%)',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-primary font-medium mb-0.5">
              Paso {state.tourStep + 1} de {tourSteps.length}
            </p>
            <h4 className="text-sm font-semibold">{currentStep.title}</h4>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={endTour}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{currentStep.text}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === state.tourStep ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <Button size="sm" className="h-7 text-xs" onClick={nextTourStep}>
            {isLast ? 'Entendido' : (
              <>Siguiente <ArrowRight className="h-3 w-3 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
