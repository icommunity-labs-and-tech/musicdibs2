import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Lightbulb, Shuffle, Copy, Sparkles, Music, Palette, Zap } from "lucide-react";
import { GENRES, MOODS } from "@/types/aiStudio";
import { toast } from "sonner";

const SUGGESTED_PROMPTS = [
  { prompt: "A cinematic orchestral piece with rising strings and epic brass, building to an emotional climax", genre: "Cinematic", mood: "Epic", tag: "Película" },
  { prompt: "Chill lo-fi hip hop beat with vinyl crackle, mellow piano chords and a laid-back drum groove", genre: "Lo-Fi", mood: "Chill", tag: "Estudio" },
  { prompt: "Energetic EDM drop with heavy bass, soaring synth leads and a four-on-the-floor kick", genre: "Electronic", mood: "Energetic", tag: "Club" },
  { prompt: "Acoustic folk ballad with fingerpicked guitar, soft harmonics and a warm, nostalgic atmosphere", genre: "Folk", mood: "Nostalgic", tag: "Acústico" },
  { prompt: "Dark trap beat with 808 bass, eerie melodies and hard-hitting hi-hats", genre: "Trap", mood: "Dark", tag: "Urbano" },
  { prompt: "Smooth jazz improvisation with walking bass, brushed drums and a mellow saxophone melody", genre: "Jazz", mood: "Calm", tag: "Relajante" },
  { prompt: "Uplifting pop anthem with catchy synth hooks, clap percussion and a feel-good chorus vibe", genre: "Pop", mood: "Happy", tag: "Radio" },
  { prompt: "Ambient soundscape with ethereal pads, gentle rain textures and deep reverb spaces", genre: "Ambient", mood: "Dreamy", tag: "Meditación" },
  { prompt: "Latin reggaeton beat with dembow rhythm, tropical synths and a danceable groove", genre: "Latin", mood: "Energetic", tag: "Fiesta" },
  { prompt: "Classical piano sonata in minor key with dramatic dynamics and expressive rubato", genre: "Classical", mood: "Sad", tag: "Clásica" },
  { prompt: "Motivational rock anthem with powerful electric guitar riffs, driving drums and triumphant energy", genre: "Rock", mood: "Motivational", tag: "Deporte" },
  { prompt: "Mysterious electronic track with glitchy textures, haunting vocal samples and deep sub-bass", genre: "Electronic", mood: "Mysterious", tag: "Thriller" },
];

const COMBO_RECIPES = [
  { name: "Atardecer Tropical", genres: ["Latin", "Ambient"], moods: ["Chill", "Romantic"], emoji: "🌅" },
  { name: "Noche Cyberpunk", genres: ["Electronic", "Trap"], moods: ["Dark", "Energetic"], emoji: "🌃" },
  { name: "Mañana Productiva", genres: ["Lo-Fi", "Jazz"], moods: ["Calm", "Uplifting"], emoji: "☕" },
  { name: "Épica Cinematográfica", genres: ["Cinematic", "Classical"], moods: ["Epic", "Motivational"], emoji: "🎬" },
  { name: "Fiesta Urbana", genres: ["Hip Hop", "Latin"], moods: ["Energetic", "Happy"], emoji: "🎉" },
  { name: "Bosque Encantado", genres: ["Folk", "Ambient"], moods: ["Dreamy", "Peaceful"], emoji: "🌿" },
  { name: "Estudio Nocturno", genres: ["R&B", "Lo-Fi"], moods: ["Romantic", "Nostalgic"], emoji: "🌙" },
  { name: "Arena de Batalla", genres: ["Rock", "Electronic"], moods: ["Aggressive", "Epic"], emoji: "⚔️" },
];

const AIStudioInspire = () => {
  const [randomCombo, setRandomCombo] = useState<{ genre: string; mood: string } | null>(null);

  const generateRandomCombo = () => {
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    setRandomCombo({ genre, mood });
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado al portapapeles");
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">Inspiración Musical</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AI MusicDibs Studio - Inspiración</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explora prompts sugeridos, combina géneros y moods, o deja que el azar te sorprenda.
          </p>
        </div>

        {/* Random Combo Generator */}
        <Card className="mb-12 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col md:flex-row items-center gap-6 py-8">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 justify-center md:justify-start">
                <Shuffle className="w-6 h-6 text-primary" />
                Generador Aleatorio
              </h2>
              <p className="text-muted-foreground mb-4">
                ¿Sin ideas? Genera una combinación aleatoria de género y mood para empezar.
              </p>
              <Button onClick={generateRandomCombo} variant="default" size="lg">
                <Shuffle className="w-4 h-4 mr-2" />
                Generar Combinación
              </Button>
            </div>
            {randomCombo && (
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-background border min-w-[220px]">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-sm">{randomCombo.genre}</Badge>
                  <span className="text-muted-foreground">+</span>
                  <Badge variant="outline" className="text-sm">{randomCombo.mood}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link to={`/ai-studio/create?genre=${randomCombo.genre}&mood=${randomCombo.mood}`}>
                    <Zap className="w-3 h-3 mr-1" />
                    Usar en Studio
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Combo Recipes */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Recetas de Combinación
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMBO_RECIPES.map((recipe) => (
              <Card key={recipe.name} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{recipe.emoji}</span>
                    {recipe.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {recipe.genres.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                    ))}
                    {recipe.moods.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link to={`/ai-studio/create?genre=${recipe.genres[0]}&mood=${recipe.moods[0]}`}>
                      <Zap className="w-3 h-3 mr-1" />
                      Probar
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Suggested Prompts */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            Prompts Sugeridos
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {SUGGESTED_PROMPTS.map((item, i) => (
              <Card key={i} className="group hover:shadow-md transition-all">
                <CardContent className="py-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed flex-1">{item.prompt}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyPrompt(item.prompt)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{item.genre}</Badge>
                    <Badge variant="outline" className="text-xs">{item.mood}</Badge>
                    <Badge className="text-xs bg-primary/10 text-primary border-0">{item.tag}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AIStudioInspire;
