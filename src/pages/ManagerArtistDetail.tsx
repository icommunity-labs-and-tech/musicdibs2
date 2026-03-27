import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Pencil, Save, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const REP_LABELS: Record<string, string> = { full: 'Completa', registration: 'Solo registro', distribution: 'Solo distribución' };
const STATUS_LABELS: Record<string, string> = { processing: 'Procesando', registered: 'Registrada', certified: 'Registrada', failed: 'Fallida' };

export default function ManagerArtistDetail() {
  const { artistId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<any>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !artistId) return;
    const load = async () => {
      const [aRes, wRes] = await Promise.all([
        supabase.from('managed_artists').select('*').eq('id', artistId).eq('manager_user_id', user.id).single(),
        supabase.from('managed_works').select('*, works(title, status, created_at, blockchain_hash)').eq('managed_artist_id', artistId).eq('manager_user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (aRes.data) { setArtist(aRes.data); setEditForm(aRes.data); }
      setWorks(wRes.data || []);
      setLoading(false);
    };
    load();
  }, [user, artistId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('managed_artists').update({
      artist_name: editForm.artist_name,
      artist_email: editForm.artist_email,
      artist_phone: editForm.artist_phone,
      artist_country: editForm.artist_country,
      representation_type: editForm.representation_type,
      notes: editForm.notes,
    } as any).eq('id', artistId!);
    setSaving(false);
    if (error) { toast.error('Error: ' + error.message); return; }
    setArtist({ ...artist, ...editForm });
    setEditing(false);
    toast.success('Datos actualizados');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!artist) return <p className="text-center py-8 text-muted-foreground">Artista no encontrado.</p>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/dashboard/manager/artists')}><ArrowLeft className="h-4 w-4 mr-2" /> Volver</Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{artist.artist_name}</CardTitle>
          {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Nombre</Label><Input value={editForm.artist_name} onChange={(e) => setEditForm({ ...editForm, artist_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={editForm.artist_email || ''} onChange={(e) => setEditForm({ ...editForm, artist_email: e.target.value })} /></div>
                <div><Label>Teléfono</Label><Input value={editForm.artist_phone || ''} onChange={(e) => setEditForm({ ...editForm, artist_phone: e.target.value })} /></div>
                <div><Label>País</Label><Input value={editForm.artist_country || ''} onChange={(e) => setEditForm({ ...editForm, artist_country: e.target.value })} /></div>
                <div>
                  <Label>Representación</Label>
                  <Select value={editForm.representation_type} onValueChange={(v) => setEditForm({ ...editForm, representation_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Completa</SelectItem>
                      <SelectItem value="registration">Solo registro</SelectItem>
                      <SelectItem value="distribution">Solo distribución</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notas</Label><Textarea value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} /></div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setEditForm(artist); }}>Cancelar</Button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div><p className="text-xs text-muted-foreground">Email</p><p>{artist.artist_email || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Teléfono</p><p>{artist.artist_phone || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">País</p><p>{artist.artist_country || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Representación</p><Badge>{REP_LABELS[artist.representation_type] || artist.representation_type}</Badge></div>
              {artist.notes && <div className="col-span-full"><p className="text-xs text-muted-foreground">Notas</p><p className="text-sm">{artist.notes}</p></div>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Obras registradas</CardTitle>
          <Button size="sm" onClick={() => navigate(`/dashboard/manager/register?artist=${artistId}`)}><Upload className="h-4 w-4 mr-2" /> Registrar nueva obra</Button>
        </CardHeader>
        <CardContent>
          {works.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">No hay obras registradas para este artista.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Hash blockchain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {works.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.works?.title || '—'}</TableCell>
                      <TableCell>{w.works?.created_at ? format(new Date(w.works.created_at), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell><Badge variant="outline">{STATUS_LABELS[w.works?.status] || w.works?.status}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{w.works?.blockchain_hash ? w.works.blockchain_hash.substring(0, 16) + '...' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
