import { useState, useRef } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Download, Sparkles } from 'lucide-react';
import { PricingLink } from '@/components/dashboard/PricingPopup';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const validateFile = (file: File, toast: any, trKey: (k: string) => string) => {
  if (file.size > 10 * 1024 * 1024) {
    toast({ title: trKey('fileTooBig'), description: trKey('fileTooBigDesc'), variant: 'destructive' as const });
    return false;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast({ title: trKey('invalidFileFormat'), description: trKey('invalidFileFormatDesc'), variant: 'destructive' as const });
    return false;
  }
  return true;
};

export const PostersSection = () => {
  const { t } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.posters.${key}`);
  const trEv = (key: string) => t(`promoMaterial.posters.events.${key}`);
  const trSo = (key: string) => t(`promoMaterial.posters.social.${key}`);
  const { toast } = useToast();

  const [category, setCategory] = useState<'events' | 'social'>('events');

  // Events state
  const [evFormat, setEvFormat] = useState<'flyer' | 'poster' | 'poster_large'>('flyer');
  const [evArtistName, setEvArtistName] = useState('');
  const [evEventTitle, setEvEventTitle] = useState('');
  const [evEventDate, setEvEventDate] = useState('');
  const [evVenue, setEvVenue] = useState('');
  const [evTime, setEvTime] = useState('');
  const [evStyle, setEvStyle] = useState('vibrant');
  const [evAdditionalInfo, setEvAdditionalInfo] = useState('');
  const [evLogo, setEvLogo] = useState<File | null>(null);
  const [evLogoPreview, setEvLogoPreview] = useState<string | null>(null);
  const [evPhoto, setEvPhoto] = useState<File | null>(null);
  const [evPhotoPreview, setEvPhotoPreview] = useState<string | null>(null);

  // Social state
  const [soFormat, setSoFormat] = useState<'facebook' | 'twitter'>('facebook');
  const [soArtistName, setSoArtistName] = useState('');
  const [soEventTitle, setSoEventTitle] = useState('');
  const [soEventDate, setSoEventDate] = useState('');
  const [soStyle, setSoStyle] = useState('vibrant');
  const [soDescription, setSoDescription] = useState('');
  const [soPhoto, setSoPhoto] = useState<File | null>(null);
  const [soPhotoPreview, setSoPhotoPreview] = useState<string | null>(null);

  // Common
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [improvingEvPrompt, setImprovingEvPrompt] = useState(false);
  const [improvingSoPrompt, setImprovingSoPrompt] = useState(false);

  const handleImprovePrompt = async (
    text: string,
    setText: (v: string) => void,
    setLoading: (v: boolean) => void,
    photo?: File | null,
  ) => {
    if (!text.trim() && !photo) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const body: any = { prompt: text, mode: 'visual_creative' };
      if (photo) body.image_base64 = await fileToBase64(photo);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/improve-prompt`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data?.improved) setText(data.improved);
    } catch (e) {
      console.error('Error improving prompt:', e);
    } finally {
      setLoading(false);
    }
  };

  const evLogoRef = useRef<HTMLInputElement>(null);
  const evPhotoRef = useRef<HTMLInputElement>(null);
  const soPhotoRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void,
    trKey: (k: string) => string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFile(file, toast, trKey)) return;
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleGenerateEvents = async () => {
    if (!evArtistName.trim() || !evEventTitle.trim() || !evEventDate.trim() || !evVenue.trim()) {
      toast({ title: trEv('missingFields'), description: trEv('missingFieldsDesc'), variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const payload: any = {
        artist_name: evArtistName,
        event_title: evEventTitle,
        event_date: evEventDate,
        venue: evVenue,
        time: evTime || undefined,
        format: evFormat,
        visual_style: evStyle,
        additional_info: evAdditionalInfo || undefined,
      };

      if (evLogo) payload.logo_base64 = await fileToBase64(evLogo);
      if (evPhoto) payload.photo_base64 = await fileToBase64(evPhoto);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-event-poster`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast({ title: trEv('generationError'), description: data.error || trEv('generationErrorDesc'), variant: 'destructive' });
        return;
      }

      const { data: urlData } = await supabase.storage
        .from('event-posters')
        .createSignedUrl(data.image_path, 3600);

      setGeneratedImage(urlData?.signedUrl || null);
      toast({ title: '✅ ' + trEv('resultTitle') });
    } catch {
      toast({ title: trEv('generationError'), description: trEv('generationErrorDesc'), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSocial = async () => {
    if (!soArtistName.trim() || !soEventTitle.trim() || !soDescription.trim()) {
      toast({ title: trSo('missingFields'), description: trSo('missingFieldsDesc'), variant: 'destructive' });
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const payload: any = {
        artist_name: soArtistName,
        event_title: soEventTitle,
        event_date: soEventDate,
        format: soFormat,
        visual_style: soStyle,
        description: soDescription,
      };

      if (soPhoto) payload.photo_base64 = await fileToBase64(soPhoto);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-social-poster`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast({ title: trSo('generationError'), description: data.error || trSo('generationErrorDesc'), variant: 'destructive' });
        return;
      }

      const { data: urlData } = await supabase.storage
        .from('social-posters')
        .createSignedUrl(data.image_path, 3600);

      setGeneratedImage(urlData?.signedUrl || null);
      toast({ title: '✅ ' + trSo('resultTitle') });
    } catch {
      toast({ title: trSo('generationError'), description: trSo('generationErrorDesc'), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const FileUploadBox = ({
    preview,
    onClear,
    onClick,
    uploadLabel,
    changeLabel,
  }: {
    preview: string | null;
    onClear: () => void;
    onClick: () => void;
    uploadLabel: string;
    changeLabel: string;
  }) => (
    <div
      onClick={onClick}
      className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
    >
      {preview ? (
        <div className="space-y-2">
          <img src={preview} alt="Preview" className="w-20 h-20 mx-auto rounded-lg object-cover" />
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            {changeLabel}
          </Button>
        </div>
      ) : (
        <>
          <Upload className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">{uploadLabel}</p>
        </>
      )}
    </div>
  );

  const StyleSelect = ({
    value,
    onChange,
    trKey,
  }: {
    value: string;
    onChange: (v: string) => void;
    trKey: (k: string) => string;
  }) => (
    <div className="space-y-2">
      <Label>{trKey('visualStyle')}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="minimalist">{trKey('styleMinimalist')}</SelectItem>
          <SelectItem value="vibrant">{trKey('styleVibrant')}</SelectItem>
          <SelectItem value="rock">{trKey('styleRock')}</SelectItem>
          <SelectItem value="electronic">{trKey('styleElectronic')}</SelectItem>
          <SelectItem value="jazz">{trKey('styleJazz')}</SelectItem>
          <SelectItem value="retro">{trKey('styleRetro')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('subtitle')}</p>
      </div>

      <Tabs value={category} onValueChange={(v) => { setCategory(v as typeof category); setGeneratedImage(null); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="events">🎤 {tr('categoryEvents')}</TabsTrigger>
          <TabsTrigger value="social">📱 {tr('categorySocial')}</TabsTrigger>
        </TabsList>

        {/* === EVENTS === */}
        <TabsContent value="events" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">{trEv('title')}</h3>
            <p className="text-sm text-muted-foreground">{trEv('subtitle')}</p>
          </div>

          <Tabs value={evFormat} onValueChange={(v) => setEvFormat(v as typeof evFormat)}>
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="flyer">
                {trEv('formatFlyer')}
                <span className="ml-1 text-xs text-muted-foreground">A5</span>
              </TabsTrigger>
              <TabsTrigger value="poster">
                {trEv('formatPoster')}
                <span className="ml-1 text-xs text-muted-foreground">A4</span>
              </TabsTrigger>
              <TabsTrigger value="poster_large">
                {trEv('formatPosterLarge')}
                <span className="ml-1 text-xs text-muted-foreground">A3</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={evFormat}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{trEv('title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{trEv('artistName')}</Label>
                      <Input value={evArtistName} onChange={(e) => setEvArtistName(e.target.value)} placeholder={trEv('artistNamePlaceholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{trEv('eventTitle')}</Label>
                      <Input value={evEventTitle} onChange={(e) => setEvEventTitle(e.target.value)} placeholder={trEv('eventTitlePlaceholder')} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{trEv('eventDate')}</Label>
                      <Input value={evEventDate} onChange={(e) => setEvEventDate(e.target.value)} placeholder={trEv('eventDatePlaceholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{trEv('venue')}</Label>
                      <Input value={evVenue} onChange={(e) => setEvVenue(e.target.value)} placeholder={trEv('venuePlaceholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{trEv('time')}</Label>
                      <Input value={evTime} onChange={(e) => setEvTime(e.target.value)} placeholder={trEv('timePlaceholder')} />
                    </div>
                  </div>

                  <StyleSelect value={evStyle} onChange={setEvStyle} trKey={trEv} />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{trEv('additionalInfo')}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={(!evAdditionalInfo.trim() && !evPhoto) || improvingEvPrompt}
                        onClick={() => handleImprovePrompt(evAdditionalInfo, setEvAdditionalInfo, setImprovingEvPrompt, evPhoto)}
                        className="h-7 text-xs gap-1"
                      >
                        {improvingEvPrompt ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {t('promoMaterial.creatives.improveWithAI')}
                      </Button>
                    </div>
                    <Textarea value={evAdditionalInfo} onChange={(e) => setEvAdditionalInfo(e.target.value)} placeholder={trEv('additionalInfoPlaceholder')} rows={2} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FileDropzone
                        label={trEv('artistLogo')}
                        description={trEv('artistLogoDesc')}
                        fileType="image"
                        accept="image/jpeg,image/png,image/webp"
                        maxSize={10}
                        currentFile={evLogo}
                        preview={evLogoPreview}
                        onFileSelect={(f) => { if (validateFile(f, toast, trEv)) { setEvLogo(f); setEvLogoPreview(URL.createObjectURL(f)); } }}
                        onRemove={() => { setEvLogo(null); setEvLogoPreview(null); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <FileDropzone
                        label={trEv('artistPhoto')}
                        description={trEv('artistPhotoDesc')}
                        fileType="image"
                        accept="image/jpeg,image/png,image/webp"
                        maxSize={10}
                        currentFile={evPhoto}
                        preview={evPhotoPreview}
                        onFileSelect={(f) => { if (validateFile(f, toast, trEv)) { setEvPhoto(f); setEvPhotoPreview(URL.createObjectURL(f)); } }}
                        onRemove={() => { setEvPhoto(null); setEvPhotoPreview(null); }}
                      />
                    </div>
                  </div>

                  <Button className="w-full" size="lg" disabled={generating} onClick={handleGenerateEvents}>
                    {generating ? (<><Loader2 className="w-4 h-4 animate-spin" />{trEv('generating')}</>) : trEv('generateButton')}
                  </Button>
                  <PricingLink className="block text-center mt-1" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* === SOCIAL === */}
        <TabsContent value="social" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">{trSo('title')}</h3>
            <p className="text-sm text-muted-foreground">{trSo('subtitle')}</p>
          </div>

          <Tabs value={soFormat} onValueChange={(v) => setSoFormat(v as typeof soFormat)}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="facebook">
                {trSo('formatFacebook')}
                <span className="ml-1 text-xs text-muted-foreground">1200×628</span>
              </TabsTrigger>
              <TabsTrigger value="twitter">
                {trSo('formatTwitter')}
                <span className="ml-1 text-xs text-muted-foreground">1500×500</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={soFormat}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{trSo('title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{trSo('artistName')}</Label>
                      <Input value={soArtistName} onChange={(e) => setSoArtistName(e.target.value)} placeholder={trSo('artistNamePlaceholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{trSo('eventTitle')}</Label>
                      <Input value={soEventTitle} onChange={(e) => setSoEventTitle(e.target.value)} placeholder={trSo('eventTitlePlaceholder')} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{trSo('eventDate')}</Label>
                    <Input value={soEventDate} onChange={(e) => setSoEventDate(e.target.value)} placeholder={trSo('eventDatePlaceholder')} />
                  </div>

                  <StyleSelect value={soStyle} onChange={setSoStyle} trKey={trSo} />

                  <div className="space-y-2">
                    <Label>{trSo('description')}</Label>
                    <Textarea value={soDescription} onChange={(e) => setSoDescription(e.target.value)} placeholder={trSo('descriptionPlaceholder')} rows={3} />
                  </div>

                  <FileDropzone
                    label={trSo('artistPhoto')}
                    description={trSo('artistPhotoDesc')}
                    fileType="image"
                    accept="image/jpeg,image/png,image/webp"
                    maxSize={10}
                    currentFile={soPhoto}
                    preview={soPhotoPreview}
                    onFileSelect={(f) => { if (validateFile(f, toast, trSo)) { setSoPhoto(f); setSoPhotoPreview(URL.createObjectURL(f)); } }}
                    onRemove={() => { setSoPhoto(null); setSoPhotoPreview(null); }}
                  />

                  <Button className="w-full" size="lg" disabled={generating} onClick={handleGenerateSocial}>
                    {generating ? (<><Loader2 className="w-4 h-4 animate-spin" />{trSo('generating')}</>) : trSo('generateButton')}
                  </Button>
                  <PricingLink className="block text-center mt-1" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Result */}
      {generatedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {category === 'events' ? trEv('resultTitle') : trSo('resultTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <img
              src={generatedImage}
              alt="Generated poster"
              className="w-full max-w-lg mx-auto rounded-lg"
            />
            <Button
              className="w-full max-w-lg mx-auto"
              onClick={() => {
                const link = document.createElement('a');
                link.href = generatedImage;
                const name = category === 'events' ? `${evArtistName}-${evEventTitle}` : `${soArtistName}-${soEventTitle}`;
                link.download = `${name}-poster.jpg`;
                link.click();
              }}
            >
              <Download className="w-4 h-4" />
              {category === 'events' ? trEv('downloadPoster') : trSo('downloadImage')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
