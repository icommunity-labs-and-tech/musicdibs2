import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Download, Eye, RefreshCw, Copy, FileText, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generatePurchaseCertificate } from '@/lib/generatePurchaseCertificate';
import type { PurchaseEvidenceData } from '@/lib/generatePurchaseCertificate';

interface UserPurchasesPanelProps {
  userId: string;
  userEmail?: string;
}

export default function UserPurchasesPanel({ userId, userEmail }: UserPurchasesPanelProps) {
  const [evidences, setEvidences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('purchase_evidences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading evidences:', error);
    } else {
      setEvidences(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const certBadge = (status: string) => {
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

  const handleDownloadPdf = async (ev: any) => {
    // Fetch usage events linked to this purchase evidence
    let usageEvents: any[] = [];
    const { data: usageData } = await supabase
      .from('purchase_usage_evidences')
      .select('event_type, event_timestamp, certification_status')
      .eq('purchase_evidence_id', ev.id)
      .order('event_timestamp', { ascending: true })
      .limit(8);
    if (usageData) {
      usageEvents = usageData.map((u: any) => ({
        eventType: u.event_type,
        eventTimestamp: u.event_timestamp,
        certificationStatus: u.certification_status,
      }));
    }

    const data: PurchaseEvidenceData = {
      email: ev.email || userEmail || '',
      displayName: ev.display_name,
      ipAddress: ev.ip_address,
      userAgent: ev.user_agent,
      browserLanguage: ev.browser_language,
      productType: ev.product_type,
      productName: ev.product_name,
      amount: Number(ev.amount),
      currency: ev.currency,
      paymentIntentId: ev.payment_intent_id,
      chargeId: ev.charge_id,
      paymentStatus: ev.payment_status,
      acceptedTerms: ev.accepted_terms,
      acceptedTermsVersion: ev.accepted_terms_version,
      acceptedTermsTimestamp: ev.accepted_terms_timestamp,
      evidenceHash: ev.evidence_hash,
      ibsTransactionId: ev.ibs_transaction_id,
      ibsRegisteredAt: ev.ibs_registered_at,
      certificationStatus: ev.certification_status,
      createdAt: ev.created_at,
      checkerUrl: ev.ibs_transaction_id
        ? `https://checker.icommunitylabs.com/check/opera/${ev.ibs_transaction_id}`
        : undefined,
      usageEvents,
    };
    await generatePurchaseCertificate(data, 'es');
    toast.success('Certificado descargado');
  };

  const handleRetry = async (evidenceId: string) => {
    try {
      const { error } = await supabase.functions.invoke('certify-purchase', {
        body: { evidence_id: evidenceId },
      });
      if (error) throw error;
      toast.success('Certificación reenviada');
      setTimeout(load, 3000);
    } catch (e: any) {
      toast.error('Error al reintentar: ' + e.message);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Cargando compras...</p>;
  }

  if (evidences.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-muted/10 p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Este usuario no tiene compras registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Compras certificadas ({evidences.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="h-3 w-3 mr-1" /> Actualizar
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Producto</TableHead>
              <TableHead className="text-xs">Importe</TableHead>
              <TableHead className="text-xs">Pago</TableHead>
              <TableHead className="text-xs">Certificación</TableHead>
              <TableHead className="text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evidences.map(ev => (
              <TableRow key={ev.id}>
                <TableCell className="text-xs">{new Date(ev.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs font-medium">{ev.product_name || ev.product_type}</TableCell>
                <TableCell className="text-xs font-mono">{Number(ev.amount).toFixed(2)} {ev.currency?.toUpperCase()}</TableCell>
                <TableCell>{
                  ev.payment_status === 'succeeded'
                    ? <Badge className="bg-green-500/20 text-green-400 text-xs">Pagado</Badge>
                    : <Badge className="bg-destructive/20 text-destructive text-xs">{ev.payment_status}</Badge>
                }</TableCell>
                <TableCell>{certBadge(ev.certification_status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedEvidence(ev); setDetailOpen(true); }} title="Ver detalle">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(ev)} title="Descargar certificado">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {ev.certification_status === 'failed' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRetry(ev.id)} title="Reintentar certificación">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detalle de evidencia
            </DialogTitle>
          </DialogHeader>

          {selectedEvidence && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estado de certificación</p>
                {certBadge(selectedEvidence.certification_status)}
                {selectedEvidence.error_message && (
                  <p className="text-xs text-destructive mt-1">{selectedEvidence.error_message}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pago</p>
                <DetailLine label="Producto" value={selectedEvidence.product_name || selectedEvidence.product_type} />
                <DetailLine label="Importe" value={`${Number(selectedEvidence.amount).toFixed(2)} ${selectedEvidence.currency?.toUpperCase()}`} />
                <DetailLine label="Estado" value={selectedEvidence.payment_status} />
                {selectedEvidence.payment_intent_id && (
                  <DetailLine label="Payment Intent" value={selectedEvidence.payment_intent_id} mono copyable />
                )}
                {selectedEvidence.charge_id && (
                  <DetailLine label="Charge ID" value={selectedEvidence.charge_id} mono copyable />
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certificación</p>
                {selectedEvidence.ibs_transaction_id && (
                  <DetailLine label="iBS Transaction ID" value={selectedEvidence.ibs_transaction_id} mono copyable />
                )}
                {selectedEvidence.evidence_hash && (
                  <DetailLine label="Hash" value={selectedEvidence.evidence_hash} mono copyable />
                )}
                {selectedEvidence.ibs_registered_at && (
                  <DetailLine label="Fecha certificación" value={new Date(selectedEvidence.ibs_registered_at).toLocaleString()} />
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleDownloadPdf(selectedEvidence)}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Descargar PDF
                </Button>
                {selectedEvidence.certification_status === 'failed' && (
                  <Button size="sm" variant="outline" onClick={() => handleRetry(selectedEvidence.id)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reintentar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailLine({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
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
