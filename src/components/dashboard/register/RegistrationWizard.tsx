import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
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
import { useProductTracking } from '@/hooks/useProductTracking';

interface RegistrationWizardProps {
  summary: DashboardSummary | null;
}

export function RegistrationWizard({ summary }: RegistrationWizardProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { track } = useProductTracking();
  const prefill = (location.state as { prefill?: { title?: string; type?: string; description?: string; audioUrl?: string } })?.prefill;

  const STEPS_NEW = [
    { label: t('wizard.steps.file') },
    { label: t('wizard.steps.title') },
    { label: t('wizard.steps.creators') },
    { label: t('wizard.steps.summary') },
    { label: t('wizard.steps.success') },
  ];

  const STEPS_VERSION = [
    { label: t('wizard.steps.parentWork') },
    { label: t('wizard.steps.file') },
    { label: t('wizard.steps.version') },
    { label: t('wizard.steps.creators') },
    { label: t('wizard.steps.summary') },
    { label: t('wizard.steps.success') },
  ];

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

  const [step, setStep] = useState(-1);
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
    let uploadFiles = data.files.length > 0 ? [...data.files] : [];
    if (!uploadFile && data.aiAudioUrl) {
      setLoading(true);
      uploadFile = await convertAudioUrlToFile(data.aiAudioUrl);
      if (!uploadFile) {
        toast.error(t('wizard.rw.errorAudio'));
        setLoading(false);
        return;
      }
      uploadFiles = [uploadFile];
    }
    if ((!uploadFile && uploadFiles.length === 0) || !data.signatureId) return;

    setLoading(true);
    try {
      const effectiveTitle = isVersion
        ? (data.versionTitle || `${data.parentWorkTitle} (${data.versionType})`)
        : data.title;

      const effectiveType = isVersion
        ? (data.versionType === 'master' || data.versionType === 'remix' ? 'audio' : 'audio')
        : (data.workType || 'audio');

      const res = await registerWork({
        title: effectiveTitle,
        type: effectiveType as any,
        author: data.creators.map((c) => c.name).join(', '),
        description: data.description,
        file: uploadFiles[0] || uploadFile!,
        files: uploadFiles.length > 0 ? uploadFiles : undefined,
        ownershipDeclaration: true,
        signatureId: data.signatureId,
      });

      if (res.ibsError || res.status === 'failed') {
        toast.error(res.ibsError || t('wizard.rw.errorRegister'));
        setLoading(false);
        return;
      }

      window.dispatchEvent(new CustomEvent('musicdibs:work-registered'));
      setResultId(res.registrationId);
      setResultHash(res.blockchainHash || '');
      setStep(steps.length - 1);

      // Track work registration
      track('work_registered', { feature: 'register', metadata: { work_id: res.registrationId } });

      // Check if there was a recent generation in this session
      const lastGen = sessionStorage.getItem('md_last_generation');
      if (lastGen) {
        const elapsed = Date.now() - parseInt(lastGen, 10);
        if (elapsed < 24 * 60 * 60 * 1000) {
          track('work_registered_after_generation', { feature: 'register', metadata: { work_id: res.registrationId } });
        }
      }

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
      toast.error(err?.message || t('wizard.rw.errorGeneric'));
    }
    setLoading(false);
  };

  const resetWizard = () => {
    setData({ ...initialWizardData });
    setStep(-1);
    setResultId('');
    setResultHash('');
  };

  if (noCredits) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6">
          <NoCreditsAlert message={t('wizard.rw.noCreditsMsg')} />
        </CardContent>
      </Card>
    );
  }

  if (kycBlocked) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            <span className="font-medium text-sm">{t('wizard.rw.kycRequired')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('wizard.rw.kycWait')}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {t('wizard.rw.kycStatus', { status: summary?.kycStatus === 'pending' ? t('wizard.rw.kycPending') : t('wizard.rw.kycNotVerified') })}
            </Badge>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/dashboard/verify-identity')}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              {t('wizard.rw.goToVerify')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStep = () => {
    if (step === -1) {
      return <StepEntry data={data} onUpdate={update} onNext={() => setStep(0)} />;
    }

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

    if (step === steps.length - 2) {
      return (
        <div className="space-y-6">
          <SignatureSelector value={data.signatureId} onChange={(id) => update({ signatureId: id })} />
          <StepSummary data={data} loading={loading} onSubmit={handleSubmit} onBack={() => setStep(step - 1)} />
        </div>
      );
    }

    if (isVersion) {
      switch (step) {
        case 0: return <StepParentWork data={data} onUpdate={update} onNext={() => setStep(1)} onBack={() => setStep(-1)} />;
        case 1: return <StepFile data={data} onUpdate={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />;
        case 2: return <StepVersion data={data} onUpdate={update} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
        case 3: return <StepCreators data={data} onUpdate={update} onNext={() => setStep(4)} onBack={() => setStep(2)} />;
      }
    } else {
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
