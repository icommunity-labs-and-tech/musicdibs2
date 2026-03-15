import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import {
  BarChart3, Users, Music, CreditCard, Download, TrendingUp, RefreshCw,
  Radio, MousePointerClick, Link, AlertTriangle, CheckCircle2, Clock,
  RotateCcw, XCircle, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--secondary))'];
const STATUS_COLORS = ['hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)'];

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [distMetrics, setDistMetrics] = useState({ distributed: 0, clicks: 0 });
  const [syncQueueCount, setSyncQueueCount] = useState(0);

  const [ibsQueue, setIbsQueue] = useState<any>(null);
  const [ibsLoading, setIbsLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [queueExpanded, setQueueExpanded] = useState(false);

  const loadIbsQueue = async () => {
    setIbsLoading(true);
    try {
      const res = await adminApi.callAction('get_ibs_queue', {});
      setIbsQueue(res);
      if ((res.exhausted_count || 0) + (res.stale_count || 0) > 0) {
        setQueueExpanded(true);
      }
    } catch (e: any) {
      toast.error('Error cargando estado de la cola: ' + e.message);
    }
    setIbsLoading(false);
  };

  const handleRetryItem = async (queueId: string, workId: string) => {
    setRetrying(queueId);
    try {
      await adminApi.callAction('retry_ibs_queue_item', { queueId, workId });
      toast.success('Reintento programado — el cron procesará la obra en los próximos 15 minutos');
      await loadIbsQueue();
    } catch (e: any) {
      toast.error('Error al programar reintento: ' + e.message);
    }
    setRetrying(null);
  };

  const loadMetrics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data, distCount, clicksData, syncQueue] = await Promise.all([
        adminApi.getMetrics(),
        supabase.from('works').select('*', { count: 'exact', head: true }).not('distributed_at', 'is', null),
        supabase.from('works').select('distribution_clicks').not('distributed_at', 'is', null),
        supabase.from('ibs_sync_queue').select('*', { count: 'exact', head: true }).in('status', ['waiting', 'retrying']),
      ]);
      setMetrics(data);
      const totalClicks = (clicksData.data || []).reduce((s: number, w: any) => s + (w.distribution_clicks || 0), 0);
      setDistMetrics({ distributed: distCount.count || 0, clicks: totalClicks });
      setSyncQueueCount(syncQueue.count || 0);
      await loadIbsQueue();
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

  const conversionRate = metrics.total_users > 0
    ? (((metrics.total_users - (metrics.plan_breakdown?.Free || 0)) / metrics.total_users) * 100).toFixed(1)
    : '0';

  const worksPerDayData = Object.entries(metrics.works_per_day || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date: date.slice(5), count }));

  const planData = Object.entries(metrics.plan_breakdown || {}).map(([name, value]) => ({ name, value }));
  const statusData = [
    { name: 'Registradas', value: metrics.works_registered },
    { name: 'Procesando', value: metrics.works_processing },
    { name: 'Fallidas', value: metrics.works_failed },
  ].filter(d => d.value > 0);

  const hasQueueProblems = ibsQueue && (ibsQueue.exhausted_count > 0 || ibsQueue.stale_count > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Métricas</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => loadMetrics(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Usuarios totales', value: metrics.total_users, icon: Users },
          { label: 'Nuevos (7d)', value: metrics.new_users_7d, icon: TrendingUp },
          { label: 'Obras registradas', value: metrics.works_registered, icon: Music },
          { label: 'Créditos vendidos', value: metrics.total_credits_sold, icon: CreditCard },
          { label: 'Créditos consumidos', value: metrics.total_credits_consumed, icon: CreditCard },
          { label: 'Conversión', value: `${conversionRate}%`, icon: TrendingUp },
          { label: 'Obras distribuidas', value: distMetrics.distributed, icon: Radio },
          { label: 'Clicks distribución', value: distMetrics.clicks, icon: MousePointerClick },
          { label: 'Cola blockchain', value: syncQueueCount, icon: Link, highlight: syncQueueCount > 0 ? 'amber' : 'green' },
        ].map((kpi: any) => (
          <Card key={kpi.label} className={`border-border/40 ${kpi.highlight === 'amber' ? 'border-amber-500/50 bg-amber-500/5' : kpi.highlight === 'green' ? 'border-green-500/50 bg-green-500/5' : ''}`}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.highlight === 'amber' ? 'text-amber-400' : kpi.highlight === 'green' ? 'text-green-400' : 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              {kpi.highlight === 'green' && <p className="text-[10px] text-green-400">Sin pendientes</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border-border/40">
          <CardHeader><CardTitle className="text-base">Obras por día (30d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={worksPerDayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Planes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name, value }) => `${name}: ${value}`}>
                    {planData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader><CardTitle className="text-base">Estado obras</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => handleExport('users')}><Download className="h-4 w-4 mr-2" /> Exportar usuarios</Button>
        <Button variant="outline" onClick={() => handleExport('transactions')}><Download className="h-4 w-4 mr-2" /> Exportar transacciones</Button>
        <Button variant="outline" onClick={() => handleExport('works')}><Download className="h-4 w-4 mr-2" /> Exportar obras</Button>
      </div>

      {/* ── Panel Monitoring iBS Blockchain Queue ─────────────── */}
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
                    <XCircle className="h-3.5 w-3.5" />
                    {ibsQueue.exhausted_count} agotados
                  </span>
                  <span className={`flex items-center gap-1 ${ibsQueue.stale_count > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {ibsQueue.stale_count} bloqueados
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {ibsQueue.resolved_24h} resueltos (24h)
                  </span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueueExpanded(e => !e)}
                className="h-7 px-2"
              >
                {queueExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {queueExpanded && (
          <CardContent>
            {ibsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Cargando estado de la cola...
              </div>
            ) : !ibsQueue || ibsQueue.items?.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                Sin registros problemáticos. La cola está sana.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Registros que requieren atención. Los agotados han superado el
                  máximo de reintentos automáticos — usa el botón de reintento
                  para relanzarlos manualmente.
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
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {item.work_title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={item.status === 'exhausted' ? 'border-red-500/50 text-red-400' : 'border-amber-500/50 text-amber-400'}>
                              {item.status === 'exhausted'
                                ? <><XCircle className="h-3 w-3 mr-1" /> Agotado</>
                                : <><Clock className="h-3 w-3 mr-1" /> Bloqueado</>
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {item.ibs_evidence_id
                              ? item.ibs_evidence_id.slice(0, 12) + '...'
                              : '—'
                            }
                          </TableCell>
                          <TableCell>
                            {item.retry_count}/{item.max_retries}
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground truncate block cursor-help">
                                  {item.error_detail
                                    ? item.error_detail.slice(0, 30) + '...'
                                    : '—'
                                  }
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
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryItem(item.id, item.work_id)}
                              disabled={retrying === item.id}
                            >
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
