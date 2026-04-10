import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Navbar } from "@/components/Navbar"
import { FileDropzone } from "@/components/FileDropzone"
import { useAuth } from "@/hooks/useAuth"
import { useCredits } from "@/hooks/useCredits"
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert"
import { FEATURE_COSTS } from "@/lib/featureCosts"
import { PricingLink } from "@/components/dashboard/PricingPopup"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useProductTracking } from "@/hooks/useProductTracking"
import {
  ArrowLeft, Loader2, Download,
  RefreshCw, ImageIcon, Sparkles,
} from "lucide-react"

type CoverMode = "none" | "artist"

const VISUAL_STYLES = [
  "Fotorrealista", "Ilustración digital", "Abstracto", "Vintage/Retro",
  "Anime/Manga", "Minimalista", "Oscuro/Atmosférico", "Neon/Cyberpunk",
  "Acuarela", "Grunge/Urbano",
] as const

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const AIStudioCovers = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { hasEnough } = useCredits()
  const { track } = useProductTracking()


  useEffect(() => {
    track('ai_studio_entered', { feature: 'cover' })
  }, [])

  const [artistName, setArtistName] = useState("")
  const [trackTitle, setTrackTitle] = useState("")
  const [description, setDescription] = useState("")
  const [styleVisual, setStyleVisual] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  const [coverMode, setCoverMode] = useState<CoverMode>("none")
  const [artistPhoto, setArtistPhoto] = useState<File | null>(null)
  const [artistPhotoPreview, setArtistPhotoPreview] = useState<string | null>(null)

  // Improve description with AI
  const [isImproving, setIsImproving] = useState(false)
  const handleImproveDesc = async () => {
    if (!description.trim()) return
    setIsImproving(true)
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", {
        body: { prompt: description, genre: styleVisual || "", mode: "cover" },
      })
      if (error || !data?.improved) throw new Error(error?.message || "No response")
      setDescription(data.improved.slice(0, 1000))
      toast.success("Descripción mejorada")
    } catch {
      toast.error(t("aiShared.error"))
    } finally {
      setIsImproving(false)
    }
  }

  const canGenerate = artistName.trim() && trackTitle.trim() && hasEnough(FEATURE_COSTS.generate_cover)

  const handleGenerate = async () => {
    if (!artistName.trim() || !trackTitle.trim()) {
      toast.error("Introduce el nombre del artista y el título")
      return
    }
    if (!hasEnough(FEATURE_COSTS.generate_cover)) {
      toast.error(t('aiShared.noCredits'))
      return
    }
    if (coverMode === "artist" && !artistPhoto) {
      toast.error("Sube una foto del artista")
      return
    }

    setIsGenerating(true)
    setGenError(null)
    setImageUrl(null)

    try {
      let artistPhotoBase64: string | null = null
      if (coverMode === "artist" && artistPhoto) {
        artistPhotoBase64 = await fileToBase64(artistPhoto)
      }

      const { data, error } = await supabase.functions.invoke("generate-cover", {
        body: {
          artistName,
          trackTitle,
          description,
          styleVisual: styleVisual || undefined,
          artistPhotoBase64,
        },
      })

      if (data?.fallback) throw new Error(data.message || "Servicio no disponible temporalmente.")
      if (error || data?.error) throw new Error(data?.error || error?.message)

      setImageUrl(data.imageUrl)
      toast.success(t('aiCovers.coverGenerated'))
      track('cover_generated', { feature: 'cover' })
    } catch (err: any) {
      setGenError(err.message || t('aiShared.error'))
      toast.error(err.message || t('aiShared.error'))
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
      toast.error(t('aiShared.error'))
    }
  }

  const handleReset = () => {
    setImageUrl(null)
    setGenError(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiCovers.backToStudio')}
        </Link>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{t('aiCovers.poweredBy')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('aiCovers.title')}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('aiCovers.subtitle')}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  {t('aiCovers.configTitle')}
                </CardTitle>
                <CardDescription>{t('aiCovers.configDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode selector */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <Label className="text-sm font-medium">Modo de generación</Label>
                  <RadioGroup
                    value={coverMode}
                    onValueChange={(v) => {
                      setCoverMode(v as CoverMode)
                      if (v === "none") {
                        setArtistPhoto(null)
                        if (artistPhotoPreview) URL.revokeObjectURL(artistPhotoPreview)
                        setArtistPhotoPreview(null)
                      }
                    }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="mode-none" />
                      <Label htmlFor="mode-none" className="text-sm cursor-pointer">Sin imagen (generación aleatoria)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="artist" id="mode-artist" />
                      <Label htmlFor="mode-artist" className="text-sm cursor-pointer">Usar foto del artista</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Artist name */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre del artista <span className="text-destructive">*</span></Label>
                  <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Tu nombre artístico" className="h-9" />
                </div>

                {/* Track title */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Título del single / disco <span className="text-destructive">*</span></Label>
                  <Input value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} placeholder="Nombre de la canción" className="h-9" />
                </div>

                {/* Visual style chips */}
                <div className="space-y-2">
                  <Label className="text-sm">Estilo visual</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {VISUAL_STYLES.map((s) => (
                      <Badge
                        key={s}
                        variant={styleVisual === s ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => setStyleVisual(styleVisual === s ? "" : s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Descripción adicional</Label>
                    <button
                      type="button"
                      onClick={handleImproveDesc}
                      disabled={isImproving || !description.trim()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                    >
                      {isImproving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      )}
                      Mejorar con IA
                    </button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: Una figura solitaria en un paisaje urbano nocturno, lluvia, luces de neón..."
                    rows={3} className="resize-none text-sm" maxLength={1000}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">{description.length}/1000</p>
                </div>

                {/* Artist photo — conditional */}
                {coverMode === "artist" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Foto del artista (opcional)</Label>
                    <FileDropzone
                      fileType="image"
                      accept="image/jpeg,image/png,image/webp"
                      maxSize={10}
                      currentFile={artistPhoto}
                      preview={artistPhotoPreview}
                      onFileSelect={(f) => {
                        if (f.size > 10 * 1024 * 1024) { toast.error("Imagen demasiado grande (máx 10MB)"); return }
                        setArtistPhoto(f)
                        setArtistPhotoPreview(URL.createObjectURL(f))
                      }}
                      onRemove={() => {
                        setArtistPhoto(null)
                        if (artistPhotoPreview) URL.revokeObjectURL(artistPhotoPreview)
                        setArtistPhotoPreview(null)
                      }}
                    />
                  </div>
                )}

                {genError && <p className="text-xs text-destructive">{genError}</p>}

                {!hasEnough(FEATURE_COSTS.generate_cover) ? (
                  <NoCreditsAlert message="Generar portada (1 crédito)" />
                ) : (
                  <Button className="w-full gap-2" size="lg" onClick={handleGenerate} disabled={isGenerating || !canGenerate}>
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Generando tu portada con IA...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" />Generar portada (1 crédito)</>
                    )}
                  </Button>
                )}

                <PricingLink className="block text-center" />
              </CardContent>
            </Card>
          </div>

          {/* Right panel — result */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t('aiCovers.result')}</h2>
            {isGenerating ? (
              <Card className="border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium">Generando tu portada con IA...</p>
                    <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos</p>
                  </div>
                </CardContent>
              </Card>
            ) : imageUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-square">
                  <img src={imageUrl} alt={`Portada: ${trackTitle}`} className="w-full h-full object-cover" />
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-1 rounded">{artistName}</span>
                  <span className="bg-muted px-2 py-1 rounded">{trackTitle}</span>
                  {styleVisual && <span className="bg-muted px-2 py-1 rounded">{styleVisual}</span>}
                  <span className="bg-muted px-2 py-1 rounded">1:1 (Cuadrado)</span>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />Descargar portada
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4" />Generar otra (1 crédito)
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="border-dashed border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-muted-foreground">{t('aiCovers.coverHere')}</p>
                    <p className="text-sm text-muted-foreground">{t('aiCovers.coverHereDesc')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AIStudioCovers
