import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import type { WizardData } from './types';

interface Work {
  id: string;
  title: string;
  created_at: string;
  type: string;
}

interface StepParentWorkProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepParentWork({ data, onUpdate, onNext, onBack }: StepParentWorkProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: w } = await supabase
        .from('works')
        .select('id, title, created_at, type')
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .order('created_at', { ascending: false });
      setWorks(w || []);
      setLoading(false);
    })();
  }, [user]);

  const filtered = works.filter((w) =>
    w.title.toLowerCase().includes(search.toLowerCase())
  );

  const dateLang = i18n.resolvedLanguage || 'es';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.parent.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.parent.subtitle')}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('wizard.parent.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t('wizard.parent.noResults')}</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {filtered.map((w) => (
            <Card
              key={w.id}
              className={cn(
                'cursor-pointer transition-all',
                data.parentWorkId === w.id
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border/40 hover:border-primary/30'
              )}
              onClick={() => onUpdate({ parentWorkId: w.id, parentWorkTitle: w.title })}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString(dateLang)} · {w.type}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{w.id.slice(0, 8)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>{t('wizard.back')}</Button>
        <Button variant="hero" onClick={onNext} disabled={!data.parentWorkId}>{t('wizard.continue')}</Button>
      </div>
    </div>
  );
}
