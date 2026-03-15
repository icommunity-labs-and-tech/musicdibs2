import { useEffect, useState } from 'react';
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

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: TimelineStep[] = [
  {
    id: 'uploaded',
    label: 'Archivo subido',
    description: 'El archivo se ha subido correctamente al almacenamiento seguro.',
    icon: UploadCloud,
  },
  {
    id: 'sent_to_ibs',
    label: 'Enviado a iBS',
    description: 'La evidencia se ha enviado a iCommunity Blockchain Solutions para su certificación.',
    icon: Link2,
  },
  {
    id: 'certifying',
    label: 'Certificando en blockchain',
    description: 'La transacción está siendo procesada en la red blockchain. Esto puede tardar unos minutos.',
    icon: ShieldCheck,
  },
  {
    id: 'certified',
    label: 'Certificado',
    description: 'La obra está certificada de forma inmutable en blockchain. Tienes prueba permanente de tu autoría.',
    icon: CheckCircle2,
  },
];

const FAILED_STEP: TimelineStep = {
  id: 'failed',
  label: 'Error en la certificación',
  description: 'No se pudo completar la certificación. Se ha reembolsado el crédito automáticamente.',
  icon: XCircle,
};

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

function formatTs(ts?: string) {
  if (!ts) return null;
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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
  const stepStates = getStepStates(workStatus, createdAt, certifiedAt);
  const isProcessing = workStatus === 'processing';
  const isFailed = workStatus === 'failed';
  const elapsed = useElapsed(createdAt, isProcessing);

  const steps = isFailed
    ? [...STEPS.slice(0, 2), FAILED_STEP]
    : STEPS;

  return (
    <div className="mt-4 pt-4 border-t border-border/40">
      {/* Banner de estado activo */}
      {isProcessing && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 mb-4 text-sm text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>
            Certificando en blockchain
            {elapsed && <> · {elapsed} transcurridos</>}
            {' · '}El proceso suele completarse en 1–5 minutos.
          </span>
        </div>
      )}
      {isFailed && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 mb-4 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          La certificación ha fallado. El crédito ha sido reembolsado automáticamente.
        </div>
      )}

      {/* Pasos */}
      <div className="relative ml-1">
        {steps.map((step, idx) => {
          const state = stepStates[step.id] || { status: 'pending' };
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className="flex gap-3 pb-4 last:pb-0">
              {/* Línea vertical + nodo */}
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full shrink-0">
                  {state.status === 'done' && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                  {state.status === 'active' && (
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                  )}
                  {state.status === 'pending' && (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                  {state.status === 'failed' && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                {/* Línea conectora */}
                {!isLast && (
                  <div className={`w-px flex-1 min-h-[16px] ${
                    state.status === 'done' ? 'bg-emerald-500/40' : 'bg-border/60'
                  }`} />
                )}
              </div>

              {/* Contenido del paso */}
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
                {/* Evidence ID para el paso de iBS */}
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
