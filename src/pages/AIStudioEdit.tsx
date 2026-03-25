import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, Wand2, Loader2, Play, Pause, Download, 
  Upload, Music, RefreshCw, Palette, Clock, Scissors,
  Sparkles, Zap, Volume2, Wind, Mic2, CheckCircle2, AlertTriangle
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MOODS, type GenerationResult, type VariationType } from "@/types/aiStudio";
import { useCredits } from "@/hooks/useCredits";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { FEATURE_COSTS } from "@/lib/featureCosts";

const ENHANCE_MODES = [
  {
    id:          "professional",
    icon:        Sparkles,
    iconColor:   "text-violet-500",
    bg:          "bg-violet-500/10",
    border:      "border-violet-500/30",
    label:       "Sonar profesional",
    description: "Todo en uno: equilibra volumen, claridad y loudness óptimo.",
  },
  {
    id:          "spotify",
    icon:        Volume2,
    iconColor:   "text-green-500",
    bg:          "bg-green-500/10",
    border:      "border-green-500/30",
    label:       "Listo para Spotify",
    description: "Ajusta el volumen al estándar -14 LUFS de plataformas de streaming.",
  },
  {
    id:          "denoise",
    icon:        Wind,
    iconColor:   "text-blue-500",
    bg:          "bg-blue-500/10",
    border:      "border-blue-500/30",
    label:       "Limpiar ruido de fondo",
    description: "Elimina ruido ambiental y zumbidos de grabaciones caseras.",
  },
  {
    id:          "clarity",
    icon:        Zap,
    iconColor:   "text-amber-500",
    bg:          "bg-amber-500/10",
    border:      "border-amber-500/30",
    label:       "Más brillo y claridad",
    description: "Mejora la presencia y definición con EQ inteligente.",
  },
  {
    id:          "reverb",
    icon:        Mic2,
    iconColor:   "text-rose-500",
    bg:          "bg-rose-500/10",
    border:      "border-rose-500/30",
    label:       "Quitar eco de habitación",
    description: "Reduce la reverberación en grabaciones con eco.",
  },
] as const;

