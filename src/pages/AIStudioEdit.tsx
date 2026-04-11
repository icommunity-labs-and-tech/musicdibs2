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
import {
  ArrowLeft, Loader2, Play, Pause, Download,
  Music, Sparkles, CheckCircle2, AlertTriangle,
  Headphones, Volume2, Waves, Wind, Radio, RefreshCw, Upload
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

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

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Result
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  // A/B comparison
  const [playingTrack, setPlayingTrack] = useState<"original" | "mastered" | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopProgress();
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };
  const stopProgress = () => {
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  };

  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setAudioName(file.name);
    setProcessedUrl(null);
    setProcessError(null);
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
      setProcessedUrl(null);
      setProcessError(null);
      setPlayingTrack(null);
    } catch {
      toast({ title: t("masterize.errorGeneric", "Error al cargar el audio"), variant: "destructive" });
    }
  };

  const handleRemoveFile = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setAudioName(null);
    setProcessedUrl(null);
    setProcessError(null);
    stopAllAudio();
  };

  const stopAllAudio = () => {
    originalAudioRef.current?.pause();
    masteredAudioRef.current?.pause();
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

    track('enhance_audio_started', { feature: 'enhance_audio' });
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
        { body: { feature: "enhance_audio", description: "Masterización profesional" } }
      );
      if (spendErr || spend?.error) throw new Error(spend?.error || "Error de créditos");

      // Upload file
      const uploadedUrl = await uploadForProcessing(audioFile);

      // Start Auphonic processing with "professional" mode
      const { data, error } = await supabase.functions.invoke("auphonic-enhance", {
        body: {
          action: "process",
          mode: "professional",
          audioUrl: uploadedUrl,
          filename: audioFile.name,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      const uuid = data.productionUuid;

      // Poll for result
      pollingRef.current = setInterval(async () => {
        try {
          const { data: st } = await supabase.functions.invoke("auphonic-enhance", {
            body: { action: "status", productionUuid: uuid },
          });
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
            setProcessError(tr('errorGeneric'));
          }
        } catch { /* continue polling */ }
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
      setProcessError(err.message || tr('errorGeneric'));
    }
  };

  const playAudio = (track: "original" | "mastered") => {
    // Stop both
    originalAudioRef.current?.pause();
    masteredAudioRef.current?.pause();

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
    }
    setPlayingTrack(track);
  };

  const handleReset = () => {
    stopAllAudio();
    originalAudioRef.current = null;
    masteredAudioRef.current = null;
    setAudioFile(null);
    setAudioUrl(null);
    setAudioName(null);
    setProcessedUrl(null);
    setProcessError(null);
    setProgressPercent(0);
    setActiveStep(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 pt-24 max-w-2xl">
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
                        accept="audio/*"
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
                      accept="audio/*"
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

          {/* CTA Button */}
          {audioFile && !isProcessing && !processedUrl && (
            <div className="space-y-2">
              {!hasEnough(FEATURE_COSTS.enhance_audio) ? (
                <NoCreditsAlert message={tr('ctaButton')} />
              ) : (
                <Button
                  onClick={handleMasterize}
                  className="w-full h-14 text-base gap-3"
                  size="lg"
                >
                  <Headphones className="w-5 h-5" />
                  {tr('ctaButton')}
                </Button>
              )}
              <PricingLink className="block text-center" />
            </div>
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
              <CardContent className="p-4 flex items-center gap-3 text-destructive">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{processError}</p>
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
