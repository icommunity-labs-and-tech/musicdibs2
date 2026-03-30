import { CheckCircle2, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import type { WizardData } from './types';

interface StepSuccessProps {
  data: WizardData;
  registrationId: string;
  fileHash?: string;
  onRegisterAnother: () => void;
}

export function StepSuccess({ data, registrationId, fileHash, onRegisterAnother }: StepSuccessProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isVersion = data.flow === 'version';
  const dateLang = i18n.resolvedLanguage || 'es';

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">{t('wizard.success.title')}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{t('wizard.success.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs text-left w-full max-w-sm bg-card rounded-lg border border-border/40 p-4">
        {isVersion && data.parentWorkTitle && (
          <div>
            <span className="text-muted-foreground">{t('wizard.success.originalWork')}</span>{' '}
            <span className="font-medium">{data.parentWorkTitle}</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{t('wizard.success.regId')}</span>{' '}
          <span className="font-mono">{registrationId.slice(0, 12)}...</span>
        </div>
        {fileHash && (
          <div>
            <span className="text-muted-foreground">{t('wizard.success.fileHash')}</span>{' '}
            <span className="font-mono">{fileHash.slice(0, 16)}...</span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">{t('wizard.success.date')}</span>{' '}
          <span>{new Date().toLocaleDateString(dateLang)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate('/dashboard/blockchain')}>
          <Eye className="h-4 w-4 mr-1.5" />
          {t('wizard.success.viewReg')}
        </Button>
        <Button variant="hero" onClick={onRegisterAnother}>
          <Plus className="h-4 w-4 mr-1.5" />
          {isVersion ? t('wizard.success.registerAnotherVersion') : t('wizard.success.registerAnother')}
        </Button>
      </div>
    </div>
  );
}
