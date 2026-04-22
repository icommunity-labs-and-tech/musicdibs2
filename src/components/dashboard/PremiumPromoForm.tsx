import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Crown, Loader2, CheckCircle2, Sparkles, Video, Users, Clock,
  Instagram, Music, ArrowLeft, Upload, FileText, X, Import,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { useProductTracking } from '@/hooks/useProductTracking';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { parseAiError } from '@/lib/aiErrorHandler';
import { toast } from 'sonner';

interface Work {
  id: string;
  title: string;
  author: string | null;
  type: string;
  source: 'registered' | 'ai_studio';
}

interface LyricsItem {
  id: string;
  lyrics: string;
  description: string | null;
  theme: string | null;
  genre: string | null;
  mood: string | null;
  created_at: string;
}

interface PremiumPromoFormProps {
  works: Work[];
  onBack: () => void;
}

const PREMIUM_COST = FEATURE_COSTS.promote_premium;
const ACCEPTED_AUDIO = '.mp3,.aac';
const ACCEPTED_VISUAL = '.mp4,.mov,.jpg,.jpeg,.png';
const VIDEO_EXTS = ['.mp4', '.mov'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png'];

export function PremiumPromoForm({ works, onBack }: PremiumPromoFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { credits, hasEnough } = useCredits();
  const { track } = useProductTracking();
  const navigate = useNavigate();
  const noCredits = !hasEnough(PREMIUM_COST);

  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [linksAndNotes, setLinksAndNotes] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progressStep, setProgressStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Lyrics import
  const [showLyricsImport, setShowLyricsImport] = useState(false);
  const [savedLyrics, setSavedLyrics] = useState<LyricsItem[]>([]);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  const loadSavedLyrics = useCallback(async () => {
    if (!user) return;
    setLoadingLyrics(true);
    const { data } = await supabase
      .from('lyrics_generations' as any)
      .select('id, lyrics, description, theme, genre, mood, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setSavedLyrics((data as any as LyricsItem[]) || []);
    setLoadingLyrics(false);
  }, [user]);

  // Auto-fill when work is selected
  const handleWorkSelect = (workId: string) => {
    setSelectedWorkId(workId);
    const work = works.find(w => w.id === workId);
    if (work) {
      if (!songTitle) setSongTitle(work.title);
      if (!artistName && work.author) setArtistName(work.author);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('dashboard.premium.fileTooLarge', 'Archivo demasiado grande (máx. 50 MB)'));
      return;
    }
    setAudioFile(file);
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('dashboard.premium.fileTooLarge', 'Archivo demasiado grande (máx. 50 MB)'));
      return;
    }
    setMediaFile(file);
  };

  const handleImportLyrics = (item: LyricsItem) => {
    setLyrics(item.lyrics);
    setShowLyricsImport(false);
    toast.success(t('dashboard.premium.lyricsImported', 'Letra importada'));
  };

  const handleSubmit = async () => {
    if (!user || !artistName.trim() || !songTitle.trim() || !lyrics.trim()) {
      toast.error(t('dashboard.premium.fillRequired'));
      return;
    }
    if (!audioFile) {
      toast.error(t('dashboard.premium.audioRequired', 'El audio de tu canción es obligatorio'));
      return;
    }
    if (!mediaFile) {
      toast.error(t('dashboard.premium.mediaRequired', 'El vídeo o imagen es obligatorio'));
      return;
    }

    setSubmitting(true);
    setProgressStep(1);
    let audioPath: string | null = null;
    let mediaPath: string | null = null;

    const cleanupUploads = async () => {
      const paths = [audioPath, mediaPath].filter(Boolean) as string[];
      if (paths.length > 0) {
        try {
          await supabase.storage.from('premium-promo-media').remove(paths);
        } catch (cleanupErr) {
          console.warn('[PremiumPromoForm] Failed to cleanup uploads:', cleanupErr);
        }
      }
    };

    const failAndReset = () => {
      setSubmitting(false);
      setProgressStep(0);
    };

    try {
      // ── 1. Validate and spend credits ───────────────────────
      const { data: spendData, error: spendError } = await supabase.functions.invoke('spend-credits', {
        body: { feature: 'promote_premium', description: `Promo Premium: ${songTitle.trim()}` },
      });

      if (spendError) {
        const status = (spendError as any)?.context?.status;
        if (status === 402) {
          toast.error(t('dashboard.premium.insufficientCredits'));
        } else if (status === 401) {
          toast.error(t('dashboard.premium.sessionExpired', 'Tu sesión ha expirado. Vuelve a iniciar sesión.'));
        } else {
          const { userMessage } = parseAiError(spendError, spendData as any);
          toast.error(t('dashboard.premium.creditsError', 'No se pudieron validar los créditos: {{msg}}', { msg: userMessage }));
        }
        failAndReset();
        return;
      }
      if (spendData?.error === 'insufficient_credits' || spendData?.error === 'Créditos insuficientes') {
        toast.error(t('dashboard.premium.insufficientCredits'));
        failAndReset();
        return;
      }
      if (spendData?.error) {
        toast.error(t('dashboard.premium.creditsError', 'No se pudieron validar los créditos: {{msg}}', { msg: spendData.error }));
        failAndReset();
        return;
      }

      const promoId = crypto.randomUUID();
      const ts = Date.now();

      // ── 2. Upload audio file ────────────────────────────────
      setProgressStep(2);
      const audioExt = audioFile.name.split('.').pop() || 'mp3';
      audioPath = `promotions/${user.id}/${promoId}/audio_${ts}.${audioExt}`;
      const { error: audioUpErr } = await supabase.storage
        .from('premium-promo-media')
        .upload(audioPath, audioFile);
      if (audioUpErr) {
        console.error('[PremiumPromoForm] Audio upload failed:', audioUpErr);
        audioPath = null;
        toast.error(t('dashboard.premium.audioUploadError', 'No se pudo subir el audio: {{msg}}', { msg: audioUpErr.message }));
        failAndReset();
        return;
      }

      // ── 3. Upload media file (video/image) ──────────────────
      setProgressStep(3);
      const mediaExt = mediaFile.name.split('.').pop() || 'bin';
      mediaPath = `promotions/${user.id}/${promoId}/media_${ts}.${mediaExt}`;
      const { error: mediaUpErr } = await supabase.storage
        .from('premium-promo-media')
        .upload(mediaPath, mediaFile);
      if (mediaUpErr) {
        console.error('[PremiumPromoForm] Media upload failed:', mediaUpErr);
        await cleanupUploads();
        toast.error(t('dashboard.premium.mediaUploadError', 'No se pudo subir el vídeo o imagen: {{msg}}', { msg: mediaUpErr.message }));
        failAndReset();
        return;
      }

      // ── 4. Determine media_file_type ────────────────────────
      const extLower = '.' + mediaExt.toLowerCase();
      const mediaFileType = VIDEO_EXTS.includes(extLower) ? 'video' : 'image';

      // ── 5. Submit promotion request via edge function ───────
      setProgressStep(4);
      const { data, error } = await supabase.functions.invoke('submit-premium-promo', {
        body: {
          work_id: selectedWorkId || null,
          artist_name: artistName.trim(),
          song_title: songTitle.trim(),
          description: lyrics.trim(),
          external_link: linksAndNotes.trim() || null,
          team_notes: null,
          media_file_path: mediaPath,
          audio_file_path: audioPath,
          media_file_type: mediaFileType,
        },
      });

      if (error || data?.error) {
        console.error('[PremiumPromoForm] submit-premium-promo failed:', error, data);
        await cleanupUploads();
        const { userMessage } = parseAiError(error, data as any);
        toast.error(t('dashboard.premium.submitErrorDetailed', 'No se pudo enviar la solicitud: {{msg}}. Tus créditos serán reembolsados automáticamente.', { msg: userMessage }));
        failAndReset();
        return;
      }

      setShowSuccess(true);
      toast.success(t('dashboard.premium.requestSent'));
      track('premium_promotion_submitted', { feature: 'premium_promotion' });
    } catch (err: any) {
      console.error('[PremiumPromoForm] Unexpected error:', err);
      await cleanupUploads();
      const { userMessage } = parseAiError(err);
      toast.error(t('dashboard.premium.unexpectedError', 'Error inesperado: {{msg}}', { msg: userMessage || err?.message || 'desconocido' }));
    } finally {
      setSubmitting(false);
      setProgressStep(0);
    }
  };

  // ── Progress steps definition ────────────────────────────
  const progressSteps = [
    { key: 'credits', label: t('dashboard.premium.stepCredits', 'Validando créditos') },
    { key: 'audio', label: t('dashboard.premium.stepAudio', 'Subiendo audio') },
    { key: 'media', label: t('dashboard.premium.stepMedia', 'Subiendo vídeo/imagen') },
    { key: 'submit', label: t('dashboard.premium.stepSubmit', 'Enviando solicitud') },
  ];

  if (showSuccess) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold">{t('dashboard.premium.successTitle')}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t('dashboard.premium.successDesc')}
          </p>
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" /> {t('dashboard.premium.statusSubmitted')}
          </Badge>
          <Button variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('dashboard.premium.backToPromo')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              {t('dashboard.premium.formTitle')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onBack} className="h-7 text-xs">
              <ArrowLeft className="h-3 w-3 mr-1" /> {t('dashboard.premium.back')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('dashboard.premium.formDesc')}
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Info banner */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <Crown className="h-4 w-4" /> {t('dashboard.premium.whatIncluded')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Video className="h-3.5 w-3.5 text-amber-500/70" />
                {t('dashboard.premium.includesVideo')}
              </div>
              <div className="flex items-center gap-2">
                <Instagram className="h-3.5 w-3.5 text-amber-500/70" />
                {t('dashboard.premium.includesChannels')}
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-amber-500/70" />
                {t('dashboard.premium.includesAudience')}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-500/70" />
                {t('dashboard.premium.includesManual')}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              {t('dashboard.premium.manualNote')}
            </p>
          </div>

          {noCredits && <NoCreditsAlert message={t('dashboard.premium.insufficientCredits')} />}

          {/* Form fields */}
          <div className="space-y-4">
            {/* Artist + Song title row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">{t('dashboard.premium.artistName')} *</Label>
                <Input
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                  placeholder={t('dashboard.premium.artistPlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{t('dashboard.premium.songTitle')} *</Label>
                <Input
                  value={songTitle}
                  onChange={e => setSongTitle(e.target.value)}
                  placeholder={t('dashboard.premium.songPlaceholder')}
                />
              </div>
            </div>

            {/* Lyrics */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('dashboard.premium.lyricsLabel')} *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 text-primary"
                  onClick={() => { setShowLyricsImport(true); loadSavedLyrics(); }}
                >
                  <Import className="h-3 w-3" /> {t('dashboard.premium.importLyrics')}
                </Button>
              </div>
              <Textarea
                value={lyrics}
                onChange={e => setLyrics(e.target.value)}
                placeholder={t('dashboard.premium.lyricsPlaceholder')}
                rows={6}
              />
            </div>

            {/* Audio file upload */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t('dashboard.premium.audioLabel', 'Audio de tu canción')} *</Label>
              <p className="text-[11px] text-muted-foreground">{t('dashboard.premium.audioDesc', 'Sube tu propio audio para que nuestro equipo lo use en la promoción.')}</p>
              {audioFile ? (
                <div className="flex items-center gap-2 rounded-md border border-border/40 p-2 text-sm">
                  <Music className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{audioFile.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAudioFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 cursor-pointer rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                  <Upload className="h-4 w-4" />
                  {t('dashboard.premium.audioUploadCta', 'Subir audio (MP3, AAC)')}
                  <input type="file" accept={ACCEPTED_AUDIO} className="hidden" onChange={handleAudioChange} />
                </label>
              )}
            </div>

            {/* Video/Image upload */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t('dashboard.premium.visualLabel', 'Vídeo o imagen')} *</Label>
              <p className="text-[11px] text-muted-foreground">{t('dashboard.premium.visualDesc', 'Vídeo: MP4 o MOV, 1080×1920px (9:16). Imagen: JPG o PNG (9:16).')}</p>
              {mediaFile ? (
                <div className="flex items-center gap-2 rounded-md border border-border/40 p-2 text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{mediaFile.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {(mediaFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMediaFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 cursor-pointer rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                  <Upload className="h-4 w-4" />
                  {t('dashboard.premium.visualUploadCta', 'Subir vídeo o imagen')}
                  <input type="file" accept={ACCEPTED_VISUAL} className="hidden" onChange={handleMediaChange} />
                </label>
              )}
            </div>

            {/* Links and Notes (merged) */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t('dashboard.premium.linksAndNotes')}</Label>
              <Textarea
                value={linksAndNotes}
                onChange={e => setLinksAndNotes(e.target.value)}
                placeholder={t('dashboard.premium.linksAndNotesPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          {/* Progress indicator (only while submitting) */}
          {submitting && progressStep > 0 && (
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-foreground">
                  {t('dashboard.premium.progressTitle', 'Procesando solicitud')} ({progressStep}/4)
                </span>
                <span className="text-muted-foreground">
                  {progressSteps[progressStep - 1]?.label}
                </span>
              </div>
              <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progressStep / 4) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-1 pt-1">
                {progressSteps.map((step, idx) => {
                  const stepNum = idx + 1;
                  const isDone = progressStep > stepNum;
                  const isActive = progressStep === stepNum;
                  return (
                    <div
                      key={step.key}
                      className="flex flex-col items-center gap-1 flex-1 min-w-0"
                    >
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors ${
                          isDone
                            ? 'bg-primary text-primary-foreground'
                            : isActive
                              ? 'bg-primary/20 text-primary border border-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="h-3 w-3" /> : isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : stepNum}
                      </div>
                      <span
                        className={`text-[10px] text-center leading-tight truncate w-full ${
                          isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <PricingLink />
            <Button
              onClick={handleSubmit}
              disabled={submitting || noCredits || !artistName.trim() || !songTitle.trim() || !lyrics.trim() || !audioFile || !mediaFile}
              className="gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              {submitting && progressStep > 0
                ? t('dashboard.premium.submittingStep', 'Paso {{n}}/4…', { n: progressStep })
                : t('dashboard.premium.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lyrics Import Dialog */}
      <Dialog open={showLyricsImport} onOpenChange={setShowLyricsImport}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t('dashboard.premium.importLyricsTitle')}
            </DialogTitle>
            <DialogDescription>{t('dashboard.premium.importLyricsDesc')}</DialogDescription>
          </DialogHeader>
          {loadingLyrics ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : savedLyrics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.premium.noSavedLyrics')}</p>
          ) : (
            <div className="space-y-2">
              {savedLyrics.map(l => (
                <button
                  key={l.id}
                  className="w-full text-left rounded-lg border border-border/40 p-3 hover:border-primary/40 hover:bg-accent/30 transition-colors space-y-1"
                  onClick={() => handleImportLyrics(l)}
                >
                  <p className="text-sm font-medium truncate">{l.description || l.theme || l.lyrics.slice(0, 60)}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{l.lyrics.slice(0, 120)}…</p>
                  <div className="flex gap-2 mt-1">
                    {l.genre && <Badge variant="outline" className="text-[9px] px-1 py-0">{l.genre}</Badge>}
                    {l.mood && <Badge variant="outline" className="text-[9px] px-1 py-0">{l.mood}</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
