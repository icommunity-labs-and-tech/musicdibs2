import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WizardStepper } from './WizardStepper';
import { StepEntry } from './StepEntry';
import { StepFile } from './StepFile';
import { StepTitle } from './StepTitle';
import { StepVersion } from './StepVersion';
import { StepCreators } from './StepCreators';
import { StepSummary } from './StepSummary';
import { StepSuccess } from './StepSuccess';
import { StepParentWork } from './StepParentWork';
import { SignatureSelector } from './SignatureSelector';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { useCredits } from '@/hooks/useCredits';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { registerWork } from '@/services/dashboardApi';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardSummary } from '@/types/dashboard';
import { initialWizardData, type WizardData } from './types';

// Steps definition for each flow
const STEPS_NEW = [
  { label: 'Archivo' },
  { label: 'Título' },
  { label: 'Creadores' },
  { label: 'Resumen' },
  { label: 'Éxito' },
];

const STEPS_VERSION = [
  { label: 'Obra original' },
  { label: 'Archivo' },
  { label: 'Versión' },
  { label: 'Creadores' },
  { label: 'Resumen' },
  { label: 'Éxito' },
];

interface RegistrationWizardProps {
  summary: DashboardSummary | null;
}

export function RegistrationWizard({ summary }: RegistrationWizardProps) {
  const location = useLocation();
  const prefill = (location.state as { prefill?: { title?: string; type?: string; description?: string; audioUrl?: string } })?.prefill;

  const [data, setData] = useState<WizardData>(() => {
    const init = { ...initialWizardData };
    if (prefill) {
      if (prefill.title) init.title = prefill.title;
      if (prefill.type) init.workType = prefill.type;
      if (prefill.description) init.description = prefill.description;
      if (prefill.audioUrl) init.aiAudioUrl = prefill.audioUrl;
    }
    return init;
  });

  const [step, setStep] = useState(-1); // -1 = entry screen
  const [loading, setLoading] = useState(false);
  const [resultId, setResultId] = useState('');
  const [resultHash, setResultHash] = useState('');

  const { hasEnough } = useCredits();
  const noCredits = !hasEnough(FEATURE_COSTS.register_work);
  const kycBlocked = summary && summary.kycStatus !== 'verified';

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const isVersion = data.flow === 'version';
  const steps = isVersion ? STEPS_VERSION : STEPS_NEW;

  const convertAudioUrlToFile = async (url: string): Promise<File | null> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new File([blob], `ai-generation-${Date.now()}.mp3`, { type: 'audio/mpeg' });
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    let uploadFile = data.file;
    if (!uploadFile && data.aiAudioUrl) {
      setLoading(true);
      uploadFile = await convertAudioUrlToFile(data.aiAudioUrl);
      if (!uploadFile) {
        toast.error('Error al procesar el audio');
        setLoading(false);
        return;
      }
    }
    if (!uploadFile || !data.signatureId) return;

    setLoading(true);
    try {
      // Build title — for versions, combine parent + version info
      const effectiveTitle = isVersion
        ? (data.versionTitle || `${data.parentWorkTitle} (${data.versionType})`)
        : data.title;

      // Map wizard work type to backend type
      const effectiveType = isVersion
        ? (data.versionType === 'master' || data.versionType === 'remix' ? 'audio' : 'audio')
        : (data.workType || 'audio');

      const res = await registerWork({
        title: effectiveTitle,
        type: effectiveType as any,
        author: data.creators.map((c) => c.name).join(', '),
        description: data.description,
        file: uploadFile,
        ownershipDeclaration: true,
        signatureId: data.signatureId,
      });

      if (res.ibsError || res.status === 'failed') {
        toast.error(res.ibsError || 'Error en el registro');
        setLoading(false);
        return;
      }

      window.dispatchEvent(new CustomEvent('musicdibs:work-registered'));
      setResultId(res.registrationId);
      setResultHash(res.blockchainHash || '');
      setStep(steps.length - 1); // Go to success step

      // Poll for blockchain certification
      if (res.registrationId) {
        const pollInterval = setInterval(async () => {
          const { data: work } = await supabase
            .from('works')
            .select('status, blockchain_hash')
            .eq('id', res.registrationId)
            .single();
          if (work?.status === 'registered') {
            if (work.blockchain_hash) setResultHash(work.blockchain_hash);
            clearInterval(pollInterval);
          } else if (work?.status === 'failed') {
            clearInterval(pollInterval);
          }
        }, 5000);
        setTimeout(() => clearInterval(pollInterval), 300_000);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar la obra');
    }
    setLoading(false);
  };

  const resetWizard = () => {
    setData({ ...initialWizardData });
    setStep(-1);
    setResultId('');
    setResultHash('');
  };

  // Render blocking states
  if (noCredits) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6">
          <NoCreditsAlert message="No tienes créditos suficientes para registrar una obra." />
        </CardContent>
      </Card>
    );
  }

  if (kycBlocked) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-medium text-sm">Verificación de identidad requerida</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tu verificación de identidad puede tardar hasta 48 horas en estar lista.
          </p>
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Estado: {summary?.kycStatus === 'pending' ? 'Pendiente' : 'No verificado'}
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // Build step content
  const renderStep = () => {
    // Entry screen
    if (step === -1) {
      return <StepEntry data={data} onUpdate={update} onNext={() => setStep(0)} />;
    }

    // Success step (last)
    if (step === steps.length - 1) {
      return (
        <StepSuccess
          data={data}
          registrationId={resultId}
          fileHash={resultHash}
          onRegisterAnother={resetWizard}
        />
      );
    }

    // Summary step (second to last)
    if (step === steps.length - 2) {
      return (
        <div className="space-y-6">
          <SignatureSelector value={data.signatureId} onChange={(id) => update({ signatureId: id })} />
          <StepSummary data={data} loading={loading} onSubmit={handleSubmit} onBack={() => setStep(step - 1)} />
        </div>
      );
    }

    if (isVersion) {
      // Flow B: Parent → File → Version → Creators → Summary → Success
      switch (step) {
        case 0: return <StepParentWork data={data} onUpdate={update} onNext={() => setStep(1)} onBack={() => setStep(-1)} />;
        case 1: return <StepFile data={data} onUpdate={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />;
        case 2: return <StepVersion data={data} onUpdate={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
        case 3: return <StepCreators data={data} onUpdate={update} onNext={() => setStep(4)} onBack={() => setStep(2)} />;
      }
    } else {
      // Flow A: File → Title → Creators → Summary → Success
      switch (step) {
        case 0: return <StepFile data={data} onUpdate={update} onNext={() => setStep(1)} onBack={() => setStep(-1)} />;
        case 1: return <StepTitle data={data} onUpdate={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />;
        case 2: return <StepCreators data={data} onUpdate={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
      }
    }
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-6 md:p-8">
        {step >= 0 && step < steps.length - 1 && (
          <WizardStepper steps={steps} currentStep={step} />
        )}
        {renderStep()}
      </CardContent>
    </Card>
  );
}
