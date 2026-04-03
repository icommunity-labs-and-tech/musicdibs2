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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Copy, Check, Download } from 'lucide-react';

export const InstagramSection = () => {
  const { t } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.instagram.${key}`);
  const { toast } = useToast();

  const [format, setFormat] = useState<'feed' | 'story'>('feed');
  const [artistName, setArtistName] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [visualStyle, setVisualStyle] = useState('vibrant');
  const [imageDescription, setImageDescription] = useState('');
  const [basePhoto, setBasePhoto] = useState<File | null>(null);
  const [basePhotoPreview, setBasePhotoPreview] = useState<string | null>(null);
  const [copyTone, setCopyTone] = useState('exciting');
  const [cta, setCta] = useState('listen_now');

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
      toast({ title: 'Image too large', description: 'Max 10MB', variant: 'destructive' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Invalid format', description: 'JPG, PNG or WEBP only', variant: 'destructive' });
      return;
    }

    setBasePhoto(file);
    setBasePhotoPreview(URL.createObjectURL(file));
  };

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

  const handleGenerate = async () => {
    if (!artistName.trim() || !trackTitle.trim() || !imageDescription.trim()) {
      toast({
        title: tr('missingFields'),
        description: tr('missingFieldsDesc'),
        variant: 'destructive',
      });
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
      if (basePhoto) {
        basePhotoBase64 = await fileToBase64(basePhoto);
      }

      const response = await supabase.functions.invoke('generate-instagram-creative', {
        body: {
          artist_name: artistName,
          track_title: trackTitle,
          format,
          visual_style: visualStyle,
          image_description: imageDescription,
          base_photo_base64: basePhotoBase64,
          copy_tone: copyTone,
          cta,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error) {
        toast({
          title: tr('generationError'),
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      setGeneratedImage(data.image_url);
      setGeneratedCopy(data.copy || '');
      setGeneratedHashtags(data.hashtags || []);

      toast({ title: '✅ ' + tr('resultTitle') });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: tr('generationError'),
        description: tr('generationErrorDesc'),
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
    toast({ title: tr('copyCopied') });
  };

  const copyHashtagsText = () => {
    navigator.clipboard.writeText(generatedHashtags.map(h => `#${h}`).join(' '));
    setHashtagsCopied(true);
    setTimeout(() => setHashtagsCopied(false), 2000);
    toast({ title: tr('hashtagsCopied') });
  };

  const copyAllText = () => {
    const fullText = `${generatedCopy}\n\n${generatedHashtags.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
    toast({ title: tr('allCopied') });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('subtitle')}</p>
      </div>

      <Tabs value={format} onValueChange={setFormat}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="feed" className="text-xs sm:text-sm">
            📱 {tr('formatFeed')}
            <Badge variant="outline" className="ml-1 text-[10px]">1:1</Badge>
          </TabsTrigger>
          <TabsTrigger value="story" className="text-xs sm:text-sm">
            📲 {tr('formatStory')}
            <Badge variant="outline" className="ml-1 text-[10px]">9:16</Badge>
          </TabsTrigger>
          <TabsTrigger value="reel" className="text-xs sm:text-sm">
            🎬 {tr('formatReel')}
            <Badge variant="outline" className="ml-1 text-[10px]">9:16</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={format} className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{tr('formTitle')}</CardTitle>
                <CardDescription>{tr('formSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Artist & track */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr('artistName')}</Label>
                    <Input
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder={tr('artistNamePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr('trackTitle')}</Label>
                    <Input
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                      placeholder={tr('trackTitlePlaceholder')}
                    />
                  </div>
                </div>

                {/* Visual style */}
                <div className="space-y-2">
                  <Label>{tr('visualStyle')}</Label>
                  <Select value={visualStyle} onValueChange={setVisualStyle}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimalist">{tr('visualStyleMinimalist')}</SelectItem>
                      <SelectItem value="vibrant">{tr('visualStyleVibrant')}</SelectItem>
                      <SelectItem value="elegant">{tr('visualStyleElegant')}</SelectItem>
                      <SelectItem value="urban">{tr('visualStyleUrban')}</SelectItem>
                      <SelectItem value="retro">{tr('visualStyleRetro')}</SelectItem>
                      <SelectItem value="neon">{tr('visualStyleNeon')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Image description */}
                <div className="space-y-2">
                  <Label>{tr('imageDescription')}</Label>
                  <Textarea
                    value={imageDescription}
                    onChange={(e) => setImageDescription(e.target.value)}
                    placeholder={tr('imageDescriptionPlaceholder')}
                    rows={3}
                  />
                </div>

                {/* Base photo */}
                <div className="space-y-2">
                  <Label>{tr('basePhoto')}</Label>
                  <p className="text-xs text-muted-foreground">{tr('basePhotoDesc')}</p>
                  <div
                    onClick={() => basePhotoRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {basePhotoPreview ? (
                      <div className="space-y-2">
                        <img src={basePhotoPreview} alt="Base" className="max-h-32 mx-auto rounded" />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBasePhoto(null);
                            setBasePhotoPreview(null);
                            if (basePhotoRef.current) basePhotoRef.current.value = '';
                          }}
                        >
                          {tr('changePhoto')}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-sm text-muted-foreground">{tr('uploadPhoto')}</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={basePhotoRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>

                {/* Tone & CTA */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{tr('copyTone')}</Label>
                    <Select value={copyTone} onValueChange={setCopyTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exciting">{tr('toneExciting')}</SelectItem>
                        <SelectItem value="mysterious">{tr('toneMysterious')}</SelectItem>
                        <SelectItem value="fun">{tr('toneFun')}</SelectItem>
                        <SelectItem value="inspiring">{tr('toneInspiring')}</SelectItem>
                        <SelectItem value="casual">{tr('toneCasual')}</SelectItem>
                        <SelectItem value="professional">{tr('toneProfessional')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{tr('cta')}</Label>
                    <Select value={cta} onValueChange={setCta}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="listen_now">{tr('ctaListenNow')}</SelectItem>
                        <SelectItem value="out_now">{tr('ctaOutNow')}</SelectItem>
                        <SelectItem value="new_single">{tr('ctaNewSingle')}</SelectItem>
                        <SelectItem value="coming_soon">{tr('ctaComingSoon')}</SelectItem>
                        <SelectItem value="link_in_bio">{tr('ctaLinkInBio')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate */}
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {tr('generating')}
                    </>
                  ) : (
                    tr('generateButton')
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-4">
              {generatedImage ? (
                <>
                  {/* Image */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{tr('imageGenerated')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <img
                        src={generatedImage}
                        alt="Generated"
                        className={`w-full rounded-lg ${
                          format === 'feed' ? 'aspect-square object-cover' : 'aspect-[9/16] object-cover max-w-xs mx-auto'
                        }`}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = generatedImage;
                          link.download = `${artistName}-${trackTitle}-${format}.jpg`;
                          link.target = '_blank';
                          link.click();
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {tr('downloadImage')}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Copy */}
                  {generatedCopy && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{tr('copyTitle')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                          {generatedCopy}
                        </p>
                        <Button variant="outline" size="sm" className="w-full" onClick={copyCopyText}>
                          {copyCopied ? <><Check className="w-4 h-4 mr-1" />{tr('copyCopied')}</> : <><Copy className="w-4 h-4 mr-1" />{tr('copyCopy')}</>}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Hashtags */}
                  {generatedHashtags.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{tr('hashtagsTitle')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          {generatedHashtags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={copyHashtagsText}>
                          {hashtagsCopied ? <><Check className="w-4 h-4 mr-1" />{tr('hashtagsCopied')}</> : <><Copy className="w-4 h-4 mr-1" />{tr('copyHashtags')}</>}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Copy all */}
                  <Button variant="default" className="w-full" onClick={copyAllText}>
                    {allCopied ? <><Check className="w-4 h-4 mr-2" />{tr('allCopied')}</> : <>📋 {tr('copyAll')}</>}
                  </Button>
                </>
              ) : (
                <Card className="flex items-center justify-center min-h-[300px]">
                  <CardContent className="text-center text-muted-foreground">
                    <p className="text-sm">📸 {tr('formSubtitle')}</p>
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
