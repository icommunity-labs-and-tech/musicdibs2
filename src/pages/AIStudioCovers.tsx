import { useState } from "react"
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
import { Footer } from "@/components/Footer"
import { FileDropzone } from "@/components/FileDropzone"
import { useAuth } from "@/hooks/useAuth"
import { useCredits } from "@/hooks/useCredits"
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert"
import { FEATURE_COSTS } from "@/lib/featureCosts"
import { PricingLink } from "@/components/dashboard/PricingPopup"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import {
  ArrowLeft, Wand2, Loader2, Download,
  RefreshCw, ImageIcon, Sparkles,
} from "lucide-react"

const STYLE_KEYS = [
  { value: "photorealistic",      key: "photorealistic" },
  { value: "digital illustration", key: "digitalIllustration" },
  { value: "abstract art",        key: "abstract" },
  { value: "vintage retro",       key: "vintage" },
  { value: "anime manga",         key: "anime" },
  { value: "minimalist",          key: "minimalist" },
  { value: "dark atmospheric",    key: "dark" },
  { value: "neon cyberpunk",      key: "neon" },
  { value: "watercolor",          key: "watercolor" },
  { value: "grunge urban",        key: "grunge" },
]

const COLOR_KEYS = [
  { value: "vibrant multicolor",               key: "vibrant" },
  { value: "dark moody blacks and deep blues",  key: "dark" },
  { value: "warm golden sunset tones",          key: "warm" },
  { value: "cold icy blues and whites",         key: "cold" },
  { value: "neon pink and purple",              key: "neon" },
  { value: "earth tones browns and greens",     key: "earth" },
  { value: "black and white monochrome",        key: "bw" },
  { value: "pastel soft colors",                key: "pastel" },
]

