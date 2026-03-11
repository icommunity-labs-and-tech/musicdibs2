import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Users, MoreHorizontal, Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  // Credit modal
  const [creditModal, setCreditModal] = useState<{ open: boolean; userId: string; email: string; currentCredits: number }>({ open: false, userId: '', email: '', currentCredits: 0 });
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers(offset, search);
      setUsers(res.users || []);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [offset]);

  const handleSearch = () => { setOffset(0); load(); };

  const handleAdjustCredits = async () => {
    const amt = parseInt(creditAmount);
    if (isNaN(amt) || !creditReason.trim()) { toast.error('Cantidad y motivo obligatorios'); return; }
    try {
      await adminApi.adjustCredits(creditModal.userId, amt, creditReason);
      toast.success('Créditos ajustados');
      setCreditModal({ open: false, userId: '', email: '', currentCredits: 0 });
      setCreditAmount('');
      setCreditReason('');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSetKyc = async (userId: string, status: string) => {
    try {
      await adminApi.setKyc(userId, status);
      toast.success('KYC actualizado');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggleBlock = async (userId: string, blocked: boolean) => {
    if (!confirm(blocked ? '¿Bloquear este usuario?' : '¿Desbloquear este usuario?')) return;
    try {
      await adminApi.toggleBlock(userId, blocked);
      toast.success(blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (!confirm(isAdmin ? '¿Dar rol de admin a este usuario?' : '¿Quitar rol de admin a este usuario?')) return;
    try {
      await adminApi.setAdminRole(userId, isAdmin);
      toast.success(isAdmin ? 'Admin asignado' : 'Admin revocado');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const kycBadge = (status: string) => {
    const map: Record<string, string> = { verified: 'bg-green-500/20 text-green-400', pending: 'bg-yellow-500/20 text-yellow-400', unverified: 'bg-muted text-muted-foreground', rejected: 'bg-destructive/20 text-destructive' };
    return <Badge className={map[status] || map.unverified}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por email o nombre..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-9" />
        </div>
        <Button onClick={handleSearch} variant="secondary">Buscar</Button>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Obras</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.user_id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.display_name}</p>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline">{u.subscription_plan}</Badge></TableCell>
                <TableCell className="font-mono">{u.available_credits}</TableCell>
                <TableCell>{kycBadge(u.kyc_status)}</TableCell>
                <TableCell>{u.works_count}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {u.is_blocked
                    ? <Badge className="bg-destructive/20 text-destructive">Bloqueado</Badge>
                    : <Badge className="bg-green-500/20 text-green-400">Activo</Badge>}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setCreditModal({ open: true, userId: u.user_id, email: u.email }); }}>
                        Ajustar créditos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSetKyc(u.user_id, 'verified')}>KYC → Verificado</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetKyc(u.user_id, 'pending')}>KYC → Pendiente</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSetKyc(u.user_id, 'rejected')}>KYC → Rechazado</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleBlock(u.user_id, !u.is_blocked)}>
                        {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggleAdmin(u.user_id, u.role !== 'admin')}
                        disabled={u.user_id === user?.id && u.role === 'admin'}
                      >
                        {u.role === 'admin' ? 'Quitar admin' : 'Dar admin'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={users.length < 50} onClick={() => setOffset(offset + 50)}>
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Credit adjustment modal */}
      <Dialog open={creditModal.open} onOpenChange={open => !open && setCreditModal({ open: false, userId: '', email: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar créditos — {creditModal.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cantidad (+/-)</Label>
              <Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="Ej: 10 o -5" />
            </div>
            <div>
              <Label>Motivo (obligatorio)</Label>
              <Textarea value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Motivo del ajuste..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditModal({ open: false, userId: '', email: '' })}>Cancelar</Button>
            <Button onClick={handleAdjustCredits}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
