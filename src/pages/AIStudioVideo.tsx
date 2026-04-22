import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFFmpegMerge } from "@/hooks/useFFmpegMerge";
import { supabase } from "@/integrations/supabase/client";
import { parseAiError } from "@/lib/aiErrorHandler";
import {
  ArrowLeft, Video, Music, Sparkles, Play, Pause,
  Image, Film, Layers, Wand2, Clock, Ratio, Upload,
  Loader2, Download, RefreshCw, AlertCircle, Merge, Volume2, Trash2,
  Filter, X, CalendarIcon, Search
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Navbar } from "@/components/Navbar";
import { AIStudioThemeBar } from "@/components/ai-studio/AIStudioThemeBar";

import type { GenerationResult } from "@/types/aiStudio";
import { useCredits } from "@/hooks/useCredits";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { FEATURE_COSTS } from "@/lib/featureCosts";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { useProductTracking } from "@/hooks/useProductTracking";

const VIDEO_STYLE_KEYS = [
  { id: "cinematic", emoji: "🎬", prompt: "cinematic, dramatic lighting, film grain, anamorphic lens" },
  { id: "anime", emoji: "🌸", prompt: "anime style, cel shaded, vibrant colors, japanese animation" },
  { id: "retro-vhs", emoji: "📼", prompt: "VHS aesthetic, retro 80s, scan lines, chromatic aberration" },
  { id: "abstract", emoji: "🎨", prompt: "abstract visuals, fluid shapes, morphing colors, art installation" },
  { id: "lyric-video", emoji: "✍️", prompt: "typography in motion, text animation, clean background" },
  { id: "neon", emoji: "💜", prompt: "neon lights, cyberpunk city, rain reflections, futuristic" },
  { id: "nature", emoji: "🌿", prompt: "natural landscapes, organic movement, time-lapse nature" },
  { id: "urban", emoji: "🏙️", prompt: "urban streets, city life, graffiti walls, street culture" },
] as const;

const ASPECT_RATIO_KEYS = [
  { id: "1280:720", key: "horizontal" },
  { id: "720:1280", key: "vertical" },
  { id: "960:960", key: "square" },
] as const;

const DURATIONS = [
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
] as const;

interface VideoResult {
  id: string;
  taskId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  videoUrl?: string;
  mergedUrl?: string;
  prompt: string;
  createdAt: Date;
  progress?: number;
}

