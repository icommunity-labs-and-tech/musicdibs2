import { useState, useEffect, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Settings2, Shield, UserPlus, ScrollText, Download, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ACTION_LABELS: Record<string, string> = {
  adjust_credits: 'Ajuste créditos',
  set_kyc: 'Cambio KYC',
  block_user: 'Bloqueo usuario',
  unblock_user: 'Desbloqueo usuario',
  grant_admin: 'Otorgar admin',
  revoke_admin: 'Revocar admin',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSystemPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const AUDIT_PAGE_SIZE = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdmins();
      setAdmins(res.admins || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await adminApi.getAuditLog(auditPage * AUDIT_PAGE_SIZE, auditFilter);
      const logs = res.logs || [];
      setAuditLogs(logs);
      setAuditHasMore(logs.length >= AUDIT_PAGE_SIZE);
    } catch (e: any) { toast.error(e.message); }
    setAuditLoading(false);
  }, [auditPage, auditFilter]);

  useEffect(() => { load(); }, []);
  useEffect(() => { loadAudit(); }, [loadAudit]);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    try {
      const res = await adminApi.searchUserByEmail(newAdminEmail);
      if (!res.user) { toast.error('Usuario no encontrado'); return; }
      await adminApi.setAdminRole(res.user.user_id, true);
      toast.success('Admin añadido');
      setAddModal(false);
      setNewAdminEmail('');
      load();
      loadAudit();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('¿Revocar acceso de administrador?')) return;
    try {
      await adminApi.setAdminRole(userId, false);
      toast.success('Admin revocado');
      load();
      loadAudit();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleExportAudit = async () => {
    try {
      const res = await adminApi.exportCsv('audit');
      const blob = new Blob([res.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `musicdibs-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.message); }
  };

  function renderDetails(log: any) {
    const d = log.details || {};
    if (log.action === 'adjust_credits') {
      return `${d.amount > 0 ? '+' : ''}${d.amount} créditos — "${d.reason}"`;
    }
    if (log.action === 'set_kyc') return `KYC → ${d.new_status}`;
    if (log.action === 'block_user') return 'Bloqueado';
    if (log.action === 'unblock_user') return 'Desbloqueado';
    if (log.action === 'grant_admin') return 'Rol admin otorgado';
    if (log.action === 'revoke_admin') return 'Rol admin revocado';
    return JSON.stringify(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Sistema</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
      </div>

      {/* Administradores */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Administradores
          </CardTitle>
          <Button size="sm" onClick={() => setAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Añadir admin
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Email</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : admins.map(a => (
                <TableRow key={a.user_id}>
                  <TableCell className="font-medium">{a.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={a.user_id === user?.id}
                      onClick={() => handleRevoke(a.user_id)}
                    >
                      Revocar
                    </Button>
                    {a.user_id === user?.id && <span className="text-xs text-muted-foreground ml-2">(tú)</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log de auditoría */}
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Log de auditoría
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={auditFilter || 'all'} onValueChange={v => { setAuditFilter(v === 'all' ? '' : v); setAuditPage(0); }}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Todas las acciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="adjust_credits">Ajuste créditos</SelectItem>
                <SelectItem value="block_user">Bloqueo</SelectItem>
                <SelectItem value="unblock_user">Desbloqueo</SelectItem>
                <SelectItem value="grant_admin">Otorgar admin</SelectItem>
                <SelectItem value="revoke_admin">Revocar admin</SelectItem>
                <SelectItem value="set_kyc">Cambio KYC</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportAudit}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Fecha</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Usuario afectado</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : auditLogs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin registros de auditoría</TableCell></TableRow>
              ) : auditLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                  <TableCell className="text-sm">{log.admin_email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.target_email || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{renderDetails(log)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Paginación */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Página {auditPage + 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={auditPage === 0}
                onClick={() => setAuditPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!auditHasMore}
                onClick={() => setAuditPage(p => p + 1)}
              >
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backfill Orders from Stripe */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Backfill de pedidos históricos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Genera registros en la tabla <code>orders</code> a partir de invoices y charges existentes en Stripe.
            Marca <code>is_first_purchase</code> automáticamente. UTMs quedan como null para datos históricos.
            Excluye pagos reembolsados, fallidos, disputados o anulados.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                toast.info('Ejecutando dry-run…');
                try {
                  const res = await adminApi.backfillOrdersFromStripe(true);
                  const s = res.stats || {};
                  toast.success(`Dry-run: ${s.orders_to_create || 0} orders se crearían, ${s.duplicates_skipped || 0} duplicados, ${s.missing_user || 0} sin usuario`);
                  console.log('[BACKFILL DRY-RUN]', res);
                  console.table(s);
                } catch (e: any) { toast.error(e.message); }
              }}
            >
              Dry-run (simulación)
            </Button>
            <Button
              variant="default"
              onClick={async () => {
                if (!confirm('¿Ejecutar backfill REAL? Se crearán orders en la base de datos.')) return;
                toast.info('Ejecutando backfill real…');
                try {
                  const res = await adminApi.backfillOrdersFromStripe(false);
                  const s = res.stats || {};
                  toast.success(`Backfill: ${s.orders_created || 0} creados (${s.invoice_based || 0} inv + ${s.charge_based || 0} ch), ${s.duplicates_skipped || 0} dup, ${s.unknown_product_type || 0} unknown`);
                  console.log('[BACKFILL]', res);
                  console.table(s);
                } catch (e: any) { toast.error(e.message); }
              }}
            >
              Ejecutar backfill real
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Añadir administrador</DialogTitle></DialogHeader>
          <div>
            <Label>Email del usuario</Label>
            <Input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="usuario@email.com" onKeyDown={e => e.key === 'Enter' && handleAddAdmin()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button onClick={handleAddAdmin}>Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
