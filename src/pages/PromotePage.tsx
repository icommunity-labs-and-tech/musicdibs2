import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Megaphone, Crown, Sparkles, Video, Users, Instagram, ArrowRight, Clock, CheckCircle2, Loader2,
} from 'lucide-react';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { PremiumPromoForm } from '@/components/dashboard/PremiumPromoForm';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Work {
  id: string;
  title: string;
  author: string | null;
  type: string;
  source: 'registered' | 'ai_studio';
}

interface PremiumPromo {
  id: string;
  artist_name: string;
  song_title: string;
  status: string;
  created_at: string;
  credits_spent: number;
}

type PromoView = 'selector' | 'standard' | 'premium';

const getStatusMap = (t: (key: string, fallback: string) => string): Record<string, { label: string; color: string }> => ({
  submitted: { label: t('dashboard.premium.statusPending', 'Pendiente de revisión'), color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  under_review: { label: t('dashboard.premium.statusUnderReview', 'En revisión'), color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  approved: { label: t('dashboard.premium.statusApproved', 'Aprobada'), color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  scheduled: { label: t('dashboard.premium.statusScheduled', 'Programada'), color: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  published: { label: t('dashboard.premium.statusPublished', 'Publicada'), color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  rejected: { label: t('dashboard.premium.statusRejected', 'Rechazada'), color: 'bg-red-500/10 text-red-600 border-red-500/20' },
});

export default function PromotePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<PromoView>('selector');
  const [works, setWorks] = useState<Work[]>([]);
  const [premiumPromos, setPremiumPromos] = useState<PremiumPromo[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);

  const loadWorks = useCallback(async () => {
    if (!user) return;
    const [worksRes, genRes, profileRes] = await Promise.all([
      supabase
        .from('works')
        .select('id, title, author, type, status')
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_generations')
        .select('id, prompt, genre, mood')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('user_artist_profiles')
        .select('name')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle(),
    ]);
    const defaultArtistName = profileRes.data?.name || null;
    const registered: Work[] = (worksRes.data || []).map((w: any) => ({
      id: w.id, title: w.title, author: w.author, type: w.type, source: 'registered' as const,
    }));
    const registeredTitles = new Set(registered.map(w => w.title?.toLowerCase()));
    const aiWorks: Work[] = (genRes.data || [])
      .filter((g: any) => g.prompt && !registeredTitles.has(g.prompt.toLowerCase()))
      .map((g: any) => ({
        id: g.id, title: g.prompt, author: defaultArtistName, type: 'audio', source: 'ai_studio' as const,
      }));
    setWorks([...registered, ...aiWorks]);
  }, [user]);

  const loadPremiumPromos = useCallback(async () => {
    if (!user) return;
    setLoadingPromos(true);
    try {
      const { data } = await supabase
        .from('premium_social_promotions')
        .select('id, artist_name, song_title, status, created_at, credits_spent')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setPremiumPromos(data || []);
    } catch { /* ignore */ }
    setLoadingPromos(false);
  }, [user]);

  useEffect(() => { loadWorks(); loadPremiumPromos(); }, [loadWorks, loadPremiumPromos]);

  if (view === 'standard') {
    return (
      <div className="max-w-3xl space-y-4" key={i18n.language}>
        <Button variant="ghost" size="sm" onClick={() => setView('selector')} className="mb-2 text-xs gap-1">
          <ArrowRight className="h-3 w-3 rotate-180" /> {t('dashboard.premium.backToPromo')}
        </Button>
        <PromoteWorks />
      </div>
    );
  }

  if (view === 'premium') {
    return (
      <div className="max-w-3xl space-y-4" key={i18n.language}>
        <PremiumPromoForm
          works={works}
          onBack={() => { setView('selector'); loadPremiumPromos(); }}
        />
      </div>
    );
  }

  // Selector view
  return (
    <div className="max-w-3xl space-y-6" key={i18n.language}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('dashboard.promoSelector.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('dashboard.promoSelector.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Standard promo card */}
        <Card
          className="border-border/40 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          onClick={() => setView('standard')}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-[11px] gap-1">
                <Sparkles className="h-3 w-3" /> {FEATURE_COSTS.promote_work} {t('dashboard.promoSelector.credits')}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                {t('dashboard.promoSelector.standardTitle')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t('dashboard.promoSelector.standardDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                <Instagram className="h-2.5 w-2.5" /> Copies
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> {t('dashboard.promoSelector.aiImage')}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                ⚡ {t('dashboard.promoSelector.instant')}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              {t('dashboard.promoSelector.standardCta')} <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Premium promo card */}
        <Card
          className="border-amber-500/30 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
          onClick={() => setView('premium')}
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/10 to-transparent" />
          <CardContent className="p-5 space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <Badge className="text-[11px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Crown className="h-3 w-3" /> {FEATURE_COSTS.promote_premium} {t('dashboard.promoSelector.credits')}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-semibold group-hover:text-amber-600 transition-colors">
                {t('dashboard.promoSelector.premiumTitle')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t('dashboard.promoSelector.premiumDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-500/20">
                <Video className="h-2.5 w-2.5" /> {t('dashboard.promoSelector.customVideo')}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-500/20">
                <Users className="h-2.5 w-2.5" /> 350K+
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-500/20">
                <Instagram className="h-2.5 w-2.5" /> TikTok + IG
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              {t('dashboard.promoSelector.premiumCta')} <Crown className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Premium promo history */}
      {premiumPromos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t('dashboard.premium.historyTitle', 'Historial de Promos Premium')}</h3>
          <div className="space-y-2">
            {premiumPromos.map(p => {
              const st = STATUS_MAP[p.status] || STATUS_MAP.submitted;
              return (
                <Card key={p.id} className="border-border/30">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.artist_name} — {p.song_title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()} · {p.credits_spent} créditos
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${st.color}`}>
                      {st.label}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {loadingPromos && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
