import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DistributeButton } from '@/components/dashboard/DistributeButton';
import { CertificateButton } from '@/components/dashboard/CertificateButton';
import { WorkTimeline } from '@/components/dashboard/WorkTimeline';

interface WorkEvidence {
  id: string;
  title: string;
  type: string;
  status: string;
  blockchain_hash: string | null;
  blockchain_network: string | null;
  checker_url: string | null;
  certificate_url: string | null;
  certified_at: string | null;
  created_at: string;
  ibs_evidence_id: string | null;
  distributed_at: string | null;
  distribution_clicks: number;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  processing: {
    label: 'En proceso',
    icon: Loader2,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  registered: {
    label: 'Certificado',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  failed: {
    label: 'Fallido',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

const typeLabels: Record<string, string> = {
  audio: '🎵 Audio',
  video: '🎬 Video',
  image: '🖼️ Imagen',
  document: '📄 Documento',
  other: '📁 Otro',
};

export default function BlockchainEvidencePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [works, setWorks] = useState<WorkEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const PAGE_SIZE = 5;

  // Fetch display name
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [user]);

  const loadWorks = async (pageNum = 0) => {
    if (!user) return;
    setLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('works')
        .select('id, title, type, status, blockchain_hash, blockchain_network, checker_url, certificate_url, certified_at, created_at, ibs_evidence_id, distributed_at, distribution_clicks', { count: 'exact' })
        .eq('user_id', user.id);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setWorks((data as WorkEvidence[]) || []);
      setTotalCount(count || 0);
    } catch (e) {
      console.error('Error loading works:', e);
    }
    setLoading(false);
  };

  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
    loadWorks(0);
  }, [user, statusFilter]);

  useEffect(() => {
    if (page > 0) loadWorks(page);
  }, [page]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('works-evidence')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'works', filter: `user_id=eq.${user.id}` },
        () => loadWorks(page)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const copyHash = async (hash: string, workId: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedId(workId);
    toast({ title: 'Hash copiado', description: 'El hash blockchain se ha copiado al portapapeles.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const truncateHash = (hash: string) =>
    hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;

  const exportToCsv = () => {
    if (works.length === 0) return;
    const headers = ['Título','Tipo','Estado','Fecha de registro','Fecha de certificación','Red blockchain','Hash TX','Evidence ID','URL verificación','Distribuido'];
    const rows = works.map(w => [
      `"${(w.title || '').replace(/"/g, '""')}"`,
      w.type || '',
      w.status || '',
      w.created_at ? new Date(w.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
      w.certified_at ? new Date(w.certified_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
      w.blockchain_network || '',
      w.blockchain_hash || '',
      w.ibs_evidence_id || '',
      w.checker_url || '',
      w.distributed_at ? new Date(w.distributed_at).toLocaleDateString('es-ES') : '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `musicdibs-mis-obras-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const certified = works.filter((w) => w.status === 'registered');
  const processing = works.filter((w) => w.status === 'processing');
  const failed = works.filter((w) => w.status === 'failed');

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Historial de registros
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCsv}
            disabled={loading || works.length === 0}
            title="Exportar mis obras a CSV"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadWorks(page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{certified.length}</p>
              <p className="text-xs text-muted-foreground">Certificadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{processing.length}</p>
              <p className="text-xs text-muted-foreground">En proceso</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{failed.length}</p>
              <p className="text-xs text-muted-foreground">Fallidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'all', label: 'Todas', icon: FileText },
          { key: 'registered', label: 'Certificadas', icon: CheckCircle2 },
          { key: 'processing', label: 'En proceso', icon: Clock },
          { key: 'failed', label: 'Fallidas', icon: XCircle },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={statusFilter === key ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setStatusFilter(key)}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* Evidence List */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Mis obras registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : works.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No tienes obras registradas</p>
              <p className="text-xs mt-1">
                Registra tu primera obra para verla aquí
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {works.map((work) => {
                  const sc = statusConfig[work.status] || statusConfig.processing;
                  const StatusIcon = sc.icon;
                  return (
                    <div
                      key={work.id}
                      className="rounded-lg border border-border/40 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === work.id ? null : work.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold truncate">{work.title}</p>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.className}`}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${work.status === 'processing' ? 'animate-spin' : ''}`} />
                                {sc.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground/60 ml-auto">
                                {expandedId === work.id ? '▲ ocultar' : '▼ ver progreso'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                              <span>{typeLabels[work.type] || work.type}</span>
                              <span>•</span>
                              <span>
                                {new Date(work.created_at).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              {work.blockchain_network && (
                                <>
                                  <span>•</span>
                                  <span className="uppercase font-medium text-primary/80">
                                    {work.blockchain_network}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Blockchain hash */}
                            {work.blockchain_hash && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <code className="text-[11px] bg-muted/60 px-2 py-0.5 rounded font-mono text-foreground/80">
                                  {truncateHash(work.blockchain_hash)}
                                </code>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyHash(work.blockchain_hash!, work.id); }}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  title="Copiar hash"
                                >
                                  {copiedId === work.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Certified date */}
                            {work.certified_at && (
                              <p className="text-[11px] text-muted-foreground">
                                Certificado: {new Date(work.certified_at).toLocaleString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {work.checker_url && (
                            <a
                              href={work.checker_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm" className="text-xs h-7 w-full">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Verificar
                              </Button>
                            </a>
                          )}
                          {work.certificate_url && work.certificate_url !== work.checker_url && (
                            <a
                              href={work.certificate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="text-xs h-7 w-full text-primary">
                                <FileText className="h-3 w-3 mr-1" />
                                Certificado
                              </Button>
                            </a>
                          )}
                          {work.status === 'registered' && (
                            <>
                              <CertificateButton
                                work={{
                                  id: work.id,
                                  title: work.title,
                                  type: work.type,
                                  description: undefined,
                                  blockchain_hash: work.blockchain_hash!,
                                  blockchain_network: work.blockchain_network!,
                                  checker_url: work.checker_url || undefined,
                                  ibs_evidence_id: work.ibs_evidence_id!,
                                  certified_at: work.certified_at || undefined,
                                  created_at: work.created_at,
                                }}
                                authorName={displayName || user?.email || 'Autor'}
                              />
                              <DistributeButton
                                workId={work.id}
                                distributedAt={work.distributed_at}
                                currentClicks={work.distribution_clicks || 0}
                                onDistributed={() => loadWorks(page)}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Timeline expandible */}
                      {expandedId === work.id && (
                        <WorkTimeline
                          workStatus={work.status as 'processing' | 'registered' | 'failed'}
                          createdAt={work.created_at}
                          certifiedAt={work.certified_at}
                          ibsEvidenceId={work.ibs_evidence_id}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    {totalCount} obra{totalCount !== 1 ? 's' : ''} · Página {page + 1} de {totalPages}
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      ← Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Siguiente →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
