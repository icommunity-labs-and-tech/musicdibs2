import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Upload, Search, Link2, Unlink } from 'lucide-react';

const WORK_TYPES = [
  { value: 'song', label: 'Canción' },
  { value: 'album', label: 'Álbum' },
  { value: 'lyrics', label: 'Letra' },
  { value: 'composition', label: 'Composición' },
  { value: 'document', label: 'Documento' },
  { value: 'other', label: 'Otro' },
];

export default function ManagerRegisterWork() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedArtist = searchParams.get('artist');

  const [artists, setArtists] = useState<any[]>([]);
  const [selectedArtist, setSelectedArtist] = useState(preselectedArtist || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState('song');
  const [author, setAuthor] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Link account state
  const [linkEmail, setLinkEmail] = useState('');
  const [linkSearching, setLinkSearching] = useState(false);
  const [linkResult, setLinkResult] = useState<any>(null);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('managed_artists').select('id, artist_name, artist_user_id').eq('manager_user_id', user.id).eq('status', 'active').order('artist_name')
      .then(({ data }) => { setArtists(data || []); setLoading(false); });
  }, [user]);

  // Auto-fill author when artist selected
  useEffect(() => {
    const a = artists.find((x: any) => x.id === selectedArtist);
    if (a) setAuthor(a.artist_name);
  }, [selectedArtist, artists]);

  const selectedArtistData = artists.find((a: any) => a.id === selectedArtist);

  // Reset link state when artist changes
  useEffect(() => {
    setLinkEmail('');
    setLinkResult(null);
    setLinkError('');
  }, [selectedArtist]);

  const handleSearchUser = async () => {
    if (!linkEmail.trim()) return;
    setLinkSearching(true);
    setLinkResult(null);
    setLinkError('');
    try {
      const { data, error } = await supabase.functions.invoke('lookup-user-by-email', {
        body: { email: linkEmail.trim() },
      });
      if (error) throw error;
      if (data?.found) {
        setLinkResult(data);
      } else {
        setLinkError('No se encontró ninguna cuenta con ese email.');
      }
    } catch (err: any) {
      setLinkError(err.message || 'Error buscando usuario');
    } finally {
      setLinkSearching(false);
    }
  };

  const handleLinkAccount = async () => {
    if (!linkResult?.user_id || !selectedArtist) return;
    const { error } = await supabase
      .from('managed_artists')
      .update({ artist_user_id: linkResult.user_id } as any)
      .eq('id', selectedArtist);
    if (error) {
      toast.error('Error vinculando cuenta: ' + error.message);
      return;
    }
    toast.success('Cuenta vinculada correctamente');
    // Update local state
    setArtists((prev) =>
      prev.map((a) => (a.id === selectedArtist ? { ...a, artist_user_id: linkResult.user_id } : a))
    );
    setLinkResult(null);
    setLinkEmail('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!selectedArtist) { toast.error('Selecciona un artista'); return; }
    if (!user) return;

    setSubmitting(true);

    try {
      // Determine user_id: use artist's account if linked, otherwise manager's
      const workUserId = selectedArtistData?.artist_user_id || user.id;

      let filePath: string | null = null;

      // Upload file if provided
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${workUserId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('works-files').upload(path, file);
        if (uploadErr) { toast.error('Error subiendo archivo: ' + uploadErr.message); setSubmitting(false); return; }
        filePath = path;
      }

      // Insert work
      const { data: work, error: workErr } = await supabase.from('works').insert({
        user_id: workUserId,
        title: title.trim(),
        description: description.trim() || null,
        type: workType,
        author: author.trim() || null,
        file_path: filePath,
        status: 'processing',
      }).select('id').single();

      if (workErr || !work) { toast.error('Error al registrar: ' + (workErr?.message || 'desconocido')); setSubmitting(false); return; }

      // Insert managed_works link
      await supabase.from('managed_works').insert({
        work_id: work.id,
        managed_artist_id: selectedArtist,
        manager_user_id: user.id,
        authorized_by: 'contract',
      } as any);

      toast.success('Obra registrada correctamente');
      navigate('/dashboard/manager/works');
    } catch (err: any) {
      toast.error('Error inesperado: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Registrar obra en nombre de artista</h1>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Artist selector */}
          <div>
            <Label>Registrando en nombre de: *</Label>
            <Select value={selectedArtist} onValueChange={setSelectedArtist}>
              <SelectTrigger><SelectValue placeholder="Seleccionar artista" /></SelectTrigger>
              <SelectContent>
                {artists.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.artist_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedArtistData && (
            <>
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-muted-foreground">
                  Estás registrando esta obra en nombre de <strong>{selectedArtistData.artist_name}</strong> como su representante autorizado.
                </AlertDescription>
              </Alert>
              {selectedArtistData.artist_user_id ? (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <AlertDescription className="text-muted-foreground flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Cuenta vinculada — la obra se registrará en la cuenta del artista.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-blue-500/50 bg-blue-500/10">
                  <AlertDescription className="text-muted-foreground flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Sin cuenta vinculada — la obra se registrará bajo tu cuenta de manager.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div>
            <Label>Título de la obra *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la canción, álbum, etc." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de obra</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Autor</Label>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Nombre del autor" />
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción de la obra..." rows={3} />
          </div>

          <div>
            <Label>Archivo (opcional)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" /> {submitting ? 'Registrando...' : 'Registrar obra'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard/manager')}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
