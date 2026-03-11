import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { CreditCard, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);

  // Quick adjust
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const loadTx = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllTransactions(offset, typeFilter);
      setTransactions(res.transactions || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { loadTx(); }, [offset, typeFilter]);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    try {
      const res = await adminApi.searchUserByEmail(searchEmail);
      setFoundUser(res.user);
    } catch (e: any) { toast.error(e.message); setFoundUser(null); }
  };

  const handleQuickAdjust = async () => {
    const amt = parseInt(amount);
    if (isNaN(amt) || !reason.trim() || !foundUser) { toast.error('Completa todos los campos'); return; }
    try {
      await adminApi.adjustCredits(foundUser.user_id, amt, reason);
      toast.success(`Créditos ajustados: ${amt > 0 ? '+' : ''}${amt}`);
      setAmount(''); setReason('');
      handleSearchUser(); // refresh
      loadTx();
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad (+/-)</Label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10 o -5" />
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo..." />
                </div>
              </div>
              <Button onClick={handleQuickAdjust} size="sm">Aplicar ajuste</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions table */}
      <div className="flex gap-2 items-center">
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setOffset(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="purchase">Compra</SelectItem>
            <SelectItem value="usage">Uso</SelectItem>
            <SelectItem value="admin_grant">Admin</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="refund">Reembolso</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
