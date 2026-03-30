import { FileUp, GitBranch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { WizardData } from './types';

interface StepEntryProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
}

export function StepEntry({ data, onUpdate, onNext }: StepEntryProps) {
  const { t } = useTranslation();

  const options = [
    {
      value: 'new' as const,
      icon: FileUp,
      title: t('wizard.entry.newTitle'),
      description: t('wizard.entry.newDesc'),
    },
    {
      value: 'version' as const,
      icon: GitBranch,
      title: t('wizard.entry.versionTitle'),
      description: t('wizard.entry.versionDesc'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.entry.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.entry.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => (
          <Card
            key={opt.value}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md',
              data.flow === opt.value
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border/40'
            )}
            onClick={() => onUpdate({ flow: opt.value })}
          >
            <CardContent className="p-5 space-y-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                data.flow === opt.value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                <opt.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-sm">{opt.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={onNext}
        disabled={!data.flow}
        variant="hero"
        className="w-full sm:w-auto"
      >
        {t('wizard.continue')}
      </Button>
    </div>
  );
}
