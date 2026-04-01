import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { Coins, Shield, Sparkles, Edit3, Music, Image, Video, Mic, Crown, Megaphone } from 'lucide-react';

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
] as const;

export function PricingPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t('pricing.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border/40">
          {PRICING_ROWS.map(({ key, icon: Icon }) => {
            const cost = FEATURE_COSTS[key as keyof typeof FEATURE_COSTS];
            return (
              <div key={key} className="flex items-center justify-between py-2.5 px-1">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t(`pricing.features.${key}`)}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {cost} {cost === 1 ? t('pricing.credit') : t('pricing.credits')}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {t('pricing.footer')}
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
        {t('pricing.viewPrices')}
      </button>
      <PricingPopup open={open} onOpenChange={setOpen} />
    </>
  );
}
