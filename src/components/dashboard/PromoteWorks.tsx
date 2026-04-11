import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone, Loader2, CheckCircle2, AlertCircle, Music, Copy, ExternalLink,
  Image as ImageIcon, Instagram, Clock, Sparkles, RefreshCw, ChevronLeft, ChevronRight,
  CreditCard, ShoppingCart, Info, Tag, Palette, Mic2, Globe,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { useProductTracking } from '@/hooks/useProductTracking';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Work {
  id: string;
  title: string;
  author: string | null;
  type: string;
  status: string;
  description: string | null;
  checker_url: string | null;
  distributed_at: string | null;
  source: 'registered' | 'ai_studio';
}

interface AiGenMeta {
  prompt: string | null;
  genre: string | null;
  mood: string | null;
}

interface SocialPromo {
  id: string;
  work_id: string;
  status: string;
  image_url: string | null;
  copy_ig_feed: string | null;
  copy_ig_story: string | null;
  copy_tiktok: string | null;
  created_at: string;
  error_detail: string | null;
  regeneration_count: number;
}

const PAGE_SIZE = 5;
const MAX_FREE_REGENS = 3;
const REGEN_CREDIT_COST = 5;

const TONE_OPTIONS = [
  { value: 'urban', labelKey: 'dashboard.promote.toneUrban' },
  { value: 'romantic', labelKey: 'dashboard.promote.toneRomantic' },
  { value: 'indie', labelKey: 'dashboard.promote.toneIndie' },
  { value: 'electronic', labelKey: 'dashboard.promote.toneElectronic' },
  { value: 'pop', labelKey: 'dashboard.promote.tonePop' },
  { value: 'rock', labelKey: 'dashboard.promote.toneRock' },
  { value: 'latino', labelKey: 'dashboard.promote.toneLatino' },
  { value: 'classical', labelKey: 'dashboard.promote.toneClassical' },
  { value: '80s', labelKey: 'dashboard.promote.tone80s' },
  { value: 'religious', labelKey: 'dashboard.promote.toneReligious' },
  { value: 'hiphop', labelKey: 'dashboard.promote.toneHipHop' },
  { value: 'jazz', labelKey: 'dashboard.promote.toneJazz' },
  { value: 'reggaeton', labelKey: 'dashboard.promote.toneReggaeton' },
  { value: 'country', labelKey: 'dashboard.promote.toneCountry' },
  { value: 'metal', labelKey: 'dashboard.promote.toneMetal' },
  { value: 'folk', labelKey: 'dashboard.promote.toneFolk' },
] as const;

const LANG_MAP: Record<string, string> = {
  es: 'español',
  en: 'English',
  'pt-BR': 'português brasileiro',
  fr: 'français',
  it: 'italiano',
  de: 'Deutsch',
};

