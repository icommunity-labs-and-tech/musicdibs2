import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

const REASONS = [
  { value: 'probando', label: 'Solo estaba probando MusicDibs' },
  { value: 'terminado', label: 'Ya he creado lo que necesitaba' },
  { value: 'no_uso', label: 'No la uso lo suficiente' },
  { value: 'pocos_creditos', label: 'Se me queda corto de créditos' },
  { value: 'caro', label: 'Es demasiado caro' },
  { value: 'mal_resultado', label: 'No he conseguido el resultado esperado' },
  { value: 'otra_herramienta', label: 'Uso otra herramienta' },
  { value: 'otro', label: 'Otro motivo' },
] as const;

function getCreditExamples(creditsRemaining: number) {
  if (creditsRemaining === 0) {
    return { message: 'Has usado todos tus créditos de este mes', examples: [] };
  }
  const examples: string[] = [];
  let remaining = creditsRemaining;
  if (remaining >= 3) {
    const videos = Math.floor(remaining / 3);
    examples.push(`${videos} video${videos > 1 ? 's' : ''} Full HD (${videos * 3} créditos)`);
    remaining = remaining % 3;
  }
  if (remaining >= 2) {
    const songs = Math.floor(remaining / 2);
    examples.push(`${songs} canción${songs > 1 ? 'es' : ''} con voz IA (${songs * 2} créditos)`);
    remaining = remaining % 2;
  }
  if (remaining >= 1 || examples.length === 0) {
    examples.push('O cualquier combinación de portadas, creatividades y registros');
  }
  return {
    message: `Te quedan ${creditsRemaining} crédito${creditsRemaining > 1 ? 's' : ''} sin usar`,
    examples,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel: (reason: string) => Promise<void>;
  planType?: string;
}

export function CancellationSurveyModal({ open, onOpenChange, onConfirmCancel, planType }: Props) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['cancel-modal-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('available_credits')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user && open,
  });

  const creditsRemaining = profile?.available_credits ?? 0;
  const { message: creditsMessage, examples } = getCreditExamples(creditsRemaining);

  const handleContinue = () => {
    if (!selectedReason) {
      toast.error('Por favor selecciona un motivo');
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // 1. Track cancellation reason (non-blocking)
      supabase
        .from('cancellation_surveys')
        .insert({
          user_id: user!.id,
          reason: selectedReason,
          plan_type: planType ?? null,
          credits_remaining: creditsRemaining,
        })
        .then(({ error }) => {
          if (error) console.error('Error tracking cancellation:', error);
        });

      // 2. Cancel subscription
      await onConfirmCancel(selectedReason);
      onOpenChange(false);
      resetState();
    } catch {
      // Modal stays open on error — user can retry
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedReason('');
    setStep(1);
  };

  const handleClose = (v: boolean) => {
    if (loading) return; // Block close during loading
    if (!v) resetState();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[500px] p-4 sm:p-8 gap-0">
        {step === 1 ? (
          <>
            <DialogHeader className="space-y-2 pb-4 sm:pb-6">
              <DialogTitle className="text-xl">¿Por qué quieres cancelar?</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Tus respuestas nos ayudan a mejorar (te llevará 5 segundos)
              </DialogDescription>
            </DialogHeader>

            <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
              {REASONS.map(({ value, label }) => (
                <Label
                  key={value}
                  htmlFor={`reason-${value}`}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                    selectedReason === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <RadioGroupItem value={value} id={`reason-${value}`} />
                  <span className="text-sm">{label}</span>
                </Label>
              ))}
            </RadioGroup>

            <DialogFooter className="mt-6 flex gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={loading}>Volver</Button>
              <Button onClick={handleContinue} disabled={!selectedReason || loading}>Continuar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="space-y-2 pb-4 sm:pb-6">
              <DialogTitle className="text-xl">Antes de cancelar...</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <p className="font-semibold" style={{ fontSize: 15 }}>
                {creditsRemaining > 0 ? (
                  <>
                    Te quedan <span className="text-primary font-bold">{creditsRemaining}</span> crédito{creditsRemaining > 1 ? 's' : ''} sin usar
                  </>
                ) : (
                  creditsMessage
                )}
              </p>

              {examples.length > 0 && creditsRemaining > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Con ellos aún puedes crear:</p>
                  <ul className="space-y-1.5">
                    {examples.map((ex, i) => (
                      <li key={i} className="flex items-start gap-2" style={{ fontSize: 15, lineHeight: 1.6 }}>
                        <span className="text-primary mt-0.5">•</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            <p className="font-semibold" style={{ fontSize: 15 }}>
              ¿Estás seguro de que quieres cancelar?
            </p>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>Volver</Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Cancelando...
                  </>
                ) : (
                  'Sí, cancelar'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
