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
import { Users, MoreHorizontal, Search, ChevronLeft, ChevronRight, Shield, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UserDetailSheet from '@/components/admin/UserDetailSheet';

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
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

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

  const handleToggleManager = async (userId: string, isManager: boolean) => {
    if (!confirm(isManager ? '¿Dar rol de manager a este usuario?' : '¿Quitar rol de manager a este usuario?')) return;
    try {
      await adminApi.setManagerRole(userId, isManager);
      toast.success(isManager ? 'Manager asignado' : 'Manager revocado');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  // Force delete user
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: '', email: '' });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleForceDelete = async () => {
    if (deleteConfirmText !== 'ELIMINAR') return;
    setDeleting(true);
    try {
      await adminApi.callAction('force_delete_user', { user_id: deleteModal.userId });
      toast.success('Usuario eliminado correctamente');
      setDeleteModal({ open: false, userId: '', email: '' });
      setDeleteConfirmText('');
      load();
    } catch (e: any) { toast.error(e.message); }
    setDeleting(false);
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

      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por email o nombre..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="pl-9" />
        </div>
        <Button onClick={handleSearch} variant="secondary">Buscar</Button>
        <Button variant="outline" size="sm" onClick={async () => {
          try {
            const res = await adminApi.exportCsv('users');
            const blob = new Blob([res.csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `usuarios_${new Date().toISOString().slice(0,10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
            toast.success('CSV descargado');
          } catch (e: any) { toast.error(e.message); }
        }}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
           <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Usuario</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead>Obras</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead>Últ. actividad</TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : users.map(u => (
              <TableRow key={u.user_id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedUser(u)}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{u.display_name || u.email?.split('@')[0] || '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.phone || '—'}</TableCell>
                <TableCell><Badge variant="outline">{u.subscription_plan}</Badge></TableCell>
                <TableCell className="font-mono">{u.available_credits}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(u.roles || ['user']).map((r: string) => (
                      <Badge key={r} className={
                        r === 'admin' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                        r === 'manager' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-muted text-muted-foreground'
                      }>{r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{kycBadge(u.kyc_status)}</TableCell>
                <TableCell>{u.works_count}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.updated_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {u.stripe_customer_id
                    ? <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Vinculado</Badge>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {u.is_blocked
                    ? <Badge className="bg-destructive/20 text-destructive">Bloqueado</Badge>
                    : <Badge className="bg-green-500/20 text-green-400">Activo</Badge>}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setCreditModal({ open: true, userId: u.user_id, email: u.email, currentCredits: u.available_credits }); }}>
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
                        onClick={() => handleToggleAdmin(u.user_id, !(u.roles || []).includes('admin'))}
                        disabled={u.user_id === user?.id && (u.roles || []).includes('admin')}
                      >
                        {(u.roles || []).includes('admin') ? 'Quitar admin' : 'Dar admin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleManager(u.user_id, !(u.roles || []).includes('manager'))}
                      >
                        {(u.roles || []).includes('manager') ? 'Quitar manager' : 'Dar manager'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={u.user_id === user?.id}
                        onClick={() => setDeleteModal({ open: true, userId: u.user_id, email: u.email })}
                      >
                        Forzar eliminación de cuenta
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
      <Dialog open={creditModal.open} onOpenChange={open => !open && setCreditModal({ open: false, userId: '', email: '', currentCredits: 0 })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar créditos — {creditModal.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Saldo actual: <span className="font-mono font-medium text-primary">{creditModal.currentCredits}</span> créditos</p>
            {creditAmount && !isNaN(parseInt(creditAmount)) && (creditModal.currentCredits + parseInt(creditAmount)) < 0 && (
              <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                ⚠️ El resultado sería negativo. El saldo se ajustará a 0.
              </div>
            )}
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
            <Button variant="outline" onClick={() => setCreditModal({ open: false, userId: '', email: '', currentCredits: 0 })}>Cancelar</Button>
            <Button onClick={handleAdjustCredits} disabled={!creditReason.trim() || !creditAmount || isNaN(parseInt(creditAmount))}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UserDetailSheet user={selectedUser} open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)} />
    </div>
  );
}
