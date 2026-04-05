import { useState, useRef, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Wand2, Loader2, Download, RefreshCw, ImageIcon, Sparkles,
  Camera, Upload, AlertTriangle, Info, X,
} from 'lucide-react';

const STYLE_KEYS = [
  { value: 'photorealistic', key: 'photorealistic' },
  { value: 'digital illustration', key: 'digitalIllustration' },
  { value: 'abstract art', key: 'abstract' },
  { value: 'vintage retro', key: 'vintage' },
  { value: 'anime manga', key: 'anime' },
  { value: 'minimalist', key: 'minimalist' },
  { value: 'dark atmospheric', key: 'dark' },
  { value: 'neon cyberpunk', key: 'neon' },
  { value: 'watercolor', key: 'watercolor' },
  { value: 'grunge urban', key: 'grunge' },
];

const COLOR_KEYS = [
  { value: 'vibrant multicolor', key: 'vibrant' },
  { value: 'dark moody blacks and deep blues', key: 'dark' },
  { value: 'warm golden sunset tones', key: 'warm' },
  { value: 'cold icy blues and whites', key: 'cold' },
  { value: 'neon pink and purple', key: 'neon' },
  { value: 'earth tones browns and greens', key: 'earth' },
  { value: 'black and white monochrome', key: 'bw' },
  { value: 'pastel soft colors', key: 'pastel' },
];

const ARTIST_REFS = [
  'Bad Bunny', 'Rosalía', 'C. Tangana', 'J Balvin',
  'Drake', 'Kendrick Lamar', 'Taylor Swift', 'The Weeknd',
  'Billie Eilish', 'Tyler the Creator', 'Frank Ocean',
  'Karol G', 'Rauw Alejandro', 'Bizarrap',
];

