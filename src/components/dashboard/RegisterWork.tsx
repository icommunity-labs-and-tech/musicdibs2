import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert, FileUp, Music, Sparkles, XCircle, Link as LinkIcon, Key, RefreshCw, Radio } from 'lucide-react';
import { registerWork, listIbsSignatures, createIbsSignature, syncIbsSignatures } from '@/services/dashboardApi';
import type { DashboardSummary, IbsSignature } from '@/types/dashboard';
import { useCredits } from '@/hooks/useCredits';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { DistributeButton } from '@/components/dashboard/DistributeButton';
import { supabase } from '@/integrations/supabase/client';

const workTypes = [
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Vídeo' },
  { value: 'image', label: 'Imagen' },
  { value: 'document', label: 'Documento' },
  { value: 'other', label: 'Otro' },
];

interface PrefillData {
  title?: string;
  type?: string;
  description?: string;
  audioUrl?: string;
  generationId?: string;
}

interface RegistrationResult {
  registrationId: string;
  status: string;
  certificateUrl?: string;
  blockchainHash?: string;
  ibsError?: string;
  evidenceId?: string;
}

export function RegisterWork({ summary }: { summary: DashboardSummary | null }) {
  const location = useLocation();
  const prefill = (location.state as { prefill?: PrefillData })?.prefill;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'failed' | 'error'>('idle');
  const [ownership, setOwnership] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [workType, setWorkType] = useState('');
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // iBS Signatures
  const [signatures, setSignatures] = useState<IbsSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState('');
  const [loadingSigs, setLoadingSigs] = useState(false);
  const [creatingSignature, setCreatingSignature] = useState(false);
  const [newSigName, setNewSigName] = useState('');
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  

  const { hasEnough } = useCredits();
  const noCredits = !hasEnough(FEATURE_COSTS.register_work);
  const kycBlocked = summary && summary.kycStatus !== 'verified';

  useEffect(() => {
    if (prefill) {
      if (prefill.title) setTitle(prefill.title);
      if (prefill.type) setWorkType(prefill.type);
      if (prefill.description) setDescription(prefill.description);
      if (prefill.audioUrl) setAiAudioUrl(prefill.audioUrl);
    }
  }, [prefill]);

  // Load signatures on mount
  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    setLoadingSigs(true);
    try {
      await syncIbsSignatures();
      const sigs = await listIbsSignatures();
      setSignatures(sigs);
      // Auto-select first active signature
      const active = sigs.find((s: IbsSignature) => s.status === 'success');
      if (active) setSelectedSignature(active.ibs_signature_id);
    } catch (err) {
      console.error('Error loading signatures:', err);
    }
    setLoadingSigs(false);
  };

  const handleCreateSignature = async () => {
    if (!newSigName.trim()) return;
    setCreatingSignature(true);
    try {
      const result = await createIbsSignature(newSigName.trim());
      if (result.kycUrl) {
        setKycUrl(result.kycUrl);
      }
      setNewSigName('');
      await loadSignatures();
    } catch (err: any) {
      console.error('Error creating signature:', err);
    }
    setCreatingSignature(false);
  };

  const convertAudioUrlToFile = async (audioUrl: string): Promise<File | null> => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      return new File([blob], `ai-generation-${Date.now()}.mp3`, { type: 'audio/mpeg' });
    } catch (error) {
      console.error('Error converting audio:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    let uploadFile = file;
    
    if (!uploadFile && aiAudioUrl) {
      setLoading(true);
      uploadFile = await convertAudioUrlToFile(aiAudioUrl);
      if (!uploadFile) {
        setStatus('error');
        setLoading(false);
        return;
      }
    }

    if (!uploadFile || !selectedSignature) return;

    setLoading(true); 
    setStatus('idle');
    
    try {
      const res = await registerWork({
        title,
        type: workType as any,
        author,
        description,
        file: uploadFile,
        ownershipDeclaration: ownership,
        signatureId: selectedSignature,
      });
      if (res.ibsError || res.status === 'failed') {
        setResult(res);
        setStatus('failed');
      } else {
        // Success — reset form immediately so user can register more works
        // Blockchain certification happens asynchronously via webhook
        window.dispatchEvent(new CustomEvent('musicdibs:work-registered'));
        toast.success('🎉 ¡Obra enviada! La certificación en blockchain se procesará en segundo plano.', {
          description: 'Recibirás una notificación cuando finalice. Puedes seguir registrando obras.',
          duration: 6000,
        });
        resetForm();
      }
    } catch (err: any) { 
      setResult({ registrationId: '', status: 'error', ibsError: err?.message });
      setStatus('error'); 
    }
    setLoading(false);
  };


  const resetForm = () => {
    setStatus('idle');
    setFile(null);
    setOwnership(false);
    setTitle('');
    setAuthor('');
    setDescription('');
    setAiAudioUrl(null);
    setWorkType('');
    setResult(null);
    
  };

  const hasFileOrAudio = file || aiAudioUrl;
  const activeSignatures = signatures.filter((s: IbsSignature) => s.status === 'success');

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Registrar obra
        </CardTitle>
      </CardHeader>
      <CardContent>
        {noCredits ? (
          <NoCreditsAlert message="No tienes créditos suficientes para registrar una obra." />
        ) : kycBlocked ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-medium text-sm">Verificación de identidad requerida</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tu verificación de identidad puede tardar hasta 48 horas en estar lista.
              Si ha pasado más tiempo, contáctanos.
            </p>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Estado: {summary?.kycStatus === 'pending' ? 'Pendiente' : 'No verificado'}
            </Badge>
          </div>
        ) : status === 'failed' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="font-medium text-sm">Error en el registro blockchain</p>
            <p className="text-xs text-muted-foreground">{result?.ibsError}</p>
            {result?.registrationId && (
              <p className="text-xs text-muted-foreground">ID: {result.registrationId}</p>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">Crédito reembolsado</span>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={resetForm}>
              Intentar de nuevo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-muted-foreground">1 registro = {FEATURE_COSTS.register_work} crédito{FEATURE_COSTS.register_work > 1 ? 's' : ''}</p>
            
            {aiAudioUrl && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                <Music className="h-4 w-4 text-primary" />
                <span className="text-xs text-primary font-medium">Audio generado con AI MusicDibs Studio</span>
              </div>
            )}

            {/* Signature Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Key className="h-3 w-3" /> Identidad digital (firma)
              </Label>
              {loadingSigs ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando firmas...
                </div>
              ) : activeSignatures.length > 0 ? (
                <Select value={selectedSignature} onValueChange={setSelectedSignature}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar firma" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSignatures.map((sig: IbsSignature) => (
                      <SelectItem key={sig.ibs_signature_id} value={sig.ibs_signature_id}>
                        {sig.signature_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2 p-2 rounded-md border border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Necesitas crear una identidad digital para firmar tus obras.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre de la firma"
                      value={newSigName}
                      onChange={(e) => setNewSigName(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={creatingSignature || !newSigName.trim()}
                      onClick={handleCreateSignature}
                    >
                      {creatingSignature ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Crear'}
                    </Button>
                  </div>
                  {kycUrl && (
                    <a
                      href={kycUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" /> Completar verificación KYC
                    </a>
                  )}
                  {signatures.filter((s: IbsSignature) => s.status === 'pending').length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Firmas pendientes de verificación:</p>
                      {signatures
                        .filter((s: IbsSignature) => s.status === 'pending')
                        .map((s: IbsSignature) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-600 text-xs">
                              {s.signature_name} — Pendiente
                            </Badge>
                            {s.kyc_url && (
                              <a href={s.kyc_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                Verificar
                              </a>
                            )}
                          </div>
                        ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={loadSignatures}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Actualizar estado
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Título de la obra</Label>
              <Input 
                name="title" 
                required 
                className="h-9 text-sm" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de obra</Label>
              <Select value={workType} onValueChange={setWorkType} required>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {workTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Autor o titular</Label>
              <Input 
                name="author" 
                required 
                className="h-9 text-sm" 
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea 
                name="description" 
                rows={2} 
                className="text-sm" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Archivo original</Label>
              {aiAudioUrl && !file ? (
                <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <Music className="h-4 w-4 text-primary" />
                  <span className="text-xs text-foreground truncate flex-1">
                    Audio AI generado (se usará automáticamente)
                  </span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => fileRef.current?.click()}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {file ? file.name : 'Seleccionar archivo'}
                  </span>
                </div>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ownership" checked={ownership} onCheckedChange={v => setOwnership(!!v)} />
              <Label htmlFor="ownership" className="text-xs leading-tight cursor-pointer">
                Declaro ser titular legítimo de esta obra
              </Label>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {result?.ibsError || 'Error al registrar la obra'}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              size="sm"
              disabled={loading || !ownership || !hasFileOrAudio || !workType || !selectedSignature}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Registrando en blockchain...</> : 'Registrar obra'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
