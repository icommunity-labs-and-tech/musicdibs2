import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProductTracking } from '@/hooks/useProductTracking';

interface DistributionInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DistributionInfoModal = ({ open, onOpenChange }: DistributionInfoModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userEmail = user?.email ?? '';
  const { track } = useProductTracking();

  const [loading, setLoading] = useState(true);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from('works')
      .select('id')
      .eq('user_id', user.id)
      .not('distributed_at', 'is', null)
      .limit(1)
      .then(({ data }) => {
        setIsReturningUser((data?.length ?? 0) > 0);
        setLoading(false);
      });
  }, [open, user]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(userEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [userEmail]);

  const distributionUrl = userEmail
    ? `https://dist.musicdibs.com/?login_hint=${encodeURIComponent(userEmail)}`
    : 'https://dist.musicdibs.com/';

  const handleContinue = () => {
    track('distribution_clicked', { feature: 'distribution' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isReturningUser ? (
          /* ── RETURNING USER ── */
          <>
            <DialogHeader>
              <DialogTitle>Accede a tu plataforma de distribución 🎵</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Tu cuenta de distribución ya está configurada. Accede directamente con:
              </p>

              {/* Email card */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <span className="flex-1 truncate text-sm font-medium">{userEmail}</span>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8" onClick={handleCopy}>
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Usa el mismo email y la contraseña que creaste en tu primer acceso a dist.musicdibs.com
              </p>

              <div className="border-t border-border" />

              <p className="text-xs text-muted-foreground">
                ¿No recuerdas tu contraseña?{' '}
                <a
                  href="https://dist.musicdibs.com/forgot_pwd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Recupérala aquí
                </a>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
              <Button asChild className="flex-1 gap-2" onClick={handleContinue}>
                <a href={distributionUrl} target="_blank" rel="noopener noreferrer">
                  Acceder a distribución <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </>
        ) : (
          /* ── NEW USER ── */
          <>
            <DialogHeader>
              <DialogTitle>Distribuye tu música en 220+ plataformas 🚀</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Steps */}
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  <span className="text-sm pt-0.5">Haz click en <strong>"Comenzar"</strong> — te abrimos la plataforma de distribución en una nueva ventana</span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  <div className="space-y-1.5 flex-1">
                    <span className="text-sm">Usa este email para acceder. Recibirás un email nuestro con instrucciones para crear tu contraseña de acceso — revisa también la carpeta de spam.</span>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                      <span className="flex-1 truncate text-sm font-medium">{userEmail}</span>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1.5 h-8" onClick={handleCopy}>
                        {copied ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                      </Button>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                  <span className="text-sm pt-0.5">Completa la verificación de identidad (5 min, solo una vez)</span>
                </li>

                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                  <span className="text-sm pt-0.5">¡Listo! Vuelve aquí cuando quieras distribuir más obras</span>
                </li>
              </ol>

              {/* Partner note */}
              <p className="text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/30 p-3">
                La distribución se gestiona a través de nuestra plataforma especializada. Tu música llegará a Spotify, Apple Music, Amazon Music, TikTok y 215+ plataformas más.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
              <Button asChild className="flex-1 gap-2" onClick={handleContinue}>
                <a href={distributionUrl} target="_blank" rel="noopener noreferrer">
                  Comenzar distribución <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
