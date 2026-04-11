import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, Loader2 } from 'lucide-react';

interface TimelineItem {
  type: 'order' | 'evidence' | 'usage';
  date: string;
  data: any;
}

const EVENT_ICONS: Record<string, string> = {
  login_after_purchase: '🔑',
  dashboard_access: '🏠',
  ai_song_generated: '🎵',
  credits_used: '⚡',
  download_attempt: '⬇️',
  distribution_started: '🚀',
  promotion_created: '📢',
};

const EVENT_LABELS: Record<string, string> = {
  login_after_purchase: 'Login post-compra',
  dashboard_access: 'Acceso al dashboard',
  ai_song_generated: 'Canción IA generada',
  credits_used: 'Créditos utilizados',
  download_attempt: 'Intento de descarga',
  distribution_started: 'Distribución iniciada',
  promotion_created: 'Promoción creada',
};

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-green-500/20 text-green-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-destructive/20 text-destructive',
    refunded: 'bg-yellow-500/20 text-yellow-400',
  };
  return <Badge className={map[status] || 'bg-muted text-muted-foreground'}>{status}</Badge>;
}

function CertBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    certified: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    failed: 'bg-destructive/20 text-destructive',
  };
  return <Badge className={map[status] || 'bg-muted text-muted-foreground'}>{status}</Badge>;
}

export default function DisputeTimeline({ userId }: { userId: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [ordersRes, evidencesRes, usageRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, product_label, product_type, product_code, amount_gross, currency, order_status, paid_at, stripe_checkout_session_id, stripe_payment_intent_id')
          .eq('user_id', userId)
          .order('paid_at', { ascending: false }),
        supabase
          .from('purchase_evidences')
          .select('id, product_name, amount, currency, certification_status, ibs_transaction_id, certificate_pdf_url, created_at, payment_intent_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('purchase_usage_evidences')
          .select('id, event_type, event_timestamp, certification_status, ibs_transaction_id, ip_address')
          .eq('user_id', userId)
          .order('event_timestamp', { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;

      const all: TimelineItem[] = [];
      (ordersRes.data || []).forEach(o => all.push({ type: 'order', date: o.paid_at, data: o }));
      (evidencesRes.data || []).forEach(e => all.push({ type: 'evidence', date: e.created_at, data: e }));
      (usageRes.data || []).forEach(u => all.push({ type: 'usage', date: u.event_timestamp, data: u }));

      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(all);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  function exportTimeline() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_${userId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando timeline…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Timeline probatorio
        </h3>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={exportTimeline}>
            <Download className="h-3 w-3" /> Exportar JSON
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Sin actividad registrada para este usuario.
        </p>
      ) : (
        <div className="relative border-l-2 border-border/50 ml-3 space-y-4">
          {items.map((item, i) => (
            <div key={`${item.type}-${item.data.id}-${i}`} className="relative pl-6">
              {/* dot */}
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-border flex items-center justify-center text-[10px]">
                {item.type === 'order' && '💳'}
                {item.type === 'evidence' && '🔐'}
                {item.type === 'usage' && (EVENT_ICONS[item.data.event_type] || '📌')}
              </span>

              {item.type === 'order' && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {item.data.product_label || item.data.product_code || item.data.product_type}
                    {' — '}€{Number(item.data.amount_gross).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <OrderStatusBadge status={item.data.order_status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleString()}
                  </p>
                  {item.data.stripe_payment_intent_id && (
                    <p className="text-[10px] text-muted-foreground/60 font-mono break-all">
                      PI: {item.data.stripe_payment_intent_id}
                    </p>
                  )}
                </div>
              )}

              {item.type === 'evidence' && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Evidencia certificada — {item.data.product_name || '—'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CertBadge status={item.data.certification_status} />
                    {item.data.certification_status === 'certified' && item.data.ibs_transaction_id && (
                      <a
                        href={`https://checker.icommunitylabs.com/check/opera/${item.data.ibs_transaction_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Ver en checker <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {item.data.certificate_pdf_url && (
                      <a
                        href={item.data.certificate_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" /> PDF
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleString()}
                  </p>
                </div>
              )}

              {item.type === 'usage' && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {EVENT_LABELS[item.data.event_type] || item.data.event_type}
                    {item.data.ip_address && (
                      <span className="text-muted-foreground font-normal"> — {item.data.ip_address}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <CertBadge status={item.data.certification_status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
