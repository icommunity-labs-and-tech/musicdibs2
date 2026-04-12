import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Loader2, UserX, TrendingDown, BarChart3, AlertTriangle } from 'lucide-react';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const REASON_LABELS: Record<string, string> = {
  no_necesito: 'Ya no necesita el servicio',
  caro: 'Demasiado caro',
  alternativa: 'Encontró alternativa',
  problemas_tecnicos: 'Problemas técnicos',
  privacidad: 'Privacidad / GDPR',
  otro: 'Otro',
  probando: 'Solo estaba probando',
  terminado: 'Ya creó lo que necesitaba',
  no_uso: 'No lo usa suficiente',
  pocos_creditos: 'Pocos créditos',
  mal_resultado: 'Mal resultado',
  otra_herramienta: 'Usa otra herramienta',
};

export default function AdminChurnPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.callAction('get_churn_data');
      setSurveys(data.surveys || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Metrics
  const now = new Date();
  const thisMonth = surveys.filter(s => {
    const d = new Date(s.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const reasonCounts: Record<string, number> = {};
  const planCounts: Record<string, number> = {};
  for (const s of thisMonth) {
    reasonCounts[s.reason] = (reasonCounts[s.reason] || 0) + 1;
    if (s.plan_type) planCounts[s.plan_type] = (planCounts[s.plan_type] || 0) + 1;
  }

  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
  const topPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0];

  const handleForceDelete = async () => {
    if (!targetUserId.trim()) return;
    setDeleting(true);
    try {
      await adminApi.callAction('force_delete_user', { user_id: targetUserId.trim() });
      toast.success('Cuenta eliminada correctamente');
      setForceDeleteOpen(false);
      setTargetUserId('');
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserX className="h-5 w-5" /> Bajas de usuarios
        </h2>
        <Button variant="destructive" size="sm" onClick={() => setForceDeleteOpen(true)}>
          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Procesar baja manualmente
        </Button>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4" /> Bajas este mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{thisMonth.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Motivo más frecuente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {topReason ? REASON_LABELS[topReason[0]] || topReason[0] : '—'}
            </p>
            {topReason && <p className="text-xs text-muted-foreground">{topReason[1]} caso{topReason[1] > 1 ? 's' : ''}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <UserX className="h-4 w-4" /> Plan más afectado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{topPlan ? topPlan[0] : '—'}</p>
            {topPlan && <p className="text-xs text-muted-foreground">{topPlan[1]} baja{topPlan[1] > 1 ? 's' : ''}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Surveys table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas encuestas de baja</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : surveys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay bajas registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono">{s.email || '—'}</TableCell>
                      <TableCell className="text-xs">{formatDate(s.created_at)}</TableCell>
                      <TableCell className="text-xs">{REASON_LABELS[s.reason] || s.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{s.plan_type || 'Free'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{s.credits_remaining ?? '—'}</TableCell>
                      <TableCell>
                        {s.account_deleted ? (
                          <Badge variant="destructive" className="text-xs">Eliminada</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Activa</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Force delete dialog */}
      <Dialog open={forceDeleteOpen} onOpenChange={setForceDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Procesar baja manualmente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esto ejecutará el proceso completo de eliminación de cuenta para el usuario especificado.
            </p>
            <div className="space-y-2">
              <Label className="text-sm">ID del usuario</Label>
              <Input
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                placeholder="UUID del usuario"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setForceDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleForceDelete} disabled={deleting || !targetUserId.trim()}>
              {deleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Eliminar cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
