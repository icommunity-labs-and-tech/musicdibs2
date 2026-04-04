import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Crown, Video, Users, Instagram, Loader2,
} from 'lucide-react';
import { PremiumPromoForm } from '@/components/dashboard/PremiumPromoForm';
import { PricingLink } from '@/components/dashboard/PricingPopup';
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
  const [showForm, setShowForm] = useState(false);
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

  if (showForm) {
    return (
      <div className="max-w-3xl space-y-4" key={i18n.language}>
        <PremiumPromoForm
          works={works}
          onBack={() => { setShowForm(false); loadPremiumPromos(); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6" key={i18n.language}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('dashboard.promoSelector.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('dashboard.promoSelector.subtitle')}</p>
      </div>

      {/* Premium promo card */}
      <Card
        className="border-amber-500/30 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden"
        onClick={() => setShowForm(true)}
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/10 to-transparent" />
        <CardContent className="p-5 space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <PricingLink />
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
              <Users className="h-2.5 w-2.5" /> 200K+
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

      {/* Social links */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('dashboard.promoSelector.followUs', 'Síguenos en nuestras redes')}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://www.tiktok.com/@musicdibs_"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 rounded-lg transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" />
            </svg>
            @musicdibs_
          </a>
          <a
            href="https://www.instagram.com/musicdibs/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 rounded-lg transition-colors text-sm"
          >
            <Instagram className="h-4 w-4" />
            @musicdibs
          </a>
        </div>
      </div>

      {/* Premium promo history */}
      {premiumPromos.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">{t('dashboard.premium.historyTitle', 'Historial de Promos Premium')}</h3>
          <div className="space-y-2">
            {premiumPromos.map(p => {
              const statusMap = getStatusMap((k, f) => t(k, { defaultValue: f }));
              const st = statusMap[p.status] || statusMap.submitted;
              return (
                <Card key={p.id} className="border-border/30">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.artist_name} — {p.song_title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
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
