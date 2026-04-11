import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Crown, Video, Users, Instagram, Loader2, Megaphone,
  Newspaper, Copy, Check, ChevronDown, ExternalLink, Rocket, AlertTriangle,
  Eye, Play,
} from 'lucide-react';
import { PremiumPromoForm } from '@/components/dashboard/PremiumPromoForm';
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProductTracking } from '@/hooks/useProductTracking';

/* ─── Types ─── */
interface Work {
  id: string;
  title: string;
  author: string | null;
  type: string;
  source: 'registered' | 'ai_studio';
  description?: string | null;
  blockchain_hash?: string | null;
  checker_url?: string | null;
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

/* ═══════════════════════════════════════════════════════════════ */
export default function PromotionPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('social');
  const { track } = useProductTracking();

  /* ─── Social tab state ─── */
  const [showForm, setShowForm] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [premiumPromos, setPremiumPromos] = useState<PremiumPromo[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);

  /* ─── Press tab state ─── */
  const [pressWorks, setPressWorks] = useState<any[]>([]);
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [pressReleases, setPressReleases] = useState<any[]>([]);
  const [audiomackSlug, setAudiomackSlug] = useState('');
  const [generatingPR, setGeneratingPR] = useState(false);
  const [generatedPR, setGeneratedPR] = useState<any>(null);
  const [artistBio, setArtistBio] = useState('');
  const [prLanguage, setPrLanguage] = useState('es');
  const [copiedField, setCopiedField] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  /* ─── Load social data ─── */
  const loadWorks = useCallback(async () => {
    if (!user) return;
    const [worksRes, genRes, profileRes] = await Promise.all([
      supabase.from('works').select('id, title, author, type, status').eq('user_id', user.id).eq('status', 'registered').order('created_at', { ascending: false }),
      supabase.from('ai_generations').select('id, prompt, genre, mood').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('user_artist_profiles').select('name').eq('user_id', user.id).eq('is_default', true).limit(1).maybeSingle(),
    ]);
    const defaultArtistName = profileRes.data?.name || null;
    const registered: Work[] = (worksRes.data || []).map((w: any) => ({ id: w.id, title: w.title, author: w.author, type: w.type, source: 'registered' as const }));
    const registeredTitles = new Set(registered.map(w => w.title?.toLowerCase()));
    const aiWorks: Work[] = (genRes.data || [])
      .filter((g: any) => g.prompt && !registeredTitles.has(g.prompt.toLowerCase()))
      .map((g: any) => ({ id: g.id, title: g.prompt, author: defaultArtistName, type: 'audio', source: 'ai_studio' as const }));
    setWorks([...registered, ...aiWorks]);
  }, [user]);

  const loadPremiumPromos = useCallback(async () => {
    if (!user) return;
    setLoadingPromos(true);
    try {
      const { data } = await supabase.from('premium_social_promotions').select('id, artist_name, song_title, status, created_at, credits_spent').eq('user_id', user.id).order('created_at', { ascending: false });
      setPremiumPromos(data || []);
    } catch { /* ignore */ }
    setLoadingPromos(false);
  }, [user]);