type ReferenceMode = 'none' | 'artist' | 'reference' | 'photomontage';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const CoversSection = () => {
  const { t } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.covers.${key}`);
  const { user } = useAuth();
  const { hasEnough } = useCredits();

  // Existing states
  const [artistName, setArtistName] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [style, setStyle] = useState('');
  const [colorPalette, setColorPalette] = useState('');
  const [artistRef, setArtistRef] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [isImprovingDesc, setIsImprovingDesc] = useState(false);

  // Reference image states
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>('none');
  const [artistPhoto, setArtistPhoto] = useState<File | null>(null);
  const [artistPhotoPreview, setArtistPhotoPreview] = useState<string | null>(null);
  const [artistPhotoStrength, setArtistPhotoStrength] = useState(50);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(50);

  // Photomontage states
  const [photomontageStep, setPhotomontageStep] = useState<1 | 2>(1);
  const [photomontageProgress, setPhotomontageProgress] = useState(0);

  const artistPhotoRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (artistPhotoPreview) URL.revokeObjectURL(artistPhotoPreview);
      if (referenceImagePreview) URL.revokeObjectURL(referenceImagePreview);
    };
  }, []);

  // Reset images when mode changes
  useEffect(() => {
    if (referenceMode === 'none') {
      setArtistPhoto(null);
      setArtistPhotoPreview(p => { if (p) URL.revokeObjectURL(p); return null; });
      setReferenceImage(null);
      setReferenceImagePreview(p => { if (p) URL.revokeObjectURL(p); return null; });
    } else if (referenceMode === 'artist') {
      setReferenceImage(null);
      setReferenceImagePreview(p => { if (p) URL.revokeObjectURL(p); return null; });
    } else if (referenceMode === 'reference') {
      setArtistPhoto(null);
      setArtistPhotoPreview(p => { if (p) URL.revokeObjectURL(p); return null; });
    }
    // photomontage keeps both images
  }, [referenceMode]);

  const validateAndSetImage = (
    file: File,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(tr('imageTooBig'), { description: tr('imageTooBigDesc') });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(tr('invalidImageFormat'), { description: tr('invalidImageFormatDesc') });
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleImproveDescription = async () => {
    if (!description.trim()) return;
    setIsImprovingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: { prompt: description, genre: '', mood: '', mode: 'instrumental' },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.improved) {
        setDescription(data.improved.slice(0, 300));
        toast.success(t('aiCovers.descImproved'));
      }
    } catch {
      toast.error(t('aiShared.error'));
    } finally {
      setIsImprovingDesc(false);
    }
  };

  const handleGenerate = async () => {
    if (!trackTitle.trim() && !description.trim()) {
      toast.error(t('aiCovers.errorMinInput'));
      return;
    }
    if (!hasEnough(FEATURE_COSTS.generate_cover)) {
      toast.error(t('aiShared.noCredits'));
      return;
    }
    if (referenceMode === 'artist' && !artistPhoto) {
      toast.error(tr('artistPhotoTitle'), { description: tr('artistPhotoUpload') });
      return;
    }
    if (referenceMode === 'reference' && !referenceImage) {
      toast.error(tr('referenceTitle'), { description: tr('referenceUpload') });
      return;
    }
    if (referenceMode === 'photomontage' && (!artistPhoto || !referenceImage)) {
      toast.error(tr('photomontageMissingPhotos'), { description: tr('photomontageMissingPhotosDesc') });
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    setImageUrl(null);
    setPhotomontageStep(1);
    setPhotomontageProgress(0);

    try {
      // Pre-validate credits
      const { data: spend, error: spendErr } = await supabase.functions.invoke('spend-credits', {
        body: {
          feature: 'generate_cover',
          description: `Portada: ${trackTitle || description}`.slice(0, 80),
        },
      });
      if (spendErr || spend?.error) throw new Error(spend?.message || t('aiShared.error'));

      // Convert images to base64 based on mode
      let artistPhotoBase64: string | null = null;
      let referenceImageBase64: string | null = null;
      let strengthValue = 0;

      if (referenceMode === 'artist' && artistPhoto) {
        artistPhotoBase64 = await fileToBase64(artistPhoto);
        strengthValue = artistPhotoStrength / 100;
      } else if (referenceMode === 'reference' && referenceImage) {
        referenceImageBase64 = await fileToBase64(referenceImage);
        strengthValue = referenceStrength / 100;
      } else if (referenceMode === 'photomontage' && artistPhoto && referenceImage) {
        artistPhotoBase64 = await fileToBase64(artistPhoto);
        referenceImageBase64 = await fileToBase64(referenceImage);
        strengthValue = 0.6;
      }

      const { data, error } = await supabase.functions.invoke('generate-cover', {
        body: {
          artistName,
          trackTitle,
          style,
          colorPalette,
          artistRef,
          description,
          artistPhotoBase64,
          referenceImageBase64,
          referenceStrength: strengthValue,
          referenceMode,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      setImageUrl(data.imageUrl);
      toast.success(t('aiCovers.coverGenerated'));
    } catch (err: any) {
      setGenError(err.message || t('aiShared.error'));
      toast.error(err.message || t('aiShared.error'));
    }
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portada-${(trackTitle || 'musicdibs').replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('aiShared.error'));
    }
  };

  const promptLabel =
    referenceMode === 'artist' ? tr('promptLabelArtist') :
    referenceMode === 'reference' ? tr('promptLabelReference') :
    referenceMode === 'photomontage' ? tr('promptLabelPhotomontage') :
    tr('promptLabelNone');

  const promptPlaceholder =
    referenceMode === 'artist' ? tr('promptPlaceholderArtist') :
    referenceMode === 'reference' ? tr('promptPlaceholderReference') :
    referenceMode === 'photomontage' ? tr('promptPlaceholderPhotomontage') :
    tr('promptPlaceholderNone');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('description')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left panel — config */}
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
              {/* Artist name + track title */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">{t('aiCovers.artistName')}</Label>
                  <Input
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder={t('aiCovers.artistNamePlaceholder')}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {t('aiCovers.trackTitle')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={trackTitle}
                    onChange={(e) => setTrackTitle(e.target.value)}
                    placeholder={t('aiCovers.trackTitlePlaceholder')}
                    className="h-9"
                  />
                </div>
              </div>

              {/* === REFERENCE IMAGE SECTION === */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div>
                  <Label className="text-sm font-medium">{tr('referenceImageTitle')}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{tr('referenceImageDesc')}</p>
                </div>

                <Tabs value={referenceMode} onValueChange={(v) => setReferenceMode(v as ReferenceMode)}>
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="none" className="text-xs">{tr('modeNone')}</TabsTrigger>
                    <TabsTrigger value="artist" className="text-xs">{tr('modeArtist')}</TabsTrigger>
                    <TabsTrigger value="reference" className="text-xs">{tr('modeReference')}</TabsTrigger>
                    <TabsTrigger value="photomontage" className="text-xs flex flex-col items-center gap-0.5 py-1.5">
                      <span>{tr('modePhotomontage')}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{tr('photomontageCredits')}</Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="none" className="mt-3">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">{tr('modeNoneAlert')}</AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="artist" className="mt-3 space-y-3">
                    <p className="text-xs text-muted-foreground">{tr('artistPhotoDesc')}</p>
                    <FileDropzone
                      fileType="image"
                      accept="image/jpeg,image/png,image/webp"
                      maxSize={10}
                      currentFile={artistPhoto}
                      preview={artistPhotoPreview}
                      onFileSelect={(f) => validateAndSetImage(f, setArtistPhoto, setArtistPhotoPreview)}
                      onRemove={() => {
                        setArtistPhoto(null);
                        if (artistPhotoPreview) URL.revokeObjectURL(artistPhotoPreview);
                        setArtistPhotoPreview(null);
                      }}
                    />

                    {artistPhotoPreview && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">{tr('artistPhotoStrength')}</Label>
                          <span className="text-xs text-muted-foreground font-mono">{artistPhotoStrength}%</span>
                        </div>
                        <Slider
                          value={[artistPhotoStrength]}
                          onValueChange={([val]) => setArtistPhotoStrength(val)}
                          min={20}
                          max={90}
                          step={10}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{tr('strengthLow')}</span>
                          <span>{tr('strengthHigh')}</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="reference" className="mt-3 space-y-3">
                    <p className="text-xs text-muted-foreground">{tr('referenceDesc')}</p>
                    <FileDropzone
                      fileType="image"
                      accept="image/jpeg,image/png,image/webp"
                      maxSize={10}
                      currentFile={referenceImage}
                      preview={referenceImagePreview}
                      onFileSelect={(f) => validateAndSetImage(f, setReferenceImage, setReferenceImagePreview)}
                      onRemove={() => {
                        setReferenceImage(null);
                        if (referenceImagePreview) URL.revokeObjectURL(referenceImagePreview);
                        setReferenceImagePreview(null);
                      }}
                    />

                    {referenceImagePreview && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">{tr('referenceStrength')}</Label>
                            <span className="text-xs text-muted-foreground font-mono">{referenceStrength}%</span>
                          </div>
                          <Slider
                            value={[referenceStrength]}
                            onValueChange={([val]) => setReferenceStrength(val)}
                            min={20}
                            max={90}
                            step={10}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{tr('strengthInspiration')}</span>
                            <span>{tr('strengthSimilar')}</span>
                          </div>
                        </div>

                        <Alert variant="default" className="border-destructive/30 bg-destructive/5">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <AlertTitle className="text-xs">{tr('copyrightWarningTitle')}</AlertTitle>
                          <AlertDescription className="text-[10px] space-y-1">
                            <p>{tr('copyrightWarning1')}</p>
                            <p>{tr('copyrightWarning2')}</p>
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </TabsContent>

                  {/* Photomontage tab */}
                  <TabsContent value="photomontage" className="mt-3 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{tr('photomontageTitle')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{tr('photomontageDesc')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Your photo */}
                      <Card>
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5" />
                            {tr('photomontageYourPhoto')}
                          </CardTitle>
                          <CardDescription className="text-[10px]">{tr('photomontageYourPhotoDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                          <FileDropzone
                            fileType="image"
                            accept="image/jpeg,image/png,image/webp"
                            maxSize={10}
                            currentFile={artistPhoto}
                            preview={artistPhotoPreview}
                            onFileSelect={(f) => validateAndSetImage(f, setArtistPhoto, setArtistPhotoPreview)}
                            onRemove={() => {
                              setArtistPhoto(null);
                              if (artistPhotoPreview) URL.revokeObjectURL(artistPhotoPreview);
                              setArtistPhotoPreview(null);
                            }}
                          />
                        </CardContent>
                      </Card>

                      {/* Reference cover */}
                      <Card>
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-xs flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {tr('photomontageReference')}
                          </CardTitle>
                          <CardDescription className="text-[10px]">{tr('photomontageReferenceDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                          <input
                            ref={referenceImageRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) validateAndSetImage(f, setReferenceImage, setReferenceImagePreview);
                            }}
                          />
                          <div
                            onClick={() => referenceImageRef.current?.click()}
                            className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                          >
                            {referenceImagePreview ? (
                              <div className="space-y-2">
                                <img src={referenceImagePreview} alt="" className="w-full aspect-square rounded-lg object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReferenceImage(null);
                                    if (referenceImagePreview) URL.revokeObjectURL(referenceImagePreview);
                                    setReferenceImagePreview(null);
                                    if (referenceImageRef.current) referenceImageRef.current.value = '';
                                  }}
                                  className="text-xs text-primary hover:underline"
                                >
                                  {tr('changeReference')}
                                </button>
                              </div>
                            ) : (
                              <>
                                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                                <p className="text-[10px] font-medium">{tr('referenceUpload')}</p>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle className="text-xs">{tr('photomontageProcessInfo')}</AlertTitle>
                      <AlertDescription className="text-[10px]">{tr('photomontageProcessDesc')}</AlertDescription>
                    </Alert>

                    {isGenerating && referenceMode === 'photomontage' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <p className="text-xs font-medium">
                            {photomontageStep === 1 ? tr('photomontageStep1') : tr('photomontageStep2')}
                          </p>
                        </div>
                        <Progress value={photomontageProgress} className="h-2" />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Visual style */}
              <div className="space-y-2">
                <Label className="text-sm">{t('aiCovers.visualStyle')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_KEYS.map(s => (
                    <Badge
                      key={s.value}
                      variant={style === s.value ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setStyle(style === s.value ? '' : s.value)}
                    >
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
                    <Badge
                      key={c.value}
                      variant={colorPalette === c.value ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setColorPalette(colorPalette === c.value ? '' : c.value)}
                    >
                      {t(`aiCovers.colors.${c.key}`)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Artist reference */}
              <div className="space-y-2">
                <Label className="text-sm">
                  {t('aiCovers.visualInspired')}{' '}
                  <span className="text-muted-foreground font-normal">{t('aiCovers.optional')}</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {ARTIST_REFS.map(a => (
                    <Badge
                      key={a}
                      variant={artistRef === a ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => setArtistRef(artistRef === a ? '' : a)}
                    >
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Description / prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{promptLabel}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleImproveDescription}
                    disabled={isImprovingDesc || !description.trim()}
                    className="gap-1.5 h-7 text-xs"
                  >
                    {isImprovingDesc ? (
                      <><Loader2 className="h-3 w-3 animate-spin" />{t('aiCovers.improving')}</>
                    ) : (
                      <><Sparkles className="h-3 w-3" />{t('aiCovers.improveWithAI')}</>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={promptPlaceholder}
                  rows={3}
                  className="resize-none text-sm"
                  maxLength={300}
                />
                <p className="text-[11px] text-muted-foreground text-right">{description.length}/300</p>
              </div>

              {genError && <p className="text-xs text-destructive">{genError}</p>}

              {!hasEnough(FEATURE_COSTS.generate_cover) ? (
                <NoCreditsAlert message={t('aiCovers.generateBtn')} />
              ) : (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || (!trackTitle.trim() && !description.trim())}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{t('aiCovers.generatingCover')}</>
                  ) : (
                    <><Wand2 className="h-4 w-4" />{t('aiCovers.generateBtn')}</>
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
                <img
                  src={imageUrl}
                  alt={`Portada: ${trackTitle || 'Sin título'}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  {t('aiCovers.downloadCover')}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className="h-4 w-4" />
                  {t('aiCovers.regenerate')}
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
    </div>
  );
};
