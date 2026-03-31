import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, FileText, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DayData {
  date: string;
  registrations: number;
  credits: number;
}

export function ActivityChart() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ registrations: 0, credits: 0 });

  const chartConfig = {
    registrations: {
      label: t('dashboard.activity.registrations'),
      color: 'hsl(var(--primary))',
    },
    credits: {
      label: t('dashboard.activity.creditsUsed'),
      color: 'hsl(var(--accent))',
    },
  };

  useEffect(() => {
    if (!user) return;

    const fetchActivity = async () => {
      setLoading(true);
      const now = new Date();
      const daysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);

      const { data: works } = await supabase
        .from('works')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', daysAgo.toISOString());

      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('created_at, amount')
        .eq('user_id', user.id)
        .eq('type', 'usage')
        .gte('created_at', daysAgo.toISOString());

      const dayMap: Record<string, DayData> = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        dayMap[key] = { date: key, registrations: 0, credits: 0 };
      }

      works?.forEach((w) => {
        const key = w.created_at.split('T')[0];
        if (dayMap[key]) dayMap[key].registrations += 1;
      });

      transactions?.forEach((t) => {
        const key = t.created_at.split('T')[0];
        if (dayMap[key]) dayMap[key].credits += Math.abs(t.amount);
      });

      const chartData = Object.values(dayMap);
      setData(chartData);
      setTotals({
        registrations: chartData.reduce((acc, d) => acc + d.registrations, 0),
        credits: chartData.reduce((acc, d) => acc + d.credits, 0),
      });
      setLoading(false);
    };

    fetchActivity();
  }, [user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t('dashboard.activity.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.activity.registrationsLabel')}</p>
              <p className="text-lg font-semibold text-foreground">{totals.registrations}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10">
            <CreditCard className="h-4 w-4 text-accent-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('dashboard.activity.creditsLabel')}</p>
              <p className="text-lg font-semibold text-foreground">{totals.credits}</p>
            </div>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[140px] w-full">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillCredits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(v) => formatDate(v as string)} />}
            />
            <Area
              type="monotone"
              dataKey="registrations"
              stroke="hsl(var(--primary))"
              fill="url(#fillRegistrations)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="credits"
              stroke="hsl(var(--accent))"
              fill="url(#fillCredits)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
