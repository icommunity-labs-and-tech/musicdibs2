import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { BarChart3, Users, Music, CreditCard, Download, TrendingUp, RefreshCw, Radio, MousePointerClick } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--secondary))'];
const STATUS_COLORS = ['hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)'];

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [distMetrics, setDistMetrics] = useState({ distributed: 0, clicks: 0 });

  const loadMetrics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data, distCount, clicksData] = await Promise.all([
        adminApi.getMetrics(),
        supabase.from('works').select('*', { count: 'exact', head: true }).not('distributed_at', 'is', null),
        supabase.from('works').select('distribution_clicks').not('distributed_at', 'is', null),
      ]);
      setMetrics(data);
      const totalClicks = (clicksData.data || []).reduce((s: number, w: any) => s + (w.distribution_clicks || 0), 0);
      setDistMetrics({ distributed: distCount.count || 0, clicks: totalClicks });
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Usuarios totales', value: metrics.total_users, icon: Users },
          { label: 'Nuevos (7d)', value: metrics.new_users_7d, icon: TrendingUp },
          { label: 'Obras registradas', value: metrics.works_registered, icon: Music },
          { label: 'Créditos vendidos', value: metrics.total_credits_sold, icon: CreditCard },
          { label: 'Créditos consumidos', value: metrics.total_credits_consumed, icon: CreditCard },
          { label: 'Conversión', value: `${conversionRate}%`, icon: TrendingUp },
          { label: 'Obras distribuidas', value: distMetrics.distributed, icon: Radio },
          { label: 'Clicks distribución', value: distMetrics.clicks, icon: MousePointerClick },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border/40">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
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
    </div>
  );
}
