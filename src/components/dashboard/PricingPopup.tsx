import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Crown, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface OperationRow {
  operation_key: string;
  operation_name: string;
  operation_icon: string | null;
  credits_cost: number;
  euro_cost: number | null;
  category: string;
  is_annual_only: boolean | null;
  display_order: number;
  description: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  gratis: '🆓 Gratis',
  registro: '🛡️ Registro',
  distribucion: '🌍 Distribución',
  audio: '🎧 Audio',
  musica: '🎵 Creación musical',
  promo: '📣 Material promocional',
};

const CATEGORY_ORDER = ['gratis', 'distribucion', 'registro', 'promo', 'musica', 'audio'];


export function PricingPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<OperationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('operation_pricing')
      .select('operation_key, operation_name, operation_icon, credits_cost, euro_cost, category, is_annual_only, display_order, description')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        setRows((data as OperationRow[]) ?? []);
        setLoading(false);
      });
  }, [open]);

  // Group by category
  const grouped = CATEGORY_ORDER
    .map(cat => ({
      cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      items: rows.filter(r => r.category === cat),
    }))
    .filter(g => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t('creditPricing.title', 'Precios por operación')}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[420px] pr-3">
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-4">
                {grouped.map(({ cat, label, items }) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                      {label}
                    </p>
                    <div className="divide-y divide-border/40">
                      {items.map((row) => {
                        const desc = row.description;
                        return (
                          <div key={row.operation_key} className="flex items-center justify-between py-2 px-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{row.operation_icon ?? '•'}</span>
                              <span className="text-sm truncate">{row.operation_name}</span>
                              {desc && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                                    {desc}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {row.is_annual_only && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 border-primary/40 text-primary">
                                  <Crown className="h-3 w-3 mr-0.5" />
                                  Anual
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm font-semibold tabular-nums whitespace-nowrap ml-3 shrink-0">
                              {row.credits_cost === 0
                                ? t('creditPricing.free', 'Gratis')
                                : `${row.credits_cost} ${row.credits_cost === 1 ? t('creditPricing.credit', 'crédito') : t('creditPricing.credits', 'créditos')}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}
        </ScrollArea>
        <p className="text-[11px] text-muted-foreground text-center pt-2">
          {t('creditPricing.footer', 'Los precios pueden variar. Consulta condiciones.')}
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
        {t('creditPricing.viewPrices', 'Ver precios')}
      </button>
      <PricingPopup open={open} onOpenChange={setOpen} />
    </>
  );
}
