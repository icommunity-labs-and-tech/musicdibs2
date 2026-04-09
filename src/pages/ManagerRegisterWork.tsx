import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKycGuard } from '@/hooks/useKycGuard';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FileDropzone } from '@/components/FileDropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Upload, Search, Link2, X, FileUp, Plus } from 'lucide-react';
import { SignatureSelector } from '@/components/dashboard/register/SignatureSelector';

const WORK_TYPES = [
  { value: 'audio', label: 'Canción' },
  { value: 'instrumental', label: 'Instrumental' },
  { value: 'document', label: 'Letra' },
  { value: 'demo', label: 'Demo' },
  { value: 'videoclip', label: 'Videoclip' },
  { value: 'cover_art', label: 'Portada de disco' },
  { value: 'other', label: 'Otro' },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ManagerRegisterWork() {
  const { user } = useAuth();
  const { isVerified, kycLoading } = useKycGuard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedArtist = searchParams.get('artist');

  const [artists, setArtists] = useState<any[]>([]);
  const [selectedArtist, setSelectedArtist] = useState(preselectedArtist || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workType, setWorkType] = useState('audio');
  const [author, setAuthor] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [signatureId, setSignatureId] = useState('');
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

  const handleAddFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setFiles(prev => {
      const merged = [...prev, ...arr];
      return merged.filter((f, i, a) => a.findIndex(x => x.name === f.name && x.size === f.size) === i);
    });
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

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
    setArtists((prev) =>
      prev.map((a) => (a.id === selectedArtist ? { ...a, artist_user_id: linkResult.user_id } : a))
    );
    setLinkResult(null);
    setLinkEmail('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!selectedArtist) { toast.error('Selecciona un artista'); return; }
    if (!signatureId) { toast.error('Selecciona una firma digital'); return; }
    if (files.length === 0) { toast.error('Adjunta al menos un archivo'); return; }
    if (!user) return;

    setSubmitting(true);

    try {
      // Always use manager's user_id for RLS compliance; the managed_works table tracks the artist relationship
      const workUserId = user.id;

      // Spend credits
      const { data: spendResult, error: spendError } = await supabase.functions.invoke('spend-credits', {
        body: { feature: 'register_work', description: `Registro manager: ${title}` },
      });
      if (spendError) throw new Error(spendError.message || 'Error al descontar créditos');
      if (spendResult?.error) throw new Error(spendResult.error);

      // Compute SHA-256 hash of primary file
      const primaryBuffer = await files[0].arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', primaryBuffer);
      const fileHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Upload all files
      const filePaths: string[] = [];
      for (const f of files) {
        const ext = f.name.split('.').pop();
        const path = `${user.id}/${Date.now()}_${f.name}`;
        const { error: uploadErr } = await supabase.storage.from('works-files').upload(path, f);
        if (uploadErr) { toast.error('Error subiendo archivo: ' + uploadErr.message); setSubmitting(false); return; }
        filePaths.push(path);
      }

      // Insert work
      const { data: work, error: workErr } = await supabase.from('works').insert({
        user_id: workUserId,
        title: title.trim(),
        description: description.trim() || null,
        type: workType,
        author: author.trim() || null,
        file_path: filePaths[0],
        file_hash: fileHash,
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

      // Call iBS to generate blockchain evidence
      const { data: ibsResult, error: ibsError } = await supabase.functions.invoke('register-work-ibs', {
        body: { workId: work.id, signatureId, additionalFilePaths: filePaths.slice(1) },
      });

      if (ibsError) {
        console.error('[ManagerRegister] iBS call error:', ibsError);
        toast.warning('Obra registrada, pero la certificación blockchain puede tardar.');
      } else if (ibsResult?.success === false) {
        toast.warning('Obra registrada. Certificación en proceso.');
      } else {
        toast.success('Obra registrada y enviada a certificación blockchain');
      }

      window.dispatchEvent(new CustomEvent('musicdibs:work-registered'));
      navigate('/dashboard/manager/works');
    } catch (err: any) {
      toast.error('Error inesperado: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (kycLoading || loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!isVerified) return <Navigate to="/dashboard/verify-identity" replace />;

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
                <div className="space-y-3">
                  <Alert className="border-blue-500/50 bg-blue-500/10">
                    <AlertDescription className="text-muted-foreground flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                      Sin cuenta vinculada — la obra se registrará bajo tu cuenta de manager.
                    </AlertDescription>
                  </Alert>
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Vincular cuenta de MusicDibs
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Email del artista en MusicDibs"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleSearchUser} disabled={linkSearching || !linkEmail.trim()}>
                        <Search className="h-4 w-4 mr-1" /> {linkSearching ? 'Buscando...' : 'Buscar'}
                      </Button>
                    </div>
                    {linkError && <p className="text-sm text-destructive">{linkError}</p>}
                    {linkResult && (
                      <div className="flex items-center justify-between bg-muted/50 rounded-md p-3">
                        <div>
                          <p className="text-sm font-medium">{linkResult.display_name}</p>
                          <p className="text-xs text-muted-foreground">{linkResult.email} · {linkResult.subscription_plan}</p>
                        </div>
                        <Button type="button" size="sm" onClick={handleLinkAccount}>
                          <Link2 className="h-4 w-4 mr-1" /> Vincular
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
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

          <div className="space-y-2">
            <Label>Archivos *</Label>
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((f, idx) => (
                  <div key={`${f.name}-${f.size}`} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeFile(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => document.getElementById('manager-file-input')?.click()}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir más archivos
                </Button>
              </div>
            ) : (
              <FileDropzone
                fileType="any"
                accept="*/*"
                maxSize={100}
                onFileSelect={(file) => setFiles(prev => {
                  const merged = [...prev, file];
                  return merged.filter((f, i, a) => a.findIndex(x => x.name === f.name && x.size === f.size) === i);
                })}
              />
            )}
            <input id="manager-file-input" type="file" multiple className="hidden" onChange={(e) => { handleAddFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {/* Signature selector */}
          <SignatureSelector value={signatureId} onChange={setSignatureId} />

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
