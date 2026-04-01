import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Coins, RefreshCw, CalendarClock, AlertTriangle } from 'lucide-react';
import { fetchDashboardSummary } from '@/services/dashboardApi';
import type { DashboardSummary } from '@/types/dashboard';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function AccountSummary({ onSummaryLoaded, subscriptionEnd, cancelAtPeriodEnd }: { onSummaryLoaded?: (s: DashboardSummary) => void; subscriptionEnd?: string | null; cancelAtPeriodEnd?: boolean }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError('');
    try {
      const summary = await fetchDashboardSummary();
      setData(summary);
      onSummaryLoaded?.(summary);
    } catch { setError(t('dashboard.account.loadError')); }
    if (showSpinner) setLoading(false);
  }, [onSummaryLoaded, t]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh when profiles or works change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('account-summary-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, () => load(false))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'works',
        filter: `user_id=eq.${user.id}`,
      }, () => load(false))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  if (loading) return (
    <Card className="border-border/40">
      <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
      <CardContent className="flex gap-6">
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-24" />)}
      </CardContent>
    </Card>
  );

  if (error) return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-6 text-center text-destructive text-sm">{error}</CardContent>
    </Card>
  );

  if (!data) return null;

  const stats = [
    { icon: FileText, value: data.registeredWorks, label: t('dashboard.account.registeredWorks'), color: 'text-primary' },
    { icon: Clock, value: data.pendingRegistrations, label: t('dashboard.account.pendingRegistrations'), color: 'text-amber-500' },
    { icon: Coins, value: data.availableCredits, label: t('dashboard.account.availableCredits'), color: 'text-emerald-500' },
  ];

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">{t('dashboard.account.title')}</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{data.subscriptionPlan}</Badge>
          <button onClick={() => load()} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="text-2xl font-bold">{s.value}</span>
              <span className="text-xs text-muted-foreground text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
        {subscriptionEnd && data.subscriptionPlan !== 'Free' && (() => {
          const endDate = new Date(subscriptionEnd);
          const daysLeft = differenceInDays(endDate, new Date());
          const expiringSoon = daysLeft >= 0 && daysLeft < 7;
          return (
            <>
              <div className={`mt-3 flex items-center gap-1.5 text-xs justify-center ${cancelAtPeriodEnd ? 'text-destructive font-medium' : expiringSoon ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {cancelAtPeriodEnd || expiringSoon ? <AlertTriangle className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                <span>
                   {cancelAtPeriodEnd
                    ? t('dashboard.account.cancelledRenewal', { date: endDate.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }) })
                    : expiringSoon
                      ? t('dashboard.account.expiresIn', { days: daysLeft })
                      : t('dashboard.account.renewal', { date: endDate.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}
                </span>
              </div>
              {expiringSoon && !cancelAtPeriodEnd && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 text-center">
                  {t('dashboard.account.renewalWarning')}
                </div>
              )}
            </>
          );
        })()}
      </CardContent>
    </Card>
  );
}
