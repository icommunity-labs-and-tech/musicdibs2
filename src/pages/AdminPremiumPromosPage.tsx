import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Crown, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const STATUS_OPTIONS = [
  { value: 'submitted', label: 'Pendiente', badge: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'under_review', label: 'En revisión', badge: 'bg-blue-500/20 text-blue-400' },
  { value: 'approved', label: 'Aprobada', badge: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'scheduled', label: 'Programada', badge: 'bg-purple-500/20 text-purple-400' },
  { value: 'published', label: 'Publicada', badge: 'bg-green-500/20 text-green-400' },
  { value: 'rejected', label: 'Rechazada', badge: 'bg-destructive/20 text-destructive' },
];

const statusBadge = (status: string) => {
  const s = STATUS_OPTIONS.find(o => o.value === status);
  return s ? <Badge className={s.badge}>{s.label}</Badge> : <Badge variant="outline">{status}</Badge>;
};

export default function AdminPremiumPromosPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  // Rejection dialog state
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Publish dialog state
  const [publishTarget, setPublishTarget] = useState<any | null>(null);
  const [igUrl, setIgUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPremiumPromos(offset, statusFilter);
      setPromos(res.promos || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [offset, statusFilter]);

  const changeStatus = async (promoId: string, newStatus: string, reason?: string, ig?: string, tiktok?: string) => {
    try {
      await adminApi.updatePremiumPromoStatus(promoId, newStatus, reason, ig, tiktok);
      toast.success(`Estado cambiado a "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`);
      load();
      if (selected?.id === promoId) setSelected((prev: any) => ({ ...prev, status: newStatus }));
    } catch (e: any) { toast.error(e.message); }
  };

  const openRejectDialog = (promo: any) => {
    setRejectTarget(promo);
    setRejectionReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    await changeStatus(rejectTarget.id, 'rejected', rejectionReason);
    setRejecting(false);
    setRejectTarget(null);
    if (selected?.id === rejectTarget.id) setSelected(null);
  };

  const openPublishDialog = (promo: any) => {
    setPublishTarget(promo);
    setIgUrl('');
    setTiktokUrl('');
  };

  const confirmPublish = async () => {
    if (!publishTarget) return;
    setPublishing(true);
    await changeStatus(publishTarget.id, 'published', undefined, igUrl || undefined, tiktokUrl || undefined);
    setPublishing(false);
    setPublishTarget(null);
    if (selected?.id === publishTarget.id) setSelected(null);
  };

  const downloadMedia = async (filePath: string) => {
    try {
      const res = await adminApi.callAction('get_premium_promo_media_url', { file_path: filePath });
      if (!res?.signed_url) throw new Error('No se pudo obtener la URL del archivo');

      const filename = filePath.split('/').pop() || 'media';
      const response = await fetch(res.signed_url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) { toast.error('Error descargando archivo: ' + e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Promos Premium</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="w-48">
            <Select value={statusFilter} onValueChange={v => { setOffset(0); setStatusFilter(v === 'all' ? '' : v); }}>
              <SelectTrigger><SelectValue placeholder="Todos los estados" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {statusFilter && statusFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setOffset(0); }}>Limpiar</Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Artista</TableHead>
                <TableHead>Canción</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : promos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin solicitudes</TableCell></TableRow>
              ) : promos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                  <TableCell className="font-medium">{p.artist_name}</TableCell>
                  <TableCell>{p.song_title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.user_email || '—'}</TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {p.media_file_path && (
                      <Button variant="ghost" size="icon" onClick={() => downloadMedia(p.media_file_path)} title="Descargar archivo">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setSelected(p)}><Eye className="h-4 w-4" /></Button>
                    {p.status === 'submitted' && (
                      <Button size="sm" variant="outline" onClick={() => changeStatus(p.id, 'approved')}>Aprobar</Button>
                    )}
                    {(p.status === 'approved' || p.status === 'scheduled') && (
                      <Button size="sm" variant="hero" onClick={() => openPublishDialog(p)}>Publicar</Button>
                    )}
                    {p.status === 'submitted' && (
                      <Button size="sm" variant="destructive" onClick={() => openRejectDialog(p)}>Rechazar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - 50))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={promos.length < 50} onClick={() => setOffset(o => o + 50)}>
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-400" /> Detalle Promo Premium</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-y-2">
                <span className="text-muted-foreground">Artista</span><span className="font-medium">{selected.artist_name}</span>
                <span className="text-muted-foreground">Canción</span><span className="font-medium">{selected.song_title}</span>
                <span className="text-muted-foreground">Email</span><span>{selected.user_email || '—'}</span>
                <span className="text-muted-foreground">Fecha</span><span>{format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm')}</span>
                <span className="text-muted-foreground">Letra</span><span className="whitespace-pre-wrap max-h-40 overflow-y-auto">{selected.description}</span>
                <span className="text-muted-foreground">Enlaces / Notas</span>
                <span className="whitespace-pre-wrap">{selected.external_link || '—'}</span>
                {selected.media_file_path && (
                  <>
                    <span className="text-muted-foreground">Archivo adjunto</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 w-fit"
                      onClick={() => downloadMedia(selected.media_file_path)}
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </Button>
                  </>
                )}
                {selected.team_notes && (
                  <>
                    <span className="text-muted-foreground">Motivo rechazo</span>
                    <span className="whitespace-pre-wrap text-destructive">{selected.team_notes}</span>
                  </>
                )}
                <span className="text-muted-foreground">Obra (ID)</span><span className="text-xs text-muted-foreground break-all">{selected.work_id || '—'}</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            {selected?.status === 'submitted' && (
              <>
                <Button variant="outline" onClick={() => changeStatus(selected.id, 'approved')}>Aprobar</Button>
                <Button variant="destructive" onClick={() => { setSelected(null); openRejectDialog(selected); }}>Rechazar</Button>
              </>
            )}
            {(selected?.status === 'approved' || selected?.status === 'scheduled') && (
              <Button variant="hero" onClick={() => { setSelected(null); openPublishDialog(selected); }}>Marcar como Publicada</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={open => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Promo Premium</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo del rechazo. Se enviará un correo al solicitante con esta explicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              <strong>{rejectTarget?.artist_name}</strong> — {rejectTarget?.song_title}
            </p>
            <Textarea
              placeholder="Escribe el motivo del rechazo..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejecting}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || rejecting}
              onClick={confirmReject}
            >
              {rejecting ? 'Enviando...' : 'Enviar rechazo'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish Dialog */}
      <AlertDialog open={!!publishTarget} onOpenChange={open => !open && setPublishTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar Promo Premium</AlertDialogTitle>
            <AlertDialogDescription>
              Introduce los enlaces de las redes sociales donde se ha publicado la promo. Se enviará un correo al solicitante con estos enlaces.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              <strong>{publishTarget?.artist_name}</strong> — {publishTarget?.song_title}
            </p>
            <div className="space-y-2">
              <Label htmlFor="ig-url">URL de Instagram</Label>
              <Input
                id="ig-url"
                placeholder="https://www.instagram.com/p/..."
                value={igUrl}
                onChange={e => setIgUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok-url">URL de TikTok</Label>
              <Input
                id="tiktok-url"
                placeholder="https://www.tiktok.com/@..."
                value={tiktokUrl}
                onChange={e => setTiktokUrl(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Cancelar</AlertDialogCancel>
            <Button
              disabled={publishing}
              onClick={confirmPublish}
            >
              {publishing ? 'Publicando...' : 'Enviar publicación'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