const AIStudioVideo = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mergeAudioVideo, progress: mergeProgress, loaded: ffmpegLoaded, resetProgress, loadFFmpeg } = useFFmpegMerge();
  const { hasEnough } = useCredits();
  const { track } = useProductTracking();

  useEffect(() => {
    track('ai_studio_entered', { feature: 'video' });
  }, []);

  // Generation mode
  const [mode, setMode] = useState<'text_to_video' | 'image_to_video'>('text_to_video');

  // Inputs
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1280:720");
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) return;
    setIsImprovingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: { prompt, genre: "", mood: "", mode: "instrumental" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.improved) {
        setPrompt(data.improved);
        toast({ title: "✨ " + t('aiVideo.improveWithAI'), description: t('aiVideo.promptImprovedDesc', { defaultValue: 'Puedes editarlo antes de generar el vídeo' }) });
      }
    } catch {
      toast({ title: t('aiShared.error'), description: t('aiVideo.errorNoDesc'), variant: "destructive" });
    } finally {
      setIsImprovingPrompt(false);
    }
  };
  const [duration, setDuration] = useState(5);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string>("");

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Audio merge state
  const [audioTracks, setAudioTracks] = useState<GenerationResult[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [preSelectedAudioId, setPreSelectedAudioId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterStyle, setFilterStyle] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      loadAudioTracks();
    }
    return () => {
      pollingRef.current.forEach(interval => clearInterval(interval));
      audioElementsRef.current.forEach(audio => audio.pause());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) {
      loadVideoHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterStatus, filterStyle, filterDate, debouncedSearch]);

  const PAGE_SIZE = 10;

  const loadVideoHistory = async (loadMore = false) => {
    if (!user) return;
    if (loadMore) setIsLoadingMore(true);
    try {
      let query = supabase
        .from('video_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (filterStatus !== "all") query = query.eq('status', filterStatus);
      if (filterStyle !== "all") query = query.eq('style', filterStyle);
      if (filterDate) {
        const dayStart = new Date(filterDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(filterDate);
        dayEnd.setHours(23, 59, 59, 999);
        query = query.gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
      }
      if (debouncedSearch.trim()) query = query.ilike('prompt', `%${debouncedSearch.trim()}%`);

      if (loadMore && results.length > 0) {
        const lastItem = results[results.length - 1];
        query = query.lt('created_at', lastItem.createdAt.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: VideoResult[] = (data || []).map(row => ({
        id: row.id,
        taskId: row.task_id,
        status: row.status as VideoResult['status'],
        videoUrl: row.video_url || undefined,
        mergedUrl: row.merged_url || undefined,
        prompt: row.prompt,
        createdAt: new Date(row.created_at),
        progress: row.status === 'SUCCEEDED' ? 100 : 0,
      }));

      setHasMore((data || []).length === PAGE_SIZE);

      if (loadMore) {
        setResults(prev => [...prev, ...mapped]);
      } else {
        setResults(mapped);
      }

      mapped.forEach(r => {
        if (r.status === 'PENDING' || r.status === 'RUNNING') {
          pollTaskStatus(r.taskId, r.id);
        }
      });
    } catch (err) {
      console.error('Error loading video history:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadAudioTracks = async () => {
    if (!user || audioTracks.length > 0) return;
    setIsLoadingTracks(true);
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setAudioTracks((data || []).map(item => ({
        id: item.id,
        audioUrl: item.audio_url,
        prompt: item.prompt,
        duration: item.duration,
        genre: item.genre || undefined,
        mood: item.mood || undefined,
        createdAt: new Date(item.created_at),
        isFavorite: item.is_favorite || false,
      })));
    } catch (err) {
      console.error('Error loading audio tracks:', err);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const toggleAudioPreview = (audioUrl: string, id: string) => {
    const existing = audioElementsRef.current.get(id);
    if (audioPlayingId === id && existing) {
      existing.pause();
      setAudioPlayingId(null);
    } else {
      audioElementsRef.current.forEach(a => a.pause());
      let audio = existing;
      if (!audio) {
        audio = new Audio(audioUrl);
        audio.onended = () => setAudioPlayingId(null);
        audioElementsRef.current.set(id, audio);
      }
      audio.play();
      setAudioPlayingId(id);
    }
  };

  const handleMerge = async (resultId: string) => {
    const result = results.find(r => r.id === resultId);
    const audioTrack = audioTracks.find(t => t.id === selectedAudioId);
    if (!result?.videoUrl || !audioTrack) return;

    setIsMerging(true);
    try {
      audioElementsRef.current.forEach(a => a.pause());
      setAudioPlayingId(null);

      const mergedUrl = await mergeAudioVideo(result.videoUrl, audioTrack.audioUrl);

      setResults(prev => prev.map(r =>
        r.id === resultId ? { ...r, mergedUrl } : r
      ));

      await supabase.from('video_generations').update({
        merged_url: mergedUrl,
        merged_audio_id: audioTrack.id,
      }).eq('id', resultId);

      setMergeDialogOpen(null);
      setSelectedAudioId(null);
      toast({ title: t('aiVideo.audioMerged'), description: t('aiVideo.audioMergedDesc') });
    } catch (err: any) {
      console.error('Merge error:', err);
      const { userMessage } = parseAiError(err);
      toast({ title: t('aiShared.error'), description: userMessage, variant: "destructive" });
    } finally {
      setIsMerging(false);
    }
  };

  const buildFullPrompt = () => {
    let fullPrompt = prompt;
    if (selectedStyle) {
      const style = VIDEO_STYLE_KEYS.find(s => s.id === selectedStyle);
      if (style) fullPrompt = `${style.prompt}. ${fullPrompt}`;
    }
    return fullPrompt.trim();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: t('aiShared.error'), description: t('aiVideo.errorImageOnly'), variant: "destructive" });
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      toast({ title: t('aiShared.error'), description: t('aiVideo.errorImageSize'), variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setUploadedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const pollTaskStatus = (taskId: string, resultId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: { action: 'status', taskId },
        });

        if (error) throw error;

        const status = data.status;
        
        setResults(prev => prev.map(r =>
          r.id === resultId
            ? {
                ...r,
                status,
                videoUrl: data.output?.[0] || r.videoUrl,
                progress: status === 'RUNNING' ? (data.progress ?? 50) : (status === 'SUCCEEDED' ? 100 : r.progress),
              }
            : r
        ));

        if (status === 'SUCCEEDED') {
          clearInterval(interval);
          pollingRef.current.delete(resultId);

          const videoUrl = data.output?.[0];
          await supabase.from('video_generations').update({
            status: 'SUCCEEDED',
            video_url: videoUrl || null,
            updated_at: new Date().toISOString(),
          }).eq('id', resultId);

          toast({ title: t('aiVideo.videoGenerated'), description: t('aiVideo.videoReady') });
          track('video_generated', { feature: 'video' });

          if (preSelectedAudioId) {
            const audioTrack = audioTracks.find(t => t.id === preSelectedAudioId);
            if (audioTrack && videoUrl) {
              try {
                const mergedUrl = await mergeAudioVideo(videoUrl, audioTrack.audioUrl);
                setResults(prev => prev.map(r =>
                  r.id === resultId ? { ...r, mergedUrl } : r
                ));
                await supabase.from('video_generations').update({
                  merged_url: mergedUrl,
                  merged_audio_id: audioTrack.id,
                }).eq('id', resultId);
                toast({ title: t('aiVideo.autoMerged'), description: t('aiVideo.autoMergedDesc') });
              } catch (mergeErr) {
                console.error('Auto-merge error:', mergeErr);
                toast({ title: t('aiVideo.videoGenerated'), description: t('aiVideo.videoReadyMergeError', { defaultValue: 'Puedes añadir audio manualmente' }), variant: "destructive" });
              }
            }
          }
        } else if (status === 'FAILED') {
          clearInterval(interval);
          pollingRef.current.delete(resultId);
          await supabase.from('video_generations').update({
            status: 'FAILED',
            failure_reason: data.failure || null,
            updated_at: new Date().toISOString(),
          }).eq('id', resultId);
          toast({ title: t('aiShared.error'), description: data.failure || t('aiVideo.genFailed'), variant: "destructive" });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);

    pollingRef.current.set(resultId, interval);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: t('aiShared.error'), description: t('aiVideo.errorNoDesc'), variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: t('aiShared.error'), description: t('aiVideo.errorLogin'), variant: "destructive" });
      return;
    }
    if (mode === 'image_to_video' && !uploadedImage) {
      toast({ title: t('aiShared.error'), description: t('aiVideo.errorNoImage'), variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data: spendResult, error: spendError } = await supabase.functions.invoke('spend-credits', {
        body: { feature: 'generate_video', description: `Video AI: ${prompt.slice(0, 80)}` },
      });
      if (spendError) throw new Error(spendError.message || 'Error al descontar créditos');
      if (spendResult?.error) throw new Error(spendResult.error);

      const fullPrompt = buildFullPrompt();

      const body: Record<string, unknown> = {
        action: 'generate',
        mode,
        promptText: fullPrompt,
        ratio: aspectRatio,
        duration,
      };

      if (mode === 'image_to_video' && uploadedImage) {
        body.promptImage = uploadedImage;
      }

      const { data, error: fnError } = await supabase.functions.invoke('generate-video', { body });

      if (data?.error === 'rate_limit_exceeded') {
        toast({
          title: t('aiVideo.rateLimit', { defaultValue: 'Demasiadas generaciones' }),
          description: data.message || t('aiVideo.rateLimitDesc', { defaultValue: 'Espera unos segundos antes de volver a generar.' }),
          variant: 'destructive',
        });
        return;
      }

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const { data: dbRow, error: dbError } = await supabase
        .from('video_generations')
        .insert({
          user_id: user.id,
          task_id: data.taskId,
          status: 'PENDING',
          prompt: fullPrompt,
          mode,
          style: selectedStyle || null,
          aspect_ratio: aspectRatio,
          duration,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      const newResult: VideoResult = {
        id: dbRow.id,
        taskId: data.taskId,
        status: 'PENDING',
        prompt: fullPrompt,
        createdAt: new Date(),
        progress: 0,
      };

      setResults(prev => [newResult, ...prev]);
      pollTaskStatus(data.taskId, dbRow.id);

      toast({ title: t('aiVideo.genStarted'), description: t('aiVideo.genStartedDesc') });
    } catch (err: any) {
      console.error('Generate error:', err);
      const { userMessage } = parseAiError(err);
      setError(userMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (resultId: string) => {
    const interval = pollingRef.current.get(resultId);
    if (interval) {
      clearInterval(interval);
      pollingRef.current.delete(resultId);
    }

    try {
      const { error } = await supabase.from('video_generations').delete().eq('id', resultId);
      if (error) throw error;
      setResults(prev => prev.filter(r => r.id !== resultId));
      toast({ title: t('aiVideo.videoDeleted') });
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: t('aiShared.error'), variant: "destructive" });
    }
  };

  const downloadVideo = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `musicdibs-video-${name}.mp4`;
    link.target = '_blank';
    link.click();
  };

  const getStatusLabel = (status: VideoResult['status']) => {
    switch (status) {
      case 'PENDING': return t('aiVideo.pending');
      case 'RUNNING': return t('aiVideo.running');
      case 'SUCCEEDED': return t('aiVideo.succeeded');
      case 'FAILED': return t('aiVideo.failed');
    }
  };

  const getStatusColor = (status: VideoResult['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-muted text-muted-foreground';
      case 'RUNNING': return 'bg-primary/10 text-primary';
      case 'SUCCEEDED': return 'bg-green-500/10 text-green-600';
      case 'FAILED': return 'bg-destructive/10 text-destructive';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AIStudioThemeBar />

      <main className="container mx-auto px-4 py-6 pt-16">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiVideo.backToStudio')}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shrink-0">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t('aiVideo.title')}</h1>
              <p className="text-muted-foreground">{t('aiVideo.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Column 1: Prompt & Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('aiVideo.generationMode')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="text_to_video" className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      {t('aiVideo.textToVideo')}
                    </TabsTrigger>
                    <TabsTrigger value="image_to_video" className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      {t('aiVideo.imageToVideo')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text_to_video" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t('aiVideo.textToVideoDesc')}
                    </p>
                  </TabsContent>

                  <TabsContent value="image_to_video" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      {t('aiVideo.imageToVideoDesc')}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {uploadedImage ? (
                      <div className="relative rounded-lg overflow-hidden border">
                        <img src={uploadedImage} alt="Preview" className="w-full max-h-48 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-3 py-2 flex justify-between items-center">
                          <span className="text-xs truncate">{uploadedImageName}</span>
                          <Button variant="ghost" size="sm" onClick={() => { setUploadedImage(null); setUploadedImageName(""); }}>
                            {t('aiVideo.change')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => fileInputRef.current?.click()}>
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t('aiVideo.uploadImage')}</span>
                        </div>
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-rose-500" />
                  {t('aiVideo.promptVisual')}
                </CardTitle>
                <CardDescription>{t('aiVideo.promptVisualDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t('aiVideo.describeScene')}</Label>
                    <button
                      type="button"
                      onClick={handleImprovePrompt}
                      disabled={isImprovingPrompt || !prompt.trim()}
                      title={t('aiVideo.improveWithAI')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#4b5563',
                        background: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        cursor: 'pointer',
                        opacity: (isImprovingPrompt || !prompt.trim()) ? 0.4 : 1,
                        transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.color = 'hsl(var(--primary))'; e.currentTarget.style.background = 'hsl(var(--primary) / 0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {isImprovingPrompt
                        ? <><Loader2 style={{ width: 16, height: 16, color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />{t('aiVideo.improving')}</>
                        : <><Sparkles style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />{t('aiVideo.improveWithAI')}</>
                      }
                    </button>
                  </div>
                  <Textarea
                    placeholder="Ej: A person walking through neon-lit streets at night, cinematic slow motion, rain reflections on the ground..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Style Selection */}
                <div className="space-y-2">
                  <Label>{t('aiVideo.visualStyle')}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VIDEO_STYLE_KEYS.map(style => (
                      <Badge
                        key={style.id}
                        variant={selectedStyle === style.id ? "default" : "outline"}
                        className="cursor-pointer justify-start gap-1.5 py-2 px-3 text-sm hover:bg-primary/10 transition-colors"
                        onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
                      >
                        <span>{style.emoji}</span>
                        {t(`aiVideo.styles.${style.id}`)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ratio className="w-4 h-4" />
                      {t('aiVideo.aspect')}
                    </Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIO_KEYS.map(r => (
                          <SelectItem key={r.id} value={r.id}>{t(`aiVideo.aspects.${r.key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {t('aiVideo.duration')}
                    </Label>
                    <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map(d => (
                          <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

            {/* Soundtrack pre-selection */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Music className="w-4 h-4 text-primary" />
                  {t('aiVideo.soundtrack')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('aiVideo.soundtrackDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoadingTracks ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : audioTracks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    {t('aiVideo.noTracks')}{" "}
                    <Link to="/ai-studio/create" className="text-primary underline">{t('aiVideo.createMusicLink')}</Link>.
                  </p>
                ) : (
                  <>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {audioTracks.map(track => (
                        <div
                          key={track.id}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm ${
                            preSelectedAudioId === track.id
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted/50 border border-transparent'
                          }`}
                          onClick={() => setPreSelectedAudioId(preSelectedAudioId === track.id ? null : track.id)}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAudioPreview(track.audioUrl, track.id);
                            }}
                          >
                            {audioPlayingId === track.id
                              ? <Pause className="w-3 h-3" />
                              : <Play className="w-3 h-3 ml-0.5" />
                            }
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs">{track.prompt}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span>{track.duration}s</span>
                              {track.genre && <Badge variant="secondary" className="text-[10px] px-1 py-0">{track.genre}</Badge>}
                            </div>
                          </div>
                          {preSelectedAudioId === track.id && (
                            <Badge variant="default" className="shrink-0 text-[10px]">✓</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    {preSelectedAudioId && (
                      <p className="text-[11px] text-primary flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        {t('aiVideo.autoMerge')}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

                {!hasEnough(FEATURE_COSTS.generate_video) ? (
                  <NoCreditsAlert message={t('aiVideo.generateBtn')} />
                ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || (mode === 'image_to_video' && !uploadedImage)}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('aiVideo.startingGen')}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      {t('aiVideo.generateBtn')}
                    </>
                  )}
                </Button>
                )}
                <PricingLink className="block text-center mt-1" />

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('aiShared.error')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Results */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5" />
              {t('aiVideo.results')}
            </h2>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('aiVideo.searchPrompt')}
                  className="h-8 w-[180px] rounded-md border border-input bg-background pl-7 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder={t('aiVideo.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('aiVideo.allStatuses')}</SelectItem>
                  <SelectItem value="PENDING">{t('aiVideo.pending')}</SelectItem>
                  <SelectItem value="RUNNING">{t('aiVideo.running')}</SelectItem>
                  <SelectItem value="SUCCEEDED">{t('aiVideo.succeeded')}</SelectItem>
                  <SelectItem value="FAILED">{t('aiVideo.failed')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStyle} onValueChange={setFilterStyle}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder={t('aiVideo.style')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('aiVideo.allStyles')}</SelectItem>
                  {VIDEO_STYLE_KEYS.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.emoji} {t(`aiVideo.styles.${s.id}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {filterDate ? format(filterDate, "dd/MM/yyyy") : t('aiVideo.date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(filterStatus !== "all" || filterStyle !== "all" || filterDate || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterStyle("all");
                    setFilterDate(undefined);
                    setSearchQuery("");
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  {t('aiVideo.clean')}
                </Button>
              )}
            </div>

            {results.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Film className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center text-sm">
                    {user ? t('aiVideo.videoclipsHere') : t('aiVideo.loginForVideoclips')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map(result => (
                  <Card key={result.id} className="overflow-hidden">
                    {/* Video preview */}
                    {result.status === 'SUCCEEDED' && result.videoUrl ? (
                      <div className="aspect-video bg-black">
                        <video
                          src={result.videoUrl}
                          controls
                          className="w-full h-full object-contain"
                          playsInline
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-rose-950/30 via-background to-red-950/20 flex flex-col items-center justify-center gap-3">
                        {(result.status === 'PENDING' || result.status === 'RUNNING') ? (
                          <>
                            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
                            <p className="text-sm text-muted-foreground">{getStatusLabel(result.status)}...</p>
                            {result.status === 'RUNNING' && (
                              <Progress value={result.progress || 0} className="w-2/3 h-2" />
                            )}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-10 h-10 text-destructive/50" />
                            <p className="text-sm text-destructive">{t('aiVideo.genFailed')}</p>
                          </>
                        )}
                      </div>
                    )}

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(result.status)}>
                          {getStatusLabel(result.status)}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {result.createdAt.toLocaleTimeString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(result.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{result.prompt}</p>

                      {result.status === 'SUCCEEDED' && result.videoUrl && (
                        <div className="space-y-2">
                          {/* Merged video display */}
                          {result.mergedUrl && (
                            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Volume2 className="w-4 h-4 text-primary" />
                                {t('aiVideo.audioVersion')}
                              </div>
                              <video
                                src={result.mergedUrl}
                                controls
                                className="w-full rounded"
                                playsInline
                              />
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full"
                                onClick={() => downloadVideo(result.mergedUrl!, `merged-${result.id.slice(0, 8)}`)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {t('aiVideo.downloadWithAudio')}
                              </Button>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => downloadVideo(result.videoUrl!, result.id.slice(0, 8))}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              {t('aiVideo.withoutAudio')}
                            </Button>
                            <Dialog
                              open={mergeDialogOpen === result.id}
                              onOpenChange={(open) => {
                                setMergeDialogOpen(open ? result.id : null);
                                if (open) {
                                  loadAudioTracks();
                                  setSelectedAudioId(null);
                                  resetProgress();
                                } else {
                                  audioElementsRef.current.forEach(a => a.pause());
                                  setAudioPlayingId(null);
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Music className="w-4 h-4 mr-1" />
                                  {t('aiVideo.addAudio')}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Merge className="w-5 h-5" />
                                    {t('aiVideo.mergeTitle')}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {t('aiVideo.mergeDesc')}
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                  {isLoadingTracks ? (
                                    <div className="flex items-center justify-center py-8">
                                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : audioTracks.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                      {t('aiVideo.noAudioTracks')}
                                    </div>
                                  ) : (
                                    audioTracks.map(track => (
                                      <Card
                                        key={track.id}
                                        className={`cursor-pointer transition-colors ${
                                          selectedAudioId === track.id
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => setSelectedAudioId(track.id)}
                                      >
                                        <CardContent className="p-3">
                                          <div className="flex items-center gap-3">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              className="shrink-0 h-9 w-9"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAudioPreview(track.audioUrl, track.id);
                                              }}
                                            >
                                              {audioPlayingId === track.id
                                                ? <Pause className="w-3.5 h-3.5" />
                                                : <Play className="w-3.5 h-3.5 ml-0.5" />
                                              }
                                            </Button>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm truncate">{track.prompt}</p>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{track.duration}s</span>
                                                {track.genre && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{track.genre}</Badge>}
                                              </div>
                                            </div>
                                            {selectedAudioId === track.id && (
                                              <Badge className="shrink-0">✓</Badge>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))
                                  )}
                                </div>

                                {/* Merge progress */}
                                {mergeProgress && (
                                  <div className="space-y-2 pt-2 border-t">
                                    <div className="flex items-center gap-2 text-sm">
                                      {mergeProgress.stage === 'error' ? (
                                        <AlertCircle className="w-4 h-4 text-destructive" />
                                      ) : (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      )}
                                      <span>{mergeProgress.message}</span>
                                    </div>
                                    {mergeProgress.stage === 'processing' && (
                                      <Progress value={mergeProgress.percent} className="h-2" />
                                    )}
                                  </div>
                                )}

                                <Button
                                  onClick={() => handleMerge(result.id)}
                                  disabled={!selectedAudioId || isMerging}
                                  className="w-full mt-2"
                                >
                                  {isMerging ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      {t('aiVideo.merging')}
                                    </>
                                  ) : (
                                    <>
                                      <Merge className="w-4 h-4 mr-2" />
                                      {t('aiVideo.mergeBtn')}
                                    </>
                                  )}
                                </Button>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              {hasMore && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => loadVideoHistory(true)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('aiVideo.loadingMore')}
                    </>
                  ) : (
                    t('aiVideo.loadMore')
                  )}
                </Button>
              )}
              </div>
            )}

            {/* Info card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 text-sm">{t('aiVideo.infoTitle', { defaultValue: 'Información' })}</h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• {t('aiVideo.info1', { defaultValue: 'La generación tarda entre 30s y 2 minutos' })}</li>
                  <li>• {t('aiVideo.info2', { defaultValue: 'Resolución de salida: 720p' })}</li>
                  <li>• {t('aiVideo.info3', { defaultValue: 'Modelo de IA de última generación' })}</li>
                  <li>• {t('aiVideo.info4', { defaultValue: 'Los prompts en inglés dan mejores resultados' })}</li>
                  
                  <li>• {t('aiVideo.info6', { defaultValue: 'Puedes fusionar audio de AI Music Studio con el vídeo directamente en tu navegador' })}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      
    </div>
  );
};

export default AIStudioVideo;
