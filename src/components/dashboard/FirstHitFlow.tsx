import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Music2, Sparkles, Shield, Megaphone,
  ChevronRight, Upload, ArrowRight,
  CheckCircle2, Rocket, Share2,
} from 'lucide-react';

interface Step {
  number: number;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  body: string;
  primaryLabel: string;
  primaryAction: () => void;
  secondaryLabel?: string;
  secondaryAction?: () => void;
  secondaryVariant?: 'outline' | 'ghost';
}

export function FirstHitFlow() {
  const navigate = useNavigate();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const markDone = (step: number) => {
    setCompletedSteps(prev =>
      prev.includes(step) ? prev : [...prev, step]
    );
  };

  const steps: Step[] = [
    {
      number: 1,
      icon: Music2,
      iconColor: 'text-violet-400',
      title: 'Tu canción, tu regla',
      subtitle: '¿Ya tienes tu tema listo?',
      body: 'Sube tu archivo de audio y protege tu autoría de forma inmediata y permanente en blockchain. Si todavía no tienes canción, créala desde cero con nuestra IA en segundos.',
      primaryLabel: '↑  Subir mi canción',
      primaryAction: () => { markDone(1); navigate('/dashboard/register'); },
      secondaryLabel: '✦  Crear con IA',
      secondaryAction: () => { markDone(1); navigate('/ai-studio/create'); },
      secondaryVariant: 'outline',
    },
    {
      number: 2,
      icon: Shield,
      iconColor: 'text-blue-400',
      title: 'Protege tu autoría',
      subtitle: 'Registra en blockchain',
      body: 'Tu obra queda sellada con un certificado blockchain inmutable. Fecha, hora y huella digital de tu archivo — prueba legal de que eres el creador original.',
      primaryLabel: 'Registrar mi obra →',
      primaryAction: () => { markDone(2); navigate('/dashboard/register'); },
    },
    {
      number: 3,
      icon: Megaphone,
      iconColor: 'text-pink-400',
      title: '¡Que se entere el mundo!',
      subtitle: '+100.000 seguidores te esperan',
      body: 'Publicamos tu canción en nuestras redes sociales — más de 100.000 seguidores reales entre Instagram y TikTok. Tu música, delante de fans que buscan artistas como tú.',
      primaryLabel: 'Quiero promocionarme →',
      primaryAction: () => { markDone(3); navigate('/dashboard/promote'); },
    },
  ];

  // ── Estado final: los 3 pasos completados ───────────────────────
  if (completedSteps.length >= 3) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Icono celebración */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 ring-2 ring-violet-500/30">
                <Rocket className="h-10 w-10 text-violet-400" />
              </div>
              <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Mensaje */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">
              ¡Tu hit está en camino! 🎉
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tu canción está protegida, registrada y a punto de llegar a
              miles de personas. En <strong>2–3 días</strong> tu música
              estará frente a más de 100.000 seguidores reales.
            </p>
          </div>

          {/* Siguiente nivel */}
          <div className="rounded-xl border border-border/40 bg-muted/30 p-5 text-left space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Share2 className="h-4 w-4 text-violet-400" />
              <p>Siguiente nivel: distribución profesional</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Publica tu música en <strong>+220 plataformas</strong> —
              Spotify, Apple Music, Amazon, YouTube Music y más.
              Tú te quedas el <strong>95% de los royalties</strong>.
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              ⏱ La aprobación puede tardar hasta 7 días.
              Te avisamos cuando esté lista.
            </p>
            <Button
              variant="hero"
              className="w-full"
              onClick={() => navigate('/dashboard/blockchain')}
            >
              Distribuir en +220 plataformas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/dashboard')}
          >
            Ir a mi panel →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-2xl w-full space-y-10">

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="text-center space-y-4">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400 ring-1 ring-violet-500/20">
            <Sparkles className="h-3 w-3" />
            PARA ARTISTAS INDEPENDIENTES
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            ¡Lanza ya tu primera
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent"> canción </span>
            al mundo!
          </h1>

          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            En solo 3 pasos: protege tu autoría, hazte viral en nuestras redes
            y distribuye a +220 plataformas musicales.
          </p>
        </div>

        {/* ── Pasos ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;
            const done = completedSteps.includes(step.number);

            return (
              <div
                key={step.number}
                className={`rounded-xl border p-5 transition-all duration-300 ${
                  done
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border/40 bg-card/50 hover:border-border/60'
                }`}
              >
                <div className="flex gap-4">
                  {/* Número / check */}
                  <div className="shrink-0 pt-0.5">
                    {done
                      ? <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                      : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {step.number}
                        </span>
                      )
                    }
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${step.iconColor}`} />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {step.subtitle}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </div>

                {/* Botones */}
                {!done && (
                  <div className="flex flex-wrap gap-2 mt-4 ml-11">
                    <Button variant="hero" size="sm" onClick={step.primaryAction}>
                      {step.primaryLabel}
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                    {step.secondaryLabel && step.secondaryAction && (
                      <Button variant={step.secondaryVariant || 'outline'} size="sm" onClick={step.secondaryAction}>
                        {step.secondaryLabel}
                      </Button>
                    )}
                  </div>
                )}

                {done && (
                  <div className="flex items-center gap-1.5 mt-3 ml-11 text-xs font-medium text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completado
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Skip */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/dashboard')}
          >
            Ya tengo obras — ir directamente al panel
          </Button>
        </div>

      </div>
    </div>
  );
}
