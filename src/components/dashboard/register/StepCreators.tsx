import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { CREATOR_ROLES, type WizardData, type Creator } from './types';
import { useCreatorRoleLabels } from './useWizardLabels';

interface StepCreatorsProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepCreators({ data, onUpdate, onNext, onBack }: StepCreatorsProps) {
  const { t } = useTranslation();
  const roleLabels = useCreatorRoleLabels();
  const { creators } = data;

  const update = (id: string, patch: Partial<Creator>) => {
    onUpdate({
      creators: creators.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const toggleRole = (id: string, role: string) => {
    const c = creators.find((x) => x.id === id);
    if (!c) return;
    const roles = c.roles.includes(role)
      ? c.roles.filter((r) => r !== role)
      : [...c.roles, role];
    update(id, { roles });
  };

  const add = () => {
    onUpdate({
      creators: [...creators, { id: crypto.randomUUID(), name: '', email: '', roles: [], percentage: null }],
    });
  };

  const remove = (id: string) => {
    if (creators.length <= 1) return;
    onUpdate({ creators: creators.filter((c) => c.id !== id) });
  };

  const usesPercentages = creators.some((c) => c.percentage !== null && c.percentage > 0);
  const totalPct = creators.reduce((sum, c) => sum + (c.percentage ?? 0), 0);
  const pctValid = !usesPercentages || totalPct === 100;

  const valid =
    creators.length >= 1 &&
    creators.every((c) => c.name.trim() && c.roles.length > 0) &&
    pctValid;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.creators.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.creators.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {creators.map((c, idx) => (
          <Card key={c.id} className="border-border/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t('wizard.creators.creatorN', { n: idx + 1 })}</p>
                {creators.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t('wizard.creators.nameLabel')} *</Label>
                  <Input value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} placeholder={t('wizard.creators.namePlaceholder')} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('wizard.creators.emailLabel')} <span className="text-muted-foreground">({t('wizard.optional')})</span></Label>
                  <Input value={c.email} onChange={(e) => update(c.id, { email: e.target.value })} placeholder="email@ejemplo.com" className="h-9" type="email" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t('wizard.creators.rolesLabel')} *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CREATOR_ROLES.map((r) => (
                    <Badge
                      key={r.value}
                      variant={c.roles.includes(r.value) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer text-xs transition-colors',
                        c.roles.includes(r.value) && 'bg-primary hover:bg-primary/90'
                      )}
                      onClick={() => toggleRole(c.id, r.value)}
                    >
                      {roleLabels[r.value] || r.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t('wizard.creators.pctLabel')} <span className="text-muted-foreground">({t('wizard.optional')})</span></Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={c.percentage ?? ''}
                  onChange={(e) => update(c.id, { percentage: e.target.value ? Number(e.target.value) : null })}
                  placeholder={t('wizard.creators.pctPlaceholder')}
                  className="h-9 w-32"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('wizard.creators.addCreator')}
        </Button>
        {usesPercentages && (
          <p className={cn('text-sm font-medium', totalPct === 100 ? 'text-emerald-600' : 'text-amber-600')}>
            {t('wizard.creators.totalRights', { pct: totalPct })}
          </p>
        )}
      </div>

      {usesPercentages && totalPct !== 100 && (
        <p className="text-xs text-destructive">{t('wizard.creators.pctError')}</p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>{t('wizard.back')}</Button>
        <Button variant="hero" onClick={onNext} disabled={!valid}>{t('wizard.continue')}</Button>
      </div>
    </div>
  );
}
