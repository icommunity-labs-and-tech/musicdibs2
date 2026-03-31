import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Megaphone, Crown, Sparkles, Video, Users, Instagram, ArrowRight,
} from 'lucide-react';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { PremiumPromoForm } from '@/components/dashboard/PremiumPromoForm';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';

interface Work {
  id: string;
  title: string;
  author: string | null;
  type: string;
  source: 'registered' | 'ai_studio';
}

type PromoView = 'selector' | 'standard' | 'premium';

export default function PromotePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<PromoView>('selector');
  const [works, setWorks] = useState<Work[]>([]);

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

  useEffect(() => { loadWorks(); }, [loadWorks]);

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
        <PremiumPromoForm works={works} onBack={() => setView('selector')} />
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
    </div>
  );
}
