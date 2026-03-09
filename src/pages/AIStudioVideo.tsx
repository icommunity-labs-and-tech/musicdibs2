import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Video, Music, Sparkles, Lock, Play, 
  Image, Film, Layers, Wand2, Clock, Ratio
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const VIDEO_STYLES = [
  { id: "cinematic", label: "Cinemático", emoji: "🎬" },
  { id: "anime", label: "Anime", emoji: "🌸" },
  { id: "retro-vhs", label: "Retro VHS", emoji: "📼" },
  { id: "abstract", label: "Abstracto", emoji: "🎨" },
  { id: "lyric-video", label: "Lyric Video", emoji: "✍️" },
  { id: "neon", label: "Neon/Cyberpunk", emoji: "💜" },
  { id: "nature", label: "Naturaleza", emoji: "🌿" },
  { id: "urban", label: "Urbano", emoji: "🏙️" },
] as const;

const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9 Horizontal", icon: "▬" },
  { id: "9:16", label: "9:16 Vertical", icon: "▮" },
  { id: "1:1", label: "1:1 Cuadrado", icon: "■" },
] as const;

const MOCK_STORYBOARD = [
  { id: 1, time: "0:00 - 0:05", description: "Intro cinemática con fade-in de luces", thumbnail: null },
  { id: 2, time: "0:05 - 0:12", description: "Plano aéreo de ciudad nocturna con reflejos neon", thumbnail: null },
  { id: 3, time: "0:12 - 0:20", description: "Close-up de elementos abstractos sincronizados con el beat", thumbnail: null },
  { id: 4, time: "0:20 - 0:30", description: "Secuencia rápida de cortes con transición final a negro", thumbnail: null },
];

