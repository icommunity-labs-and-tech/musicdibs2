import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import {
  BarChart3, Users, Music, CreditCard, Download, TrendingUp, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, RotateCcw, XCircle, ChevronDown,
  ChevronUp, Loader2,
} from 'lucide-react';
import KpiGrid from '@/components/admin/metrics/KpiGrid';
import MetricsCharts from '@/components/admin/metrics/MetricsCharts';
import UnitEconomics from '@/components/admin/metrics/UnitEconomics';
import CohortRetention from '@/components/admin/metrics/CohortRetention';

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // iBS queue state
  const [ibsQueue, setIbsQueue] = useState<any>(null);
  const [ibsLoading, setIbsLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [queueExpanded, setQueueExpanded] = useState(false);

  const loadIbsQueue = async () => {
    setIbsLoading(true);
    try {
      const res = await adminApi.callAction('get_ibs_queue', {});
      setIbsQueue(res);
      if ((res.exhausted_count || 0) + (res.stale_count || 0) > 0) setQueueExpanded(true);
    } catch (e: any) {
      toast.error('Error cargando cola: ' + e.message);
    }
    setIbsLoading(false);
  };

  const handleRetryItem = async (queueId: string, workId: string) => {
    setRetrying(queueId);
    try {
      await adminApi.callAction('retry_ibs_queue_item', { queueId, workId });
      toast.success('Reintento programado');
      await loadIbsQueue();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    }
    setRetrying(null);
  };

  const loadMetrics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data] = await Promise.all([adminApi.getSaasMetrics(), loadIbsQueue()]);
      setMetrics(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const handleExport = async (dataset: string) => {
    try {
      const res = await adminApi.exportCsv(dataset);
      const blob = new Blob([res.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musicdibs-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV descargado');
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando métricas...</div>;
  if (!metrics) return null;

  const hasQueueProblems = ibsQueue && (ibsQueue.exhausted_count > 0 || ibsQueue.stale_count > 0);

  return (
    <div className="space-y-6">
      {/* Header + actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">SaaS Analytics</h1>
          <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={() => loadMetrics(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('users')}>
                👥 Usuarios (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('transactions')}>
                💳 Transacciones (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('works')}>
                🎵 Obras (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('audit')}>
                📋 Audit Log (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Rows */}
      <KpiGrid metrics={metrics} />

      {/* Charts + Revenue */}
      <MetricsCharts metrics={metrics} />

      {/* Export section */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">📥 Exportar Datos</CardTitle>
          <CardDescription>Descarga informes en formato CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="gap-2" onClick={() => handleExport('users')}>
              <Users className="w-4 h-4" /> Usuarios
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleExport('transactions')}>
              <CreditCard className="w-4 h-4" /> Transacciones
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleExport('works')}>
              <Music className="w-4 h-4" /> Obras
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleExport('audit')}>
              <TrendingUp className="w-4 h-4" /> Audit Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blockchain Monitoring */}
      <Card className={`border-border/40 ${hasQueueProblems ? 'border-red-500/40 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasQueueProblems
                ? <AlertTriangle className="h-5 w-5 text-red-400" />
                : <CheckCircle2 className="h-5 w-5 text-green-400" />
              }
              <CardTitle className="text-base">Monitoring · Cola Blockchain iBS</CardTitle>
            </div>
            <div className="flex items-center gap-4">
              {!ibsLoading && ibsQueue && (
                <div className="flex items-center gap-4 text-sm">
                  <span className={`flex items-center gap-1 ${ibsQueue.exhausted_count > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    <XCircle className="h-3.5 w-3.5" /> {ibsQueue.exhausted_count} agotados
                  </span>
                  <span className={`flex items-center gap-1 ${ibsQueue.stale_count > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    <Clock className="h-3.5 w-3.5" /> {ibsQueue.stale_count} bloqueados
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {ibsQueue.resolved_24h} resueltos (24h)
                  </span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setQueueExpanded(e => !e)} className="h-7 px-2">
                {queueExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {queueExpanded && (
          <CardContent>
            {ibsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
              </div>
            ) : !ibsQueue || ibsQueue.items?.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-green-400">
                <CheckCircle2 className="h-5 w-5" /> Sin registros problemáticos.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Registros que requieren atención. Los agotados han superado el máximo de reintentos.
                </p>
                <TooltipProvider>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Obra</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Evidence ID</TableHead>
                        <TableHead>Intentos</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ibsQueue.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{item.work_title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={item.status === 'exhausted' ? 'border-red-500/50 text-red-400' : 'border-amber-500/50 text-amber-400'}>
                              {item.status === 'exhausted'
                                ? <><XCircle className="h-3 w-3 mr-1" /> Agotado</>
                                : <><Clock className="h-3 w-3 mr-1" /> Bloqueado</>
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {item.ibs_evidence_id ? item.ibs_evidence_id.slice(0, 12) + '...' : '—'}
                          </TableCell>
                          <TableCell>{item.retry_count}/{item.max_retries}</TableCell>
                          <TableCell className="max-w-[180px]">
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground truncate block cursor-help">
                                  {item.error_detail ? item.error_detail.slice(0, 30) + '...' : '—'}
                                </span>
                              </TooltipTrigger>
                              {item.error_detail && (
                                <TooltipContent className="max-w-sm">
                                  <p className="text-xs">{item.error_detail}</p>
                                </TooltipContent>
                              )}
                            </UiTooltip>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleString('es-ES', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleRetryItem(item.id, item.work_id)} disabled={retrying === item.id}>
                              {retrying === item.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reintentar</>
                              }
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TooltipProvider>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
