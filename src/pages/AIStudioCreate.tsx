import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, Wand2, Loader2, Play, Pause, Download, 
  Heart, Clock, Music, Trash2 
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GENRES, MOODS, type GenerationResult } from "@/types/aiStudio";

const AIStudioCreate = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [creativity, setCreativity] = useState(7);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  // Load history on mount
  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setResults((data || []).map(item => ({
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
      setIsLoading(false);
    }
  };

  const buildFullPrompt = () => {
    let fullPrompt = prompt;
    if (selectedGenre) fullPrompt = `${selectedGenre} ${fullPrompt}`;
    if (selectedMood) fullPrompt = `${selectedMood} ${fullPrompt}`;
    return fullPrompt.trim();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Escribe una descripción para tu música", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const fullPrompt = buildFullPrompt();
      
      const { data, error } = await supabase.functions.invoke('generate-audio', {
        body: { 
          prompt: fullPrompt, 
          duration, 
          cfgScale: creativity 
        }
      });

      if (error) throw error;

      if (data?.audio) {
        const audioUrl = `data:${data.format};base64,${data.audio}`;
        const newResult: GenerationResult = {
          id: crypto.randomUUID(),
          audioUrl,
          prompt: fullPrompt,
          duration: data.duration,
          genre: selectedGenre || undefined,
          mood: selectedMood || undefined,
          createdAt: new Date(),
          isFavorite: false
        };
        setResults(prev => [newResult, ...prev]);
        toast({ title: "¡Música generada!", description: "Tu pista está lista para escuchar" });
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ 
        title: "Error al generar", 
        description: error.message || "No se pudo generar la música", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = (result: GenerationResult) => {
    const existingAudio = audioElements.get(result.id);
    
    if (playingId === result.id && existingAudio) {
      existingAudio.pause();
      setPlayingId(null);
    } else {
      // Pause any playing audio
      audioElements.forEach(audio => audio.pause());
      
      let audio = existingAudio;
      if (!audio) {
        audio = new Audio(result.audioUrl);
        audio.onended = () => setPlayingId(null);
        setAudioElements(prev => new Map(prev).set(result.id, audio!));
      }
      audio.play();
      setPlayingId(result.id);
    }
  };

  const toggleFavorite = (id: string) => {
    setResults(prev => prev.map(r => 
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
  };

  const downloadAudio = (result: GenerationResult) => {
    const link = document.createElement('a');
    link.href = result.audioUrl;
    link.download = `musicdibs-ai-${result.id.slice(0, 8)}.mp3`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver a AI Studio
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Creation Panel */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Crear Música</h1>
              <p className="text-muted-foreground">Describe la música que quieres generar</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tu Prompt</CardTitle>
                <CardDescription>Sé específico: instrumentos, tempo, estilo...</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Ej: A smooth jazz piano melody with soft drums, perfect for a late night café ambiance..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Genre Selection */}
                <div className="space-y-2">
                  <Label>Género (opcional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(genre => (
                      <Badge
                        key={genre}
                        variant={selectedGenre === genre ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Mood Selection */}
                <div className="space-y-2">
                  <Label>Mood (opcional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map(mood => (
                      <Badge
                        key={mood}
                        variant={selectedMood === mood ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                      >
                        {mood}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Duration Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Duración</Label>
                    <span className="text-sm font-medium">{duration}s</span>
                  </div>
                  <Slider
                    value={[duration]}
                    onValueChange={([v]) => setDuration(v)}
                    min={5}
                    max={180}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">5 segundos - 3 minutos</p>
                </div>

                {/* Creativity Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Fidelidad al Prompt</Label>
                    <span className="text-sm font-medium">{creativity}/10</span>
                  </div>
                  <Slider
                    value={[creativity]}
                    onValueChange={([v]) => setCreativity(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Bajo = más creativo, Alto = más fiel al prompt</p>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generar Música
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Resultados</h2>
              {results.length > 0 && (
                <span className="text-sm text-muted-foreground">{results.length} generaciones</span>
              )}
            </div>

            {results.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Music className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Tus generaciones aparecerán aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map(result => (
                  <Card key={result.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Play Button */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 w-12 h-12 rounded-full"
                          onClick={() => togglePlay(result)}
                        >
                          {playingId === result.id ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5" />
                          )}
                        </Button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate mb-1">{result.prompt}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{result.duration}s</span>
                            {result.genre && <Badge variant="secondary" className="text-xs">{result.genre}</Badge>}
                            {result.mood && <Badge variant="secondary" className="text-xs">{result.mood}</Badge>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavorite(result.id)}
                          >
                            <Heart className={`w-4 h-4 ${result.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadAudio(result)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIStudioCreate;
