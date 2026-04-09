import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { RefreshCw, Save, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

const fmtEur = (n: number, decimals = 2) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtPct = (n: number, decimals = 1) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';

const PAGE_SIZE = 10;

interface ApiCostConfig {
  feature_key: string;
  feature_label: string;
  api_provider: string;
  api_model: string;
  credit_cost: number;
  price_per_credit_eur: number;
  api_cost_eur: number;
  notes: string | null;
}

interface ApiCostDaily {
  id: string;
  date: string;
  feature_key: string;
  total_uses: number;
  total_credits_charged: number;
  total_revenue_eur: number;
  total_api_cost_eur: number;
  gross_margin_eur: number;
  margin_pct: number;
}

type RangeOption = '7' | '30' | '90' | 'custom';

export default function AdminApiCostsPage() {
  const [configs, setConfigs] = useState<ApiCostConfig[]>([]);
  const [dailyData, setDailyData] = useState<ApiCostDaily[]>([]);
  const [range, setRange] = useState<RangeOption>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editChanges, setEditChanges] = useState<Partial<ApiCostConfig>>({});
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [dailyPage, setDailyPage] = useState(1);
  const [configPage, setConfigPage] = useState(1);

  const getDateRange = useCallback(() => {
    const to = new Date();
    const toStr = to.toISOString().split('T')[0];
    if (range === 'custom' && customFrom && customTo) return { from: customFrom, to: customTo };
    const days = range === 'custom' ? 30 : parseInt(range);
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString().split('T')[0], to: toStr };
  }, [range, customFrom, customTo]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { from, to } = getDateRange();

    const [configRes, dailyRes] = await Promise.all([
      supabase.from('api_cost_config').select('*').order('feature_key'),
      supabase.from('api_cost_daily').select('*').gte('date', from).lte('date', to).order('date', { ascending: false }),
    ]);

    if (configRes.data) setConfigs(configRes.data as unknown as ApiCostConfig[]);
    if (dailyRes.data) setDailyData(dailyRes.data as unknown as ApiCostDaily[]);
    setDailyPage(1);
    setLoading(false);
  }, [getDateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveConfig = async (key: string) => {
    const { error } = await supabase
      .from('api_cost_config')
      .update({ ...editChanges, updated_at: new Date().toISOString() } as any)
      .eq('feature_key', key);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Configuración guardada');
    setEditingRow(null);
    setEditChanges({});
    loadData();
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.functions.invoke('api-cost-cron', {
        body: { date: today },
      });
      if (error) throw error;
      toast.success(`Recalculado: ${data?.features || 0} features procesadas`);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Error al recalcular');
    } finally {
      setRecalculating(false);
    }
  };

  // Summary calculations
  const totalRevenue = dailyData.reduce((s, d) => s + Number(d.total_revenue_eur), 0);
  const totalCost = dailyData.reduce((s, d) => s + Number(d.total_api_cost_eur), 0);
  const totalMargin = totalRevenue - totalCost;
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  const featureMargins: Record<string, { revenue: number; cost: number }> = {};
  dailyData.forEach(d => {
    if (!featureMargins[d.feature_key]) featureMargins[d.feature_key] = { revenue: 0, cost: 0 };
    featureMargins[d.feature_key].revenue += Number(d.total_revenue_eur);
    featureMargins[d.feature_key].cost += Number(d.total_api_cost_eur);
  });

  const featureMarginList = Object.entries(featureMargins)
    .map(([k, v]) => ({ key: k, marginPct: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0 }))
    .filter(f => f.marginPct !== 0);

  const configMap = Object.fromEntries(configs.map(c => [c.feature_key, c]));
  const bestFeature = featureMarginList.sort((a, b) => b.marginPct - a.marginPct)[0];
  const worstFeature = featureMarginList.sort((a, b) => a.marginPct - b.marginPct)[0];

  const marginBadge = (pct: number) => {
    if (pct >= 80) return <Badge className="bg-green-600 text-white">{fmtPct(pct)}</Badge>;
    if (pct >= 50) return <Badge className="bg-yellow-500 text-black">{fmtPct(pct)}</Badge>;
    return <Badge variant="destructive">{fmtPct(pct)}</Badge>;
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(dailyData.length / PAGE_SIZE));
  const paginatedDaily = dailyData.slice((dailyPage - 1) * PAGE_SIZE, dailyPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rentabilidad de APIs</h1>
        <Button onClick={handleRecalculate} disabled={recalculating} variant="blue">
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
          Recalcular hoy
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3 w-3" /> Ingresos</div>
            <p className="text-lg font-bold">{fmtEur(totalRevenue)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="h-3 w-3" /> Coste API</div>
            <p className="text-lg font-bold">{fmtEur(totalCost, 4)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="h-3 w-3" /> Margen bruto</div>
            <p className="text-lg font-bold">{fmtEur(totalMargin)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Percent className="h-3 w-3" /> % Margen</div>
            <p className="text-lg font-bold">{marginBadge(avgMarginPct)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp className="h-3 w-3" /> Más rentable</div>
            <p className="text-sm font-bold truncate">{bestFeature ? configMap[bestFeature.key]?.feature_label || bestFeature.key : '—'}</p>
            {bestFeature && <p className="text-xs text-green-600">{fmtPct(bestFeature.marginPct)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingDown className="h-3 w-3" /> Menos rentable</div>
            <p className="text-sm font-bold truncate">{worstFeature ? configMap[worstFeature.key]?.feature_label || worstFeature.key : '—'}</p>
            {worstFeature && <p className="text-xs text-red-500">{fmtPct(worstFeature.marginPct)}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['7', '30', '90'] as RangeOption[]).map(r => (
          <Button key={r} variant={range === r ? 'default' : 'outline'} size="sm" onClick={() => setRange(r)}>
            {r} días
          </Button>
        ))}
        <Button variant={range === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setRange('custom')}>
          Personalizado
        </Button>
        {range === 'custom' && (
          <>
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" />
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" />
            <Button size="sm" onClick={loadData}>Aplicar</Button>
          </>
        )}
      </div>

      {/* Config Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Configuración de costes por feature</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>API Provider</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>€/crédito</TableHead>
                <TableHead>Coste API €/uso</TableHead>
                <TableHead>Margen bruto €</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const configTotalPages = Math.max(1, Math.ceil(configs.length / PAGE_SIZE));
                const paginatedConfigs = configs.slice((configPage - 1) * PAGE_SIZE, configPage * PAGE_SIZE);
                return paginatedConfigs.map(c => (
                <TableRow key={c.feature_key}>
                  <TableCell className="font-medium">{c.feature_label || c.feature_key}</TableCell>
                  <TableCell>{editingRow === c.feature_key
                    ? <Input defaultValue={c.api_provider} className="w-28" onChange={e => setEditChanges(p => ({ ...p, api_provider: e.target.value }))} />
                    : c.api_provider}</TableCell>
                  <TableCell>{editingRow === c.feature_key
                    ? <Input defaultValue={c.api_model} className="w-36" onChange={e => setEditChanges(p => ({ ...p, api_model: e.target.value }))} />
                    : <span className="text-xs font-mono">{c.api_model || '—'}</span>}</TableCell>
                  <TableCell>{c.credit_cost}</TableCell>
                  <TableCell>{editingRow === c.feature_key
                    ? <Input type="number" step="0.01" defaultValue={c.price_per_credit_eur} className="w-24" onChange={e => setEditChanges(p => ({ ...p, price_per_credit_eur: parseFloat(e.target.value) }))} />
                    : c.price_per_credit_eur}</TableCell>
                  <TableCell>{editingRow === c.feature_key
                    ? <Input type="number" step="0.001" defaultValue={c.api_cost_eur} className="w-28" onChange={e => setEditChanges(p => ({ ...p, api_cost_eur: parseFloat(e.target.value) }))} />
                    : c.api_cost_eur}</TableCell>
                  <TableCell className="font-medium">
                    {(() => {
                      const revenue = c.credit_cost * Number(c.price_per_credit_eur);
                      const cost = Number(c.api_cost_eur);
                      const margin = revenue - cost;
                      const pct = revenue > 0 ? (margin / revenue) * 100 : 0;
                      return <span>{fmtEur(margin, 4)} € <span className="text-xs text-muted-foreground">({fmtPct(pct, 0)})</span></span>;
                    })()}
                  </TableCell>
                  <TableCell>{editingRow === c.feature_key
                    ? <Input defaultValue={c.notes || ''} className="w-40" onChange={e => setEditChanges(p => ({ ...p, notes: e.target.value }))} />
                    : (c.notes || '—')}</TableCell>
                  <TableCell>
                    {editingRow === c.feature_key ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleSaveConfig(c.feature_key)}><Save className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingRow(null); setEditChanges({}); }}>✕</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setEditingRow(c.feature_key); setEditChanges({}); }}>Editar</Button>
                    )}
                  </TableCell>
                </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
          {configs.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="text-sm text-muted-foreground">
                Página {configPage} de {Math.ceil(configs.length / PAGE_SIZE)}
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setConfigPage(p => Math.max(1, p - 1))}
                      className={configPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(Math.ceil(configs.length / PAGE_SIZE), 5) }, (_, i) => {
                    const tp = Math.ceil(configs.length / PAGE_SIZE);
                    let page: number;
                    if (tp <= 5) { page = i + 1; }
                    else if (configPage <= 3) { page = i + 1; }
                    else if (configPage >= tp - 2) { page = tp - 4 + i; }
                    else { page = configPage - 2 + i; }
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === configPage}
                          onClick={() => setConfigPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setConfigPage(p => Math.min(Math.ceil(configs.length / PAGE_SIZE), p + 1))}
                      className={configPage >= Math.ceil(configs.length / PAGE_SIZE) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Metrics Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Métricas diarias</CardTitle>
            {dailyData.length > 0 && (
              <span className="text-xs text-muted-foreground">{dailyData.length.toLocaleString('de-DE')} registros</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm py-4">Cargando datos…</p>
          ) : dailyData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No hay datos para el período seleccionado. Pulsa "Recalcular hoy" para generar.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">Usos</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead className="text-right">Ingresos €</TableHead>
                    <TableHead className="text-right">Coste API €</TableHead>
                    <TableHead className="text-right">Margen €</TableHead>
                    <TableHead className="text-right">% Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDaily.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>{configMap[d.feature_key]?.feature_label || d.feature_key}</TableCell>
                      <TableCell className="text-right">{d.total_uses.toLocaleString('de-DE')}</TableCell>
                      <TableCell className="text-right">{d.total_credits_charged.toLocaleString('de-DE')}</TableCell>
                      <TableCell className="text-right">{fmtEur(Number(d.total_revenue_eur), 4)}</TableCell>
                      <TableCell className="text-right">{fmtEur(Number(d.total_api_cost_eur), 6)}</TableCell>
                      <TableCell className="text-right">{fmtEur(Number(d.gross_margin_eur), 4)}</TableCell>
                      <TableCell className="text-right">{marginBadge(Number(d.margin_pct))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    Página {dailyPage} de {totalPages}
                  </span>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setDailyPage(p => Math.max(1, p - 1))}
                          className={dailyPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (dailyPage <= 3) {
                          page = i + 1;
                        } else if (dailyPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = dailyPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={page === dailyPage}
                              onClick={() => setDailyPage(page)}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setDailyPage(p => Math.min(totalPages, p + 1))}
                          className={dailyPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
