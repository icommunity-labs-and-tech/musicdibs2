import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DistributionInfoModal } from '@/components/DistributionInfoModal';
import { useTranslation } from 'react-i18next';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { PaymentAlertBanner } from '@/components/dashboard/PaymentAlertBanner';
import { RecentRegistrations } from '@/components/dashboard/RecentRegistrations';
import { Card, CardContent } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, Shield, AlertCircle, Loader2, CheckCircle2, Share2, Sparkles, CircleDollarSign, Rocket, X, Lock, FolderOpen, Music, Film, ImageIcon, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKycGuard } from '@/hooks/useKycGuard';
import type { DashboardSummary } from '@/types/dashboard';
import { useUsageTracking } from '@/hooks/useUsageTracking';

export default function DashboardHome() {
  const { trackUsage } = useUsageTracking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { guardRegister } = useKycGuard();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [worksCount, setWorksCount] = useState<number | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(() => sessionStorage.getItem('newUserBannerDismissed') === 'true');
  const [assetCounts, setAssetCounts] = useState({ songs: 0, videos: 0, covers: 0, voices: 0 });
  useEffect(() => {
    if (!user) return;
    trackUsage('dashboard_access');
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
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setWorksCount(count ?? 0));

    // Asset counts for media library widget
    Promise.all([
      supabase.from('ai_generations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('video_generations').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'COMPLETED'),
      supabase.from('social_promotions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('image_url', 'is', null),
      supabase.from('voice_clones').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    ]).then(([songs, videos, covers, voices]) => {
      setAssetCounts({
        songs: songs.count ?? 0,
        videos: videos.count ?? 0,
        covers: covers.count ?? 0,
        voices: voices.count ?? 0,
      });
    });
  }, [user]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PaymentAlertBanner />

      {/* Banner for new users with no works */}
      {worksCount === 0 && !bannerDismissed && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 relative">
          <button
            onClick={() => { setBannerDismissed(true); sessionStorage.setItem('newUserBannerDismissed', 'true'); }}
            className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">{t('dashboard.home.newUserTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.home.newUserDesc')}</p>
            </div>
            <Button
              variant="hero"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => navigate('/dashboard/launch')}
            >
              <Rocket className="h-3.5 w-3.5" />
              {t('dashboard.home.newUserBtn')}
            </Button>
          </CardContent>
        </Card>
      )}
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
        {/* Col 1: Account Summary + AI Studio */}
        <div className="space-y-4">
          <div data-tour="account-summary">
            <AccountSummary onSummaryLoaded={setSummary} subscriptionEnd={subscriptionEnd} cancelAtPeriodEnd={cancelAtPeriodEnd} />
          </div>
          <Card
            data-tour="ai-studio"
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
                <Badge variant="secondary" className="text-xs">🎧 {t('dashboard.home.aiStudioMastering', 'Masterizado profesional')}</Badge>
                <Badge variant="secondary" className="text-xs">🎤 {t('dashboard.home.aiStudioVoice')}</Badge>
                <Badge variant="secondary" className="text-xs">🎨 {t('dashboard.home.aiStudioImages')}</Badge>
                <Badge variant="secondary" className="text-xs">🎬 {t('dashboard.home.aiStudioVideos')}</Badge>
              </div>
              <Button variant="hero" className="w-full">
                {t('dashboard.home.aiStudioButton')}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Col 2: Register CTA + Distribute */}
        <div className="space-y-4">
          <div data-tour="register-work">
            <Card className="border-border/40 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">{t('dashboard.home.registerNew')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.home.registerNewDesc')}
                  </p>
                </div>
                <Button variant="hero" onClick={() => guardRegister()} className="w-full">
                  {t('dashboard.home.goToRegister')}
                </Button>
              </CardContent>
            </Card>
          </div>
          <Card data-tour="distribute" className={`border-border/40 shadow-sm transition-all ${summary?.subscriptionPlan === 'Annual' ? 'cursor-pointer hover:shadow-lg hover:border-primary/50' : 'opacity-70'}`} onClick={() => summary?.subscriptionPlan === 'Annual' ? setShowDistributionModal(true) : undefined}>
            <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Share2 className="h-6 w-6 text-blue-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">{t('dashboard.home.distributeWork')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.home.distributeWorkDesc')}
                </p>
                <p className="text-sm font-semibold text-green-500 flex items-center justify-center gap-1.5">
                  <CircleDollarSign className="h-4 w-4" />
                  {t('dashboard.home.distributeRoyalties', 'Recibe el 95% de tus royalties.')}
                </p>
              </div>
              {summary?.subscriptionPlan === 'Annual' ? (
                <Button variant="blue" className="w-full">
                  {t('dashboard.home.goToDistribute')}
                </Button>
              ) : (
                <div className="w-full space-y-2">
                  <Button variant="outline" className="w-full gap-1.5 opacity-60" disabled>
                    <Lock className="h-3.5 w-3.5" />
                    {t('dashboard.home.goToDistribute')}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('dashboard.distribute.annualOnly', { defaultValue: 'Disponible solo con suscripción anual' })}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Col 3: Credit Store + Media Library */}
        <div className="space-y-4">
          <div data-tour="credit-store">
            <CreditStore compact cancelAtPeriodEnd={cancelAtPeriodEnd} />
          </div>
          {/* Media Library quick access */}
          <Card
            className="border-border/40 shadow-sm cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
            onClick={() => navigate('/dashboard/media-library')}
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Biblioteca multimedia</h3>
                  <p className="text-xs text-muted-foreground">
                    {assetCounts.songs + assetCounts.videos + assetCounts.covers + assetCounts.voices} assets creados
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Music, label: "Canciones", count: assetCounts.songs, color: "text-violet-500" },
                  { icon: Film, label: "Vídeos", count: assetCounts.videos, color: "text-blue-500" },
                  { icon: ImageIcon, label: "Portadas", count: assetCounts.covers, color: "text-pink-500" },
                  { icon: Mic, label: "Voces", count: assetCounts.voices, color: "text-emerald-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span className="text-xs font-medium">{item.count}</span>
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs">
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Abrir biblioteca
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Registrations spanning cols 1-2 */}
        <div className="md:col-span-2" data-tour="recent-registrations">
          <RecentRegistrations />
        </div>
      </div>
      <DistributionInfoModal open={showDistributionModal} onOpenChange={setShowDistributionModal} />
    </div>
  );
}
