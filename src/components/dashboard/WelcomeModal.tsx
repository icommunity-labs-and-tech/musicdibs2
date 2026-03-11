import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Sparkles, Music, Shield } from 'lucide-react';

export function WelcomeModal() {
  const { showWelcome, markWelcomed, startTour } = useOnboarding();

  const handleStart = () => {
    markWelcomed();
    startTour();
  };

  const handleExplore = () => {
    markWelcomed();
  };

  return (
    <Dialog open={showWelcome} onOpenChange={(open) => { if (!open) markWelcomed(); }}>
      <DialogContent className="sm:max-w-md border-border/40 bg-background">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Bienvenido a MusicDibs</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
            MusicDibs te permite registrar y proteger tus obras con prueba de autoría verificable y validez legal.
            <br /><br />
            Completa estos primeros pasos para empezar a usar la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Registra y protege</p>
              <p className="text-xs text-muted-foreground">Sube tu obra y genera prueba de autoría</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
            <Sparkles className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium">Crea con IA</p>
              <p className="text-xs text-muted-foreground">Usa AI MusicDibs Studio para componer</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button variant="hero" size="lg" onClick={handleStart} className="w-full">
            Empezar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExplore} className="w-full text-muted-foreground">
            Explorar el panel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
