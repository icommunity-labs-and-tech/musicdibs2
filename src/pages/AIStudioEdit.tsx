import { useState, useEffect, useRef } from "react";
import { FileDropzone } from '@/components/FileDropzone';
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProductTracking } from "@/hooks/useProductTracking";
import { supabase } from "@/integrations/supabase/client";
import { parseAiError } from "@/lib/aiErrorHandler";
import {
  ArrowLeft, Loader2, Play, Pause, Download,
  Music, Sparkles, CheckCircle2, AlertTriangle,
  Headphones, Volume2, Waves, Wind, Radio, RefreshCw, Upload
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AIStudioThemeBar } from "@/components/ai-studio/AIStudioThemeBar";

import { useCredits } from "@/hooks/useCredits";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { FEATURE_COSTS } from "@/lib/featureCosts";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { GenerationPicker } from "@/components/ai-studio/GenerationPicker";

const PROCESSING_STEPS = [
  { icon: Waves, key: "eq" },
  { icon: Volume2, key: "compression" },
  { icon: Radio, key: "loudness" },
  { icon: Wind, key: "noise" },
  { icon: Sparkles, key: "stereo" },
] as const;

const INVALID_PREVIEW_URL_PATTERNS = [/example\.com\/dummy/i, /dummy_dev_preview/i];

const isPlayablePreviewUrl = (url: string | null | undefined): url is string =>
  !!url && /^https?:\/\//i.test(url) && !INVALID_PREVIEW_URL_PATTERNS.some((pattern) => pattern.test(url));