  /* ─── Load press data ─── */
  useEffect(() => {
    if (!user) return;
    supabase.from('works').select('id,title,author,type,description,blockchain_hash,checker_url,created_at').eq('user_id', user.id).eq('status', 'registered').order('created_at', { ascending: false }).then(({ data }) => setPressWorks(data || []));
    supabase.from('press_releases').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setPressReleases(data || []));
    supabase.from('audiomack_connections').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => { if (data?.audiomack_slug) setAudiomackSlug(data.audiomack_slug); });
  }, [user]);

  useEffect(() => { loadWorks(); loadPremiumPromos(); }, [loadWorks, loadPremiumPromos]);

  /* ─── Press helpers ─── */
  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => handleCopy(text, field)}>
      {copiedField === field ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  const handleGeneratePR = async () => {
    if (!selectedWork) { toast({ title: t('dashboard.press.selectWork'), variant: 'destructive' }); return; }
    setGeneratingPR(true);
    setGeneratedPR(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-press-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ work_id: selectedWork.id, artist_name: selectedWork.author || user?.email?.split('@')[0], work_title: selectedWork.title, work_type: selectedWork.type, description: selectedWork.description, blockchain_hash: selectedWork.blockchain_hash, checker_url: selectedWork.checker_url, language: prLanguage, artist_bio: artistBio || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      setGeneratedPR(data);
      setPressReleases(prev => [{ id: data.press_release_id, title: data.headline, body: data.body, created_at: new Date().toISOString(), status: 'draft' }, ...prev]);
      toast({ title: t('dashboard.press.prGenerated'), description: t('dashboard.press.prGeneratedDesc') });
      track('press_release_generated', { feature: 'press' });
    } catch { toast({ title: t('dashboard.press.errorConnection'), variant: 'destructive' }); }
    finally { setGeneratingPR(false); }
  };

  /* ═══════════════════════════════════════════════════════════ */
  /* RENDER — Premium Promo Form (full-screen overlay)         */
  /* ═══════════════════════════════════════════════════════════ */
  if (showForm) {
    return (
      <div className="max-w-3xl space-y-4" key={i18n.language}>
        <PremiumPromoForm works={works} onBack={() => { setShowForm(false); loadPremiumPromos(); }} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════ */
  /* RENDER — Main page with tabs                               */
  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-4xl mx-auto space-y-6" key={i18n.language}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          {t('promotion.title', 'Promoción RRSS')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('promotion.subtitle', 'Da visibilidad a tu música en redes sociales y medios de comunicación')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value="social" className="space-y-6">
        {/* Tab list hidden — single section, no need for tab navigation */}

        {/* ── TAB: Social ── */}
        <TabsContent value="social">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t('dashboard.promoSelector.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('dashboard.promoSelector.subtitle')}</p>
            </div>

            {/* Premium promo card — enhanced */}
            <Card
              className="border-amber-400/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer group relative overflow-hidden"
              onClick={() => setShowForm(true)}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
                <div className="absolute top-4 right-8"><Instagram className="h-12 w-12" /></div>
                <div className="absolute bottom-6 right-24"><Play className="h-10 w-10" /></div>
                <div className="absolute top-12 left-[60%]"><Eye className="h-8 w-8" /></div>
                <div className="absolute bottom-4 left-8"><Users className="h-10 w-10" /></div>
                <div className="absolute top-2 left-[30%]"><svg viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" /></svg></div>
              </div>

              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-400/10 to-transparent" />

              <CardContent className="p-6 sm:p-8 space-y-5 relative">
                {/* Top row: icon + hero number */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                        {t('dashboard.promoSelector.premiumTitle')}
                      </h3>
                      <PricingLink />
                    </div>
                  </div>
                  {/* Hero reach number */}
                  <div className="text-right shrink-0">
                    <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-500 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent leading-none">
                      +200K
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {t('dashboard.promoSelector.activeFollowers', 'seguidores activos')}
                    </p>
                  </div>
                </div>

                {/* Impact subtitle */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('dashboard.promoSelector.premiumImpactDesc', 'Lleva tu música a miles de personas reales y gana visibilidad como artista.')}
                </p>

                {/* Stats chips */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs px-3 py-1 gap-1.5 font-medium">
                    <Eye className="h-3 w-3" /> 5-50K {t('dashboard.promoSelector.potentialViews', 'visualizaciones potenciales')}
                  </Badge>
                  <Badge variant="secondary" className="text-xs px-3 py-1 gap-1.5 font-medium">
                    <Instagram className="h-3 w-3" /> TikTok + Instagram
                  </Badge>
                </div>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 gap-1 border-amber-500/20 rounded-full">
                    <Video className="h-3 w-3" /> {t('dashboard.promoSelector.customVideo')}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 gap-1 border-amber-500/20 rounded-full">
                    <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Premium
                  </Badge>
                </div>

                {/* Video promo note */}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-amber-600/60 dark:text-amber-400/60 shrink-0" />
                  {t('dashboard.promoSelector.includesVideoNote', '🎥 Incluye vídeo promocional personalizado')}
                </p>

                {/* Scarcity */}
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {t('dashboard.promoSelector.scarcity', 'Solo unas pocas promociones disponibles cada semana')}
                </p>

                {/* CTA */}
                <Button size="lg" className="w-full text-sm font-semibold h-12 gap-2 group-hover:shadow-lg transition-all bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white border-0">
                  <Rocket className="h-4 w-4" />
                  {t('dashboard.promoSelector.premiumCtaNew', 'Impulsar mi canción ahora 🚀')}
                </Button>
              </CardContent>
            </Card>

            {/* Social links */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('dashboard.promoSelector.followUs', 'Síguenos en nuestras redes')}</p>
              <div className="flex flex-wrap gap-2">
                <a href="https://www.tiktok.com/@musicdibs_" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 rounded-lg transition-colors text-sm">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" /></svg>
                  @musicdibs_
                </a>
                <a href="https://www.instagram.com/musicdibs/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/50 rounded-lg transition-colors text-sm">
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
                              <p className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${st.color}`}>{st.label}</Badge>
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
        </TabsContent>

        {/* ── TAB: Press — hidden for v2.0, reactivate in v2.1 ── */}
        <TabsContent value="press" className="hidden">
          <div className="space-y-6">
            {/* Press release generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">{t('dashboard.press.generatorTitle')}</CardTitle>
                <CardDescription>{t('dashboard.press.generatorDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('dashboard.press.step1')}</Label>
                  {pressWorks.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                      <p>{t('dashboard.press.noWorks')}</p>
                      <Button variant="link" className="mt-1" onClick={() => navigate('/dashboard/register')}>{t('dashboard.press.goToRegister')}</Button>
                    </div>
                  ) : (
                    <Select onValueChange={(id) => setSelectedWork(pressWorks.find((w) => w.id === id) || null)}>
                      <SelectTrigger><SelectValue placeholder={t('dashboard.press.selectPlaceholder')} /></SelectTrigger>
                      <SelectContent>{pressWorks.map((w) => (<SelectItem key={w.id} value={w.id}>{w.title} — {w.type}</SelectItem>))}</SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('dashboard.press.step2')}</Label>
                  <Textarea value={artistBio} onChange={(e) => setArtistBio(e.target.value)} rows={3} placeholder={t('dashboard.press.bioPlaceholder')} className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>{t('dashboard.press.step3')}</Label>
                  <Select value={prLanguage} onValueChange={setPrLanguage}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGeneratePR} disabled={generatingPR || !selectedWork} className="w-full gap-2">
                  {generatingPR ? (<><Loader2 className="h-4 w-4 animate-spin" />{t('dashboard.press.generating')}</>) : (<><Newspaper className="h-4 w-4" />{t('dashboard.press.generateBtn')}</>)}
                </Button>
              </CardContent>
            </Card>

            {/* Result */}
            {generatedPR && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader><CardTitle>{t('dashboard.press.resultTitle')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('dashboard.press.labelHeadline')}</Label>
                    <div className="flex items-start gap-2"><p className="text-lg font-bold flex-1">{generatedPR.headline}</p><CopyButton text={generatedPR.headline} field="headline" /></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('dashboard.press.labelBody')}</Label>
                    <div className="flex items-start gap-2"><Textarea readOnly value={generatedPR.body} rows={10} className="text-sm flex-1 bg-background" /><CopyButton text={generatedPR.body} field="body" /></div>
                  </div>
                  {generatedPR.artist_quote && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('dashboard.press.labelQuote')}</Label>
                      <div className="flex items-start gap-2"><p className="italic text-sm text-muted-foreground flex-1">"{generatedPR.artist_quote}"</p><CopyButton text={generatedPR.artist_quote} field="quote" /></div>
                    </div>
                  )}
                  {generatedPR.short_bio && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('dashboard.press.labelBio')}</Label>
                      <div className="flex items-start gap-2"><p className="text-sm flex-1">{generatedPR.short_bio}</p><CopyButton text={generatedPR.short_bio} field="bio" /></div>
                    </div>
                  )}
                  {generatedPR.hashtags?.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('dashboard.press.labelHashtags')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {generatedPR.hashtags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => handleCopy(tag, `tag-${i}`)}>
                            {copiedField === `tag-${i}` ? <Check className="h-3 w-3 mr-1" /> : null}{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator />
                  <p className="text-sm text-muted-foreground text-center">{t('dashboard.press.whatNow')}</p>
                  <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 p-5 space-y-3">
                    <div className="flex items-center gap-2"><ExternalLink className="h-5 w-5 text-primary" /><h3 className="font-semibold text-white">{t('dashboard.press.grooverTitle')}</h3></div>
                    <p className="text-sm text-zinc-400">{t('dashboard.press.grooverDesc')}</p>
                    <Button className="gap-2" onClick={() => { window.open(`https://groover.co/en/?ref=musicdibs&artist=${encodeURIComponent(selectedWork?.author || '')}&track=${encodeURIComponent(selectedWork?.title || '')}`, '_blank'); }}>
                      {t('dashboard.press.grooverBtn')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t('dashboard.press.historyTitle')} ({pressReleases.length})</CardTitle>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {pressReleases.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.press.historyEmpty')}</p>
                    ) : (
                      <div className="space-y-3">
                        {pressReleases.map((pr) => (
                          <div key={pr.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{pr.title}</p>
                                <p className="text-xs text-muted-foreground">{new Date(pr.created_at).toLocaleDateString()}</p>
                              </div>
                              <Badge variant={pr.status === 'draft' ? 'secondary' : 'default'} className="text-xs shrink-0">
                                {pr.status === 'draft' ? t('dashboard.press.statusDraft') : t('dashboard.press.statusSent')}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => setExpandedPR(expandedPR === pr.id ? null : pr.id)}>
                                {expandedPR === pr.id ? t('dashboard.press.hideContent') : t('dashboard.press.showContent')}
                              </Button>
                            </div>
                            {expandedPR === pr.id && pr.body && (
                              <div className="space-y-2 pt-2 border-t">
                                <Textarea readOnly value={pr.body} rows={6} className="text-sm bg-muted/30" />
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCopy(pr.body, `pr-${pr.id}`)}>
                                  {copiedField === `pr-${pr.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{t('dashboard.press.copyBtn')}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Audiomack */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">🎵 Tu perfil en Audiomack</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Conecta tu perfil de Audiomack para acceder rápidamente a tus estadísticas y compartir tu música con curadores.</p>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tu slug de Audiomack</Label>
                  <div className="flex gap-2">
                    <Input value={audiomackSlug} onChange={e => setAudiomackSlug(e.target.value)} placeholder="ej: nombre-artista" className="text-sm" />
                    <Button variant="outline" onClick={async () => { if (!audiomackSlug.trim() || !user) return; await supabase.from('audiomack_connections').upsert({ user_id: user.id, audiomack_slug: audiomackSlug.trim(), connected_at: new Date().toISOString() }, { onConflict: 'user_id' }); toast({ title: '✅ Perfil guardado' }); }} disabled={!audiomackSlug.trim()}>Guardar</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Encuéntralo en tu URL: audiomack.com/<strong>tu-slug</strong></p>
                </div>
                {audiomackSlug && (
                  <a href={`https://audiomack.com/${audiomackSlug}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full gap-2" variant="outline"><span>🎵</span> Ver mi perfil en Audiomack →</Button>
                  </a>
                )}
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">📊 Analytics avanzados — Próximamente</p>
                  <p>En la siguiente versión podrás ver tus reproducciones, seguidores y tendencias directamente desde MusicDibs gracias a la integración con Chartmetric.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
