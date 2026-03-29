import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone, Loader2, CheckCircle2, AlertCircle, Music, Copy, ExternalLink,
  Image as ImageIcon, Instagram, Clock, Sparkles, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { toast } from 'sonner';

interface Work {
  id: string;
  title: string;
  author: string | null;
  type: string;
  status: string;
  checker_url: string | null;
  distributed_at: string | null;
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
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Loader2 }> = {
  generating: { label: 'Generando...', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Loader2 },
  assets_ready: { label: 'Assets listos', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: ImageIcon },
  email_sent: { label: 'Email enviado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  completed: { label: 'Completado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
  failed: { label: 'Error', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle },
};

export function PromoteWorks() {
  const { user } = useAuth();
  const { credits, hasEnough } = useCredits();
  const noCredits = !hasEnough(FEATURE_COSTS.promote_work);

  const [works, setWorks] = useState<Work[]>([]);
  const [promos, setPromos] = useState<SocialPromo[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [polling, setPolling] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState('');

  // Load works & existing promotions
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingWorks(true);

    const [worksRes, promosRes] = await Promise.all([
      supabase
        .from('works')
        .select('id, title, author, type, status, checker_url, distributed_at')
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .order('created_at', { ascending: false }),
      supabase
        .from('social_promotions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (worksRes.data) setWorks(worksRes.data as Work[]);
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
          if (p.status === 'completed' || p.status === 'assets_ready') {
            toast.success('¡Promoción generada! Revisa tus assets y tu email.');
          } else if (p.status === 'failed') {
            toast.error(`Error: ${p.error_detail || 'Fallo desconocido'}`);
          }
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [polling]);

  const handleLaunch = async (workId: string) => {
    setLaunching(workId);
    try {
      const { data, error } = await supabase.functions.invoke('promo-social-generate', {
        body: { work_id: workId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        if (data.error === 'insufficient_credits') {
          toast.error('No tienes créditos suficientes (25 necesarios).');
        } else {
          throw new Error(data.error);
        }
        return;
      }
      // Add to promos list and start polling
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
      };
      setPromos(prev => [newPromo, ...prev]);
      setPolling(data.promo_id);
      toast.info('Generando promoción... esto tardará ~30 segundos.');
    } catch (err: any) {
      toast.error(err.message || 'Error al lanzar la promoción');
    } finally {
      setLaunching(null);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado al portapapeles');
    setTimeout(() => setCopiedField(''), 2000);
  };

  const getWorkPromo = (workId: string) => promos.find(p => p.work_id === workId);

  if (loadingWorks) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Promoción en Redes Sociales</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Generamos automáticamente una imagen profesional y copies virales para Instagram y TikTok.
          Te lo enviamos todo por email, listo para publicar.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
          <Sparkles className="h-3 w-3" />
          <span>Cada promoción consume {FEATURE_COSTS.promote_work} créditos · Imagen + 3 copies + email</span>
        </div>
      </div>

      {noCredits && (
        <NoCreditsAlert message={`Necesitas al menos ${FEATURE_COSTS.promote_work} créditos para promocionar una obra.`} />
      )}

      {works.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <Music className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center">
              No tienes obras registradas todavía.<br />
              Registra tu primera obra para poder promocionarla.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {works.map(work => {
            const promo = getWorkPromo(work.id);
            const isGenerating = promo?.status === 'generating';
            const hasAssets = promo && (promo.status === 'assets_ready' || promo.status === 'completed' || promo.status === 'email_sent');
            const statusInfo = promo ? STATUS_MAP[promo.status] : null;

            return (
              <Card key={work.id} className="border-border/40 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate">
                        {work.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {work.author && <span>{work.author}</span>}
                        <span>·</span>
                        <span className="capitalize">{work.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusInfo && (
                        <Badge variant="outline" className={`text-[11px] ${statusInfo.color}`}>
                          {isGenerating ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <statusInfo.icon className="h-3 w-3 mr-1" />
                          )}
                          {statusInfo.label}
                        </Badge>
                      )}
                      {!promo && (
                        <Button
                          size="sm"
                          variant="hero"
                          disabled={noCredits || launching === work.id}
                          onClick={() => handleLaunch(work.id)}
                        >
                          {launching === work.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Megaphone className="h-4 w-4 mr-1" />
                              Promocionar
                            </>
                          )}
                        </Button>
                      )}
                      {promo?.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={noCredits || launching === work.id}
                          onClick={() => handleLaunch(work.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reintentar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Generated assets */}
                {hasAssets && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid md:grid-cols-[200px_1fr] gap-4">
                      {/* Image */}
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
                            <ExternalLink className="h-3 w-3" /> Abrir imagen
                          </a>
                        </div>
                      )}

                      {/* Copies */}
                      <div className="space-y-3">
                        {promo.copy_ig_feed && (
                          <CopyBlock
                            label="Instagram Feed"
                            icon={<Instagram className="h-3.5 w-3.5" />}
                            text={promo.copy_ig_feed}
                            fieldId={`ig-feed-${promo.id}`}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                          />
                        )}
                        {promo.copy_ig_story && (
                          <CopyBlock
                            label="Instagram Story"
                            icon={<Instagram className="h-3.5 w-3.5" />}
                            text={promo.copy_ig_story}
                            fieldId={`ig-story-${promo.id}`}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                          />
                        )}
                        {promo.copy_tiktok && (
                          <CopyBlock
                            label="TikTok"
                            icon={<Music className="h-3.5 w-3.5" />}
                            text={promo.copy_tiktok}
                            fieldId={`tiktok-${promo.id}`}
                            copiedField={copiedField}
                            onCopy={copyToClipboard}
                          />
                        )}
                      </div>
                    </div>

                    {promo.status === 'completed' && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Email enviado con todos los assets
                      </p>
                    )}
                  </CardContent>
                )}

                {/* Generating state */}
                {isGenerating && (
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 py-4 px-4 rounded-lg bg-muted/50">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div>
                        <p className="text-sm font-medium">Generando tu promoción...</p>
                        <p className="text-xs text-muted-foreground">
                          Creando imagen y copies con IA. Esto puede tardar ~30 segundos.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}

                {/* Error state */}
                {promo?.status === 'failed' && (
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 rounded-lg px-4 py-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{promo.error_detail || 'Error al generar la promoción. Se han reembolsado los créditos.'}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Credits info */}
      {credits !== null && (
        <p className="text-xs text-center text-muted-foreground">
          Créditos disponibles: <span className="font-medium">{credits}</span>
        </p>
      )}
    </div>
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
            <><CheckCircle2 className="h-3 w-3" /> Copiado</>
          ) : (
            <><Copy className="h-3 w-3" /> Copiar</>
          )}
        </button>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
