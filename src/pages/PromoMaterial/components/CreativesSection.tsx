import { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Check, Download, Sparkles } from 'lucide-react';
import { PricingLink } from '@/components/dashboard/PricingPopup';

export const CreativesSection = () => {
  const { t } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.creatives.${key}`);
  const trIg = (key: string) => t(`promoMaterial.creatives.instagram.${key}`);
  const trYt = (key: string) => t(`promoMaterial.creatives.youtube.${key}`);
  const { toast } = useToast();

  const [platform, setPlatform] = useState<'instagram' | 'youtube'>('instagram');
  const [instagramFormat, setInstagramFormat] = useState<'feed' | 'story'>('feed');

  // Simplified fields
  const [imageDescription, setImageDescription] = useState('');
  const [basePhoto, setBasePhoto] = useState<File | null>(null);
  const [basePhotoPreview, setBasePhotoPreview] = useState<string | null>(null);

  // Results
  const [generating, setGenerating] = useState(false);
  const [improvingPrompt, setImprovingPrompt] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);

  const [copyCopied, setCopyCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);
  const [allCopied, setAllCopied] = useState(false);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImproveDescription = async () => {
    if (!imageDescription.trim() && !basePhoto) {
      toast({ title: t('promoMaterial.creatives.aiDescribe.needInput'), variant: 'destructive' });
      return;
    }
    setImprovingPrompt(true);
    try {
      let image_base64: string | null = null;
      if (basePhoto) image_base64 = await fileToBase64(basePhoto);

      const visualMode = platform === 'instagram' ? 'instagram_creative' : 'youtube_thumbnail';
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: { prompt: imageDescription.trim() || '', mode: visualMode, image_base64 },
      });

      if (error) throw error;
      if (data?.improved) {
        setImageDescription(data.improved);
        toast({ title: '✨ ' + t('promoMaterial.creatives.aiDescribe.success') });
      }
    } catch (err: any) {
      console.error('AI describe error:', err);
      toast({ title: t('promoMaterial.creatives.aiDescribe.error'), variant: 'destructive' });
    } finally {
      setImprovingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!imageDescription.trim()) {
      toast({ title: platform === 'instagram' ? trIg('missingFields') : trYt('missingFields'), description: 'Añade una descripción de la imagen', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);
    setGeneratedCopy('');
    setGeneratedHashtags([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
        return;
      }

      let basePhotoBase64: string | null = null;
      if (basePhoto) basePhotoBase64 = await fileToBase64(basePhoto);

      const endpoint = platform === 'instagram' ? 'generate-instagram-creative' : 'generate-youtube-thumbnail';
      const payload = platform === 'instagram'
        ? { format: instagramFormat, image_description: imageDescription, base_photo_base64: basePhotoBase64 }
        : { thumbnail_description: imageDescription, base_photo_base64: basePhotoBase64 };

      const response = await supabase.functions.invoke(endpoint, { body: payload });

      if (response.error) throw new Error(response.error.message);
      const data = response.data;

      if (data.error) {
        toast({ title: platform === 'instagram' ? trIg('generationError') : trYt('generationError'), description: data.error, variant: 'destructive' });
        return;
      }

      setGeneratedImage(data.image_url);
      if (platform === 'instagram') {
        setGeneratedCopy(data.copy || '');
        setGeneratedHashtags(data.hashtags || []);
      }

      toast({ title: '✅ ' + (platform === 'instagram' ? trIg('resultTitle') : trYt('resultTitle')) });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: platform === 'instagram' ? trIg('generationError') : trYt('generationError'),
        description: platform === 'instagram' ? trIg('generationErrorDesc') : trYt('generationErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyCopyText = () => {
    navigator.clipboard.writeText(generatedCopy);
    setCopyCopied(true);
    setTimeout(() => setCopyCopied(false), 2000);
    toast({ title: trIg('copyCopied') });
  };

  const copyHashtagsText = () => {
    navigator.clipboard.writeText(generatedHashtags.map(h => `#${h}`).join(' '));
    setHashtagsCopied(true);
    setTimeout(() => setHashtagsCopied(false), 2000);
    toast({ title: trIg('hashtagsCopied') });
  };

  const copyAllText = () => {
    navigator.clipboard.writeText(`${generatedCopy}\n\n${generatedHashtags.map(h => `#${h}`).join(' ')}`);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
    toast({ title: trIg('allCopied') });
  };

  /* Shared description + photo block */
  const descriptionBlock = (placeholderKey: string) => (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{platform === 'instagram' ? trIg('imageDescription') : trYt('thumbnailDescription')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-primary"
            disabled={improvingPrompt || (!imageDescription.trim() && !basePhoto)}
            onClick={handleImproveDescription}
          >
            {improvingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {improvingPrompt ? t('promoMaterial.creatives.aiDescribe.generating') : t('promoMaterial.creatives.aiDescribe.button')}
          </Button>
        </div>
        <Textarea
          value={imageDescription}
          onChange={(e) => setImageDescription(e.target.value.slice(0, 300))}
          placeholder={t(placeholderKey)}
          rows={4}
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground text-right">{imageDescription.length}/300</p>
      </div>

      <FileDropzone
        label={t(platform === 'instagram' ? 'promoMaterial.creatives.instagram.basePhoto' : 'promoMaterial.creatives.youtube.basePhoto')}
        description={t(platform === 'instagram' ? 'promoMaterial.creatives.instagram.basePhotoDesc' : 'promoMaterial.creatives.youtube.basePhotoDesc')}
        fileType="image"
        accept="image/jpeg,image/png,image/webp"
        maxSize={10}
        currentFile={basePhoto}
        preview={basePhotoPreview}
        onFileSelect={(file) => {
          if (file.size > 10 * 1024 * 1024) { toast({ title: trIg('imageTooBig'), variant: 'destructive' }); return; }
          setBasePhoto(file);
          setBasePhotoPreview(URL.createObjectURL(file));
        }}
        onRemove={() => { setBasePhoto(null); setBasePhotoPreview(null); }}
      />
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('subtitle')}</p>
      </div>

      <Tabs value={platform} onValueChange={(v) => { setPlatform(v as typeof platform); setGeneratedImage(null); setGeneratedCopy(''); setGeneratedHashtags([]); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="instagram" className="gap-1.5 text-xs sm:text-sm">📱 {tr('platformInstagram')}</TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5 text-xs sm:text-sm">🎬 {tr('platformYoutube')}</TabsTrigger>
        </TabsList>

        {/* ─── Instagram ─── */}
        <TabsContent value="instagram" className="mt-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium">{trIg('title')}</h3>
            <p className="text-sm text-muted-foreground">{trIg('subtitle')}</p>
          </div>

          <Tabs value={instagramFormat} onValueChange={(v) => setInstagramFormat(v as typeof instagramFormat)}>
            <TabsList className="grid w-full grid-cols-2 max-w-sm" data-tour="pm-ig-formats">
              <TabsTrigger value="feed" className="gap-1.5 text-xs sm:text-sm">
                {trIg('formatFeed')} <Badge variant="outline" className="ml-1 text-[10px]">1:1</Badge>
              </TabsTrigger>
              <TabsTrigger value="story" className="gap-1.5 text-xs sm:text-sm">
                {trIg('formatStory')} <Badge variant="outline" className="ml-1 text-[10px]">9:16</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={instagramFormat} className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{trIg('formTitle')}</CardTitle>
                    <CardDescription>{trIg('formSubtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {descriptionBlock('promoMaterial.creatives.instagram.imageDescriptionPlaceholder')}

                    <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
                      {generating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{trIg('generating')}</>) : trIg('generateButton')}
                    </Button>
                    <PricingLink className="block text-center mt-1" />
                  </CardContent>
                </Card>

                {/* Results */}
                <div className="space-y-4">
                  {generatedImage && platform === 'instagram' ? (
                    <>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">{trIg('imageGenerated')}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          <img src={generatedImage} alt="Generated" className={`w-full rounded-lg ${instagramFormat === 'feed' ? 'aspect-square object-cover' : 'aspect-[9/16] object-cover max-w-xs mx-auto'}`} />
                          <Button variant="outline" className="w-full" onClick={() => { const a = document.createElement('a'); a.href = generatedImage!; a.download = `creative-${instagramFormat}.jpg`; a.target = '_blank'; a.click(); }}>
                            <Download className="w-4 h-4 mr-2" />{trIg('downloadImage')}
                          </Button>
                        </CardContent>
                      </Card>

                      {generatedCopy && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-base">{trIg('copyTitle')}</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{generatedCopy}</p>
                            <Button variant="outline" size="sm" className="w-full" onClick={copyCopyText}>
                              {copyCopied ? <><Check className="w-4 h-4 mr-1" />{trIg('copyCopied')}</> : <><Copy className="w-4 h-4 mr-1" />{trIg('copyCopy')}</>}
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {generatedHashtags.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2"><CardTitle className="text-base">{trIg('hashtagsTitle')}</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                              {generatedHashtags.map((tag, i) => <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>)}
                            </div>
                            <Button variant="outline" size="sm" className="w-full" onClick={copyHashtagsText}>
                              {hashtagsCopied ? <><Check className="w-4 h-4 mr-1" />{trIg('hashtagsCopied')}</> : <><Copy className="w-4 h-4 mr-1" />{trIg('copyHashtags')}</>}
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      <Button variant="default" className="w-full" onClick={copyAllText}>
                        {allCopied ? <><Check className="w-4 h-4 mr-2" />{trIg('allCopied')}</> : <>📋 {trIg('copyAll')}</>}
                      </Button>
                    </>
                  ) : (
                    <Card className="flex items-center justify-center min-h-[300px]">
                      <CardContent className="text-center text-muted-foreground">
                        <p className="text-sm">📸 {trIg('formSubtitle')}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─── YouTube ─── */}
        <TabsContent value="youtube" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{trYt('title')}</CardTitle>
                <CardDescription>{trYt('subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {descriptionBlock('promoMaterial.creatives.youtube.thumbnailDescriptionPlaceholder')}

                <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
                  {generating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{trYt('generating')}</>) : trYt('generateButton')}
                </Button>
                <PricingLink className="block text-center mt-1" />
              </CardContent>
            </Card>

            {/* YouTube Results */}
            <div className="space-y-4">
              {generatedImage && platform === 'youtube' ? (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{trYt('resultTitle')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <img src={generatedImage} alt="YouTube Thumbnail" className="w-full rounded-lg aspect-video object-cover" />
                    <Button className="w-full" onClick={() => { const a = document.createElement('a'); a.href = generatedImage!; a.download = `thumbnail.jpg`; a.target = '_blank'; a.click(); }}>
                      <Download className="w-4 h-4 mr-2" />{trYt('downloadThumbnail')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex items-center justify-center min-h-[300px]">
                  <CardContent className="text-center text-muted-foreground">
                    <p className="text-sm">🎬 {trYt('subtitle')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
