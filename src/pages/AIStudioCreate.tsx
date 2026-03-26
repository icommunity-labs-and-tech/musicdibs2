import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Loader2, Play, Pause, Download, Mic, Music,
  ChevronDown, RefreshCw, Wand2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCredits } from "@/hooks/useCredits";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { FEATURE_COSTS } from "@/lib/featureCosts";

// ── Constants ─────────────────────────────────────────────────
type Mode = "song" | "instrumental";

const GENRES = [
  "Pop", "Rock", "Hip-Hop", "Reggaeton", "Flamenco", "Electrónica", "Jazz", "Clásica",
] as const;

const MOODS = [
  "Alegre", "Melancólico", "Épico", "Relajado", "Enérgico", "Romántico",
] as const;

const DURATION_STEPS = [30, 60, 90, 120] as const;

const costFor = (mode: Mode) =>
  mode === "song" ? FEATURE_COSTS.generate_audio_song : FEATURE_COSTS.generate_audio;

// ── Component ─────────────────────────────────────────────────
const AIStudioCreate = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { credits, hasEnough } = useCredits();

  // Form
  const [mode, setMode] = useState<Mode>("song");
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(60);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Result
  const [result, setResult] = useState<{
    audioUrl: string;
    mode: Mode;
    id?: string;
  } | null>(null);

  // Audio player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const cost = costFor(mode);
  const canGenerate = prompt.trim().length > 0 && hasEnough(cost) && !isGenerating;

  // ── Generate ───────────────────────────────────────────────
  const handleGenerate = async (isRegenerate = false) => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Describe tu canción", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "Inicia sesión para generar música", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setResult(null);
    stopAudio();

    try {
      // 1. Spend credits
      const featureKey = mode === "song" ? "generate_audio_song" : "generate_audio";
      const { data: spendResult, error: spendError } = await supabase.functions.invoke("spend-credits", {
        body: { feature: featureKey, description: `Audio AI (${mode}): ${prompt.slice(0, 60)}` },
      });
      if (spendError) throw new Error(spendError.message || "Error al descontar créditos");
      if (spendResult?.error) throw new Error(spendResult.error);

      // 2. Call generate-audio
      const { data, error } = await supabase.functions.invoke("generate-audio", {
        body: {
          prompt: prompt.trim(),
          duration,
          genre: selectedGenre || undefined,
          mood: selectedMood || undefined,
          lyrics: mode === "song" && lyrics.trim() ? lyrics.trim() : undefined,
          mode,
        },
      });

      if (error) {
        if (data?.error === "rate_limit_exceeded") {
          toast({ title: "Demasiadas generaciones", description: data.message, variant: "destructive" });
          return;
        }
        throw new Error(data?.error || error.message || "Error al generar audio");
      }
      if (data?.error) throw new Error(data.error);

      if (data?.audio) {
        const audioUrl = `data:${data.format};base64,${data.audio}`;

        // 3. Save to DB
        const { data: saved } = await supabase
          .from("ai_generations")
          .insert({
            user_id: user.id,
            prompt: prompt.trim(),
            duration: data.duration,
            genre: selectedGenre,
            mood: selectedMood,
            audio_url: audioUrl,
          })
          .select("id")
          .single();

        setResult({ audioUrl, mode, id: saved?.id });
        toast({ title: "¡Música generada!", description: "Tu pista está lista para escuchar" });
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setGenerationError(err.message || "No se pudo generar la música");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Audio helpers ──────────────────────────────────────────
  const togglePlay = () => {
    if (!result) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(result.audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.audioUrl;
    a.download = `musicdibs-${result.id?.slice(0, 8) || "audio"}.mp3`;
    a.click();
  };

  // Cleanup audio on unmount
  useEffect(() => () => stopAudio(), []);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back */}
        <Link
          to="/ai-studio"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          AI Studio
        </Link>

        <h1 className="text-2xl font-bold mb-6">Crear Música</h1>

        {/* ── Mode toggle ─────────────────────────────────── */}
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
          className="w-full mb-6 bg-muted/50 rounded-lg p-1"
        >
          <ToggleGroupItem
            value="song"
            className="flex-1 gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
          >
            <Mic className="h-4 w-4" />
            Canción con voz
            <Badge variant="secondary" className="ml-1 text-xs">3 créd.</Badge>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="instrumental"
            className="flex-1 gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
          >
            <Music className="h-4 w-4" />
            Instrumental / Base
            <Badge variant="secondary" className="ml-1 text-xs">2 créd.</Badge>
          </ToggleGroupItem>
        </ToggleGroup>

        {/* ── Form ────────────────────────────────────────── */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-5">
            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Describe tu canción</label>
              <Textarea
                placeholder="Una canción de pop romántico sobre un verano en la playa..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{prompt.length}/500</p>
            </div>

            {/* Lyrics (collapsible) */}
            {mode === "song" && (
              <Collapsible open={lyricsOpen} onOpenChange={setLyricsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", lyricsOpen && "rotate-180")}
                  />
                  Letra (opcional)
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <Textarea
                    placeholder="Escribe o pega la letra de tu canción..."
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={6}
                    maxLength={3000}
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">{lyrics.length}/3000</p>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Genre chips */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Género</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      selectedGenre === g
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood chips */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mood</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMood(selectedMood === m ? null : m)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      selectedMood === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Duración</label>
              <div className="flex gap-2">
                {DURATION_STEPS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-sm font-medium border transition-colors",
                      duration === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Credits check */}
            {!hasEnough(cost) && <NoCreditsAlert />}

            {/* CTA */}
            <Button
              className="w-full"
              size="lg"
              disabled={!canGenerate}
              onClick={() => handleGenerate(false)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generar {mode === "song" ? "canción" : "instrumental"} — {cost} créditos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Loading state ───────────────────────────────── */}
        {isGenerating && (
          <Card className="mb-6 overflow-hidden">
            <CardContent className="py-10 flex flex-col items-center gap-4">
              {/* Audio wave animation */}
              <div className="flex items-end gap-1 h-10">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-primary animate-pulse"
                    style={{
                      height: `${12 + Math.random() * 28}px`,
                      animationDelay: `${i * 0.12}s`,
                      animationDuration: `${0.6 + Math.random() * 0.6}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Componiendo tu {mode === "song" ? "canción" : "instrumental"}… esto puede tardar 1-2 minutos
              </p>
              <Progress className="w-full max-w-xs" value={undefined} />
            </CardContent>
          </Card>
        )}

        {/* ── Error ───────────────────────────────────────── */}
        {generationError && (
          <Card className="mb-6 border-destructive/40">
            <CardContent className="py-4 text-center space-y-2">
              <p className="text-sm font-medium text-destructive">{generationError}</p>
              <Button variant="outline" size="sm" onClick={() => setGenerationError(null)}>
                Cerrar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Result ──────────────────────────────────────── */}
        {result && !isGenerating && (
          <Card className="mb-6">
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Tu música está lista</h3>
                <Badge variant={result.mode === "song" ? "default" : "secondary"}>
                  {result.mode === "song" ? "Canción" : "Instrumental"}
                </Badge>
              </div>

              {/* Player */}
              <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>
                {/* Simple waveform placeholder */}
                <div className="flex-1 flex items-center gap-[2px] h-8">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-full bg-primary/30"
                      style={{ height: `${20 + Math.sin(i * 0.5) * 60}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Descargar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!hasEnough(cost) || isGenerating}
                  onClick={() => handleGenerate(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Regenerar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AIStudioCreate;
