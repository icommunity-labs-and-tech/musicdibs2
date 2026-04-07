import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface HistoricalDataNoticeProps {
  compact?: boolean;
  collapsible?: boolean;
  storageKey?: string;
}

function getInitialOpen(storageKey?: string): boolean {
  if (!storageKey) return true;
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export default function HistoricalDataNotice({
  compact = false,
  collapsible = true,
  storageKey,
}: HistoricalDataNoticeProps) {
  const [open, setOpen] = useState(() => getInitialOpen(storageKey));

  const handleToggle = (value: boolean) => {
    setOpen(value);
    if (storageKey) {
      try { localStorage.setItem(storageKey, String(value)); } catch {}
    }
  };

  const body = (
    <div className={`text-sm text-muted-foreground leading-relaxed space-y-2 ${compact ? 'text-xs' : ''}`}>
      <p>
        Las métricas basadas en <span className="font-medium text-foreground">orders</span> son completas y fiables desde la implantación del nuevo sistema de tracking.
      </p>
      <p>
        El histórico anterior puede haberse reconstruido parcialmente mediante backfill desde Stripe, pero muchas compras antiguas no disponen de atribución fiable de campaña ni de UTMs.
      </p>
      <p>
        Las compras históricas sin trazabilidad suficiente se muestran como <span className="font-medium text-foreground">"Sin atribución"</span>.
      </p>
      <p>
        Por ello, las métricas históricas de revenue y ventas pueden ser razonablemente completas, mientras que las métricas históricas de campaña (ROI, CAC y atribución) deben interpretarse como <span className="font-medium text-foreground">parciales</span>.
      </p>
    </div>
  );

  if (!collapsible) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold">Calidad de los datos históricos</h3>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={handleToggle}>
      <div className="rounded-lg border border-border/40 bg-muted/30">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold">Calidad de los datos históricos</h3>
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            {body}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/** Normalizes raw attribution values to user-friendly labels */
export function normalizeAttribution(value: string | null | undefined): string {
  if (!value || value === 'unattributed' || value === 'null' || value.trim() === '') {
    return 'Sin atribución';
  }
  return value;
}