type CoverMode = "none" | "artist"

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

  const [artistName,   setArtistName]   = useState("")
  const [trackTitle,   setTrackTitle]   = useState("")
  const [style,        setStyle]        = useState("")
  const [colorPalette, setColorPalette] = useState("")
  const [description,  setDescription]  = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageUrl,     setImageUrl]     = useState<string | null>(null)
  const [genError,     setGenError]     = useState<string | null>(null)
  const [isImprovingDesc, setIsImprovingDesc] = useState(false)

  const [coverMode, setCoverMode] = useState<CoverMode>("none")
  const [artistPhoto, setArtistPhoto] = useState<File | null>(null)
  const [artistPhotoPreview, setArtistPhotoPreview] = useState<string | null>(null)

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
        toast.success(t('aiCovers.descImproved'))
      }
    } catch {
      toast.error(t('aiShared.error'))
    } finally {
      setIsImprovingDesc(false)
    }
  }

  const handleGenerate = async () => {
    if (!trackTitle.trim() && !description.trim()) {
      toast.error(t('aiCovers.errorMinInput'))
      return
    }
    if (!hasEnough(FEATURE_COSTS.generate_cover)) {
      toast.error(t('aiShared.noCredits'))
      return
    }
    if (coverMode === "artist" && !artistPhoto) {
      toast.error(t('aiCovers.needArtistPhoto') || "Sube una foto del artista")
      return
    }

    setIsGenerating(true)
    setGenError(null)
    setImageUrl(null)

    try {
      const { data: spend, error: spendErr } =
        await supabase.functions.invoke("spend-credits", {
          body: {
            feature: "generate_cover",
            description: `Portada: ${trackTitle || description}`.slice(0, 80),
          },
        })
      if (spendErr || spend?.error) throw new Error(spend?.message || t('aiShared.error'))

      let artistPhotoBase64: string | null = null
      if (coverMode === "artist" && artistPhoto) {
        artistPhotoBase64 = await fileToBase64(artistPhoto)
      }

      const { data, error } = await supabase.functions.invoke("generate-cover", {
        body: {
          artistName,
          trackTitle,
          style,
          colorPalette,
          description,
          artistPhotoBase64,
          referenceMode: coverMode,
        },
      })
      if (error || data?.error) throw new Error(data?.error || error?.message)

      setImageUrl(data.imageUrl)
      toast.success(t('aiCovers.coverGenerated'))
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
              <CardContent className="space-y-5">
                {/* Mode selector */}
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <Label className="text-sm font-medium">{t('aiCovers.mode') || "Modo"}</Label>
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
                      <Label htmlFor="mode-none" className="text-sm cursor-pointer">
                        {t('aiCovers.modeNone') || "Sin imagen"}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="artist" id="mode-artist" />
                      <Label htmlFor="mode-artist" className="text-sm cursor-pointer">
                        {t('aiCovers.modeArtist') || "Con foto del artista"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Artist photo — conditional */}
                {coverMode === "artist" && (
                  <div className="space-y-2">
                    <Label className="text-sm">{t('aiCovers.artistPhoto') || "Foto del artista"}</Label>
                    <FileDropzone
                      fileType="image"
                      accept="image/jpeg,image/png,image/webp"
                      maxSize={10}
                      currentFile={artistPhoto}
                      preview={artistPhotoPreview}
                      onFileSelect={(f) => {
                        if (f.size > 10 * 1024 * 1024) { toast.error("Imagen demasiado grande"); return }
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

                {/* Artist name + track title */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('aiCovers.artistName')}</Label>
                    <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder={t('aiCovers.artistNamePlaceholder')} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t('aiCovers.trackTitle')} <span className="text-destructive">*</span></Label>
                    <Input value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} placeholder={t('aiCovers.trackTitlePlaceholder')} className="h-9" />
                  </div>
                </div>

                {/* Visual style */}
                <div className="space-y-2">
                  <Label className="text-sm">{t('aiCovers.visualStyle')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLE_KEYS.map(s => (
                      <Badge key={s.value} variant={style === s.value ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setStyle(style === s.value ? "" : s.value)}>
                        {t(`aiCovers.styles.${s.key}`)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Color palette */}
                <div className="space-y-2">
                  <Label className="text-sm">{t('aiCovers.dominantColor')}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_KEYS.map(c => (
                      <Badge key={c.value} variant={colorPalette === c.value ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setColorPalette(colorPalette === c.value ? "" : c.value)}>
                        {t(`aiCovers.colors.${c.key}`)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t('aiCovers.additionalDesc')}</Label>
                    <Button
                      variant="ghost" size="sm"
                      onClick={handleImproveDescription}
                      disabled={isImprovingDesc || !description.trim()}
                      className="gap-1.5 h-7 text-xs"
                    >
                      {isImprovingDesc
                        ? <><Loader2 className="h-3 w-3 animate-spin" />{t('aiCovers.improving')}</>
                        : <><Sparkles className="h-3 w-3" />{t('aiCovers.improveWithAI')}</>
                      }
                    </Button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={coverMode === "artist"
                      ? "Describe el estilo visual que quieres y cómo integrar la foto del artista en el diseño..."
                      : t('aiCovers.descPlaceholder')
                    }
                    rows={3} className="resize-none text-sm" maxLength={300}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">{description.length}/300</p>
                </div>

                {genError && <p className="text-xs text-destructive">{genError}</p>}

                {!hasEnough(FEATURE_COSTS.generate_cover) ? (
                  <NoCreditsAlert message={t('aiCovers.generateBtn')} />
                ) : (
                  <Button className="w-full gap-2" size="lg" onClick={handleGenerate} disabled={isGenerating || (!trackTitle.trim() && !description.trim())}>
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />{t('aiCovers.generatingCover')}</>
                    ) : (
                      <><Wand2 className="h-4 w-4" />🎨 {t('aiCovers.generateBtn')}</>
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
                    <p className="font-medium">{t('aiCovers.creatingCover')}</p>
                    <p className="text-sm text-muted-foreground">{t('aiCovers.creatingCoverDesc')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : imageUrl ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-square">
                  <img src={imageUrl} alt={`Portada: ${trackTitle || "Sin título"}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />{t('aiCovers.downloadCover')}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
                    <RefreshCw className="h-4 w-4" />{t('aiCovers.regenerate')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">{t('aiCovers.hiRes')}</p>
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
      <Footer />
    </div>
  )
}

export default AIStudioCovers
