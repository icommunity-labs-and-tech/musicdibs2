import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
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
import {
  ArrowLeft, Video, Music, Sparkles, Play, Pause,
  Image, Film, Layers, Wand2, Clock, Ratio, Upload,
  Loader2, Download, RefreshCw, AlertCircle, Merge, Volume2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import type { GenerationResult } from "@/types/aiStudio";

const VIDEO_STYLES = [
  { id: "cinematic", label: "Cinemático", emoji: "🎬", prompt: "cinematic, dramatic lighting, film grain, anamorphic lens" },
  { id: "anime", label: "Anime", emoji: "🌸", prompt: "anime style, cel shaded, vibrant colors, japanese animation" },
  { id: "retro-vhs", label: "Retro VHS", emoji: "📼", prompt: "VHS aesthetic, retro 80s, scan lines, chromatic aberration" },
  { id: "abstract", label: "Abstracto", emoji: "🎨", prompt: "abstract visuals, fluid shapes, morphing colors, art installation" },
  { id: "lyric-video", label: "Lyric Video", emoji: "✍️", prompt: "typography in motion, text animation, clean background" },
  { id: "neon", label: "Neon/Cyberpunk", emoji: "💜", prompt: "neon lights, cyberpunk city, rain reflections, futuristic" },
  { id: "nature", label: "Naturaleza", emoji: "🌿", prompt: "natural landscapes, organic movement, time-lapse nature" },
  { id: "urban", label: "Urbano", emoji: "🏙️", prompt: "urban streets, city life, graffiti walls, street culture" },
] as const;

const ASPECT_RATIOS = [
  { id: "1280:768", label: "16:9 Horizontal", icon: "▬" },
  { id: "768:1280", label: "9:16 Vertical", icon: "▮" },
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
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mergeAudioVideo, progress: mergeProgress, loaded: ffmpegLoaded, resetProgress, loadFFmpeg } = useFFmpegMerge();

  // Generation mode
  const [mode, setMode] = useState<'text_to_video' | 'image_to_video'>('text_to_video');

  // Inputs
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("1280:768");
  const [duration, setDuration] = useState(5);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string>("");

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // Audio merge state
  const [audioTracks, setAudioTracks] = useState<GenerationResult[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState<string | null>(null); // result id
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [preSelectedAudioId, setPreSelectedAudioId] = useState<string | null>(null); // pre-select before generation
  const [isMerging, setIsMerging] = useState(false);
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Load audio tracks and video history on mount
  useEffect(() => {
    if (user) {
      loadAudioTracks();
      loadVideoHistory();
    }
    return () => {
      pollingRef.current.forEach(interval => clearInterval(interval));
      audioElementsRef.current.forEach(audio => audio.pause());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadVideoHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const loaded: VideoResult[] = (data || []).map(row => ({
        id: row.id,
        taskId: row.task_id,
        status: row.status as VideoResult['status'],
        videoUrl: row.video_url || undefined,
        mergedUrl: row.merged_url || undefined,
        prompt: row.prompt,
        createdAt: new Date(row.created_at),
        progress: row.status === 'SUCCEEDED' ? 100 : 0,
      }));
      setResults(loaded);

      // Resume polling for pending/running
      loaded.forEach(r => {
        if (r.status === 'PENDING' || r.status === 'RUNNING') {
          pollTaskStatus(r.taskId, r.id);
        }
      });
    } catch (err) {
      console.error('Error loading video history:', err);
    }
  };

  // Load audio tracks when merge dialog opens
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
      // Stop any audio previews
      audioElementsRef.current.forEach(a => a.pause());
      setAudioPlayingId(null);

      const mergedUrl = await mergeAudioVideo(result.videoUrl, audioTrack.audioUrl);

      setResults(prev => prev.map(r =>
        r.id === resultId ? { ...r, mergedUrl } : r
      ));

      setMergeDialogOpen(null);
      setSelectedAudioId(null);
      toast({ title: "¡Audio fusionado!", description: "Tu videoclip ahora tiene banda sonora" });
    } catch (err: any) {
      console.error('Merge error:', err);
      toast({ title: "Error al fusionar", description: err.message || "No se pudo fusionar audio y vídeo", variant: "destructive" });
    } finally {
      setIsMerging(false);
    }
  };

  const buildFullPrompt = () => {
    let fullPrompt = prompt;
    if (selectedStyle) {
      const style = VIDEO_STYLES.find(s => s.id === selectedStyle);
      if (style) fullPrompt = `${style.prompt}. ${fullPrompt}`;
    }
    return fullPrompt.trim();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen", variant: "destructive" });
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      toast({ title: "Error", description: "La imagen no puede superar 16MB", variant: "destructive" });
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
          toast({ title: "¡Videoclip generado!", description: "Tu vídeo está listo" });

          // Auto-merge if a pre-selected audio track exists
          if (preSelectedAudioId) {
            const audioTrack = audioTracks.find(t => t.id === preSelectedAudioId);
            const videoUrl = data.output?.[0];
            if (audioTrack && videoUrl) {
              try {
                const mergedUrl = await mergeAudioVideo(videoUrl, audioTrack.audioUrl);
                setResults(prev => prev.map(r =>
                  r.id === resultId ? { ...r, mergedUrl } : r
                ));
                toast({ title: "¡Audio fusionado automáticamente!", description: "Tu videoclip ya tiene banda sonora" });
              } catch (mergeErr) {
                console.error('Auto-merge error:', mergeErr);
                toast({ title: "Vídeo listo, pero el merge automático falló", description: "Puedes añadir audio manualmente", variant: "destructive" });
              }
            }
          }
        } else if (status === 'FAILED') {
          clearInterval(interval);
          pollingRef.current.delete(resultId);
          toast({ title: "Error", description: data.failure || "La generación del vídeo falló", variant: "destructive" });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds

    pollingRef.current.set(resultId, interval);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Escribe una descripción para tu videoclip", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión", variant: "destructive" });
      return;
    }
    if (mode === 'image_to_video' && !uploadedImage) {
      toast({ title: "Error", description: "Sube una imagen para el modo Image-to-Video", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
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

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const resultId = crypto.randomUUID();
      const newResult: VideoResult = {
        id: resultId,
        taskId: data.taskId,
        status: 'PENDING',
        prompt: fullPrompt,
        createdAt: new Date(),
        progress: 0,
      };

      setResults(prev => [newResult, ...prev]);
      pollTaskStatus(data.taskId, resultId);

      toast({ title: "Generación iniciada", description: "El vídeo se está procesando. Esto puede tardar 1-2 minutos." });
    } catch (err: any) {
      console.error('Generate error:', err);
      setError(err.message || "No se pudo iniciar la generación");
    } finally {
      setIsGenerating(false);
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
      case 'PENDING': return 'En cola';
      case 'RUNNING': return 'Procesando';
      case 'SUCCEEDED': return 'Completado';
      case 'FAILED': return 'Fallido';
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

      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver a AI MusicDibs Studio
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shrink-0">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Videoclips con IA</h1>
              <p className="text-muted-foreground">Genera videoclips musicales con Runway Gen-4 Turbo</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Column 1: Prompt & Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Modo de Generación</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="text_to_video" className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      Text to Video
                    </TabsTrigger>
                    <TabsTrigger value="image_to_video" className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Image to Video
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="text_to_video" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Genera un vídeo completamente desde una descripción textual.
                    </p>
                  </TabsContent>

                  <TabsContent value="image_to_video" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Anima una imagen estática para crear un videoclip. La imagen será el primer fotograma.
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
                            Cambiar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => fileInputRef.current?.click()}>
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Subir imagen (max 16MB)</span>
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
                  Prompt Visual
                </CardTitle>
                <CardDescription>Describe el contenido y estilo del videoclip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea
                  placeholder="Ej: A person walking through neon-lit streets at night, cinematic slow motion, rain reflections on the ground..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                />

                {/* Style Selection */}
                <div className="space-y-2">
                  <Label>Estilo Visual (opcional)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VIDEO_STYLES.map(style => (
                      <Badge
                        key={style.id}
                        variant={selectedStyle === style.id ? "default" : "outline"}
                        className="cursor-pointer justify-start gap-1.5 py-2 px-3 text-sm hover:bg-primary/10 transition-colors"
                        onClick={() => setSelectedStyle(selectedStyle === style.id ? null : style.id)}
                      >
                        <span>{style.emoji}</span>
                        {style.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Ratio className="w-4 h-4" />
                      Aspecto
                    </Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.icon} {r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Duración
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
                  Banda Sonora (opcional)
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecciona una pista de AI Studio para fusionar automáticamente con el vídeo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoadingTracks ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : audioTracks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No hay pistas. Genera una en{" "}
                    <Link to="/ai-studio/create" className="text-primary underline">AI Studio → Crear Música</Link>.
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
                        Se fusionará automáticamente al completar el vídeo
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || (mode === 'image_to_video' && !uploadedImage)}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando generación...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Generar Videoclip
                    </>
                  )}
                </Button>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
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
              Resultados
            </h2>

            {results.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Film className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center text-sm">
                    {user ? "Tus videoclips aparecerán aquí" : "Inicia sesión para generar videoclips"}
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
                            <p className="text-sm text-destructive">Generación fallida</p>
                          </>
                        )}
                      </div>
                    )}

                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(result.status)}>
                          {getStatusLabel(result.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.createdAt.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{result.prompt}</p>

                      {result.status === 'SUCCEEDED' && result.videoUrl && (
                        <div className="space-y-2">
                          {/* Merged video display */}
                          {result.mergedUrl && (
                            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Volume2 className="w-4 h-4 text-primary" />
                                Versión con audio
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
                                Descargar con audio
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
                              Sin audio
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
                                  Añadir audio
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Merge className="w-5 h-5" />
                                    Fusionar Audio + Vídeo
                                  </DialogTitle>
                                  <DialogDescription>
                                    Selecciona una pista de tu historial de AI Studio para añadir como banda sonora
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                  {isLoadingTracks ? (
                                    <div className="flex items-center justify-center py-8">
                                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : audioTracks.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                      No hay pistas de audio. Genera una en AI Studio → Crear Música.
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
                                      Fusionando...
                                    </>
                                  ) : (
                                    <>
                                      <Merge className="w-4 h-4 mr-2" />
                                      Fusionar Audio + Vídeo
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
              </div>
            )}

            {/* Info card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 text-sm">Información</h3>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• La generación tarda entre 30s y 2 minutos</li>
                  <li>• Resolución de salida: 720p</li>
                  <li>• Modelo: Runway Gen-4 Turbo</li>
                  <li>• Los prompts en inglés dan mejores resultados</li>
                  <li>• Cada generación consume créditos de tu cuenta Runway</li>
                  <li>• Puedes fusionar audio de AI Studio con el vídeo directamente en tu navegador</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIStudioVideo;