const AIStudioVideo = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>("none");
  const [duration, setDuration] = useState(15);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [syncBeats, setSyncBeats] = useState(true);
  const [showStoryboard, setShowStoryboard] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver a AI MusicDibs Studio
        </Link>

        {/* Coming Soon Banner */}
        <div className="relative mb-8 rounded-xl border border-primary/20 bg-gradient-to-r from-rose-500/10 via-red-500/5 to-background p-6 overflow-hidden">
          <div className="absolute top-3 right-3">
            <Badge className="bg-rose-500/90 text-white hover:bg-rose-500">
              <Sparkles className="w-3 h-3 mr-1" />
              Próximamente
            </Badge>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center shrink-0">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Videoclips con IA</h1>
              <p className="text-muted-foreground">Genera videoclips musicales únicos a partir de tus pistas de audio</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Estamos trabajando en esta funcionalidad. Pronto podrás crear videoclips con inteligencia artificial, 
            sincronizados con tu música, eligiendo estilos visuales y personalizando cada escena.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Column 1: Prompt & Style */}
          <div className="space-y-6">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  Disponible próximamente
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-rose-500" />
                  Prompt Visual
                </CardTitle>
                <CardDescription>Describe el estilo visual de tu videoclip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Ej: Escena cinemática nocturna con luces neon reflejándose en charcos de lluvia, cámara lenta, estilo Blade Runner..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                    disabled
                  />
                </div>

                {/* Style Selection */}
                <div className="space-y-2">
                  <Label>Estilo Visual</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_STYLES.map(style => (
                      <Badge
                        key={style.id}
                        variant={selectedStyle === style.id ? "default" : "outline"}
                        className="cursor-not-allowed justify-start gap-1.5 py-2 px-3 text-sm"
                      >
                        <span>{style.emoji}</span>
                        {style.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Track Selection */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  Disponible próximamente
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Music className="w-5 h-5 text-rose-500" />
                  Pista de Audio
                </CardTitle>
                <CardDescription>Selecciona la música para tu videoclip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedTrack} onValueChange={setSelectedTrack} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una pista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin audio (solo vídeo)</SelectItem>
                    <SelectItem value="demo-1">🎵 Jazz nocturno - 30s</SelectItem>
                    <SelectItem value="demo-2">🎵 Beat electrónico - 45s</SelectItem>
                    <SelectItem value="demo-3">🎵 Ambient chill - 60s</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Podrás elegir pistas de tu historial de AI MusicDibs Studio o subir tu propio audio.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Settings */}
          <div className="space-y-6">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  Disponible próximamente
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Film className="w-5 h-5 text-rose-500" />
                  Configuración
                </CardTitle>
                <CardDescription>Ajusta los parámetros del videoclip</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Duration */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Duración
                    </Label>
                    <span className="text-sm font-medium">{duration}s</span>
                  </div>
                  <Slider
                    value={[duration]}
                    onValueChange={([v]) => setDuration(v)}
                    min={5}
                    max={30}
                    step={5}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">5 - 30 segundos por segmento</p>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Ratio className="w-4 h-4" />
                    Relación de aspecto
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map(ratio => (
                      <Button
                        key={ratio.id}
                        variant={aspectRatio === ratio.id ? "default" : "outline"}
                        size="sm"
                        className="flex flex-col gap-1 h-auto py-3 cursor-not-allowed"
                        disabled
                      >
                        <span className="text-lg">{ratio.icon}</span>
                        <span className="text-xs">{ratio.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Beat Sync */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <Label className="text-sm">Sincronizar con beats</Label>
                    <p className="text-xs text-muted-foreground">Cortes y transiciones al ritmo de la música</p>
                  </div>
                  <Badge variant={syncBeats ? "default" : "secondary"} className="cursor-not-allowed">
                    {syncBeats ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                {/* Generate Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button disabled className="w-full" size="lg">
                          <Video className="w-4 h-4 mr-2" />
                          Generar Videoclip
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>Esta función estará disponible próximamente</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Features preview */}
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3 text-sm">Funcionalidades planeadas</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    { icon: Wand2, text: "Generación text-to-video con IA" },
                    { icon: Music, text: "Sincronización automática audio-vídeo" },
                    { icon: Layers, text: "Storyboard con preview de escenas" },
                    { icon: Image, text: "Estilos visuales personalizables" },
                    { icon: Film, text: "Exportación en múltiples formatos" },
                    { icon: Sparkles, text: "Transiciones inteligentes con beats" },
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <feat.icon className="w-4 h-4 text-rose-500 shrink-0" />
                      {feat.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Column 3: Storyboard Preview */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Storyboard
              </h2>
              <Badge variant="outline" className="text-xs">Preview</Badge>
            </div>

            {/* Mock storyboard */}
            <div className="space-y-3">
              {MOCK_STORYBOARD.map((scene) => (
                <Card key={scene.id} className="relative overflow-hidden opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail placeholder */}
                      <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-rose-500/20 to-red-500/10 border border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                        <Play className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {scene.time}
                          </Badge>
                          <span className="text-xs text-muted-foreground">Escena {scene.id}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{scene.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mock video preview */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-rose-950/40 via-background to-red-950/30 flex flex-col items-center justify-center gap-3 border-b">
                <div className="w-16 h-16 rounded-full bg-muted/50 border flex items-center justify-center">
                  <Play className="w-8 h-8 text-muted-foreground/40 ml-1" />
                </div>
                <p className="text-sm text-muted-foreground">Vista previa del videoclip</p>
                <Badge variant="outline" className="text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Próximamente
                </Badge>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" disabled className="rounded-full">
                      <Play className="w-4 h-4" />
                    </Button>
                    <div className="h-1.5 w-40 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-rose-500/30 rounded-full" />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">0:00 / 0:{duration.toString().padStart(2, '0')}</span>
                  </div>
                  <Button variant="ghost" size="sm" disabled>
                    Descargar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Gallery placeholder */}
            <Card className="border-dashed opacity-60">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Film className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center">
                  Tu galería de videoclips aparecerá aquí
                </p>
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
