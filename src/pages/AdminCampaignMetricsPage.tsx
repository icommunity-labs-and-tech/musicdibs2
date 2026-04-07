import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import {
  Megaphone, RefreshCw, Plus, TrendingUp, DollarSign,
  Users, ShoppingBag, BarChart3, Eye, Calendar, Loader2,
} from 'lucide-react';
import HistoricalDataNotice, { normalizeAttribution } from '@/components/admin/HistoricalDataNotice';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type PeriodType = 'week' | 'month' | 'year';

function getWeekMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getPeriodLabel(periodType: PeriodType, weekStart?: string, month?: string, year?: string): string {
  if (periodType === 'week' && weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }
  if (periodType === 'month' && month && year) {
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }
  if (periodType === 'year' && year) return year;
  return 'Todo el periodo';
}

const MONTHS = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

export default function AdminCampaignMetricsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [weekStart, setWeekStart] = useState(getWeekMonday(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [detailCampaign, setDetailCampaign] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', type: '', owner: '', cost: '0', coupon_code: '', utm_source: '', utm_medium: '', utm_campaign: '', notes: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = { periodType };
      if (periodType === 'week') filters.weekStart = weekStart;
      if (periodType === 'month') { filters.month = selectedMonth; filters.year = selectedYear; }
      if (periodType === 'year') filters.year = selectedYear;

      const [metricsRes, catalogRes] = await Promise.all([
        adminApi.getCampaignMetrics(filters),
        adminApi.getCampaignsCatalog(),
      ]);
      setMetrics(metricsRes);
      setCampaigns(catalogRes.campaigns || []);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  }, [periodType, weekStart, selectedMonth, selectedYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadDetail = async (campaignName: string) => {
    if (!campaignName) { toast.error('Campaña sin nombre'); return; }
    setDetailCampaign(campaignName);
    try {
      const filters: any = { periodType, campaign_name: campaignName };
      if (periodType === 'week') filters.weekStart = weekStart;
      if (periodType === 'month') { filters.month = selectedMonth; filters.year = selectedYear; }
      if (periodType === 'year') filters.year = selectedYear;
      const res = await adminApi.getCampaignDetail(campaignName);
      setDetailData(res);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveCampaign = async () => {
    try {
      await adminApi.saveCampaign({
        ...newCampaign,
        cost: parseFloat(newCampaign.cost) || 0,
      });
      toast.success('Campaña creada');
      setShowNewCampaign(false);
      setNewCampaign({ name: '', type: '', owner: '', cost: '0', coupon_code: '', utm_source: '', utm_medium: '', utm_campaign: '', notes: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const navigateWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const campaignRows = (metrics?.campaigns || []).map((c: any) => ({ ...c, campaign_name: normalizeAttribution(c.campaign_name) }));
  const topByRevenue = [...campaignRows].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);
  const topByCustomers = [...campaignRows].sort((a: any, b: any) => b.new_customers - a.new_customers).slice(0, 5);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando campañas...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Campañas</h1>
          <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Marketing</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
              <SelectItem value="year">Año</SelectItem>
            </SelectContent>
          </Select>

          {periodType === 'week' && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigateWeek(-1)}>←</Button>
              <span className="text-xs text-muted-foreground">{getPeriodLabel('week', weekStart)}</span>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => navigateWeek(1)}>→</Button>
            </div>
          )}
          {periodType === 'month' && (
            <>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
              </Select>
            </>
          )}
          {periodType === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
          </Button>

          <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva campaña</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nueva campaña</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nombre *</Label><Input value={newCampaign.name} onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Tipo</Label><Input value={newCampaign.type} onChange={e => setNewCampaign(p => ({ ...p, type: e.target.value }))} placeholder="paid, organic, referral..." /></div>
                  <div><Label>Owner</Label><Input value={newCampaign.owner} onChange={e => setNewCampaign(p => ({ ...p, owner: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Gasto (€)</Label><Input type="number" value={newCampaign.cost} onChange={e => setNewCampaign(p => ({ ...p, cost: e.target.value }))} /></div>
                  <div><Label>Cupón</Label><Input value={newCampaign.coupon_code} onChange={e => setNewCampaign(p => ({ ...p, coupon_code: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>utm_source</Label><Input value={newCampaign.utm_source} onChange={e => setNewCampaign(p => ({ ...p, utm_source: e.target.value }))} /></div>
                  <div><Label>utm_medium</Label><Input value={newCampaign.utm_medium} onChange={e => setNewCampaign(p => ({ ...p, utm_medium: e.target.value }))} /></div>
                  <div><Label>utm_campaign</Label><Input value={newCampaign.utm_campaign} onChange={e => setNewCampaign(p => ({ ...p, utm_campaign: e.target.value }))} /></div>
                </div>
                <div><Label>Notas</Label><Input value={newCampaign.notes} onChange={e => setNewCampaign(p => ({ ...p, notes: e.target.value }))} /></div>
                <Button onClick={handleSaveCampaign} disabled={!newCampaign.name.trim()} className="w-full">Guardar campaña</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Historical data quality notice */}
      <HistoricalDataNotice compact collapsible storageKey="admin-campaigns-notice" />

      {/* Summary KPIs */}
      {metrics?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KpiCard label="Registros atribuidos" value={metrics.summary.attributed_registrations} icon={Users} />
          <KpiCard label="Clientes atribuidos" value={metrics.summary.attributed_customers} icon={ShoppingBag} />
          <KpiCard label="Revenue atribuido" value={`€${metrics.summary.attributed_revenue?.toLocaleString() || 0}`} icon={DollarSign} />
          <KpiCard label="Ad Spend total" value={`€${metrics.summary.total_ad_spend?.toLocaleString() || 0}`} icon={TrendingUp} />
          <KpiCard label="CAC medio" value={`€${metrics.summary.avg_cac?.toFixed(2) || '—'}`} icon={BarChart3} />
          <KpiCard label="ROI medio" value={metrics.summary.avg_roi ? `${(metrics.summary.avg_roi * 100).toFixed(0)}%` : '—'} icon={TrendingUp} />
        </div>
      )}

      {/* Charts: top campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">🏆 Top 5 por Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topByRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="campaign_name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue €" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardHeader><CardTitle className="text-base">👥 Top 5 por Clientes Nuevos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topByCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="campaign_name" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="new_customers" fill="hsl(142, 76%, 36%)" name="Clientes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Campaign table */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">📊 Desglose por campaña</CardTitle>
          <CardDescription>Rendimiento de cada campaña en el periodo seleccionado</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead className="text-right">Registrados</TableHead>
                <TableHead className="text-right">Clientes nuevos</TableHead>
                <TableHead className="text-right">Recurrentes</TableHead>
                <TableHead className="text-right">Órdenes</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">CAC</TableHead>
                <TableHead className="text-right">Cupón usos</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignRows.length === 0 && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Sin datos de campaña para este periodo</TableCell></TableRow>
              )}
              {campaignRows.map((c: any) => (
                <TableRow key={c.campaign_name}>
                  <TableCell className="font-medium">{normalizeAttribution(c.campaign_name)}</TableCell>
                  <TableCell className="text-right">{c.registered}</TableCell>
                  <TableCell className="text-right">{c.new_customers}</TableCell>
                  <TableCell className="text-right">{c.returning_customers}</TableCell>
                  <TableCell className="text-right">{c.orders}</TableCell>
                  <TableCell className="text-right font-medium">€{c.revenue?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">€{c.cost?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={c.roi > 0 ? 'default' : 'destructive'} className="text-[10px]">
                      {c.roi !== null ? `${(c.roi * 100).toFixed(0)}%` : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">€{c.cac?.toFixed(2) || '—'}</TableCell>
                  <TableCell className="text-right">{c.coupon_uses || 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => loadDetail(c.campaign_name)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!detailCampaign} onOpenChange={() => { setDetailCampaign(null); setDetailData(null); }}>
        <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>📈 {detailCampaign}</SheetTitle>
          </SheetHeader>
          {!detailData ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Registrados</span><p className="text-lg font-bold">{detailData.registered}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Clientes nuevos</span><p className="text-lg font-bold">{detailData.new_customers}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Revenue</span><p className="text-lg font-bold">€{detailData.revenue?.toLocaleString()}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">CAC</span><p className="text-lg font-bold">€{detailData.cac?.toFixed(2) || '—'}</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Conv. Rate</span><p className="text-lg font-bold">{detailData.conversion_rate?.toFixed(1) || 0}%</p></div>
                <div className="p-3 rounded-lg bg-muted/50"><span className="text-muted-foreground">Recompra</span><p className="text-lg font-bold">{detailData.repurchase_rate?.toFixed(1) || 0}%</p></div>
              </div>
              {detailData.products && detailData.products.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader><CardTitle className="text-sm">Productos vendidos</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Uds</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {detailData.products.map((p: any) => (
                          <TableRow key={p.product_code}><TableCell>{p.product_code}</TableCell><TableCell className="text-right">{p.units}</TableCell><TableCell className="text-right">€{p.revenue?.toLocaleString()}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs flex items-center gap-1"><Icon className="w-3 h-3" />{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
