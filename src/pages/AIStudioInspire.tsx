import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { AIStudioThemeBar } from "@/components/ai-studio/AIStudioThemeBar";
import { useProductTracking } from "@/hooks/useProductTracking";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { ArrowLeft, Sparkles, Dice5, Loader2, Download, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";

const GENEROS = ["pop", "pop urbano", "reggaeton", "trap", "indie pop", "electrónica", "balada"];
const TEMAS = [
  "una ruptura reciente",
  "un amor imposible",
  "una noche de verano",
  "superación personal",
  "nostalgia del pasado",
  "una relación tóxica",
  "fiesta sin control",
];
const VOCES = [
  "voz femenina suave",
  "voz masculina emocional",
  "voz juvenil energética",
  "voz profunda y melancólica",
];
const REFERENCIAS = [
  "estilo Aitana",
  "estilo Quevedo",
  "estilo Bad Bunny",
  "estilo Rosalía",
  "estilo Mora",
  "estilo The Weeknd",
];
const EMOCIONES = ["melancólica", "energética", "nostálgica", "intensa", "feliz", "oscura"];
const TEMPOS = ["lento", "medio", "rápido"];
const ESTRUCTURAS = [
  "verso + estribillo + verso + estribillo",
  "intro + verso + pre-estribillo + estribillo + puente",
  "estructura simple pegadiza",
];

const PRESET_IDEAS = [
  {
    emoji: "💔",
    label: "Ruptura emocional",
    prompt:
      "Canción pop emocional sobre una ruptura reciente, con voz femenina suave, estilo Aitana, atmósfera melancólica, tempo lento, con estructura verso + estribillo + verso + estribillo, con alta calidad de producción y enfoque comercial.",
  },
  {
    emoji: "🌴",
    label: "Hit de verano",
    prompt:
      "Canción pop urbano / reggaeton sobre una noche de verano, con voz juvenil energética, estilo Quevedo, atmósfera alegre y pegadiza, tempo rápido, con estructura simple enfocada en estribillo viral, con alta calidad de producción y enfoque comercial.",
  },
  {
    emoji: "🔥",
    label: "Trap",
    prompt:
      "Canción trap sobre una relación tóxica y ambición personal, con voz masculina grave, estilo Bad Bunny, atmósfera oscura e intensa, tempo medio, con estructura verso + estribillo con beat contundente, con alta calidad de producción y enfoque comercial.",
  },
  {
    emoji: "🎤",
    label: "Pop romántico",
    prompt:
      "Canción pop romántica sobre un amor profundo, con voz masculina emocional, estilo The Weeknd, atmósfera íntima y cálida, tempo medio, con estructura verso + pre-estribillo + estribillo, con alta calidad de producción y enfoque comercial.",
  },
  {
    emoji: "🌴",
    label: "Reggaeton",
    prompt:
      "Canción reggaeton sobre una historia de atracción y fiesta nocturna, con voz masculina sensual, estilo Bad Bunny, atmósfera caliente y pegadiza, tempo medio-rápido, con estructura verso + estribillo repetitivo enfocado en hook viral, con alta calidad de producción y enfoque comercial.",
  },
  {
    emoji: "🎸",
    label: "Rock",
    prompt:
      "Canción rock sobre superación personal y lucha interna, con voz masculina rasgada, estilo Arctic Monkeys, atmósfera intensa y enérgica, tempo medio, con estructura intro + verso + estribillo + solo de guitarra + estribillo final, con alta calidad de producción y enfoque comercial.",
  },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const buildSurprisePrompt = () => {
  const genero = pick(GENEROS);
  const tema = pick(TEMAS);
  const voz = pick(VOCES);
  const referencia = pick(REFERENCIAS);
  const emocion = pick(EMOCIONES);
  const tempo = pick(TEMPOS);
  const estructura = pick(ESTRUCTURAS);
  return `Canción ${genero} sobre ${tema}, con ${voz}, ${referencia}, atmósfera ${emocion}, tempo ${tempo}, con ${estructura}, con alta calidad de producción y enfoque comercial.`;
};

interface InspireResult {
  audioUrl: string;
  prompt: string;
  duration: number;
}

const AIStudioInspire = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useProductTracking();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<InspireResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");

  useEffect(() => {
    track("ai_studio_entered", { feature: "inspire" });
  }, []);

  const goToCreator = (prompt: string) => {
    const params = new URLSearchParams({ prompt, mode: "song", tab: "music" });
    navigate(`/ai-studio/create?${params.toString()}`);
  };

  const generateInline = async (prompt: string) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para generar canciones",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setLastPrompt(prompt);
    track("generation_started", { feature: "create_music", metadata: { mode: "song", source: "inspire" } });

    try {
      // Spend credits — use the same feature key as the music creator (song mode)
      const { data: spendResult, error: spendError } = await supabase.functions.invoke("spend-credits", {
        body: { feature: "generate_audio_song", description: `Canción: ${prompt.slice(0, 80)}` },
      });
      if (spendError) throw new Error(spendError.message || "Error al descontar créditos");
      if (spendResult?.error) throw new Error(spendResult.error);

      // Identical payload to AIStudioCreate (song mode, no duration → IA decides)
      const { data, error: invokeError } = await supabase.functions.invoke("generate-audio", {
        body: {
          prompt,
          lyrics: "",
          mode: "song",
        },
      });

      if (invokeError) {
        if (data?.error) throw new Error(data.message || data.error);
        throw new Error(invokeError.message || "Error al generar audio");
      }
      if (data?.error) throw new Error(data.message || data.error);

      if (!data?.audio && !data?.audioUrl) {
        throw new Error("No se recibió audio del servicio");
      }

      const audioUrl = data.audioUrl || `data:${data.format};base64,${data.audio}`;
      setResult({
        audioUrl,
        prompt,
        duration: data.duration || 0,
      });
      track("generation_completed", { feature: "create_music", metadata: { mode: "song", source: "inspire" } });
    } catch (e: any) {
      console.error("[Inspire] Generation error:", e);
      const msg = e?.message || "No se pudo generar la canción";
      setError(msg);
      track("generation_failed", { feature: "create_music", metadata: { mode: "song", source: "inspire", error: msg } });
      toast({ title: "Error al generar", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSurprise = () => {
    generateInline(buildSurprisePrompt());
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const res = await fetch(result.audioUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `musicdibs-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Error al descargar", description: "No se pudo descargar el archivo", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setLastPrompt("");
  };

  const truncate = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AIStudioThemeBar />

      <main className="container mx-auto px-4 py-6 pt-16">
        <Link
          to="/ai-studio"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("aiInspire.backToStudio", "Volver al estudio")}
        </Link>

        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Crear en 1 click</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Crear en 1 click <span aria-hidden>🎵</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10">
            ¿No sabes por dónde empezar? Genera una canción automáticamente y empieza a crear al instante.
          </p>

          <Button
            onClick={handleSurprise}
            disabled={isGenerating}
            size="xl"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg min-w-[260px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Dice5 className="w-5 h-5 mr-2" />
                🎲 Sorpréndeme
              </>
            )}
          </Button>

          {/* Loading state */}
          {isGenerating && (
            <div className="mt-8 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Generando tu canción... ⚡</p>
              <p className="text-xs">Esto puede tardar entre 30 y 60 segundos</p>
            </div>
          )}

          {/* Error state */}
          {error && !isGenerating && (
            <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-left">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground mb-1">No se pudo generar la canción</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
              <Button
                onClick={() => generateInline(lastPrompt || buildSurprisePrompt())}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Result card */}
          {result && !isGenerating && (
            <div className="mt-8 rounded-xl border border-border bg-card shadow-sm p-6 text-left">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Canción generada</p>
                  <h3 className="font-semibold text-foreground leading-snug">
                    {truncate(result.prompt)}
                  </h3>
                </div>
                {result.duration > 0 && (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground shrink-0">
                    {Math.round(result.duration)}s
                  </span>
                )}
              </div>

              <audio
                controls
                src={result.audioUrl}
                className="w-full rounded-lg mb-4"
                preload="metadata"
              />

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Otra canción
                </Button>
                <Button
                  onClick={() => goToCreator(result.prompt)}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Ir al estudio
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Preset chips */}
          <div className="mt-12">
            <p className="text-sm text-muted-foreground mb-4">O prueba con estas ideas:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESET_IDEAS.map((idea) => (
                <button
                  key={idea.label}
                  onClick={() => generateInline(idea.prompt)}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border"
                >
                  <span aria-hidden>{idea.emoji}</span>
                  {idea.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing link */}
          <div className="mt-6 flex justify-center">
            <PricingLink />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIStudioInspire;
