import { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  UploadCloud,
  Link2,
  ShieldCheck,
  Circle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

type StepStatus = 'done' | 'active' | 'pending' | 'failed';

interface StepState {
  status: StepStatus;
  timestamp?: string;
}

interface Props {
  workStatus: 'processing' | 'registered' | 'failed';
  createdAt: string;
  certifiedAt?: string | null;
  ibsEvidenceId?: string | null;
}

function getStepStates(
  workStatus: Props['workStatus'],
  createdAt: string,
  certifiedAt?: string | null,
): Record<string, StepState> {
  if (workStatus === 'registered') {
    return {
      uploaded:     { status: 'done', timestamp: createdAt },
      sent_to_ibs:  { status: 'done', timestamp: createdAt },
      certifying:   { status: 'done', timestamp: createdAt },
      certified:    { status: 'done', timestamp: certifiedAt || undefined },
    };
  }
  if (workStatus === 'failed') {
    return {
      uploaded:     { status: 'done',   timestamp: createdAt },
      sent_to_ibs:  { status: 'done',   timestamp: createdAt },
      certifying:   { status: 'failed' },
      certified:    { status: 'pending' },
    };
  }
  return {
    uploaded:     { status: 'done',   timestamp: createdAt },
    sent_to_ibs:  { status: 'done',   timestamp: createdAt },
    certifying:   { status: 'active' },
    certified:    { status: 'pending' },
  };
}

function useElapsed(createdAt: string, active: boolean) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}min`);
      else setElapsed(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`);
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [createdAt, active]);

  return elapsed;
}

export function WorkTimeline({ workStatus, createdAt, certifiedAt, ibsEvidenceId }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';
  const stepStates = getStepStates(workStatus, createdAt, certifiedAt);
  const isProcessing = workStatus === 'processing';
  const isFailed = workStatus === 'failed';
  const elapsed = useElapsed(createdAt, isProcessing);

  const STEPS: TimelineStep[] = useMemo(() => [
    { id: 'uploaded', label: t('dashboard.timeline.uploaded'), description: t('dashboard.timeline.uploadedDesc'), icon: UploadCloud },
    { id: 'sent_to_ibs', label: t('dashboard.timeline.sentToIbs'), description: t('dashboard.timeline.sentToIbsDesc'), icon: Link2 },
    { id: 'certifying', label: t('dashboard.timeline.certifying'), description: t('dashboard.timeline.certifyingDesc'), icon: ShieldCheck },
    { id: 'certified', label: t('dashboard.timeline.certified'), description: t('dashboard.timeline.certifiedDesc'), icon: CheckCircle2 },
  ], [t]);

  const FAILED_STEP: TimelineStep = useMemo(() => ({
    id: 'failed',
    label: t('dashboard.timeline.failedLabel'),
    description: t('dashboard.timeline.failedDesc'),
    icon: XCircle,
  }), [t]);

  const formatTs = (ts?: string) => {
    if (!ts) return null;
    return new Date(ts).toLocaleString(lang, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const steps = isFailed
    ? [...STEPS.slice(0, 2), FAILED_STEP]
    : STEPS;

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      {isProcessing && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 mb-4 text-sm text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>
            {t('dashboard.timeline.certifyingBanner')}
            {elapsed && <> · {t('dashboard.timeline.elapsed', { time: elapsed })}</>}
            {' · '}{t('dashboard.timeline.etaNote')}
          </span>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 mb-4 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {t('dashboard.timeline.failedBanner')}
        </div>
      )}

      <div className="relative ml-1">
        {steps.map((step, idx) => {
          const state = stepStates[step.id] || { status: 'pending' };
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full shrink-0">
                  {state.status === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  {state.status === 'active' && <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />}
                  {state.status === 'pending' && <Circle className="h-5 w-5 text-muted-foreground/40" />}
                  {state.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 min-h-[16px] ${
                    state.status === 'done' ? 'bg-emerald-500/40' : 'bg-border/60'
                  }`} />
                )}
              </div>

              <div className="pt-0.5 pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${
                    state.status === 'done' ? 'text-foreground' :
                    state.status === 'active' ? 'text-amber-600' :
                    state.status === 'failed' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                  {state.timestamp && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTs(state.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
                {step.id === 'sent_to_ibs' && ibsEvidenceId && (
                  <code className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded font-mono text-foreground/70 mt-1 inline-block">
                    {ibsEvidenceId}
                  </code>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
