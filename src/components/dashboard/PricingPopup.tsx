import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { Shield, Sparkles, Edit3, Music, Image, Video, Mic, Crown, Megaphone, Coins, Instagram, Youtube, LayoutGrid, Share2, Languages } from 'lucide-react';

const PRICING_ROWS = [
  { key: 'register_work', icon: Shield },
  { key: 'promote_work', icon: Megaphone },
  { key: 'promote_premium', icon: Crown },
  { key: 'generate_audio', icon: Music },
  { key: 'generate_audio_song', icon: Mic },
  { key: 'edit_audio', icon: Edit3 },
  { key: 'enhance_audio', icon: Sparkles },
  { key: 'generate_cover', icon: Image },
  { key: 'generate_video', icon: Video },
  { key: 'instagram_creative', icon: Instagram },
  { key: 'youtube_thumbnail', icon: Youtube },
  { key: 'event_poster', icon: LayoutGrid },
  { key: 'social_poster', icon: Share2 },
  { key: 'social_video', icon: Video },
  { key: 'voice_translation_per_min', icon: Languages },
] as const;

export function PricingPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t('creditPricing.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border/40">
          {[...PRICING_ROWS]
            .sort((a, b) => (FEATURE_COSTS[a.key as keyof typeof FEATURE_COSTS] ?? 0) - (FEATURE_COSTS[b.key as keyof typeof FEATURE_COSTS] ?? 0))
            .map(({ key, icon: Icon }) => {
            const cost = FEATURE_COSTS[key as keyof typeof FEATURE_COSTS];
            return (
              <div key={key} className="flex items-center justify-between py-2.5 px-1">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t(`creditPricing.features.${key}`)}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {cost} {cost === 1 ? t('creditPricing.credit') : t('creditPricing.credits')}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {t('creditPricing.footer')}
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Small link that opens pricing popup inline */
export function PricingLink({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors ${className ?? ''}`}
      >
        {t('creditPricing.viewPrices')}
      </button>
      <PricingPopup open={open} onOpenChange={setOpen} />
    </>
  );
}
