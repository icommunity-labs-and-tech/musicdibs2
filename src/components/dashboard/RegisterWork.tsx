import { useState, useRef, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
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
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { DistributeButton } from '@/components/dashboard/DistributeButton';
import { CertificateButton } from '@/components/dashboard/CertificateButton';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';


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
  const { t } = useTranslation();

  const workTypes = [
    { value: 'audio', label: t('dashboard.registerWork.typeAudio') },
    { value: 'video', label: t('dashboard.registerWork.typeVideo') },
    { value: 'image', label: t('dashboard.registerWork.typeImage') },
    { value: 'document', label: t('dashboard.registerWork.typeDocument') },
    { value: 'other', label: t('dashboard.registerWork.typeOther') },
  ];
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
  const [lastRegisteredWorkId, setLastRegisteredWorkId] = useState<string | null>(null);
  const [lastRegisteredWork, setLastRegisteredWork] = useState<any>(null);
  const [showDistributeBanner, setShowDistributeBanner] = useState(false);
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
        toast.success(t('dashboard.registerWork.toastSuccess'), {
          description: t('dashboard.registerWork.toastSuccessDesc'),
          duration: 6000,
        });
        setLastRegisteredWorkId(res.registrationId);
        setShowDistributeBanner(false);
        // Listen for status change to 'registered' via polling
        if (res.registrationId) {
          const pollInterval = setInterval(async () => {
            const { data } = await supabase
              .from('works')
              .select('id, title, type, status, blockchain_hash, blockchain_network, checker_url, ibs_evidence_id, certified_at, created_at')
              .eq('id', res.registrationId)
              .single();
            if (data?.status === 'registered') {
              setShowDistributeBanner(true);
              setLastRegisteredWork(data);
              clearInterval(pollInterval);
            } else if (data?.status === 'failed') {
              clearInterval(pollInterval);
            }
          }, 5000);
          // Stop polling after 5 minutes
          setTimeout(() => clearInterval(pollInterval), 300_000);
        }
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
          <Upload className="h-4 w-4 text-primary" /> {t('dashboard.registerWork.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {noCredits ? (
          <NoCreditsAlert message={t('dashboard.registerWork.noCreditsMsg')} />
        ) : kycBlocked ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-medium text-sm">{t('dashboard.registerWork.kycRequired')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.registerWork.kycWait')}
            </p>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {t('dashboard.registerWork.statusLabel')}: {summary?.kycStatus === 'pending' ? t('dashboard.registerWork.statusPending') : t('dashboard.registerWork.statusUnverified')}
            </Badge>
          </div>
        ) : status === 'failed' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="font-medium text-sm">{t('dashboard.registerWork.blockchainError')}</p>
            <p className="text-xs text-muted-foreground">{result?.ibsError}</p>
            {result?.registrationId && (
              <p className="text-xs text-muted-foreground">ID: {result.registrationId}</p>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">{t('dashboard.registerWork.creditRefunded')}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={resetForm}>
              {t('dashboard.registerWork.tryAgain')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <PricingLink />
            
            {aiAudioUrl && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 border border-primary/20">
                <Music className="h-4 w-4 text-primary" />
                <span className="text-xs text-primary font-medium">{t('dashboard.registerWork.aiAudioAttached')}</span>
              </div>
            )}

            {/* Signature Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Key className="h-3 w-3" /> {t('dashboard.registerWork.signatureLabel')}
              </Label>
              {loadingSigs ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> {t('dashboard.registerWork.loadingSignatures')}
                </div>
              ) : activeSignatures.length > 0 ? (
                <Select value={selectedSignature} onValueChange={setSelectedSignature}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t('dashboard.registerWork.selectSignature')} />
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
                    {t('dashboard.registerWork.needSignature')}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('dashboard.registerWork.signatureName')}
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
                      {creatingSignature ? <Loader2 className="h-3 w-3 animate-spin" /> : t('dashboard.registerWork.create')}
                    </Button>
                  </div>
                  {kycUrl && (
                    <a
                      href={kycUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <LinkIcon className="h-3 w-3" /> {t('dashboard.registerWork.completeKyc')}
                    </a>
                  )}
                  {signatures.filter((s: IbsSignature) => s.status === 'pending').length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('dashboard.registerWork.pendingSignatures')}</p>
                      {signatures
                        .filter((s: IbsSignature) => s.status === 'pending')
                        .map((s: IbsSignature) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-600 text-xs">
                              {s.signature_name} — {t('dashboard.registerWork.pending')}
                            </Badge>
                            {s.kyc_url && (
                              <a href={s.kyc_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                {t('dashboard.registerWork.verify')}
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
                        <RefreshCw className="h-3 w-3 mr-1" /> {t('dashboard.registerWork.refreshStatus')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('dashboard.registerWork.workTitle')}</Label>
              <Input 
                name="title" 
                required 
                className="h-9 text-sm" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('dashboard.registerWork.workType')}</Label>
              <Select value={workType} onValueChange={setWorkType} required>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('dashboard.registerWork.selectType')} /></SelectTrigger>
                <SelectContent>
                  {workTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('dashboard.registerWork.authorHolder')}</Label>
              <Input 
                name="author" 
                required 
                className="h-9 text-sm" 
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('dashboard.registerWork.description')}</Label>
              <Textarea 
                name="description" 
                rows={2} 
                className="text-sm" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('dashboard.registerWork.originalFile')}</Label>
              {aiAudioUrl && !file ? (
                <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <Music className="h-4 w-4 text-primary" />
                  <span className="text-xs text-foreground truncate flex-1">
                    {t('dashboard.registerWork.aiAudioGenerated')}
                  </span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => fileRef.current?.click()}
                  >
                    {t('dashboard.registerWork.change')}
                  </Button>
                </div>
              ) : (
                <FileDropzone
                  fileType="audio"
                  accept="*/*"
                  maxSize={100}
                  currentFile={file}
                  onFileSelect={(f) => setFile(f)}
                  onRemove={() => setFile(null)}
                />
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ownership" checked={ownership} onCheckedChange={v => setOwnership(!!v)} />
              <Label htmlFor="ownership" className="text-xs leading-tight cursor-pointer">
                {t('dashboard.registerWork.ownershipDeclaration')}
              </Label>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> {result?.ibsError || t('dashboard.registerWork.errorDefault')}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              size="sm"
              disabled={loading || !ownership || !hasFileOrAudio || !workType || !selectedSignature}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> {t('dashboard.registerWork.registering')}</> : t('dashboard.registerWork.registerBtn')}
            </Button>

            {showDistributeBanner && lastRegisteredWorkId && (
              <Card className="mt-4 border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <Radio className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold">{t('dashboard.registerWork.workRegistered')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.registerWork.distributeDesc')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {lastRegisteredWork?.blockchain_hash && lastRegisteredWork?.ibs_evidence_id && (
                        <CertificateButton
                          work={{
                            id: lastRegisteredWork.id,
                            title: lastRegisteredWork.title,
                            type: lastRegisteredWork.type,
                            blockchain_hash: lastRegisteredWork.blockchain_hash,
                            blockchain_network: lastRegisteredWork.blockchain_network || 'Polygon',
                            checker_url: lastRegisteredWork.checker_url || undefined,
                            ibs_evidence_id: lastRegisteredWork.ibs_evidence_id,
                            certified_at: lastRegisteredWork.certified_at || undefined,
                            created_at: lastRegisteredWork.created_at,
                          }}
                          authorName={author || 'Autor'}
                        />
                      )}
                      <DistributeButton
                        workId={lastRegisteredWorkId}
                        distributedAt={null}
                        variant="banner"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