export function PromoteWorks() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { credits, hasEnough } = useCredits();
  const { track } = useProductTracking();
  const noCredits = !hasEnough(FEATURE_COSTS.promote_work);
  const navigate = useNavigate();

  const [works, setWorks] = useState<Work[]>([]);
  const [promos, setPromos] = useState<SocialPromo[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [polling, setPolling] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState('');
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [aiMetaMap, setAiMetaMap] = useState<Record<string, AiGenMeta>>({});
  const [page, setPage] = useState(0);
  const [detailWorkId, setDetailWorkId] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>('urban');
  const userLang = LANG_MAP[i18n.resolvedLanguage || 'es'] || 'español';
  const statusMap: Record<string, { label: string; color: string; icon: typeof Loader2 }> = {
    generating: { label: t('dashboard.promote.generating'), color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Loader2 },
    assets_ready: { label: t('dashboard.promote.assetsReady'), color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: ImageIcon },
    email_sent: { label: t('dashboard.promote.emailSent'), color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
    completed: { label: t('dashboard.promote.completed'), color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
    failed: { label: t('dashboard.promote.error'), color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingWorks(true);

    const [worksRes, promosRes, genRes, profileRes] = await Promise.all([
      supabase
        .from('works')
        .select('id, title, author, type, status, description, checker_url, distributed_at')
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .order('created_at', { ascending: false }),
      supabase
        .from('social_promotions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_generations')
        .select('id, prompt, genre, mood, created_at')
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

    const registeredWorks: Work[] = (worksRes.data || []).map((w: any) => ({
      ...w,
      source: 'registered' as const,
    }));

    // Build AI generation entries, deduplicating against registered works
    const registeredTitles = new Set(registeredWorks.map(w => w.title?.toLowerCase()));
    const aiWorks: Work[] = (genRes.data || [])
      .filter((g: any) => g.prompt && !registeredTitles.has(g.prompt.toLowerCase()))
      .map((g: any) => ({
        id: g.id,
        title: g.prompt,
        author: defaultArtistName,
        type: 'audio',
        status: 'ai_generated',
        description: [g.genre, g.mood].filter(Boolean).join(' · ') || null,
        checker_url: null,
        distributed_at: null,
        source: 'ai_studio' as const,
      }));

    const allWorks = [...registeredWorks, ...aiWorks];
    setWorks(allWorks);

    // Build AI meta map for registered works
    if (genRes.data) {
      const metaMap: Record<string, AiGenMeta> = {};
      for (const w of registeredWorks) {
        const match = genRes.data.find((g: any) =>
          w.title && g.prompt?.toLowerCase().includes(w.title.toLowerCase())
        );
        if (match) {
          metaMap[w.id] = { prompt: match.prompt, genre: match.genre, mood: match.mood };
        }
      }
      // For AI studio works, always populate meta
      for (const g of genRes.data as any[]) {
        if (!registeredTitles.has(g.prompt?.toLowerCase())) {
          metaMap[g.id] = { prompt: g.prompt, genre: g.genre, mood: g.mood };
        }
      }
      setAiMetaMap(metaMap);
    }

    if (promosRes.data) setPromos(promosRes.data as unknown as SocialPromo[]);
    setLoadingWorks(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for generating promos
  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('social_promotions')
        .select('*')
        .eq('id', polling)
        .single();
      if (data) {
        const p = data as unknown as SocialPromo;
        setPromos(prev => prev.map(x => x.id === p.id ? p : x));
        if (p.status !== 'generating') {
          setPolling(null);
          setRegenerating(null);
          setLaunching(null);
          if (p.status === 'completed' || p.status === 'assets_ready') {
            toast.success(t('dashboard.promote.promoGenerated'));
            track('promotion_generated', { feature: 'promotion' });
          } else if (p.status === 'failed') {
            toast.error(`${t('dashboard.promote.error')}: ${p.error_detail || t('dashboard.promote.unknownError')}`);
          }
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [polling, t]);

  const handleLaunch = async (workId: string) => {
    setLaunching(workId);
    const work = works.find(w => w.id === workId);
    const body: Record<string, any> = { tone: selectedTone, language: userLang };
    if (work?.source === 'ai_studio') {
      body.ai_generation_id = workId;
      if (work.author) body.author = work.author;
    } else {
      body.work_id = workId;
    }
    try {
      const { data, error } = await supabase.functions.invoke('promo-social-generate', { body });
      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error === 'insufficient_credits') {
          toast.error(t('dashboard.promote.insufficientCredits'));
        } else {
          throw new Error(data.error);
        }
        setLaunching(null);
        return;
      }
      const newPromo: SocialPromo = {
        id: data.promo_id,
        work_id: workId,
        status: 'generating',
        image_url: null,
        copy_ig_feed: null,
        copy_ig_story: null,
        copy_tiktok: null,
        created_at: new Date().toISOString(),
        error_detail: null,
        regeneration_count: 0,
      };
      setPromos(prev => [newPromo, ...prev]);
      setPolling(data.promo_id);
      toast.info(t('dashboard.promote.generatingInfo'));
    } catch (err: any) {
      toast.error(err.message || t('dashboard.promote.launchError'));
      setLaunching(null);
    }
    // Note: launching stays set until polling completes — cleared in the poll effect
  };

  const handleRegenerate = async (promoId: string, type: 'copies' | 'image', paid: boolean) => {
    setRegenerating(promoId);
    const fnName = type === 'copies' ? 'promo-social-regenerate-copies' : 'promo-social-regenerate-image';
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { promo_id: promoId, paid, tone: selectedTone, language: userLang },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error === 'insufficient_credits') {
          toast.error(t('dashboard.promote.regenInsufficient'));
          setRegenerating(null);
          return;
        }
        throw new Error(data.error);
      }
      if (data?.regeneration_count != null) {
        setPromos(prev => prev.map(p => p.id === promoId ? { ...p, regeneration_count: data.regeneration_count } : p));
      }
      setPolling(promoId);
      const label = type === 'copies' ? 'copies' : 'imagen';
      toast.info(paid ? t('dashboard.promote.regeneratingPaid', { label, cost: REGEN_CREDIT_COST }) : t('dashboard.promote.regenerating', { label }));
    } catch (err: any) {
      toast.error(err.message || t('dashboard.promote.regenError'));
      setRegenerating(null);
    }
    // Note: regenerating stays set until polling completes — cleared in the poll effect
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(t('dashboard.promote.copiedToClipboard'));
    setTimeout(() => setCopiedField(''), 2000);
  };

  const getLatestPromo = (workId: string) => promos.find(p => p.work_id === workId);
  const getPromoCount = (workId: string) => promos.filter(p => p.work_id === workId).length;

  const totalPages = Math.ceil(works.length / PAGE_SIZE);
  const pageData = works.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Detail dialog data
  const detailWork = detailWorkId ? works.find(w => w.id === detailWorkId) : null;
  const detailPromo = detailWorkId ? getLatestPromo(detailWorkId) : null;
  const detailMeta = detailWorkId ? aiMetaMap[detailWorkId] : null;

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> {t('dashboard.promoSelector.standardTitle')}
          </CardTitle>
          <PricingLink />
        </div>
        <button onClick={loadData} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {noCredits && (
          <div className="px-6 pb-3">
            <NoCreditsAlert message={t('dashboard.promote.insufficientCredits')} />
          </div>
        )}

        {/* Tone selector */}
        <div className="px-6 pb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t('dashboard.promote.toneLabel')}</span>
            <Select value={selectedTone} onValueChange={setSelectedTone}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            {t('dashboard.promote.languageNote', { lang: userLang })}
          </div>
        </div>

        {loadingWorks ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm px-6 pb-4">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {t('dashboard.promote.noWorks')}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_1fr] gap-4 items-center px-6 py-2 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>{t('dashboard.promote.work')}</span>
                <span>{t('dashboard.promote.status')}</span>
                <span>{t('dashboard.promote.promos')}</span>
                <span>{t('dashboard.promote.actions')}</span>
              </div>
              <div className="divide-y divide-border/20">
                {pageData.map(work => {
                  const promo = getLatestPromo(work.id);
                  const promoCount = getPromoCount(work.id);
                  const isGenerating = promo?.status === 'generating';
                  const statusInfo = promo ? statusMap[promo.status] : null;
                  const meta = aiMetaMap[work.id];

                  return (
                    <div
                      key={work.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_100px_80px_1fr] gap-2 sm:gap-4 items-center px-6 py-3 hover:bg-muted/30 transition-colors"
                    >
                      {/* Obra */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{work.title}</p>
                        {work.source === 'ai_studio' && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {work.author && <span className="text-xs text-muted-foreground truncate">{work.author}</span>}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0 bg-primary/10 text-primary border-primary/20">
                              <Sparkles className="h-2.5 w-2.5" /> {t('dashboard.promote.generatedWithAI')}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {work.source !== 'ai_studio' && work.author && <><span className="truncate">{work.author}</span><span>·</span></>}
                          <span className="capitalize">{work.type}</span>
                          {meta && (
                            <>
                              {meta.genre && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 ml-1">
                                  <Tag className="h-2.5 w-2.5" />{meta.genre}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Estado */}
                      <div>
                        {statusInfo ? (
                          <Badge variant="outline" className={`text-[11px] ${statusInfo.color}`}>
                            {isGenerating ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <statusInfo.icon className="h-3 w-3 mr-1" />
                            )}
                            {statusInfo.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t('dashboard.promote.noPromo')}</span>
                        )}
                      </div>

                      {/* Promos count */}
                      <div>
                        {promoCount > 0 ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {promoCount}×
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={promoCount > 0 ? 'outline' : 'hero'}
                          disabled={noCredits || launching === work.id || isGenerating}
                          onClick={() => handleLaunch(work.id)}
                          className="h-7 text-xs"
                        >
                          {launching === work.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Megaphone className="h-3 w-3 mr-1" />
                              {promoCount > 0 ? t('dashboard.promote.new') : t('dashboard.promote.promote')}
                            </>
                          )}
                        </Button>
                        {promo && (promo.status === 'assets_ready' || promo.status === 'completed' || promo.status === 'email_sent') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setDetailWorkId(work.id)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> {t('dashboard.promote.viewAssets')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.promote.worksCount', { n: works.length, page: page + 1, total: totalPages })}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Credits footer */}
            {credits !== null && (
              <div className="px-6 py-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.promote.availableCredits')} <span className="font-medium">{credits}</span>
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <PromoDetailDialog
        work={detailWork}
        promo={detailPromo}
        meta={detailMeta}
        copiedField={copiedField}
        regenerating={regenerating}
        credits={credits}
        open={!!detailWorkId}
        onClose={() => setDetailWorkId(null)}
        onCopy={copyToClipboard}
        onRegenerate={handleRegenerate}
        onBuyCredits={() => navigate('/dashboard/credits')}
      />
    </Card>
  );
}

// ── Detail Dialog ──
function PromoDetailDialog({
  work, promo, meta, copiedField, regenerating, credits, open, onClose, onCopy, onRegenerate, onBuyCredits,
}: {
  work: Work | null | undefined;
  promo: SocialPromo | null | undefined;
  meta: AiGenMeta | null | undefined;
  copiedField: string;
  regenerating: string | null;
  credits: number | null;
  open: boolean;
  onClose: () => void;
  onCopy: (text: string, field: string) => void;
  onRegenerate: (promoId: string, type: 'copies' | 'image', paid: boolean) => void;
  onBuyCredits: () => void;
}) {
  const { t } = useTranslation();
  if (!work || !promo) return null;

  const regenCount = promo.regeneration_count ?? 0;
  const freeRemaining = Math.max(0, MAX_FREE_REGENS - regenCount);
  const isFree = freeRemaining > 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <span>{t('dashboard.promote.promoTitle', { title: work.title })}</span>
              {work.source === 'ai_studio' && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {work.author && <span className="text-xs font-normal text-muted-foreground">{work.author}</span>}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 bg-primary/10 text-primary border-primary/20 font-normal">
                    <Sparkles className="h-2.5 w-2.5" /> {t('dashboard.promote.generatedWithAI')}
                  </Badge>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata */}
          {(meta || work.description) && (
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {t('dashboard.promote.metadataUsed')}
              </p>
              <div className="flex flex-wrap gap-2">
                {meta?.genre && (
                  <Badge variant="outline" className="text-[11px] gap-1">
                    <Tag className="h-3 w-3" /> {t('dashboard.promote.genre')}: {meta.genre}
                  </Badge>
                )}
                {meta?.mood && (
                  <Badge variant="outline" className="text-[11px] gap-1">
                    <Palette className="h-3 w-3" /> {t('dashboard.promote.mood')}: {meta.mood}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[11px] gap-1">
                  <Mic2 className="h-3 w-3" /> {t('dashboard.promote.type')}: {work.type}
                </Badge>
                {work.author && (
                  <Badge variant="outline" className="text-[11px] gap-1">
                    {t('dashboard.promote.artist')}: {work.author}
                  </Badge>
                )}
              </div>
              {work.description && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t('dashboard.promote.description')}:</span> {work.description}
                </p>
              )}
              {meta?.prompt && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t('dashboard.promote.aiPrompt')}:</span> {meta.prompt.length > 200 ? meta.prompt.slice(0, 200) + '…' : meta.prompt}
                </p>
              )}
            </div>
          )}

          {/* Image + copies */}
          <div className="grid sm:grid-cols-[200px_1fr] gap-4">
            {promo.image_url && (
              <div className="space-y-2">
                <img
                  src={promo.image_url}
                  alt={`Promo ${work.title}`}
                  className="w-full rounded-lg border border-border/40 aspect-square object-cover"
                />
                <a
                  href={promo.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> {t('dashboard.promote.openImage')}
                </a>
                <RegenButton
                  label={t('dashboard.promote.imageLabel')}
                  isFree={isFree}
                  freeRemaining={freeRemaining}
                  credits={credits}
                  isLoading={regenerating === promo.id}
                  onRegenerate={(paid) => onRegenerate(promo.id, 'image', paid)}
                  onBuyCredits={onBuyCredits}
                />
              </div>
            )}

            <div className="space-y-3">
              {promo.copy_ig_feed && (
                <CopyBlock
                  label="Instagram Feed"
                  icon={<Instagram className="h-3.5 w-3.5" />}
                  text={promo.copy_ig_feed}
                  fieldId={`ig-feed-${promo.id}`}
                  copiedField={copiedField}
                  onCopy={onCopy}
                />
              )}
              {promo.copy_ig_story && (
                <CopyBlock
                  label="Instagram Story"
                  icon={<Instagram className="h-3.5 w-3.5" />}
                  text={promo.copy_ig_story}
                  fieldId={`ig-story-${promo.id}`}
                  copiedField={copiedField}
                  onCopy={onCopy}
                />
              )}
              {promo.copy_tiktok && (
                <CopyBlock
                  label="TikTok"
                  icon={<Music className="h-3.5 w-3.5" />}
                  text={promo.copy_tiktok}
                  fieldId={`tiktok-${promo.id}`}
                  copiedField={copiedField}
                  onCopy={onCopy}
                />
              )}
              <RegenButton
                label={t('dashboard.promote.copiesLabel')}
                isFree={isFree}
                freeRemaining={freeRemaining}
                credits={credits}
                isLoading={regenerating === promo.id}
                onRegenerate={(paid) => onRegenerate(promo.id, 'copies', paid)}
                onBuyCredits={onBuyCredits}
              />
            </div>
          </div>

          {/* Regen counter */}
          <p className="text-[11px] text-muted-foreground/70 text-center">
            {isFree
              ? t('dashboard.promote.freeRegens', { n: freeRemaining })
              : t('dashboard.promote.noFreeRegens', { cost: REGEN_CREDIT_COST })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Regen button sub-component ──
function RegenButton({
  label, isFree, freeRemaining, credits, isLoading, onRegenerate, onBuyCredits,
}: {
  label: string;
  isFree: boolean;
  freeRemaining: number;
  credits: number | null;
  isLoading: boolean;
  onRegenerate: (paid: boolean) => void;
  onBuyCredits: () => void;
}) {
  const { t } = useTranslation();
  const canAffordPaid = (credits ?? 0) >= REGEN_CREDIT_COST;

  if (isFree) {
    return (
      <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-primary" disabled={isLoading} onClick={() => onRegenerate(false)}>
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
        {t('dashboard.promote.regenFree', { label, n: freeRemaining })}
      </Button>
    );
  }
  if (canAffordPaid) {
    return (
      <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-primary" disabled={isLoading} onClick={() => onRegenerate(true)}>
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
        {t('dashboard.promote.regenPaid', { label, cost: REGEN_CREDIT_COST })}
      </Button>
    );
  }
  return (
    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-primary" onClick={onBuyCredits}>
      <ShoppingCart className="h-3 w-3 mr-1" /> {t('dashboard.promote.buyCredits')}
    </Button>
  );
}

// ── Copy block sub-component ──
function CopyBlock({
  label, icon, text, fieldId, copiedField, onCopy,
}: {
  label: string;
  icon: React.ReactNode;
  text: string;
  fieldId: string;
  copiedField: string;
  onCopy: (text: string, field: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </div>
        <button
          onClick={() => onCopy(text, fieldId)}
          className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
        >
          {copiedField === fieldId ? (
            <><CheckCircle2 className="h-3 w-3" /> {t('dashboard.promote.copied')}</>
          ) : (
            <><Copy className="h-3 w-3" /> {t('dashboard.promote.copy')}</>
          )}
        </button>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
