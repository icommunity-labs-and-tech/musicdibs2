import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { CreditCard, Search, ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

const typeBadge: Record<string, string> = {
  purchase: 'bg-green-500/20 text-green-400',
  usage: 'bg-destructive/20 text-destructive',
  admin_grant: 'bg-blue-500/20 text-blue-400',
  admin_deduct: 'bg-blue-500/20 text-blue-400',
  refund: 'bg-yellow-500/20 text-yellow-400',
  renewal: 'bg-muted text-muted-foreground',
  onboarding: 'bg-purple-500/20 text-purple-400',
};

export default function AdminCreditsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick adjust
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const loadTx = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllTransactions(offset, typeFilter, dateFrom, dateTo);
      setTransactions(res.transactions || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadTx(); }, [offset, typeFilter, dateFrom, dateTo]);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    try {
      const res = await adminApi.searchUserByEmail(searchEmail);
      setFoundUser(res.user);
    } catch (e: any) { toast.error(e.message); setFoundUser(null); }
  };

  const parsedAmount = parseInt(amount);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount !== 0 && parsedAmount >= -1000 && parsedAmount <= 1000;
  const isReasonValid = reason.trim().length >= 5;
  const resultingBalance = foundUser ? Math.max(0, foundUser.available_credits + (isAmountValid ? parsedAmount : 0)) : 0;

  const handleQuickAdjust = async () => {
    if (!isAmountValid || !isReasonValid || !foundUser) {
      if (!isAmountValid) toast.error('Cantidad inválida (entre -1000 y 1000, no puede ser 0)');
      else if (!isReasonValid) toast.error('El motivo debe tener al menos 5 caracteres');
      return;
    }
    try {
      await adminApi.adjustCredits(foundUser.user_id, parsedAmount, reason.slice(0, 200));
      toast.success(`Créditos ajustados: ${parsedAmount > 0 ? '+' : ''}${parsedAmount}`);
      setAmount(''); setReason('');
      handleSearchUser(); // refresh
      loadTx();
    } catch (e: any) { toast.error(e.message); }
  };

  const clearFilters = () => {
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setOffset(0);
  };

  const hasFilters = typeFilter || dateFrom || dateTo;

  const handleExportCsv = async () => {
    try {
      const res = await adminApi.exportCsv('transactions');
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transacciones_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV descargado');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Créditos</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
      </div>

      {/* Quick adjust card */}
      <Card className="border-border/40">
        <CardHeader><CardTitle className="text-base">Ajuste rápido de créditos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Email del usuario" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUser()} />
            <Button onClick={handleSearchUser} variant="secondary"><Search className="h-4 w-4 mr-1" /> Buscar</Button>
          </div>
          {foundUser && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/30">
              <p className="text-sm"><strong>{foundUser.display_name || foundUser.email}</strong> — Saldo actual: <span className="font-mono text-primary">{foundUser.available_credits}</span> créditos</p>
              
              {isAmountValid && foundUser.available_credits + parsedAmount < 0 && (
                <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                  ⚠️ El resultado sería negativo. El saldo se ajustará a 0.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad (+/-)</Label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10 o -5" />
                  {amount && !isAmountValid && (
                    <p className="text-xs text-destructive mt-1">
                      {parsedAmount === 0 ? 'No puede ser 0' : 'Entre -1000 y 1000'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Motivo <span className="text-muted-foreground">({reason.length}/200)</span></Label>
                  <Input value={reason} onChange={e => setReason(e.target.value.slice(0, 200))} placeholder="Mínimo 5 caracteres..." />
                  {reason.length > 0 && reason.length < 5 && (
                    <p className="text-xs text-destructive mt-1">Mínimo 5 caracteres</p>
                  )}
                </div>
              </div>
              <Button onClick={handleQuickAdjust} size="sm" disabled={!isAmountValid || !isReasonValid}>Aplicar ajuste</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={typeFilter || 'all'} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setOffset(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="purchase">Compra</SelectItem>
            <SelectItem value="usage">Uso</SelectItem>
            <SelectItem value="admin_grant">Admin +</SelectItem>
            <SelectItem value="admin_deduct">Admin -</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="refund">Reembolso</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Desde</Label>
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setOffset(0); }} className="w-36 h-9" />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Hasta</Label>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setOffset(0); }} className="w-36 h-9" />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Limpiar filtros
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* Transactions table */}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Email</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : transactions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin resultados para los filtros seleccionados</TableCell></TableRow>
            ) : transactions.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-sm">{t.email}</TableCell>
                <TableCell className={`font-mono font-medium ${t.amount > 0 ? 'text-green-400' : 'text-destructive'}`}>{t.amount > 0 ? '+' : ''}{t.amount}</TableCell>
                <TableCell><Badge className={typeBadge[t.type] || 'bg-muted text-muted-foreground'}>{t.type}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{t.description}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={transactions.length < 50} onClick={() => setOffset(offset + 50)}>
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
