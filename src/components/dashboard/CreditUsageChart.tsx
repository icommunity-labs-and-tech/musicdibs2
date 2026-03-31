import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const FEATURE_MAP: Record<string, { labelKey: string; color: string }> = {
  register_work:  { labelKey: 'dashboard.creditChart.registerWork', color: '#431884' },
  promote_work:   { labelKey: 'dashboard.creditChart.promotion', color: '#3A50B0' },
  generate_audio: { labelKey: 'dashboard.creditChart.generateAudio', color: '#5972C2' },
  edit_audio:     { labelKey: 'dashboard.creditChart.editAudio', color: '#7BB3F0' },
  generate_video: { labelKey: 'dashboard.creditChart.generateVideo', color: '#8090D0' },
  other:          { labelKey: 'dashboard.creditChart.other', color: '#94A3B8' },
};

function parseFeature(description: string | null): string {
  if (!description) return 'other';
  const d = description.toLowerCase();
  if (d.includes('register_work') || d.includes('registro'))  return 'register_work';
  if (d.includes('promote_work')  || d.includes('promoción') || d.includes('promocion')) return 'promote_work';
  if (d.includes('generate_audio') || d.includes('audio'))    return 'generate_audio';
  if (d.includes('edit_audio'))                               return 'edit_audio';
  if (d.includes('generate_video') || d.includes('vídeo') || d.includes('video')) return 'generate_video';
  return 'other';
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  feature: string;
}

function CustomTooltip({ active, payload }: any) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">
        {t('dashboard.creditChart.nCredits', { n: value })}
      </p>
    </div>
  );
}

function CustomLegend({ data, total }: { data: ChartEntry[]; total: number }) {
  return (
    <div className="space-y-2">
      {data.map(entry => (
        <div key={entry.feature} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-foreground">{entry.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums text-foreground">{entry.value}</span>
            <span className="text-muted-foreground text-xs w-10 text-right">
              {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CreditUsageChart() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [data, setData]       = useState<ChartEntry[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<'30' | '90' | 'all'>('30');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      let query = supabase
        .from('credit_transactions')
        .select('amount, description, created_at')
        .eq('user_id', user.id)
        .eq('type', 'usage')
        .lt('amount', 0);

      if (period !== 'all') {
        const since = new Date();
        since.setDate(since.getDate() - parseInt(period));
        query = query.gte('created_at', since.toISOString());
      }

      const { data: txs } = await query;

      if (!txs || txs.length === 0) {
        setData([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      const counts: Record<string, number> = {};
      for (const tx of txs) {
        const feature = parseFeature(tx.description);
        counts[feature] = (counts[feature] || 0) + Math.abs(tx.amount);
      }

      const entries: ChartEntry[] = Object.entries(counts)
        .map(([feature, value]) => ({
          feature,
          name: t(FEATURE_MAP[feature]?.labelKey || 'dashboard.creditChart.other'),
          color: FEATURE_MAP[feature]?.color  || '#94A3B8',
          value,
        }))
        .sort((a, b) => b.value - a.value);

      const totalCredits = entries.reduce((s, e) => s + e.value, 0);
      setData(entries);
      setTotal(totalCredits);
      setLoading(false);
    };
    load();
  }, [user, period, t, i18n.resolvedLanguage]);

  const periodLabel = {
    '30':  t('dashboard.creditChart.last30'),
    '90':  t('dashboard.creditChart.last90'),
    'all': t('dashboard.creditChart.allTime'),
  }[period];

  if (loading) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t('dashboard.creditChart.title')}
        </CardTitle>

        <div className="flex rounded-lg border border-border/60 overflow-hidden text-xs">
          {(['30', '90', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
                {p === '30' ? t('dashboard.creditChart.d30') : p === '90' ? t('dashboard.creditChart.d90') : t('dashboard.creditChart.all')}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('dashboard.creditChart.noUsage', { period: periodLabel.toLowerCase() })}
          </p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-[180px] h-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={data.length > 1 ? 3 : 0}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {data.map(entry => (
                        <Cell key={entry.feature} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-foreground">{total}</span>
                  <span className="text-xs text-muted-foreground">{t('dashboard.creditChart.credits')}</span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <CustomLegend data={data} total={total} />
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground text-center">
              {t('dashboard.creditChart.periodNote', { period: periodLabel })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
