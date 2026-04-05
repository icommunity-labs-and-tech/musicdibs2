import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Copy, Check, Download } from 'lucide-react';

export const CreativesSection = () => {
  const { t } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.creatives.${key}`);
  const trIg = (key: string) => t(`promoMaterial.creatives.instagram.${key}`);
  const trYt = (key: string) => t(`promoMaterial.creatives.youtube.${key}`);
  const { toast } = useToast();

  const [platform, setPlatform] = useState<'instagram' | 'youtube'>('instagram');
  const [instagramFormat, setInstagramFormat] = useState<'feed' | 'story'>('feed');

  // Common
  const [visualStyle, setVisualStyle] = useState('vibrant');
  const [imageDescription, setImageDescription] = useState('');
  const [basePhoto, setBasePhoto] = useState<File | null>(null);
  const [basePhotoPreview, setBasePhotoPreview] = useState<string | null>(null);

  // Instagram
  const [artistName, setArtistName] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [copyTone, setCopyTone] = useState('exciting');
  const [cta, setCta] = useState('listen_now');

  // YouTube
  const [videoTitle, setVideoTitle] = useState('');
  const [includeText, setIncludeText] = useState(false);
  const [highlightText, setHighlightText] = useState('');

  // Results
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);

  const [copyCopied, setCopyCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);
  const [allCopied, setAllCopied] = useState(false);

  const basePhotoRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t(`promoMaterial.creatives.${platform}.imageTooBig`), description: t(`promoMaterial.creatives.${platform}.imageTooBigDesc`), variant: 'destructive' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: t(`promoMaterial.creatives.${platform}.invalidImageFormat`), description: t(`promoMaterial.creatives.${platform}.invalidImageFormatDesc`), variant: 'destructive' });
      return;
    }
    setBasePhoto(file);
    setBasePhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBasePhoto(null);
    setBasePhotoPreview(null);
    if (basePhotoRef.current) basePhotoRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleGenerate = async () => {
    if (platform === 'instagram') {
      if (!artistName.trim() || !trackTitle.trim() || !imageDescription.trim()) {
        toast({ title: trIg('missingFields'), description: trIg('missingFieldsDesc'), variant: 'destructive' });
        return;
      }
    } else {
      if (!videoTitle.trim() || !imageDescription.trim()) {
        toast({ title: trYt('missingFields'), description: trYt('missingFieldsDesc'), variant: 'destructive' });
        return;
      }
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
        ? { artist_name: artistName, track_title: trackTitle, format: instagramFormat, visual_style: visualStyle, image_description: imageDescription, base_photo_base64: basePhotoBase64, copy_tone: copyTone, cta }
        : { video_title: videoTitle, visual_style: visualStyle, thumbnail_description: imageDescription, base_photo_base64: basePhotoBase64, include_text: includeText, highlight_text: highlightText };

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

  const photoUploadBlock = (labelKey: string, descKey: string, changeKey: string, uploadKey: string) => (
    <FileDropzone
      label={t(labelKey)}
      description={t(descKey)}
      fileType="image"
      accept="image/jpeg,image/png,image/webp"
      maxSize={10}
      currentFile={basePhoto}
      preview={basePhotoPreview}
      onFileSelect={(file) => {
        if (file.size > 10 * 1024 * 1024) { toast({ title: 'Archivo demasiado grande', variant: 'destructive' }); return; }
        setBasePhoto(file);
        setBasePhotoPreview(URL.createObjectURL(file));
      }}
      onRemove={clearPhoto}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('subtitle')}</p>
      </div>

      {/* Level 1: Platform */}
      <Tabs value={platform} onValueChange={(v) => { setPlatform(v as typeof platform); setGeneratedImage(null); setGeneratedCopy(''); setGeneratedHashtags([]); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="instagram" className="gap-1.5 text-xs sm:text-sm">📱 {tr('platformInstagram')}</TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5 text-xs sm:text-sm">🎬 {tr('platformYoutube')}</TabsTrigger>
        </TabsList>

        {/* Instagram */}
        <TabsContent value="instagram" className="mt-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium">{trIg('title')}</h3>
            <p className="text-sm text-muted-foreground">{trIg('subtitle')}</p>
          </div>

          {/* Level 2: Format */}
          <Tabs value={instagramFormat} onValueChange={(v) => setInstagramFormat(v as typeof instagramFormat)}>
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="feed" className="gap-1.5 text-xs sm:text-sm">
                {trIg('formatFeed')} <Badge variant="outline" className="ml-1 text-[10px]">1:1</Badge>
              </TabsTrigger>
              <TabsTrigger value="story" className="gap-1.5 text-xs sm:text-sm">
                {trIg('formatStory')} <Badge variant="outline" className="ml-1 text-[10px]">9:16</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={instagramFormat} className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{trIg('formTitle')}</CardTitle>
                    <CardDescription>{trIg('formSubtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{trIg('artistName')}</Label>
                        <Input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder={trIg('artistNamePlaceholder')} />
                      </div>
                      <div className="space-y-2">
                        <Label>{trIg('trackTitle')}</Label>
                        <Input value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} placeholder={trIg('trackTitlePlaceholder')} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{trIg('visualStyle')}</Label>
                      <Select value={visualStyle} onValueChange={setVisualStyle}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimalist">{trIg('visualStyleMinimalist')}</SelectItem>
                          <SelectItem value="vibrant">{trIg('visualStyleVibrant')}</SelectItem>
                          <SelectItem value="elegant">{trIg('visualStyleElegant')}</SelectItem>
                          <SelectItem value="urban">{trIg('visualStyleUrban')}</SelectItem>
                          <SelectItem value="retro">{trIg('visualStyleRetro')}</SelectItem>
                          <SelectItem value="neon">{trIg('visualStyleNeon')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{trIg('imageDescription')}</Label>
                      <Textarea value={imageDescription} onChange={(e) => setImageDescription(e.target.value)} placeholder={trIg('imageDescriptionPlaceholder')} rows={3} />
                    </div>

                    {photoUploadBlock(
                      'promoMaterial.creatives.instagram.basePhoto',
                      'promoMaterial.creatives.instagram.basePhotoDesc',
                      'promoMaterial.creatives.instagram.changePhoto',
                      'promoMaterial.creatives.instagram.uploadPhoto'
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{trIg('copyTone')}</Label>
                        <Select value={copyTone} onValueChange={setCopyTone}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exciting">{trIg('toneExciting')}</SelectItem>
                            <SelectItem value="mysterious">{trIg('toneMysterious')}</SelectItem>
                            <SelectItem value="fun">{trIg('toneFun')}</SelectItem>
                            <SelectItem value="inspiring">{trIg('toneInspiring')}</SelectItem>
                            <SelectItem value="casual">{trIg('toneCasual')}</SelectItem>
                            <SelectItem value="professional">{trIg('toneProfessional')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{trIg('cta')}</Label>
                        <Select value={cta} onValueChange={setCta}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="listen_now">{trIg('ctaListenNow')}</SelectItem>
                            <SelectItem value="out_now">{trIg('ctaOutNow')}</SelectItem>
                            <SelectItem value="new_single">{trIg('ctaNewSingle')}</SelectItem>
                            <SelectItem value="coming_soon">{trIg('ctaComingSoon')}</SelectItem>
                            <SelectItem value="link_in_bio">{trIg('ctaLinkInBio')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
                      {generating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{trIg('generating')}</>) : trIg('generateButton')}
                    </Button>
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
                          <Button variant="outline" className="w-full" onClick={() => { const a = document.createElement('a'); a.href = generatedImage!; a.download = `${artistName}-${trackTitle}-${instagramFormat}.jpg`; a.target = '_blank'; a.click(); }}>
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

        {/* YouTube */}
        <TabsContent value="youtube" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{trYt('title')}</CardTitle>
                <CardDescription>{trYt('subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{trYt('videoTitle')}</Label>
                  <Input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder={trYt('videoTitlePlaceholder')} />
                </div>

                <div className="space-y-2">
                  <Label>{trYt('visualStyle')}</Label>
                  <Select value={visualStyle} onValueChange={setVisualStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimalist">{trYt('styleMinimalist')}</SelectItem>
                      <SelectItem value="vibrant">{trYt('styleVibrant')}</SelectItem>
                      <SelectItem value="clickbait">{trYt('styleClickbait')}</SelectItem>
                      <SelectItem value="professional">{trYt('styleProfessional')}</SelectItem>
                      <SelectItem value="retro">{trYt('styleRetro')}</SelectItem>
                      <SelectItem value="neon">{trYt('styleNeon')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{trYt('thumbnailDescription')}</Label>
                  <Textarea value={imageDescription} onChange={(e) => setImageDescription(e.target.value)} placeholder={trYt('thumbnailDescriptionPlaceholder')} rows={3} />
                </div>

                {photoUploadBlock(
                  'promoMaterial.creatives.youtube.basePhoto',
                  'promoMaterial.creatives.youtube.basePhotoDesc',
                  'promoMaterial.creatives.youtube.changePhoto',
                  'promoMaterial.creatives.youtube.uploadPhoto'
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox id="includeText" checked={includeText} onCheckedChange={(c) => setIncludeText(c as boolean)} />
                  <Label htmlFor="includeText" className="cursor-pointer">{trYt('includeText')}</Label>
                </div>

                {includeText && (
                  <div className="space-y-2">
                    <Label>{trYt('textToHighlight')}</Label>
                    <Input value={highlightText} onChange={(e) => setHighlightText(e.target.value.slice(0, 20))} placeholder={trYt('textPlaceholder')} maxLength={20} />
                    <p className="text-xs text-muted-foreground">{trYt('textHelper')} ({highlightText.length}/20)</p>
                  </div>
                )}

                <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
                  {generating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{trYt('generating')}</>) : trYt('generateButton')}
                </Button>
              </CardContent>
            </Card>

            {/* YouTube Results */}
            <div className="space-y-4">
              {generatedImage && platform === 'youtube' ? (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{trYt('resultTitle')}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <img src={generatedImage} alt="YouTube Thumbnail" className="w-full rounded-lg aspect-video object-cover" />
                    <Button className="w-full" onClick={() => { const a = document.createElement('a'); a.href = generatedImage!; a.download = `${videoTitle}-thumbnail.jpg`; a.target = '_blank'; a.click(); }}>
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
