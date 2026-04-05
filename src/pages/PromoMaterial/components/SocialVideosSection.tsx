import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useCredits } from '@/hooks/useCredits';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, Download, Info, AlertCircle, Video } from 'lucide-react';
const VIDEO_COST = FEATURE_COSTS.social_video;

export const SocialVideosSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { credits, hasEnough } = useCredits();
  const tr = (key: string, opts?: any) => t(`promoMaterial.videos.${key}`, opts) as string;

  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('10');
  const [style, setStyle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim() || !duration || !style || !user) return;

    if (!hasEnough(VIDEO_COST)) {
      toast({
        title: tr('insufficientCredits'),
        description: tr('insufficientCreditsDesc', { current: credits }),
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: description,
            duration: parseInt(duration),
            style,
            mode: 'social_clip',
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast({ title: tr('error'), description: data.error || tr('errorDesc'), variant: 'destructive' });
        return;
      }

      if (data.video_url) {
        setVideoUrl(data.video_url);
      }

      toast({ title: tr('success'), description: tr('successDesc') });
    } catch (error) {
      console.error('Error generating video:', error);
      toast({ title: tr('error'), description: tr('errorDesc'), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('description')}</p>
      </div>

      {/* Important notice */}
      <Alert className="border-amber-500/20 bg-amber-50 dark:bg-amber-500/5">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">{tr('important')}</AlertTitle>
        <AlertDescription className="text-sm">{tr('notMusicVideo')}</AlertDescription>
      </Alert>

      {/* Use cases */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">{tr('useCases')}</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{tr('useCase1')}</li>
            <li>{tr('useCase2')}</li>
            <li>{tr('useCase3')}</li>
            <li>{tr('useCase4')}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Generation form */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>{tr('descriptionLabel')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr('descriptionPlaceholder')}
              rows={4}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tr('durationLabel')}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{tr('duration5')}</SelectItem>
                  <SelectItem value="10">{tr('duration10')}</SelectItem>
                  <SelectItem value="15">{tr('duration15')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tr('styleLabel')}</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue placeholder={tr('stylePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">{tr('styleCinematic')}</SelectItem>
                  <SelectItem value="abstract">{tr('styleAbstract')}</SelectItem>
                  <SelectItem value="performance">{tr('stylePerformance')}</SelectItem>
                  <SelectItem value="animated">{tr('styleAnimated')}</SelectItem>
                  <SelectItem value="lofi">{tr('styleLofi')}</SelectItem>
                  <SelectItem value="nature">{tr('styleNature')}</SelectItem>
                  <SelectItem value="urban">{tr('styleUrban')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {tr('costInfo')}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !description.trim() || !style || !hasEnough(VIDEO_COST)}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {tr('generatingBtn')}
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                {tr('generateBtn')} ({VIDEO_COST} créditos)
              </>
            )}
          </Button>

          {videoUrl && (
            <div className="space-y-3">
              <video src={videoUrl} controls className="w-full rounded-lg max-h-80 bg-black" />
              <div className="flex gap-2">
                <Button asChild variant="default" className="flex-1">
                  <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    {tr('downloadVideo')}
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setVideoUrl(null); setDescription(''); setStyle(''); }}
                  className="flex-1"
                >
                  {tr('regenerate')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
