import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Music, Search, ChevronLeft, ChevronRight, ExternalLink, Download, Eye, Loader2, MoreHorizontal, Trash2, RotateCcw } from 'lucide-react';

export default function AdminWorksPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailWork, setDetailWork] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllWorks(offset, statusFilter, search);
      setWorks(res.works || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [offset, statusFilter]);

  const handleExportCsv = async () => {
    try {
      const res = await adminApi.exportCsv('works');
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `obras_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado correctamente');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteWork = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteWork(deleteTarget.id);
      toast.success(`Obra "${deleteTarget.title}" eliminada correctamente`);
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setDeleting(false);
  };

  const handleRetryWork = async (work: any) => {
    try {
      // Find the queue item for this work
      const res = await adminApi.callAction('get_ibs_queue');
      const queueItem = (res.items || []).find((i: any) => i.work_id === work.id);
      if (!queueItem) {
        toast.error('No se encontró elemento en la cola para esta obra');
        return;
      }
      await adminApi.callAction('retry_ibs_queue_item', { queueId: queueItem.id, workId: work.id });
      toast.success('Reintento programado');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const getProcessingDelay = (createdAt: string) => {
    const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
    if (mins >= 60) return { label: 'Posible fallo', color: 'text-red-400' };
    if (mins >= 15) return { label: 'Retrasada', color: 'text-amber-400' };
    return { label: 'Certificando...', color: 'text-muted-foreground' };
  };

  const statusBadge = (status: string, createdAt?: string) => {
    if (status === 'processing') {
      const delay = createdAt ? getProcessingDelay(createdAt) : null;
      return (
        <div className="flex flex-col gap-0.5">
          <Badge className="bg-yellow-500/20 text-yellow-400 animate-pulse">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            processing
          </Badge>
          {delay && <span className={`text-[10px] ${delay.color}`}>{delay.label}</span>}
        </div>
      );
    }
    const map: Record<string, string> = {
      registered: 'bg-green-500/20 text-green-400',
      failed: 'bg-destructive/20 text-destructive',
    };
    return <Badge className={map[status] || 'bg-muted text-muted-foreground'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Music className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Obras</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título o email..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setOffset(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="processing">Procesando</SelectItem>
            <SelectItem value="registered">Registrado</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={load} variant="secondary">Buscar</Button>
        <Button onClick={handleExportCsv} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Usuario</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Checker</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : works.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : works.map(w => (
              <TableRow key={w.id}>
                <TableCell>
                  <div>
                    <p className="text-sm">{w.user_email}</p>
                    <p className="text-xs text-muted-foreground">{w.user_display_name}</p>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{w.title}</TableCell>
                <TableCell><Badge variant="outline">{w.type}</Badge></TableCell>
                <TableCell>{statusBadge(w.status, w.created_at)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {w.checker_url && w.status === 'registered' ? (
                    <a href={w.checker_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                      Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetailWork(w)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver registro
                      </DropdownMenuItem>
                      {w.status === 'failed' && (
                        <DropdownMenuItem onClick={() => handleRetryWork(w)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reintentar registro
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(w)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar registro
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
        <Button variant="outline" size="sm" disabled={works.length < 50} onClick={() => setOffset(offset + 50)}>
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta obra?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar permanentemente la obra <strong>"{deleteTarget?.title}"</strong> de <strong>{deleteTarget?.user_email}</strong>.
              <br /><br />
              Esta acción eliminará también los archivos asociados, registros de gestión y datos de la cola de certificación. <strong>No se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWork}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Work Detail Modal */}
      <Dialog open={!!detailWork} onOpenChange={open => !open && setDetailWork(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de obra</DialogTitle>
          </DialogHeader>
          {detailWork && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Título</p>
                  <p className="font-medium">{detailWork.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p>{detailWork.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Usuario</p>
                  <p>{detailWork.user_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Estado</p>
                  {statusBadge(detailWork.status, detailWork.created_at)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha de creación</p>
                  <p>{new Date(detailWork.created_at).toLocaleString()}</p>
                </div>
                {detailWork.certified_at && (
                  <div>
                    <p className="text-muted-foreground text-xs">Fecha de certificación</p>
                    <p>{new Date(detailWork.certified_at).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Autor</p>
                  <p>{detailWork.author || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Descripción</p>
                  <p>{detailWork.description || '—'}</p>
                </div>
              </div>

              {/* Blockchain info */}
              {detailWork.blockchain_hash && (
                <div className="border border-border/40 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Blockchain</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-muted-foreground text-xs">Red</p>
                      <p className="text-xs">{detailWork.blockchain_network || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Hash</p>
                      <p className="text-xs font-mono break-all">{detailWork.blockchain_hash}</p>
                    </div>
                  </div>
                  {detailWork.checker_url && (
                    <a href={detailWork.checker_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                      Abrir checker <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* IBS info */}
              {detailWork.ibs_evidence_id && (
                <div className="border border-border/40 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">IBS</p>
                  <p className="text-xs">Evidence ID: <span className="font-mono">{detailWork.ibs_evidence_id}</span></p>
                  {detailWork.ibs_signature_id && (
                    <p className="text-xs">Signature ID: <span className="font-mono">{detailWork.ibs_signature_id}</span></p>
                  )}
                </div>
              )}

              {/* Failed status info */}
              {detailWork.status === 'failed' && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-destructive">Obra fallida</p>
                  <p className="text-xs text-muted-foreground">
                    Fecha del fallo: {new Date(detailWork.updated_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    El crédito fue reembolsado automáticamente si se consumió al registrar.
                  </p>
                </div>
              )}

              {/* Certificate */}
              {detailWork.certificate_url && (
                <a href={detailWork.certificate_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                  Descargar certificado <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}