const AIStudioEdit = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasEnough } = useCredits();
  const { track } = useProductTracking();
  const tr = (key: string, opts?: any) => t(`masterize.${key}`, opts) as string;

  const [sourceTab, setSourceTab] = useState<string>("upload");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);

  // Preset (mastering style)
  type PresetKey = 'professional' | 'spotify' | 'clarity' | 'denoise' | 'reverb';
  const [preset, setPreset] = useState<PresetKey>('professional');

  // Processing (full)
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preview (free)
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Result
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // A/B comparison
  const [playingTrack, setPlayingTrack] = useState<"original" | "mastered" | "preview" | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopProgress();
      stopPreviewPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };
  const stopProgress = () => {
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  };
  const stopPreviewPolling = () => {
    if (previewPollingRef.current) { clearInterval(previewPollingRef.current); previewPollingRef.current = null; }
  };

  const resetResults = () => {
    setProcessedUrl(null);
    setProcessError(null);
    setPreviewUrl(null);
    setPreviewError(null);
  };

  const ACCEPTED_AUDIO_EXT = /\.(mp3|wav|flac|aac|m4a|ogg)$/i;

  const handleFileSelect = (file: File) => {
    if (!ACCEPTED_AUDIO_EXT.test(file.name)) {
      toast({
        title: t('masterize.invalidFormat', 'Formato no soportado'),
        description: t('masterize.invalidFormatDesc', 'Sube un archivo de audio (MP3, WAV, FLAC, AAC, M4A u OGG). Los vídeos no son compatibles.'),
        variant: "destructive",
      });
      return;
    }
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
    resetResults();
    setPlayingTrack(null);
  };

  const handleGenerationSelect = async (url: string, name: string) => {
    // Fetch the audio as a File so the upload flow works identically
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], name, { type: blob.type || "audio/mpeg" });
      setAudioFile(file);
      setAudioUrl(url);
      setAudioName(name);
      resetResults();
      setPlayingTrack(null);
    } catch {
      toast({ title: t("masterize.errorGeneric", "Error al cargar el audio"), variant: "destructive" });
    }
  };

  const handleRemoveFile = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setAudioName(null);
    resetResults();
    stopAllAudio();
  };

  const stopAllAudio = () => {
    originalAudioRef.current?.pause();
    masteredAudioRef.current?.pause();
    previewAudioRef.current?.pause();
    setPlayingTrack(null);
  };

  // Upload to auphonic-temp bucket
  const uploadForProcessing = async (file: File): Promise<string> => {
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .toLowerCase();
    const path = `auphonic/${user!.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from("auphonic-temp")
      .upload(path, file, { upsert: true });
    if (error) throw new Error(`Upload error: ${error.message}`);
    const { data } = supabase.storage.from("auphonic-temp").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleMasterize = async () => {
    if (!audioFile || !user) return;

    if (!hasEnough(FEATURE_COSTS.enhance_audio)) {
      toast({ title: t('aiShared.noCredits'), variant: "destructive" });
      return;
    }

    track('enhance_audio_started', { feature: 'enhance_audio', metadata: { preset } });
    setIsProcessing(true);
    setProcessError(null);
    setProcessedUrl(null);
    setProgressPercent(0);
    setActiveStep(0);
    stopAllAudio();

    // Animate progress & steps
    progressRef.current = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 3;
      });
      setActiveStep(prev => {
        if (prev >= PROCESSING_STEPS.length - 1) return PROCESSING_STEPS.length - 1;
        return prev + (Math.random() > 0.6 ? 1 : 0);
      });
    }, 3000);

    try {
      // Validate credits
      const { data: spend, error: spendErr } = await supabase.functions.invoke(
        "spend-credits",
        { body: { feature: "enhance_audio", description: `Masterización (${preset})` } }
      );
      if (spendErr || spend?.error) throw new Error(spend?.error || "Error de créditos");

      // Upload file
      const uploadedUrl = await uploadForProcessing(audioFile);

      // Start RoEx processing with selected preset
      const { data, error } = await supabase.functions.invoke("auphonic-enhance", {
        body: {
          action: "process",
          mode: preset,
          audioUrl: uploadedUrl,
          filename: audioFile.name,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      const uuid = data.productionUuid;

      // Poll for result
      pollingRef.current = setInterval(async () => {
        try {
          const { data: st, error: stErr } = await supabase.functions.invoke("auphonic-enhance", {
            body: { action: "status", productionUuid: uuid },
          });
          if (stErr) {
            console.warn('[Auphonic] status poll transient error', stErr);
            return; // continue polling
          }
          if (st?.done) {
            stopPolling();
            stopProgress();
            setProgressPercent(100);
            setActiveStep(PROCESSING_STEPS.length - 1);

            setTimeout(() => {
              setProcessedUrl(st.outputUrl);
              setIsProcessing(false);
              toast({ title: tr('success.title') });
              track('enhance_audio_completed', { feature: 'enhance_audio' });
            }, 500);
          } else if (st?.errored) {
            stopPolling();
            stopProgress();
            setIsProcessing(false);
            // Map upstream Auphonic error message via centralized handler
            const { userMessage } = parseAiError(
              new Error(st.errorMessage || 'auphonic_error'),
              { error: st.errorMessage } as any,
            );
            setProcessError(userMessage);
            console.error('[Auphonic] processing failed:', st.errorMessage);
            track('enhance_audio_failed', { feature: 'enhance_audio', metadata: { reason: st.errorMessage || 'unknown' } });
          }
        } catch (e) {
          console.warn('[Auphonic] status poll exception', e);
          /* continue polling */
        }
      }, 8000);

      // Timeout after 5 min
      setTimeout(() => {
        if (pollingRef.current) {
          stopPolling();
          stopProgress();
          setIsProcessing(false);
          setProcessError(tr('errorTimeout'));
        }
      }, 300_000);

    } catch (err: any) {
      stopProgress();
      setIsProcessing(false);
      // Edge function errors via supabase.functions.invoke include the response body in context
      const responseData =
        (err?.context?.body && typeof err.context.body === 'object') ? err.context.body :
        (err?.context && typeof err.context === 'object' ? err.context : null);
      const { userMessage } = parseAiError(err, responseData);
      setProcessError(userMessage);
      console.error('[Auphonic] enhance failed:', err);
      track('enhance_audio_failed', { feature: 'enhance_audio', metadata: { reason: err?.message || 'unknown' } });
    }
  };

  const handlePreview = async () => {
    if (!audioFile || !user) return;

    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewUrl(null);
    stopAllAudio();

    try {
      const uploadedUrl = await uploadForProcessing(audioFile);

      const { data, error } = await supabase.functions.invoke("auphonic-enhance", {
        body: { action: "preview", mode: preset, audioUrl: uploadedUrl, filename: audioFile.name },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      const uuid = data.productionUuid;

      previewPollingRef.current = setInterval(async () => {
        try {
          const { data: st, error: stErr } = await supabase.functions.invoke("auphonic-enhance", {
            body: { action: "status", productionUuid: uuid, isPreview: true },
          });
          if (stErr) return;
          if (st?.done) {
            stopPreviewPolling();
            const nextPreviewUrl = isPlayablePreviewUrl(st.outputUrl) ? st.outputUrl : null;

            if (!nextPreviewUrl) {
              setPreviewError(tr('preview.unavailable', { defaultValue: 'No se ha podido cargar una preview válida. Inténtalo de nuevo.' }));
              setIsPreviewing(false);
              return;
            }

            previewAudioRef.current = null;
            setPreviewUrl(nextPreviewUrl);
            setIsPreviewing(false);
            toast({ title: tr('preview.ready') });
          } else if (st?.errored) {
            stopPreviewPolling();
            setIsPreviewing(false);
            const { userMessage } = parseAiError(
              new Error(st.errorMessage || 'roex_error'),
              { error: st.errorMessage } as any,
            );
            setPreviewError(userMessage);
          }
        } catch { /* keep polling */ }
      }, 6000);

      // Timeout after 3 min
      setTimeout(() => {
        if (previewPollingRef.current) {
          stopPreviewPolling();
          setIsPreviewing(false);
          setPreviewError(tr('errorTimeout'));
        }
      }, 180_000);
    } catch (err: any) {
      setIsPreviewing(false);
      const responseData =
        (err?.context?.body && typeof err.context.body === 'object') ? err.context.body :
        (err?.context && typeof err.context === 'object' ? err.context : null);
      const { userMessage } = parseAiError(err, responseData);
      setPreviewError(userMessage);
    }
  };

  const handlePreviewAudioError = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPlayingTrack((current) => (current === 'preview' ? null : current));
    setPreviewUrl(null);
    setPreviewError(tr('preview.unavailable', { defaultValue: 'La preview no está disponible. Regénérala para intentarlo de nuevo.' }));
  };

  const playAudio = (track: "original" | "mastered" | "preview") => {
    // Stop all
    originalAudioRef.current?.pause();
    masteredAudioRef.current?.pause();
    previewAudioRef.current?.pause();

    if (playingTrack === track) {
      setPlayingTrack(null);
      return;
    }

    if (track === "original" && audioUrl) {
      if (!originalAudioRef.current) {
        originalAudioRef.current = new Audio(audioUrl);
        originalAudioRef.current.onended = () => setPlayingTrack(null);
      }
      originalAudioRef.current.currentTime = 0;
      originalAudioRef.current.play();
    } else if (track === "mastered" && processedUrl) {
      if (!masteredAudioRef.current) {
        masteredAudioRef.current = new Audio(processedUrl);
        masteredAudioRef.current.onended = () => setPlayingTrack(null);
      }
      masteredAudioRef.current.currentTime = 0;
      masteredAudioRef.current.play();
    } else if (track === "preview" && previewUrl) {
      if (!previewAudioRef.current || previewAudioRef.current.src !== previewUrl) {
        previewAudioRef.current = new Audio(previewUrl);
        previewAudioRef.current.onended = () => setPlayingTrack(null);
      }
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.play();
    }
    setPlayingTrack(track);
  };

  const handleReset = () => {
    stopAllAudio();
    stopPreviewPolling();
    originalAudioRef.current = null;
    masteredAudioRef.current = null;
    previewAudioRef.current = null;
    setAudioFile(null);
    setAudioUrl(null);
    setAudioName(null);
    resetResults();
    setProgressPercent(0);
    setActiveStep(0);
  };

  const PRESETS: { key: PresetKey; icon: typeof Headphones; labelKey: string; descKey: string }[] = [
    { key: 'professional', icon: Headphones, labelKey: 'presets.professional.label', descKey: 'presets.professional.desc' },
    { key: 'spotify',      icon: Radio,      labelKey: 'presets.spotify.label',      descKey: 'presets.spotify.desc' },
    { key: 'clarity',      icon: Sparkles,   labelKey: 'presets.clarity.label',      descKey: 'presets.clarity.desc' },
    { key: 'denoise',      icon: Wind,       labelKey: 'presets.denoise.label',      descKey: 'presets.denoise.desc' },
    { key: 'reverb',       icon: Waves,      labelKey: 'presets.reverb.label',       descKey: 'presets.reverb.desc' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AIStudioThemeBar />

      <main className="container mx-auto px-4 py-6 pt-16 max-w-2xl">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiEdit.backToStudio')}
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{tr('title')}</h1>
          <p className="text-muted-foreground max-w-md mx-auto">{tr('subtitle')}</p>
        </div>

        <div className="space-y-6">
          {/* Upload */}
          {!processedUrl && !isProcessing && (
            <Card>
              <CardContent className="p-6">
                {!audioFile ? (
                  <Tabs value={sourceTab} onValueChange={setSourceTab}>
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="upload" className="flex-1 gap-2">
                        <Upload className="w-4 h-4" />
                        {t('masterize.tabUpload', 'Subir archivo')}
                      </TabsTrigger>
                      <TabsTrigger value="library" className="flex-1 gap-2">
                        <Music className="w-4 h-4" />
                        {t('masterize.tabLibrary', 'Mis canciones')}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload">
                      <FileDropzone
                        fileType="audio"
                        accept=".mp3,.wav,.flac,.aac,.m4a,.ogg,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4,audio/ogg"
                        maxSize={50}
                        label={tr('uploadLabel')}
                        description={tr('uploadDescription')}
                        currentFile={audioFile}
                        onFileSelect={handleFileSelect}
                        onRemove={handleRemoveFile}
                      />
                    </TabsContent>

                    <TabsContent value="library">
                      <GenerationPicker onSelect={handleGenerationSelect} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <>
                    <FileDropzone
                      fileType="audio"
                      accept=".mp3,.wav,.flac,.aac,.m4a,.ogg,audio/mpeg,audio/wav,audio/flac,audio/aac,audio/mp4,audio/ogg"
                      maxSize={50}
                      label={tr('uploadLabel')}
                      description={tr('uploadDescription')}
                      currentFile={audioFile}
                      onFileSelect={handleFileSelect}
                      onRemove={handleRemoveFile}
                    />

                    {/* Audio preview */}
                    {audioUrl && (
                      <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 rounded-full"
                            onClick={() => playAudio('original')}
                          >
                            {playingTrack === 'original' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{audioName || audioFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <audio src={audioUrl} className="w-full h-8" controls />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preset selector + CTA */}
          {audioFile && !isProcessing && !processedUrl && (
            <>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">{tr('presets.title')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESETS.map(p => {
                      const Icon = p.icon;
                      const selected = preset === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => { setPreset(p.key); setPreviewUrl(null); setPreviewError(null); }}
                          className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${
                            selected
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${selected ? 'text-primary' : ''}`} />
                            <span className="text-sm font-medium">{tr(p.labelKey)}</span>
                          </div>
                          <span className="text-xs opacity-80">{tr(p.descKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {previewUrl && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">{tr('preview.resultTitle')}</p>
                    </div>
                    <audio key={previewUrl} src={previewUrl} className="w-full h-8" controls preload="metadata" onError={handlePreviewAudioError} />
                    <p className="text-xs text-muted-foreground">{tr('preview.resultHint')}</p>
                  </CardContent>
                </Card>
              )}

              {previewError && (
                <Card className="border-destructive/30">
                  <CardContent className="p-3 flex items-start gap-2 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{previewError}</span>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {!previewUrl ? (
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={isPreviewing}
                    className="h-12 gap-2"
                  >
                    {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {isPreviewing ? tr('preview.loading') : tr('preview.cta')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => { setPreviewUrl(null); handlePreview(); }}
                    disabled={isPreviewing}
                    className="h-12 gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {tr('preview.regenerate', 'Regenerar preview')}
                  </Button>
                )}

                {!hasEnough(FEATURE_COSTS.enhance_audio) ? (
                  <NoCreditsAlert message={tr('ctaButton')} />
                ) : (
                  <Button
                    onClick={handleMasterize}
                    className="h-12 gap-2"
                    size="lg"
                  >
                    <Headphones className="w-5 h-5" />
                    {tr('ctaButton')}
                  </Button>
                )}
              </div>
              {isPreviewing && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  {tr('preview.hint')}
                </p>
              )}
              <PricingLink className="block text-center" />
            </>
          )}

          {/* Processing state */}
          {isProcessing && (
            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">{tr('processing.title')}</p>
                    <p className="text-sm text-muted-foreground">{tr('processing.subtitle')}</p>
                  </div>
                </div>

                <Progress value={progressPercent} className="h-2" />

                <div className="space-y-2">
                  {PROCESSING_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i < activeStep;
                    const active = i === activeStep;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                          done ? 'text-primary' : active ? 'text-foreground' : 'text-muted-foreground/50'
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        ) : active ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Icon className="w-4 h-4 shrink-0" />
                        )}
                        {tr(`processing.steps.${step.key}`)}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {processError && !isProcessing && (
            <Card className="border-destructive/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3 text-destructive">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{processError}</p>
                </div>
                {audioFile && hasEnough(FEATURE_COSTS.enhance_audio) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setProcessError(null); handleMasterize(); }}
                    className="gap-2 w-full"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('aiShared.retry', 'Reintentar')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Success result */}
          {processedUrl && (
            <div className="space-y-4">
              {/* Success header */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                    <h2 className="text-lg font-semibold">{tr('success.title')}</h2>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      {tr('success.indicators.optimized')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                      <Volume2 className="w-3 h-3" />
                      {tr('success.indicators.streaming')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                      <Sparkles className="w-3 h-3" />
                      {tr('success.indicators.professional')}
                    </span>
                  </div>

                  {/* Mastered audio player */}
                  <div className="rounded-xl border border-border/40 bg-background p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 rounded-full"
                        onClick={() => playAudio('mastered')}
                      >
                        {playingTrack === 'mastered' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <div>
                        <p className="text-sm font-medium">{tr('success.masteredTitle')}</p>
                        <p className="text-xs text-muted-foreground">{tr('success.masteredSubtitle')}</p>
                      </div>
                    </div>
                    <audio src={processedUrl} className="w-full h-8" controls />
                  </div>
                </CardContent>
              </Card>

              {/* A/B Comparison */}
              {audioUrl && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3">📊 {tr('success.compare')}</p>
                    <div className="flex gap-2">
                      <Button
                        variant={playingTrack === 'original' ? "default" : "outline"}
                        size="sm"
                        onClick={() => playAudio('original')}
                        className="gap-2 flex-1"
                      >
                        {playingTrack === 'original' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {tr('success.original')}
                      </Button>
                      <Button
                        variant={playingTrack === 'mastered' ? "default" : "outline"}
                        size="sm"
                        onClick={() => playAudio('mastered')}
                        className="gap-2 flex-1"
                      >
                        {playingTrack === 'mastered' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {tr('success.mastered')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button asChild className="gap-2">
                  <a href={processedUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                    {tr('actions.download')}
                  </a>
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {tr('actions.startNew')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      
    </div>
  );
};

export default AIStudioEdit;
