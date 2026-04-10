import { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCredits } from '@/hooks/useCredits';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { Loader2, Download, Sparkles, RefreshCw, ImageIcon } from 'lucide-react';
import { PricingLink } from '@/components/dashboard/PricingPopup';

type Format = 'feed' | 'story' | 'youtube';

const FORMAT_LABELS: Record<Format, string> = {
  feed: 'Instagram Feed',
  story: 'Instagram Stories',
  youtube: 'YouTube Thumbnail',
};

const FORMAT_LOADING: Record<Format, string> = {
  feed: 'Generando tu creatividad para Instagram Feed...',
  story: 'Generando tu creatividad para Instagram Stories...',
  youtube: 'Generando tu creatividad para YouTube...',
};

const ASPECT_CLASS: Record<Format, string> = {
  feed: 'aspect-square',
  story: 'aspect-[9/16] max-w-xs mx-auto',
  youtube: 'aspect-video',
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const CreativesSection = () => {
  const { t } = useTranslation();
  const { hasEnough } = useCredits();

  const [platform, setPlatform] = useState<'instagram' | 'youtube'>('instagram');
  const [instagramFormat, setInstagramFormat] = useState<'feed' | 'story'>('feed');

  const [description, setDescription] = useState('');
  const [basePhoto, setBasePhoto] = useState<File | null>(null);
  const [basePhotoPreview, setBasePhotoPreview] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [resultFormat, setResultFormat] = useState<Format>('feed');

  const currentFormat: Format = platform === 'youtube' ? 'youtube' : instagramFormat;
  const creditCost = FEATURE_COSTS.generate_cover ?? 1;
  const canGenerate = description.trim().length > 0 && hasEnough(creditCost);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Añade una descripción de la imagen');
      return;
    }
    if (!hasEnough(creditCost)) {
      toast.error('No tienes créditos suficientes');
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);

    try {
      let photo_base64: string | null = null;
      if (basePhoto) photo_base64 = await fileToBase64(basePhoto);

      const { data, error } = await supabase.functions.invoke('generate-promo-creative', {
        body: { description, format: currentFormat, photo_base64 },
      });

      if (data?.fallback) throw new Error(data.message || 'Servicio no disponible temporalmente.');
      if (error || data?.error) throw new Error(data?.error || error?.message);

      setGeneratedImage(data.image_url);
      setResultFormat(currentFormat);
      toast.success(`Creatividad ${FORMAT_LABELS[currentFormat]} generada`);
    } catch (err: any) {
      toast.error(err.message || 'Error generando la creatividad');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `creative-${resultFormat}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar');
    }
  };

  const handleReset = () => {
    setGeneratedImage(null);
  };

  /* ── Shared form ── */
  const formBlock = (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          {FORMAT_LABELS[currentFormat]}
        </CardTitle>
        <CardDescription>Genera una creatividad profesional para {FORMAT_LABELS[currentFormat]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-sm">Describe la imagen que quieres <span className="text-destructive">*</span></Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            placeholder="Ej: Artista cantando en un escenario con luces de neón azul y rosa, ambiente nocturno urbano"
            rows={4}
            maxLength={1000}
            className="resize-none text-sm"
          />
          <p className="text-[11px] text-muted-foreground text-right">{description.length}/1000</p>
        </div>

        {/* Photo */}
        <div className="space-y-1.5">
          <Label className="text-sm">Foto base (opcional)</Label>
          <p className="text-xs text-muted-foreground mb-1">Sube una foto del artista o de referencia</p>
          <FileDropzone
            fileType="image"
            accept="image/jpeg,image/png,image/webp"
            maxSize={10}
            currentFile={basePhoto}
            preview={basePhotoPreview}
            onFileSelect={(file) => {
              if (file.size > 10 * 1024 * 1024) { toast.error('Imagen demasiado grande (máx 10MB)'); return; }
              setBasePhoto(file);
              setBasePhotoPreview(URL.createObjectURL(file));
            }}
            onRemove={() => {
              setBasePhoto(null);
              if (basePhotoPreview) URL.revokeObjectURL(basePhotoPreview);
              setBasePhotoPreview(null);
            }}
          />
        </div>

        {!hasEnough(creditCost) ? (
          <NoCreditsAlert message="Generar creatividad (1 crédito)" />
        ) : (
          <Button className="w-full gap-2" size="lg" onClick={handleGenerate} disabled={generating || !canGenerate}>
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{FORMAT_LOADING[currentFormat]}</>
            ) : (
              <><Sparkles className="h-4 w-4" />Generar creatividad (1 crédito)</>
            )}
          </Button>
        )}
        <PricingLink className="block text-center mt-1" />
      </CardContent>
    </Card>
  );

  /* ── Result panel ── */
  const resultBlock = (
    <div className="space-y-4">
      {generating ? (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">{FORMAT_LOADING[currentFormat]}</p>
              <p className="text-sm text-muted-foreground">Esto puede tardar unos segundos</p>
            </div>
          </CardContent>
        </Card>
      ) : generatedImage ? (
        <div className="space-y-3">
          <div className={`relative rounded-2xl overflow-hidden border border-border/40 shadow-lg ${ASPECT_CLASS[resultFormat]}`}>
            <img src={generatedImage} alt={`Creatividad ${FORMAT_LABELS[resultFormat]}`} className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">{FORMAT_LABELS[resultFormat]}</span>
            <span className="bg-muted px-2 py-1 rounded">
              {resultFormat === 'feed' ? '1:1' : resultFormat === 'story' ? '9:16' : '16:9'}
            </span>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />Descargar creatividad
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
              <p className="font-medium text-muted-foreground">Tu creatividad aparecerá aquí</p>
              <p className="text-sm text-muted-foreground">Configura los campos y pulsa generar</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('promoMaterial.creatives.title') || 'Creatividades'}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('promoMaterial.creatives.subtitle') || 'Genera imágenes profesionales para tus redes sociales'}</p>
      </div>

      <Tabs value={platform} onValueChange={(v) => { setPlatform(v as typeof platform); setGeneratedImage(null); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="instagram" className="gap-1.5 text-xs sm:text-sm">📱 Instagram</TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5 text-xs sm:text-sm">🎬 YouTube</TabsTrigger>
        </TabsList>

        {/* ─── Instagram ─── */}
        <TabsContent value="instagram" className="mt-6 space-y-4">
          <Tabs value={instagramFormat} onValueChange={(v) => { setInstagramFormat(v as typeof instagramFormat); setGeneratedImage(null); }}>
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="feed" className="gap-1.5 text-xs sm:text-sm">
                Feed Post <Badge variant="outline" className="ml-1 text-[10px]">1:1</Badge>
              </TabsTrigger>
              <TabsTrigger value="story" className="gap-1.5 text-xs sm:text-sm">
                Story <Badge variant="outline" className="ml-1 text-[10px]">9:16</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={instagramFormat} className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {formBlock}
                {resultBlock}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─── YouTube ─── */}
        <TabsContent value="youtube" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {formBlock}
            {resultBlock}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
