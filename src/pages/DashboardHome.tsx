import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { PaymentAlertBanner } from '@/components/dashboard/PaymentAlertBanner';
import { RecentRegistrations } from '@/components/dashboard/RecentRegistrations';
import { FirstHitFlow } from '@/components/dashboard/FirstHitFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, Shield, AlertCircle, Loader2, CheckCircle2, Share2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardSummary } from '@/types/dashboard';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [hasWorks, setHasWorks] = useState<boolean | null>(null);
  const storageKey = user ? `musicdibs_skip_first_hit_${user.id}` : null;
  const [skipFirstHit, setSkipFirstHit] = useState(() => {
    if (!storageKey) return false;
    return localStorage.getItem(storageKey) === '1';
  });

  useEffect(() => {
    if (!user) return;
    const check = () => {
      supabase.functions.invoke('check-subscription').then(({ data, error }) => {
        if (error) console.error('[check-subscription]', error);
        else {
          setSubscriptionEnd(data?.subscription_end ?? null);
          setCancelAtPeriodEnd(data?.cancel_at_period_end === true);
        }
      });
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('works')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        setHasWorks((count ?? 0) > 0);
      });
  }, [user]);

  if (hasWorks === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasWorks === false && !skipFirstHit) {
    return <FirstHitFlow onSkip={() => {
      if (storageKey) localStorage.setItem(storageKey, '1');
      setSkipFirstHit(true);
    }} />;
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PaymentAlertBanner />
      {/* KYC verification alert */}
      {summary && summary.kycStatus !== 'verified' && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{t('dashboard.home.kycRequired')}</p>
                <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {summary.kycStatus === 'pending' ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> {t('dashboard.home.kycPending')}</>
                  ) : (
                    <><AlertCircle className="h-3 w-3" /> {t('dashboard.home.kycUnverified')}</>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.kycStatus === 'pending'
                  ? t('dashboard.home.kycPendingDesc')
                  : t('dashboard.home.kycUnverifiedDesc')}
              </p>
            </div>
            {summary.kycStatus === 'unverified' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 shrink-0"
                onClick={() => navigate('/dashboard/verify-identity')}
              >
                <Shield className="h-3.5 w-3.5" /> {t('dashboard.home.verifyIdentity')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Row 1: Account Summary | Register CTA | Credit Store */}
        <div data-tour="account-summary">
          <AccountSummary onSummaryLoaded={setSummary} subscriptionEnd={subscriptionEnd} cancelAtPeriodEnd={cancelAtPeriodEnd} />
        </div>
        <div data-tour="register-work">
          <Card className="border-border/40 shadow-sm h-full">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">{t('dashboard.home.registerNew')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.home.registerNewDesc')}
                </p>
              </div>
              <Button variant="hero" onClick={() => navigate('/dashboard/register')} className="w-full">
                {t('dashboard.home.goToRegister')}
              </Button>
            </CardContent>
          </Card>
        </div>
        <div data-tour="credit-store">
          <CreditStore compact cancelAtPeriodEnd={cancelAtPeriodEnd} />
        </div>

        {/* Row 2: AI Studio | Distribute */}
        <Card
          className="border-border/40 shadow-sm cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
          onClick={() => navigate('/ai-studio')}
        >
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">{t('dashboard.home.aiStudioTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.home.aiStudioDesc')}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <Badge variant="secondary" className="text-xs">🎵 {t('dashboard.home.aiStudioMusic')}</Badge>
              <Badge variant="secondary" className="text-xs">🎤 {t('dashboard.home.aiStudioVoice')}</Badge>
              <Badge variant="secondary" className="text-xs">🎨 {t('dashboard.home.aiStudioImages')}</Badge>
              <Badge variant="secondary" className="text-xs">🎬 {t('dashboard.home.aiStudioVideos')}</Badge>
            </div>
            <Button variant="hero" className="w-full">
              {t('dashboard.home.aiStudioButton')}
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
              <Share2 className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">{t('dashboard.home.distributeWork')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.home.distributeWorkDesc')}
              </p>
              <p className="text-sm font-medium text-emerald-500">
                {t('dashboard.home.distributeRoyalties')}
              </p>
            </div>
            <Button variant="blue" className="w-full" asChild>
              <a href="https://dist.musicdibs.com/" target="_blank" rel="noopener noreferrer">
                {t('dashboard.home.goToDistribute')}
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Registrations spanning cols 1-2 */}
        <div className="md:col-span-2" data-tour="recent-registrations">
          <RecentRegistrations />
        </div>
      </div>
    </div>
  );
}
