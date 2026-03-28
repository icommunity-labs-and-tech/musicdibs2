import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle,
         CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { useAuth } from "@/hooks/useAuth"
import { useCredits } from "@/hooks/useCredits"
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert"
import { FEATURE_COSTS } from "@/lib/featureCosts"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Wand2, Loader2, Download,
  RefreshCw, ImageIcon, Sparkles,
} from "lucide-react"

const VISUAL_STYLES = [
  { value: "photorealistic",   label: "Fotorrealista" },
  { value: "digital illustration", label: "Ilustración digital" },
  { value: "abstract art",     label: "Abstracto" },
  { value: "vintage retro",    label: "Vintage / Retro" },
  { value: "anime manga",      label: "Anime / Manga" },
  { value: "minimalist",       label: "Minimalista" },
  { value: "dark atmospheric", label: "Oscuro / Atmósferico" },
  { value: "neon cyberpunk",   label: "Neon / Cyberpunk" },
  { value: "watercolor",       label: "Acuarela" },
  { value: "grunge urban",     label: "Grunge / Urbano" },
]

const COLOR_PALETTES = [
  { value: "vibrant multicolor", label: "Vibrante / Multicolor" },
  { value: "dark moody blacks and deep blues", label: "Oscuro / Moody" },
  { value: "warm golden sunset tones", label: "Cálido / Dorado" },
  { value: "cold icy blues and whites", label: "Frío / Azul hielo" },
  { value: "neon pink and purple", label: "Neon Rosa / Púrpura" },
  { value: "earth tones browns and greens", label: "Tierra / Natural" },
  { value: "black and white monochrome", label: "Blanco y Negro" },
  { value: "pastel soft colors", label: "Pastel / Suave" },
]

const ARTIST_REFS = [
  "Bad Bunny", "Rosalía", "C. Tangana", "J Balvin",
  "Drake", "Kendrick Lamar", "Taylor Swift", "The Weeknd",
  "Billie Eilish", "Tyler the Creator", "Frank Ocean",
  "Karol G", "Rauw Alejandro", "Bizarrap",
]