const AIStudioEdit = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hasEnough } = useCredits();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [selectedSource, setSelectedSource] = useState<GenerationResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  
  // Variation settings
  const [variationType, setVariationType] = useState<VariationType>('similar');
  const [newMood, setNewMood] = useState<string>('');
  const [newDuration, setNewDuration] = useState(60);
  const [inpaintStart, setInpaintStart] = useState(0);
  const [inpaintEnd, setInpaintEnd] = useState(10);
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  
  // Result
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  // Auphonic enhance states
  const [enhanceMode, setEnhanceMode] = useState("professional");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProductionUuid, setEnhanceProductionUuid] = useState<string | null>(null);
  const [enhanceStatus, setEnhanceStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [enhanceOutputUrl, setEnhanceOutputUrl] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) loadHistory();
    else setIsLoadingHistory(false);
  }, [user]);

  // Cleanup polling on unmount
  useEffect(() => () => stopPolling(), []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setHistory((data || []).map(item => ({
        id: item.id,
        audioUrl: item.audio_url,
        prompt: item.prompt,
        duration: item.duration,
        genre: item.genre || undefined,
        mood: item.mood || undefined,
        createdAt: new Date(item.created_at),
        isFavorite: item.is_favorite || false,
      })));
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ title: "Error", description: "Solo se permiten archivos de audio", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Error", description: "El archivo no puede superar 20MB", variant: "destructive" });
      return;
    }

    setUploadedFile(file);
    setUploadedAudioUrl(URL.createObjectURL(file));
    setSelectedSource(null);
  };

  const selectFromHistory = (item: GenerationResult) => {
    setSelectedSource(item);
    setUploadedFile(null);
    setUploadedAudioUrl(null);
    setNewDuration(Math.min(item.duration * 1.5, 180));
  };

  const buildVariationPrompt = (): string => {
    const basePrompt = selectedSource?.prompt || `Audio track based on uploaded file`;
    
    switch (variationType) {
      case 'similar':
        return `${basePrompt}, create a fresh variation with subtle differences`;
      case 'mood_change':
        return `${basePrompt}, but with a ${newMood.toLowerCase()} mood and feeling`;
      case 'extend':
        return `${basePrompt}, extended version maintaining the same style and energy`;
      case 'inpaint':
        return inpaintPrompt || basePrompt;
      default:
        return basePrompt;
    }
  };

  const handleProcess = async () => {
    if (!selectedSource && !uploadedFile) {
      toast({ title: "Error", description: "Selecciona una pista del historial o sube un archivo", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión", variant: "destructive" });
      return;
    }

    if (variationType === 'mood_change' && !newMood) {
      toast({ title: "Error", description: "Selecciona un nuevo mood", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const { data: spendResult, error: spendError } = await supabase.functions.invoke('spend-credits', {
        body: { feature: 'edit_audio', description: `Edición AI: ${variationType}` },
      });
      if (spendError) throw new Error(spendError.message || 'Error al descontar créditos');
      if (spendResult?.error) throw new Error(spendResult.error);

      const prompt = buildVariationPrompt();
      const duration = variationType === 'extend' ? newDuration : (selectedSource?.duration || 30);

      const { data, error } = await supabase.functions.invoke('generate-audio', {
        body: { 
          prompt,
          duration,
          cfgScale: variationType === 'similar' ? 5 : 7,
        }
      });

      if (error) throw error;

      if (data?.audio) {
        const audioUrl = `data:${data.format};base64,${data.audio}`;
        
        const { data: savedGen, error: saveError } = await supabase
          .from('ai_generations')
          .insert({
            user_id: user.id,
            prompt,
            duration: data.duration,
            genre: selectedSource?.genre,
            mood: variationType === 'mood_change' ? newMood : selectedSource?.mood,
            audio_url: audioUrl,
          })
          .select()
          .single();

        if (saveError) throw saveError;

        const newResult: GenerationResult = {
          id: savedGen.id,
          audioUrl,
          prompt,
          duration: data.duration,
          genre: selectedSource?.genre,
          mood: variationType === 'mood_change' ? newMood : selectedSource?.mood,
          createdAt: new Date(savedGen.created_at),
          isFavorite: false,
          parentId: selectedSource?.id,
          variationType,
        };
        
        setResult(newResult);
        toast({ title: "¡Variación creada!", description: "Tu nueva pista está lista" });
      }
    } catch (error: any) {
      console.error('Process error:', error);
      toast({ 
        title: "Error al procesar", 
        description: error.message || "No se pudo crear la variación", 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlay = (audioUrl: string, id: string) => {
    const existingAudio = audioElements.get(id);
    
    if (playingId === id && existingAudio) {
      existingAudio.pause();
      setPlayingId(null);
    } else {
      audioElements.forEach(audio => audio.pause());
      
      let audio = existingAudio;
      if (!audio) {
        audio = new Audio(audioUrl);
        audio.onended = () => setPlayingId(null);
        setAudioElements(prev => new Map(prev).set(id, audio!));
      }
      audio.play();
      setPlayingId(id);
    }
  };

  const downloadAudio = (audioUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `musicdibs-${name}.mp3`;
    link.click();
  };

  // ── Auphonic helpers ──────────────────────────────────────
  const uploadFileForAuphonic = async (file: File): Promise<string> => {
    // Limpiar el nombre: solo letras, números, guiones y puntos
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")   // quitar tildes
      .replace(/[^a-zA-Z0-9._-]/g, "_")  // reemplazar especiales por _
      .replace(/_+/g, "_")               // colapsar múltiples _
      .toLowerCase();
    const path = `auphonic/${user!.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from("auphonic-temp")
      .upload(path, file, { upsert: true });
    if (error) throw new Error(`Upload error: ${error.message}`);
    const { data } = supabase.storage.from("auphonic-temp").getPublicUrl(path);
    return data.publicUrl;
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleEnhance = async () => {
    const sourceSelected = uploadedFile || uploadedAudioUrl || selectedSource;
    if (!sourceSelected) {
      toast({ title: "Selecciona un audio",
              description: "Sube un archivo o elige una generación previa.",
              variant: "destructive" });
      return;
    }
    if (!hasEnough(FEATURE_COSTS.enhance_audio)) {
      toast({ title: "Sin créditos",
              description: "Necesitas 1 crédito para mejorar el audio.",
              variant: "destructive" });
      return;
    }

    setIsEnhancing(true);
    setEnhanceStatus("processing");
    setEnhanceError(null);
    setEnhanceOutputUrl(null);
    stopPolling();

    try {
      const { data: spend, error: spendErr } = await supabase.functions.invoke(
        "spend-credits",
        { body: { feature: "enhance_audio", description: `Auphonic: ${enhanceMode}` } }
      );
      if (spendErr || spend?.error) throw new Error(spend?.error || "Error al gastar créditos");

      let audioUrl = uploadedAudioUrl || selectedSource?.audioUrl || "";
      if (uploadedFile) {
        audioUrl = await uploadFileForAuphonic(uploadedFile);
      }

      const { data, error } = await supabase.functions.invoke("auphonic-enhance", {
        body: {
          action:   "process",
          mode:     enhanceMode,
          audioUrl,
          filename: uploadedFile?.name || "audio",
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      const uuid = data.productionUuid;
      setEnhanceProductionUuid(uuid);

      pollingRef.current = setInterval(async () => {
        try {
          const { data: st } = await supabase.functions.invoke("auphonic-enhance", {
            body: { action: "status", productionUuid: uuid },
          });
          if (st?.done) {
            stopPolling();
            setEnhanceStatus("done");
            setEnhanceOutputUrl(st.outputUrl);
            setIsEnhancing(false);
            toast({ title: "¡Audio mejorado!",
                    description: "Tu track está listo para descargar." });
          } else if (st?.errored) {
            stopPolling();
            setEnhanceStatus("error");
            setEnhanceError("Auphonic no pudo procesar el audio. Intenta con otro archivo.");
            setIsEnhancing(false);
          }
        } catch { /* continuar polling */ }
      }, 8000);

      setTimeout(() => {
        if (pollingRef.current) {
          stopPolling();
          setIsEnhancing(false);
          setEnhanceStatus("error");
          setEnhanceError("Tiempo de espera agotado. El procesamiento tardó demasiado.");
        }
      }, 300_000);

    } catch (err: any) {
      setEnhanceStatus("error");
      setEnhanceError(err.message || "Error al procesar el audio");
      setIsEnhancing(false);
    }
  };

  const sourceSelected = selectedSource || uploadedFile;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver a AI MusicDibs Studio
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Editar Audio</h1>
          <p className="text-muted-foreground">Crea variaciones y edita tus pistas de audio</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Source Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fuente de Audio</CardTitle>
                <CardDescription>Selecciona del historial o sube un archivo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir archivo de audio
                </Button>

                {/* Uploaded File Preview */}
                {uploadedFile && uploadedAudioUrl && (
                  <Card className="bg-primary/5 border-primary">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => togglePlay(uploadedAudioUrl, 'uploaded')}
                        >
                          {playingId === 'uploaded' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">Archivo subido</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* History */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">O selecciona del historial:</Label>
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {user ? "No hay generaciones previas" : "Inicia sesión para ver tu historial"}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {history.map(item => (
                        <Card 
                          key={item.id} 
                          className={`cursor-pointer transition-colors ${selectedSource?.id === item.id ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'}`}
                          onClick={() => selectFromHistory(item)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlay(item.audioUrl, item.id);
                                }}
                              >
                                {playingId === item.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.prompt}</p>
                                <p className="text-xs text-muted-foreground">{item.duration}s</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Options */}
          <div className="space-y-6">
            {/* ── Mejora con Auphonic ─────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Mejora tu canción con IA
                </CardTitle>
                <CardDescription>
                  Procesado profesional en la nube · 1 crédito por track
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                <div className="space-y-2">
                  {ENHANCE_MODES.map(m => {
                    const Icon = m.icon;
                    const selected = enhanceMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setEnhanceMode(m.id)}
                        className={`
                          flex items-center gap-3 rounded-xl border p-3 text-left
                          transition-all duration-150 w-full
                          ${selected
                            ? `${m.border} ${m.bg}`
                            : "border-border/40 hover:border-border hover:bg-muted/30"
                          }
                        `}
                      >
                        <div className={`rounded-lg p-2 ${m.bg}`}>
                          <Icon className={`w-4 h-4 ${m.iconColor}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {m.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            {m.description}
                          </p>
                        </div>

                        {selected && (
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${m.iconColor}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {enhanceStatus === "processing" && (
                  <div className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        Procesando con Auphonic…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Suele tardar 1–3 minutos. No cierres la página.
                      </p>
                    </div>
                  </div>
                )}

                {enhanceStatus === "done" && enhanceOutputUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="w-5 h-5" />
                      <p className="text-sm font-semibold">¡Audio mejorado y listo!</p>
                    </div>
                    <a
                      href={enhanceOutputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center justify-center gap-2 w-full
                                 rounded-lg bg-emerald-600 hover:bg-emerald-700
                                 text-white text-sm font-semibold py-2.5
                                 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Descargar track mejorado
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setEnhanceStatus("idle");
                        setEnhanceOutputUrl(null);
                        setEnhanceProductionUuid(null);
                      }}
                    >
                      Procesar de nuevo →
                    </Button>
                  </div>
                )}

                {enhanceStatus === "error" && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>{enhanceError || "Error al procesar el audio."}</p>
                  </div>
                )}

                {enhanceStatus !== "done" && (
                  !hasEnough(FEATURE_COSTS.enhance_audio) ? (
                    <NoCreditsAlert message="Necesitas 1 crédito para mejorar el audio." />
                  ) : (
                    <Button
                      onClick={handleEnhance}
                      disabled={isEnhancing || enhanceStatus === "processing" || !sourceSelected}
                      className="w-full"
                      size="lg"
                    >
                      {isEnhancing || enhanceStatus === "processing"
                        ? <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando…
                          </>
                        : <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Mejorar audio (1 crédito)
                          </>
                      }
                    </Button>
                  )
                )}

                <p className="text-[11px] text-center text-muted-foreground">
                  Procesado por Auphonic · Algoritmos de audio profesionales
                </p>
              </CardContent>
            </Card>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                o usa IA generativa para variaciones
              </span>
            </div>

            {/* Existing edit type card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Edición</CardTitle>
                <CardDescription>Elige cómo quieres modificar el audio</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={variationType} onValueChange={(v) => setVariationType(v as VariationType)}>
                  <TabsList className="grid grid-cols-2 gap-1 h-auto">
                    <TabsTrigger value="similar" className="flex flex-col gap-1 py-3">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-xs">Variación</span>
                    </TabsTrigger>
                    <TabsTrigger value="mood_change" className="flex flex-col gap-1 py-3">
                      <Palette className="w-4 h-4" />
                      <span className="text-xs">Mood</span>
                    </TabsTrigger>
                    <TabsTrigger value="extend" className="flex flex-col gap-1 py-3">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Extender</span>
                    </TabsTrigger>
                    <TabsTrigger value="inpaint" className="flex flex-col gap-1 py-3">
                      <Scissors className="w-4 h-4" />
                      <span className="text-xs">Inpaint</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="similar" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Genera una variación similar manteniendo el estilo y estructura general pero con diferencias sutiles.
                    </p>
                  </TabsContent>

                  <TabsContent value="mood_change" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Nuevo Mood</Label>
                      <Select value={newMood} onValueChange={setNewMood}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un mood" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOODS.map(mood => (
                            <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Transforma el mood de la pista manteniendo la estructura musical.
                    </p>
                  </TabsContent>

                  <TabsContent value="extend" className="mt-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>Nueva duración</Label>
                        <span className="text-sm font-medium">{newDuration}s</span>
                      </div>
                      <Slider
                        value={[newDuration]}
                        onValueChange={([v]) => setNewDuration(v)}
                        min={selectedSource ? selectedSource.duration : 30}
                        max={180}
                        step={5}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Extiende la duración de la pista manteniendo coherencia.
                    </p>
                  </TabsContent>

                  <TabsContent value="inpaint" className="mt-4 space-y-4">
                    <div className="space-y-3">
                      <Label>Región a modificar (segundos)</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Inicio</Label>
                          <Slider
                            value={[inpaintStart]}
                            onValueChange={([v]) => setInpaintStart(v)}
                            min={0}
                            max={selectedSource?.duration || 60}
                            step={1}
                          />
                          <span className="text-xs">{inpaintStart}s</span>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Fin</Label>
                          <Slider
                            value={[inpaintEnd]}
                            onValueChange={([v]) => setInpaintEnd(v)}
                            min={inpaintStart}
                            max={selectedSource?.duration || 60}
                            step={1}
                          />
                          <span className="text-xs">{inpaintEnd}s</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción del cambio</Label>
                      <Textarea
                        placeholder="Ej: Añade un solo de guitarra eléctrica..."
                        value={inpaintPrompt}
                        onChange={(e) => setInpaintPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {!hasEnough(FEATURE_COSTS.edit_audio) ? (
                  <NoCreditsAlert message={`Necesitas ${FEATURE_COSTS.edit_audio} créditos para editar música.`} />
                ) : (
                <Button 
                  onClick={handleProcess} 
                  disabled={isProcessing || !sourceSelected}
                  className="w-full mt-6"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Crear {variationType === 'similar' ? 'Variación' : variationType === 'mood_change' ? 'Versión' : variationType === 'extend' ? 'Extensión' : 'Edición'} (1 crédito)
                    </>
                  )}
                </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Result */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Resultado</h2>
            {isProcessing ? (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <p className="text-sm text-muted-foreground text-center animate-pulse">
                    Generando audio...
                  </p>
                </CardContent>
              </Card>
            ) : result ? (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 w-14 h-14 rounded-full"
                      onClick={() => togglePlay(result.audioUrl, result.id)}
                    >
                      {playingId === result.id ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-0.5" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-2">
                        {variationType === 'similar' ? 'Variación' : 
                         variationType === 'mood_change' ? `Mood: ${newMood}` :
                         variationType === 'extend' ? 'Extendido' : 'Inpaint'}
                      </Badge>
                      <p className="text-sm truncate">{result.prompt}</p>
                      <p className="text-xs text-muted-foreground">{result.duration}s</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => downloadAudio(result.audioUrl, result.id.slice(0, 8))}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Music className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {sourceSelected ? "Elige un tipo de edición y procesa" : "Selecciona una fuente de audio"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIStudioEdit;
