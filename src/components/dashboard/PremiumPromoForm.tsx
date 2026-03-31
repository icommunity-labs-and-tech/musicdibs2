import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Crown, Loader2, CheckCircle2, Sparkles, Video, Users, Clock,
  Instagram, Music, ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { toast } from 'sonner';

interface Work {
  id: string;
  title: string;
  author: string | null;
  type: string;
  source: 'registered' | 'ai_studio';
}

interface PremiumPromoFormProps {
  works: Work[];
  onBack: () => void;
}

const PREMIUM_COST = FEATURE_COSTS.promote_premium;

const PROMO_STYLES = [
  { value: 'cinematic', label: 'Cinemático' },
  { value: 'urban', label: 'Urbano / Street' },
  { value: 'minimal', label: 'Minimalista' },
  { value: 'colorful', label: 'Colorido / Vibrante' },
  { value: 'dark', label: 'Oscuro / Misterioso' },
  { value: 'retro', label: 'Retro / Vintage' },
  { value: 'futuristic', label: 'Futurista' },
  { value: 'other', label: 'Otro' },
];

export function PremiumPromoForm({ works, onBack }: PremiumPromoFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { credits, hasEnough } = useCredits();
  const navigate = useNavigate();
  const noCredits = !hasEnough(PREMIUM_COST);

  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [artistName, setArtistName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promoStyle, setPromoStyle] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [teamNotes, setTeamNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-fill when work is selected
  const handleWorkSelect = (workId: string) => {
    setSelectedWorkId(workId);
    const work = works.find(w => w.id === workId);
    if (work) {
      if (!songTitle) setSongTitle(work.title);
      if (!artistName && work.author) setArtistName(work.author);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedWorkId || !artistName.trim() || !songTitle.trim() || !description.trim()) {
      toast.error(t('dashboard.premium.fillRequired'));
      return;
    }

    setSubmitting(true);
    try {
      // Validate and spend credits
      const { data: spendData, error: spendError } = await supabase.functions.invoke('spend-credits', {
        body: { feature: 'promote_premium', description: `Promo Premium: ${songTitle.trim()}` },
      });
      if (spendError) throw new Error(spendError.message);
      if (spendData?.error === 'insufficient_credits') {
        toast.error(t('dashboard.premium.insufficientCredits'));
        setSubmitting(false);
        return;
      }
      if (spendData?.error) throw new Error(spendData.error);

      // Insert premium request via edge function
      const { data, error } = await supabase.functions.invoke('submit-premium-promo', {
        body: {
          work_id: selectedWorkId,
          artist_name: artistName.trim(),
          song_title: songTitle.trim(),
          description: description.trim(),
          promo_style: promoStyle || null,
          promo_message: promoMessage.trim() || null,
          external_link: externalLink.trim() || null,
          team_notes: teamNotes.trim() || null,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setShowSuccess(true);
      toast.success(t('dashboard.premium.requestSent'));
    } catch (err: any) {
      toast.error(err.message || t('dashboard.premium.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold">{t('dashboard.premium.successTitle')}</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t('dashboard.premium.successDesc')}
          </p>
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" /> {t('dashboard.premium.statusSubmitted')}
          </Badge>
          <Button variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('dashboard.premium.backToPromo')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            {t('dashboard.premium.formTitle')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 text-xs">
            <ArrowLeft className="h-3 w-3 mr-1" /> {t('dashboard.premium.back')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('dashboard.premium.formDesc')}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Info banner */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Crown className="h-4 w-4" /> {t('dashboard.premium.whatIncluded')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 text-amber-500/70" />
              {t('dashboard.premium.includesVideo')}
            </div>
            <div className="flex items-center gap-2">
              <Instagram className="h-3.5 w-3.5 text-amber-500/70" />
              {t('dashboard.premium.includesChannels')}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-amber-500/70" />
              {t('dashboard.premium.includesAudience')}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500/70" />
              {t('dashboard.premium.includesManual')}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            {t('dashboard.premium.manualNote')}
          </p>
        </div>

        {noCredits && <NoCreditsAlert message={t('dashboard.premium.insufficientCredits')} />}

        {/* Form fields */}
        <div className="space-y-4">
          {/* Work selector */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('dashboard.premium.selectWork')} *</Label>
            <Select value={selectedWorkId} onValueChange={handleWorkSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.premium.selectWorkPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {works.map(w => (
                  <SelectItem key={w.id} value={w.id}>
                    <div className="flex items-center gap-2">
                      <Music className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{w.title}</span>
                      {w.source === 'ai_studio' && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          <Sparkles className="h-2 w-2" /> AI
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Artist + Song title row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('dashboard.premium.artistName')} *</Label>
              <Input
                value={artistName}
                onChange={e => setArtistName(e.target.value)}
                placeholder={t('dashboard.premium.artistPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{t('dashboard.premium.songTitle')} *</Label>
              <Input
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                placeholder={t('dashboard.premium.songPlaceholder')}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('dashboard.premium.songDescription')} *</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('dashboard.premium.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Style */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('dashboard.premium.videoStyle')}</Label>
            <Select value={promoStyle} onValueChange={setPromoStyle}>
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.premium.stylePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {PROMO_STYLES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Promo message */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('dashboard.premium.promoMessage')}</Label>
            <Textarea
              value={promoMessage}
              onChange={e => setPromoMessage(e.target.value)}
              placeholder={t('dashboard.premium.messagePlaceholder')}
              rows={2}
            />
          </div>

          {/* External link */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('dashboard.premium.releaseLink')}</Label>
            <Input
              value={externalLink}
              onChange={e => setExternalLink(e.target.value)}
              placeholder="https://open.spotify.com/..."
              type="url"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t('dashboard.premium.notes')}</Label>
            <Textarea
              value={teamNotes}
              onChange={e => setTeamNotes(e.target.value)}
              placeholder={t('dashboard.premium.notesPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            {t('dashboard.premium.cost', { cost: PREMIUM_COST })}
            {credits !== null && <> · {t('dashboard.promote.availableCredits')} <span className="font-medium">{credits}</span></>}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={submitting || noCredits || !selectedWorkId || !artistName.trim() || !songTitle.trim() || !description.trim()}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            {t('dashboard.premium.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
