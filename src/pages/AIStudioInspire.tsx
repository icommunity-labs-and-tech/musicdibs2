import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { useProductTracking } from "@/hooks/useProductTracking";
import { ArrowLeft, Sparkles, Dice5 } from "lucide-react";

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

const AIStudioInspire = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useProductTracking();

  useEffect(() => {
    track("ai_studio_entered", { feature: "inspire" });
  }, []);

  const goToCreator = (prompt: string, source: string) => {
    track("inspire_prompt_selected", { source, prompt: prompt.slice(0, 80) });
    const params = new URLSearchParams({ prompt, mode: "song", tab: "music" });
    navigate(`/ai-studio/create?${params.toString()}`);
  };

  const handleSurprise = () => {
    goToCreator(buildSurprisePrompt(), "surprise");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
            size="xl"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg min-w-[260px]"
          >
            <Dice5 className="w-5 h-5 mr-2" />
            🎲 Sorpréndeme
          </Button>

          <div className="mt-12">
            <p className="text-sm text-muted-foreground mb-4">O prueba con estas ideas:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESET_IDEAS.map((idea) => (
                <button
                  key={idea.label}
                  onClick={() => goToCreator(idea.prompt, `preset:${idea.label}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors text-sm font-medium"
                >
                  <span aria-hidden>{idea.emoji}</span>
                  {idea.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIStudioInspire;
