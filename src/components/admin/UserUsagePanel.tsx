import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Eye, Copy, Activity, ShieldCheck, AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserUsagePanelProps {
  userId: string;
}

const EVENT_LABELS: Record<string, string> = {
  login_after_purchase: 'Login tras compra',
  dashboard_access: 'Acceso al dashboard',
  ai_song_generated: 'Generación IA',
  credits_used: 'Uso de créditos',
  asset_created: 'Asset creado',
  download_attempt: 'Descarga',
  distribution_started: 'Distribución iniciada',
  promotion_created: 'Promoción creada',
};

export default function UserUsagePanel({ userId }: UserUsagePanelProps) {
  const [evidences, setEvidences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_usage_evidences')
      .select('*')
      .eq('user_id', userId)
      .order('event_timestamp', { ascending: false });

    if (error) console.error('Error loading usage evidences:', error);
    else setEvidences(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const handleRetry = async (usageEvidenceId: string) => {
    try {
      const { error } = await supabase.functions.invoke('certify-usage', {
        body: { usage_evidence_id: usageEvidenceId },
      });
      if (error) throw error;
      toast.success('Certificación de uso reenviada');
      setTimeout(load, 3000);
    } catch (e: any) {
      toast.error('Error al reintentar: ' + e.message);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { className: string; icon: any }> = {
      certified: { className: 'bg-green-500/20 text-green-400', icon: ShieldCheck },
      pending: { className: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
      failed: { className: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
    };
    const cfg = map[status] || map.pending;
    const Icon = cfg.icon;
    return (
      <Badge className={cfg.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando evidencias de uso...</p>;
  }

  if (evidences.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/10 p-6 text-center">
        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sin evidencias de uso registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Uso tras compra ({evidences.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Actualizar
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Evento</TableHead>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">IP</TableHead>
              <TableHead className="text-xs">Certificación</TableHead>
              <TableHead className="text-xs">iBS tx</TableHead>
              <TableHead className="text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evidences.map(ev => (
              <TableRow key={ev.id}>
                <TableCell className="text-xs font-medium">
                  {EVENT_LABELS[ev.event_type] || ev.event_type}
                </TableCell>
                <TableCell className="text-xs">{new Date(ev.event_timestamp).toLocaleString()}</TableCell>
                <TableCell className="text-xs font-mono">{ev.ip_address || '—'}</TableCell>
                <TableCell>{statusBadge(ev.certification_status)}</TableCell>
                <TableCell className="text-xs font-mono max-w-[120px] truncate">
                  {ev.ibs_transaction_id || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelected(ev); setDetailOpen(true); }} title="Ver detalle">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {ev.ibs_transaction_id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        navigator.clipboard.writeText(ev.ibs_transaction_id);
                        toast.success('iBS tx copiado');
                      }} title="Copiar iBS tx">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(ev.certification_status === 'failed' || ev.certification_status === 'pending') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRetry(ev.id)} title="Reintentar certificación">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Detalle de uso
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estado</p>
                {statusBadge(selected.certification_status)}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evento</p>
                <DetailLine label="Tipo" value={EVENT_LABELS[selected.event_type] || selected.event_type} />
                <DetailLine label="Fecha" value={new Date(selected.event_timestamp).toLocaleString()} />
                <DetailLine label="IP" value={selected.ip_address} />
                <DetailLine label="User Agent" value={selected.user_agent} />
                <DetailLine label="Session ID" value={selected.session_id} mono copyable />
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certificación</p>
                {selected.ibs_transaction_id && (
                  <DetailLine label="iBS Transaction ID" value={selected.ibs_transaction_id} mono copyable />
                )}
                {selected.evidence_hash && (
                  <DetailLine label="Hash" value={selected.evidence_hash} mono copyable />
                )}
                {selected.ibs_registered_at && (
                  <DetailLine label="Fecha certificación" value={new Date(selected.ibs_registered_at).toLocaleString()} />
                )}
              </div>

              {selected.metadata_json && Object.keys(selected.metadata_json).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(selected.metadata_json, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailLine({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}:</span>
      <span className={`text-xs break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
      {copyable && (
        <button
          onClick={() => { navigator.clipboard.writeText(value); toast.success('Copiado'); }}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Copy className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
