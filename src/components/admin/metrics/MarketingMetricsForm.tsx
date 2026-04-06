import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Save, Loader2, PencilLine, DollarSign, TrendingDown, Wallet, Flame } from 'lucide-react';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function MarketingMetricsForm({ hasManualMetrics }: { hasManualMetrics?: boolean }) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [adSpend, setAdSpend] = useState('');
  const [cogs, setCogs] = useState('');
  const [cashBalance, setCashBalance] = useState('');
  const [monthlyBurn, setMonthlyBurn] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await adminApi.callAction('get_marketing_metrics', {});
      setHistory(res.items || []);
      // Auto-fill if current month exists
      const current = (res.items || []).find(
        (i: any) => i.year === parseInt(year) && i.month === parseInt(month)
      );
      if (current) {
        setAdSpend(String(current.ad_spend || ''));
        setCogs(String(current.cogs || ''));
        setCashBalance(String(current.cash_balance || ''));
        setMonthlyBurn(String(current.monthly_burn || ''));
        setNotes(current.notes || '');
      } else {
        setAdSpend(''); setCogs(''); setCashBalance(''); setMonthlyBurn(''); setNotes('');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadHistory(); }, []);

  // When month/year changes, update form
  useEffect(() => {
    const current = history.find(
      (i: any) => i.year === parseInt(year) && i.month === parseInt(month)
    );
    if (current) {
      setAdSpend(String(current.ad_spend || ''));
      setCogs(String(current.cogs || ''));
      setCashBalance(String(current.cash_balance || ''));
      setMonthlyBurn(String(current.monthly_burn || ''));
      setNotes(current.notes || '');
    } else {
      setAdSpend(''); setCogs(''); setCashBalance(''); setMonthlyBurn(''); setNotes('');
    }
  }, [year, month, history]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.callAction('save_marketing_metrics', {
        year, month, ad_spend: adSpend, cogs, cash_balance: cashBalance, monthly_burn: monthlyBurn, notes,
      });
      toast.success(`Métricas guardadas para ${MONTH_NAMES[parseInt(month)]} ${year}`);
      await loadHistory();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Métricas Manuales de Negocio</CardTitle>
            {hasManualMetrics ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Datos reales activos</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Usando estimaciones</Badge>
            )}
          </div>
          <CardDescription>
            Introduce los gastos mensuales para calcular CAC, Gross Margin, Burn Rate y Runway con datos reales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-xs">Año</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mes</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.slice(1).map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Ad Spend (€)
              </Label>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={adSpend} onChange={e => setAdSpend(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Gasto total en marketing/publicidad</p>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> COGS (€)
              </Label>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={cogs} onChange={e => setCogs(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Costes directos (infra, APIs, hosting)</p>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Cash Balance (€)
              </Label>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={cashBalance} onChange={e => setCashBalance(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Saldo de caja al final del mes</p>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Flame className="w-3 h-3" /> Monthly Burn (€)
              </Label>
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={monthlyBurn} onChange={e => setMonthlyBurn(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Gasto mensual total (nóminas + infra + otros)</p>
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs">Notas</Label>
            <Textarea
              placeholder="Notas opcionales sobre este mes..."
              className="h-16 text-sm"
              value={notes} onChange={e => setNotes(e.target.value)}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar {MONTH_NAMES[parseInt(month)]} {year}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">📊 Historial de Métricas Manuales</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ad Spend</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Burn</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Actualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => { setYear(String(item.year)); setMonth(String(item.month)); }}
                    >
                      <TableCell className="font-medium">
                        {MONTH_NAMES[item.month]} {item.year}
                      </TableCell>
                      <TableCell className="text-right">€{parseFloat(item.ad_spend).toLocaleString()}</TableCell>
                      <TableCell className="text-right">€{parseFloat(item.cogs).toLocaleString()}</TableCell>
                      <TableCell className="text-right">€{parseFloat(item.cash_balance).toLocaleString()}</TableCell>
                      <TableCell className="text-right">€{parseFloat(item.monthly_burn).toLocaleString()}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-muted-foreground">
                        {item.notes || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.updated_at).toLocaleDateString('es-ES')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
