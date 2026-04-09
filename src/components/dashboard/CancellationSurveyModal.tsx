import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertTriangle, Calendar, Sparkles, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmCancel: (reason: string) => Promise<void>;
}

export function CancellationSurveyModal({ open, onOpenChange, onConfirmCancel }: Props) {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

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
      await onConfirmCancel(selectedReason);
      onOpenChange(false);
      resetState();
    } catch {
      toast.error('Error al cancelar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedReason('');
    setStep(1);
  };

  const handleClose = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[500px] p-8 gap-0">
        {step === 1 ? (
          <>
            <DialogHeader className="space-y-2 pb-6">
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
              <Button variant="ghost" onClick={() => handleClose(false)}>Volver</Button>
              <Button onClick={handleContinue} disabled={!selectedReason}>Continuar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="space-y-2 pb-6">
              <DialogTitle className="text-xl">Antes de irte…</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Tu suscripción incluye beneficios que perderás al cancelar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <ValueRow icon={<Sparkles className="h-4 w-4 text-primary" />} text="Acceso a top-ups con descuento exclusivo para suscriptores" />
              <ValueRow icon={<Calendar className="h-4 w-4 text-primary" />} text="Créditos mensuales/anuales que se acumulan automáticamente" />
              <ValueRow icon={<Shield className="h-4 w-4 text-primary" />} text="Precio garantizado aunque suba en el futuro" />
            </div>

            <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Al cancelar, mantendrás el acceso hasta el final de tu periodo de facturación actual, pero no recibirás nuevos créditos.
              </p>
            </div>

            <DialogFooter className="mt-6 flex gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <div className="flex gap-2">
                <Button variant="default" onClick={() => handleClose(false)}>Mantener suscripción</Button>
                <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleConfirm} disabled={loading}>
                  {loading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Cancelar igualmente
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ValueRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card px-4 py-3">
      {icon}
      <span className="text-sm">{text}</span>
    </div>
  );
}
