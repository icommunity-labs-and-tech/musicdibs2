import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DistributionInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DistributionInfoModal = ({ open, onOpenChange }: DistributionInfoModalProps) => {
  const { t } = useTranslation();

  const handleContinue = () => {
    window.open('https://dist.musicdibs.com/', '_blank', 'noopener');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dashboard.distributionModal.title', 'Antes de continuar con la distribución')}</DialogTitle>
          <DialogDescription>
            {t('dashboard.distributionModal.subtitle', 'Para distribuir tu música en plataformas como Spotify, Apple Music o TikTok, es necesario completar un proceso inicial de configuración.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* First time */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-semibold">
              🔹 {t('dashboard.distributionModal.firstTimeTitle', 'Si es tu primera vez')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.distributionModal.firstTimeIntro', 'Tendrás que:')}
            </p>
            <ul className="space-y-1.5 ml-1">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {t('dashboard.distributionModal.step1', 'Crear tu cuenta de distribución')}
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {t('dashboard.distributionModal.step2', 'Completar la verificación de identidad (KYC)')}
              </li>
            </ul>
            <p className="text-xs font-medium text-foreground/80">
              👉 {t('dashboard.distributionModal.firstTimeNote', 'Este paso es obligatorio y solo se realiza una vez.')}
            </p>
          </div>

          {/* Returning user */}
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-semibold">
              🔹 {t('dashboard.distributionModal.returningTitle', 'Si ya has distribuido antes')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.distributionModal.returningDesc', 'Puedes acceder directamente con tus credenciales y continuar distribuyendo tu música sin repetir el proceso.')}
            </p>
          </div>

          {/* Recommendation */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1">
            <p className="text-sm font-semibold">💡 {t('dashboard.distributionModal.tipTitle', 'Recomendación')}</p>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.distributionModal.tipDesc', 'Para evitar problemas de acceso, te recomendamos usar el mismo email y contraseña que en MusicDibs.')}
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('dashboard.distributionModal.timeNote', 'Este proceso suele tardar solo unos minutos.')}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {t('dashboard.distributionModal.cancel', 'Cancelar')}
          </Button>
          <Button variant="hero" onClick={handleContinue} className="flex-1 gap-2">
            {t('dashboard.distributionModal.continue', 'Continuar a distribución')}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