const AIStudioCovers = () => {
  const { user } = useAuth()
  const { hasEnough } = useCredits()

  const [artistName,   setArtistName]   = useState("")
  const [trackTitle,   setTrackTitle]   = useState("")
  const [style,        setStyle]        = useState("")
  const [colorPalette, setColorPalette] = useState("")
  const [artistRef,    setArtistRef]    = useState("")
  const [description,  setDescription]  = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageUrl,     setImageUrl]     = useState<string | null>(null)
  const [genError,     setGenError]     = useState<string | null>(null)
  const [isImprovingDesc, setIsImprovingDesc] = useState(false)

  const handleImproveDescription = async () => {
    if (!description.trim()) return
    setIsImprovingDesc(true)
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: { prompt: description, genre: "", mood: "", mode: "instrumental" },
      })
      if (error || data?.error) throw new Error(data?.error || error?.message)
      if (data?.improved) {
        setDescription(data.improved.slice(0, 300))
        toast.success("✨ Descripción mejorada")
      }
    } catch {
      toast.error("No se pudo mejorar la descripción")
    } finally {
      setIsImprovingDesc(false)
    }
  }

  const handleGenerate = async () => {
    if (!trackTitle.trim() && !description.trim()) {
      toast.error("Añade al menos el título del single o una descripción")
      return
    }
    if (!hasEnough(FEATURE_COSTS.generate_cover)) {
      toast.error("Necesitas 2 créditos para generar una portada")
      return
    }

    setIsGenerating(true)
    setGenError(null)
    setImageUrl(null)

    try {
      // Gastar créditos
      const { data: spend, error: spendErr } =
        await supabase.functions.invoke("spend-credits", {
          body: {
            feature:     "generate_cover",
            description: `Portada: ${trackTitle || description}`.slice(0, 80),
          },
        })
      if (spendErr || spend?.error) {
        throw new Error(spend?.message || "Error al gastar créditos")
      }

      // Generar portada
      const { data, error } = await supabase.functions.invoke(
        "generate-cover",
        {
          body: {
            artistName,
            trackTitle,
            style,
            colorPalette,
            artistRef,
            description,
          },
        }
      )
      if (error || data?.error) {
        throw new Error(data?.error || error?.message)
      }

      setImageUrl(data.imageUrl)
      toast.success("¡Portada generada!")
    } catch (err: any) {
      setGenError(err.message || "Error al generar la portada")
      toast.error(err.message || "Error al generar la portada")
    }

    setIsGenerating(false)
  }

  const handleDownload = async () => {
    if (!imageUrl) return
    try {
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `portada-${(trackTitle || "musicdibs").replace(/\s+/g, "-").toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al descargar la imagen")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver a AI MusicDibs Studio
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Powered by Nano Banana 2</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Generador de Portadas</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Crea portadas profesionales para tu single o álbum con IA.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Panel izquierdo — configuración */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Configura tu portada
                </CardTitle>
                <CardDescription>
                  Cuanto más detallado seas, mejor será el resultado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Nombre artista + título */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nombre del artista</Label>
                    <Input
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder="Tu nombre artístico"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Título del single / disco <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                      placeholder="Nombre de la canción"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Estilo visual */}
                <div className="space-y-2">
                  <Label className="text-sm">Estilo visual</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {VISUAL_STYLES.map(s => (
                      <Badge
                        key={s.value}
                        variant={style === s.value ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => setStyle(style === s.value ? "" : s.value)}
                      >
                        {s.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Paleta de color */}
                <div className="space-y-2">
                  <Label className="text-sm">Color dominante</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PALETTES.map(c => (
                      <Badge
                        key={c.value}
                        variant={colorPalette === c.value ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => setColorPalette(colorPalette === c.value ? "" : c.value)}
                      >
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Referencia de artista */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Estilo visual inspirado en{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ARTIST_REFS.map(a => (
                      <Badge
                        key={a}
                        variant={artistRef === a ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => setArtistRef(artistRef === a ? "" : a)}
                      >
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Descripción libre */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">
                      Descripción adicional{" "}
                      <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <button
                      type="button"
                      onClick={handleImproveDescription}
                      disabled={isImprovingDesc || !description.trim()}
                      title="Optimiza tu descripción para obtener mejores resultados"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: 400,
                        color: '#9ca3af',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        opacity: (isImprovingDesc || !description.trim()) ? 0.4 : 1,
                      }}
                    >
                      {isImprovingDesc
                        ? <><Loader2 style={{ width: 12, height: 12, color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />Mejorando…</>
                        : <><Sparkles style={{ width: 12, height: 12, color: 'hsl(var(--primary))' }} />Mejorar con IA</>
                      }
                    </button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: Una figura solitaria en un paisaje urbano nocturno, lluvia, luces de neón..."
                    rows={3}
                    className="resize-none text-sm"
                    maxLength={300}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">
                    {description.length}/300
                  </p>
                </div>

                {genError && (
                  <p className="text-xs text-destructive">{genError}</p>
                )}

                {!hasEnough(FEATURE_COSTS.generate_cover) ? (
                  <NoCreditsAlert message="Necesitas 2 créditos para generar una portada." />
                ) : (
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isGenerating || (!trackTitle.trim() && !description.trim())}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando portada…
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Generar portada (2 créditos)
                      </>
                    )}
                  </Button>
                )}

                <p className="text-[11px] text-muted-foreground text-center">
                  Powered by Nano Banana 2 · fal.ai
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Panel derecho — resultado */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resultado</h2>

            {isGenerating ? (
              <Card className="border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium">Creando tu portada…</p>
                    <p className="text-sm text-muted-foreground">
                      Nano Banana 2 está generando tu imagen. Suele tardar 10–20 segundos.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : imageUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-square">
                  <img
                    src={imageUrl}
                    alt={`Portada: ${trackTitle || "Sin título"}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    Descargar portada
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Imagen en alta resolución · Formato cuadrado 1:1
                </p>
              </div>
            ) : (
              <Card className="border-dashed border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-muted-foreground">Tu portada aparecerá aquí</p>
                    <p className="text-sm text-muted-foreground">
                      Configura los parámetros y pulsa "Generar portada"
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default AIStudioCovers
