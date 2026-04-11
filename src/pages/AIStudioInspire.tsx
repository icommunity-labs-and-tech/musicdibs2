import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { useProductTracking } from "@/hooks/useProductTracking";

import { ArrowLeft, Lightbulb, Shuffle, Copy, Sparkles, Music, Palette, Zap, FileText } from "lucide-react";
import { GENRES, MOODS } from "@/types/aiStudio";
import { toast } from "sonner";

const SUGGESTED_PROMPTS = [
  { prompt: "A cinematic orchestral piece with rising strings and epic brass, building to an emotional climax", genre: "Cinematic", mood: "Epic", tagKey: "movie" },
  { prompt: "Chill lo-fi hip hop beat with vinyl crackle, mellow piano chords and a laid-back drum groove", genre: "Lo-Fi", mood: "Chill", tagKey: "studio" },
  { prompt: "Energetic EDM drop with heavy bass, soaring synth leads and a four-on-the-floor kick", genre: "Electronic", mood: "Energetic", tagKey: "club" },
  { prompt: "Acoustic folk ballad with fingerpicked guitar, soft harmonics and a warm, nostalgic atmosphere", genre: "Folk", mood: "Nostalgic", tagKey: "acoustic" },
  { prompt: "Dark trap beat with 808 bass, eerie melodies and hard-hitting hi-hats", genre: "Trap", mood: "Dark", tagKey: "urban" },
  { prompt: "Smooth jazz improvisation with walking bass, brushed drums and a mellow saxophone melody", genre: "Jazz", mood: "Calm", tagKey: "relaxing" },
  { prompt: "Uplifting pop anthem with catchy synth hooks, clap percussion and a feel-good chorus vibe", genre: "Pop", mood: "Happy", tagKey: "radio" },
  { prompt: "Ambient soundscape with ethereal pads, gentle rain textures and deep reverb spaces", genre: "Ambient", mood: "Dreamy", tagKey: "meditation" },
  { prompt: "Latin reggaeton beat with dembow rhythm, tropical synths and a danceable groove", genre: "Latin", mood: "Energetic", tagKey: "party" },
  { prompt: "Classical piano sonata in minor key with dramatic dynamics and expressive rubato", genre: "Classical", mood: "Sad", tagKey: "classical" },
  { prompt: "Motivational rock anthem with powerful electric guitar riffs, driving drums and triumphant energy", genre: "Rock", mood: "Motivational", tagKey: "sport" },
  { prompt: "Mysterious electronic track with glitchy textures, haunting vocal samples and deep sub-bass", genre: "Electronic", mood: "Mysterious", tagKey: "thriller" },
];

const COMBO_RECIPE_KEYS = [
  { key: "tropical", genres: ["Latin", "Ambient"], moods: ["Chill", "Romantic"], emoji: "🌅" },
  { key: "cyberpunk", genres: ["Electronic", "Trap"], moods: ["Dark", "Energetic"], emoji: "🌃" },
  { key: "productive", genres: ["Lo-Fi", "Jazz"], moods: ["Calm", "Uplifting"], emoji: "☕" },
  { key: "cinematic", genres: ["Cinematic", "Classical"], moods: ["Epic", "Motivational"], emoji: "🎬" },
  { key: "urban", genres: ["Hip Hop", "Latin"], moods: ["Energetic", "Happy"], emoji: "🎉" },
  { key: "forest", genres: ["Folk", "Ambient"], moods: ["Dreamy", "Peaceful"], emoji: "🌿" },
  { key: "studio", genres: ["R&B", "Lo-Fi"], moods: ["Romantic", "Nostalgic"], emoji: "🌙" },
  { key: "arena", genres: ["Rock", "Electronic"], moods: ["Aggressive", "Epic"], emoji: "⚔️" },
];

const AIStudioInspire = () => {
  const { t } = useTranslation();
  const { track } = useProductTracking();
  const [randomCombo, setRandomCombo] = useState<{ genre: string; mood: string } | null>(null);

  useEffect(() => {
    track('ai_studio_entered', { feature: 'inspire' });
  }, []);

  const generateRandomCombo = () => {
    const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
    const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
    setRandomCombo({ genre, mood });
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success(t('aiInspire.promptCopied'));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiInspire.backToStudio')}
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-6">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">{t('aiInspire.badge')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('aiInspire.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('aiInspire.subtitle')}
          </p>
        </div>

        {/* Compositor de Letras */}
        <Card className="mb-12 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col md:flex-row items-center gap-6 py-8">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 justify-center md:justify-start">
                <FileText className="w-6 h-6 text-primary" />
                {t('aiInspire.lyricsTitle', 'Compositor de Letras')}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t('aiInspire.lyricsDesc', 'Crea letras originales de canciones. Describe el tema y genera tu letra.')}
                {' '}
                <Badge variant="secondary" className="text-xs ml-1">{t('aiInspire.free', 'Gratis')}</Badge>
              </p>
              <Button asChild variant="default" size="lg" className="min-h-[44px]">
                <Link to="/ai-studio/create?tab=lyrics">
                  <FileText className="w-4 h-4 mr-2" />
                  {t('aiInspire.createLyrics', 'Crear Letras')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generador Aleatorio */}
        <Card className="mb-12 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col md:flex-row items-center gap-6 py-8">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 justify-center md:justify-start">
                <Shuffle className="w-6 h-6 text-primary" />
                {t('aiInspire.randomTitle')}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t('aiInspire.randomDesc')}
              </p>
              <Button onClick={generateRandomCombo} variant="default" size="lg">
                <Shuffle className="w-4 h-4 mr-2" />
                {t('aiInspire.generateCombo')}
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
                    {t('aiInspire.useInStudio')}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            {t('aiInspire.comboRecipes')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMBO_RECIPE_KEYS.map((recipe) => (
              <Card key={recipe.key} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{recipe.emoji}</span>
                    {t(`aiInspire.recipes.${recipe.key}`)}
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
                      {t('aiInspire.tryBtn')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            {t('aiInspire.suggestedPrompts')}
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
                    <Badge className="text-xs bg-primary/10 text-primary border-0">{t(`aiInspire.tags.${item.tagKey}`)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      
    </div>
  );
};

export default AIStudioInspire;
