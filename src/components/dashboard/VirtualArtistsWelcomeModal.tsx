import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Mic, Music, Lock, Globe, X, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFirst: () => void;
}

export const VirtualArtistsWelcomeModal = ({ open, onOpenChange, onCreateFirst }: Props) => {
  const { t } = useTranslation();

  const flowSteps = [
    { icon: Mic, label: t('virtualArtists.welcome.flowCreate', 'Crea tu artista'), gradient: 'from-pink-500 to-purple-500' },
    { icon: Music, label: t('virtualArtists.welcome.flowGenerate', 'Genera canciones con IA'), gradient: 'from-purple-500 to-blue-500' },
    { icon: Lock, label: t('virtualArtists.welcome.flowRegister', 'Registra tu obra'), gradient: 'from-blue-500 to-cyan-500' },
    { icon: Globe, label: t('virtualArtists.welcome.flowDistribute', 'Distribuye y gana dinero'), gradient: 'from-cyan-500 to-emerald-500' },
  ];

  const bullets = [
    t('virtualArtists.welcome.bullet1', 'Crea múltiples artistas virtuales'),
    t('virtualArtists.welcome.bullet2', 'Genera canciones completas en minutos'),
    t('virtualArtists.welcome.bullet3', 'Usa voces predefinidas para tus canciones'),
    t('virtualArtists.welcome.bullet4', 'Registra y protege tu música automáticamente'),
    t('virtualArtists.welcome.bullet5', 'Distribuye y monetiza sin complicaciones'),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&>button:last-child]:hidden">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 z-50 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white mx-auto">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t('virtualArtists.welcome.title', 'Crea tu propio artista y lanza música al mundo 🚀')}
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {t('virtualArtists.welcome.subtitle', 'Genera canciones con IA, registra la autoría en blockchain y distribuye tu música en plataformas como Spotify.')}
            </p>
          </div>

          {/* Visual Flow */}
          <div className="rounded-xl bg-muted/40 border border-border/60 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              {flowSteps.map((step, i) => (
                <div key={i} className="contents">
                  <div className="flex flex-row sm:flex-col items-center gap-2 text-center">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white shrink-0`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium leading-tight">{step.label}</span>
                  </div>
                  {i < flowSteps.length - 1 && (
                    <span className="text-muted-foreground font-light hidden sm:block">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Benefit text */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/90">
              {t('virtualArtists.welcome.benefit', 'Por primera vez, cualquiera puede crear y escalar artistas sin estudio, sin equipo y sin barreras.')}
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-2.5">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{b}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" className="flex-1" onClick={onCreateFirst}>
              👉 {t('virtualArtists.welcome.ctaPrimary', 'Crear mi primer artista virtual')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t('virtualArtists.welcome.ctaSecondary', 'Ver cómo funciona')}
            </Button>
          </div>

          {/* Footnote */}
          <p className="text-xs text-muted-foreground text-center">
            {t('virtualArtists.welcome.footnote', 'Todo funciona con créditos. Solo pagas por lo que usas.')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
