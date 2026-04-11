import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useCredits } from '@/hooks/useCredits';
import { useProductTracking } from '@/hooks/useProductTracking';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { FileDropzone } from '@/components/FileDropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, Info, AlertCircle, Film, Clock, Instagram } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const VIDEO_COST = FEATURE_COSTS.social_video;

type VideoFormat = 'story' | 'youtube';

const FORMAT_CONFIG: Record<VideoFormat, { aspectRatio: string; label: string; playerClass: string }> = {
  story: { aspectRatio: '9:16', label: 'Instagram Stories/Reels (9:16)', playerClass: 'max-h-[70vh] aspect-[9/16] mx-auto' },
  youtube: { aspectRatio: '16:9', label: 'YouTube (16:9)', playerClass: 'w-full aspect-video' },
};

export const SocialVideosSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { credits, hasEnough } = useCredits();
  const { track } = useProductTracking();
  const tr = (key: string, opts?: any) => t(`promoMaterial.videos.${key}`, opts) as string;

  const [format, setFormat] = useState<VideoFormat>('story');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<'queued' | 'processing' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  // Prompt beforeunload while generating
  useEffect(() => {
    if (!generating) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [generating]);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const getProgressMessage = (count: number) => {
    if (count < 6) return tr('progress.phase1');
    if (count < 12) return tr('progress.phase2');
    return tr('progress.phase3');
  };

  const handleGenerate = async () => {
    if (!description.trim() || !user) return;

    if (!hasEnough(VIDEO_COST)) {
      toast({
        title: tr('insufficientCredits'),
        description: tr('insufficientCreditsDesc', { current: credits }),
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setVideoUrl(null);
    setProgressStatus('queued');
    setQueuePosition(null);
    setPollCount(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      };
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`;

      let imageBase64: string | undefined;
      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
      }

      const config = FORMAT_CONFIG[format];

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'generate',
          promptText: description,
          duration: 10,
          aspectRatio: config.aspectRatio,
          imageBase64,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: tr('error'), description: data.error || data.message || tr('errorDesc'), variant: 'destructive' });
        setGenerating(false);
        setProgressStatus(null);
        return;
      }

      const reqId = data.requestId;
      const statusUrl = data.statusUrl;
      const provider = data.provider || 'fal';
      setActiveProvider(provider);
      if (!reqId) {
        toast({ title: tr('error'), description: tr('errorDesc'), variant: 'destructive' });
        setGenerating(false);
        setProgressStatus(null);
        return;
      }

      // Polling loop
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const statusRes = await fetch(baseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action: 'status', requestId: reqId, statusUrl, provider }),
          });
          const statusData = await statusRes.json();

          if (!statusRes.ok) {
            toast({ title: tr('error'), description: statusData.error || tr('errorDesc'), variant: 'destructive' });
            break;
          }

          if (statusData.queue_position != null) {
            setQueuePosition(statusData.queue_position);
            setProgressStatus('queued');
          } else {
            setProgressStatus('processing');
            setQueuePosition(null);
          }
          setPollCount(i + 1);

          if (statusData.status === 'SUCCEEDED' && statusData.video_url) {
            setVideoUrl(statusData.video_url);
            setProgressStatus(null);
            toast({ title: tr('success'), description: tr('successDesc') });
            track('social_video_generated', { feature: 'social_video' });
            break;
          }

          if (statusData.status === 'FAILED') {
            setProgressStatus(null);
            toast({ title: tr('error'), description: statusData.failure || tr('errorDesc'), variant: 'destructive' });
            break;
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }
    } catch (error) {
      console.error('Error generating video:', error);
      toast({ title: tr('error'), description: tr('errorDesc'), variant: 'destructive' });
    } finally {
      setGenerating(false);
      setProgressStatus(null);
      setQueuePosition(null);
    }
  };

  const config = FORMAT_CONFIG[format];

  const renderForm = () => (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Description */}
        <div className="space-y-2">
          <Label>{tr('descriptionLabel')} <span className="text-destructive">*</span></Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            placeholder={tr('descriptionPlaceholder')}
            rows={5}
            disabled={generating}
          />
          <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
        </div>

        {/* Image dropzone */}
        <FileDropzone
          label={tr('baseImageLabel')}
          description={tr('baseImageDesc')}
          onFileSelect={handleImageSelect}
          onRemove={handleImageRemove}
          currentFile={imageFile}
          preview={imagePreview}
          accept=".jpg,.jpeg,.png,.webp"
          maxSize={10}
          fileType="image"
          disabled={generating}
        />

        {/* Info card */}
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {tr('specInfo', { format: config.label })}
          </p>
        </div>

        {/* Warning */}
        <Alert className="border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">⚡ {tr('timeWarning')}</AlertTitle>
          <AlertDescription className="text-sm">{tr('timeWarningDesc')}</AlertDescription>
        </Alert>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !description.trim() || !hasEnough(VIDEO_COST)}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {tr('generatingBtn')}
            </>
          ) : (
            <>
              <Film className="w-4 h-4 mr-2" />
              {tr('generateBtn', { cost: VIDEO_COST })}
            </>
          )}
        </Button>

        {/* Progress indicator */}
        {generating && progressStatus && (
          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {progressStatus === 'queued' ? (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                  <span>
                    {queuePosition != null && queuePosition > 0
                      ? tr('progress.queuePosition', { position: queuePosition })
                      : tr('progress.queueWaiting')}
                  </span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>{getProgressMessage(pollCount)}</span>
                </>
              )}
            </div>
            <Progress
              value={
                progressStatus === 'queued'
                  ? Math.min(pollCount * 5, 30)
                  : Math.min(30 + pollCount * 3, 95)
              }
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              {progressStatus === 'queued' ? tr('progress.queueHint') : tr('progress.processingHint')}
            </p>
          </div>
        )}

        {!hasEnough(VIDEO_COST) && !generating && (
          <PricingLink className="block text-center mt-1" />
        )}

        {/* Video result */}
        {videoUrl && (
          <div className="space-y-4 pt-2">
            <div className={`bg-black rounded-lg overflow-hidden ${config.playerClass}`}>
              <video src={videoUrl} controls className="w-full h-full object-contain" />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border border-border/40 rounded-lg p-3">
              <div><span className="font-medium text-foreground">{tr('metaFormat')}:</span> {config.label}</div>
              <div><span className="font-medium text-foreground">{tr('metaDuration')}:</span> 10 {tr('metaSeconds')}</div>
              <div><span className="font-medium text-foreground">{tr('metaResolution')}:</span> 1080p Full HD</div>
              <div><span className="font-medium text-foreground">{tr('metaAudio')}:</span> ✅ {tr('metaAudioNative')}</div>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="default" className="flex-1">
                <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  {tr('downloadVideo')}
                </a>
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setVideoUrl(null); setDescription(''); handleImageRemove(); }}
                className="flex-1"
              >
                {tr('regenerate', { cost: VIDEO_COST })}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('description')}</p>
      </div>

      <Tabs value={format} onValueChange={(v) => setFormat(v as VideoFormat)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="story" className="gap-1.5 text-xs sm:text-sm" disabled={generating}>
            <Instagram className="w-4 h-4" />
            <span className="hidden sm:inline">{tr('tabStory')}</span>
            <span className="sm:hidden">IG</span>
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5 text-xs sm:text-sm" disabled={generating}>
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline">{tr('tabYoutube')}</span>
            <span className="sm:hidden">YT</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="story">{renderForm()}</TabsContent>
        <TabsContent value="youtube">{renderForm()}</TabsContent>
      </Tabs>
    </div>
  );
};
