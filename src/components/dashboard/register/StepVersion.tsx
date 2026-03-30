import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { VERSION_TYPES, type WizardData } from './types';
import { useVersionTypeLabels } from './useWizardLabels';

interface StepVersionProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepVersion({ data, onUpdate, onNext, onBack }: StepVersionProps) {
  const { t } = useTranslation();
  const versionTypeLabels = useVersionTypeLabels();
  const valid = !!data.versionType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.version.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.version.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">{t('wizard.version.typeLabel')} *</Label>
          <Select value={data.versionType} onValueChange={(v) => onUpdate({ versionType: v })}>
            <SelectTrigger><SelectValue placeholder={t('wizard.version.typePlaceholder')} /></SelectTrigger>
            <SelectContent>
              {VERSION_TYPES.map((vt) => (
                <SelectItem key={vt.value} value={vt.value}>{versionTypeLabels[vt.value] || vt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">{t('wizard.version.titleLabel')} <span className="text-muted-foreground">({t('wizard.optional')})</span></Label>
          <Input
            value={data.versionTitle}
            onChange={(e) => onUpdate({ versionTitle: e.target.value })}
            placeholder={t('wizard.version.titlePlaceholder')}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">{t('wizard.version.descLabel')} <span className="text-muted-foreground">({t('wizard.optional')})</span></Label>
          <Textarea
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={3}
            placeholder={t('wizard.version.descPlaceholder')}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>{t('wizard.back')}</Button>
        <Button variant="hero" onClick={onNext} disabled={!valid}>{t('wizard.continue')}</Button>
      </div>
    </div>
  );
}
