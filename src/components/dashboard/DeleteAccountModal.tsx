import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, Shield, Database, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const DELETION_REASONS = [
  { value: 'no_need', label: 'Ya no necesito el servicio' },
  { value: 'too_expensive', label: 'Es demasiado caro' },
  { value: 'alternative', label: 'Encontré una alternativa mejor' },
  { value: 'technical', label: 'Problemas técnicos' },
  { value: 'privacy', label: 'Privacidad / protección de datos' },
  { value: 'other', label: 'Otro' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountModal({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setStep(1);
    setReason('');
    setFeedback('');
    setEmailConfirm('');
  };

  const handleClose = (v: boolean) => {
    if (loading) return;
    if (!v) resetState();
    onOpenChange(v);
  };

  const handleStep1 = () => {
    if (!reason) {
      toast.error('Selecciona un motivo');
      return;
    }
    setStep(2);
  };

  const handleStep2 = () => {
    if (emailConfirm.trim().toLowerCase() !== (user?.email || '').toLowerCase()) {
      toast.error('El email no coincide con tu cuenta');
      return;
    }
    setStep(3);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { reason, additional_feedback: feedback || null },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success('Tu cuenta ha sido eliminada. Sentimos verte partir.');
      onOpenChange(false);
      resetState();
      await signOut();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[520px] p-4 sm:p-8 gap-0">
        {step === 1 && (
          <>
            <DialogHeader className="space-y-2 pb-4">
              <DialogTitle className="text-xl">¿Por qué quieres eliminar tu cuenta?</DialogTitle>
              <DialogDescription>
                Tu opinión nos ayuda a mejorar. Selecciona un motivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Motivo de baja *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {DELETION_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label className="text-sm font-medium">¿Quieres contarnos algo más?</Label>
              <Textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Comentario opcional..."
                maxLength={500}
                rows={3}
              />
            </div>

            <DialogFooter className="mt-6 flex gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button onClick={handleStep1} disabled={!reason}>Continuar</Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader className="space-y-2 pb-4">
              <DialogTitle className="text-xl flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Información importante
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <p>Tus obras registradas en blockchain permanecerán válidas indefinidamente — el registro es inmutable.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Database className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p>Tus datos de compra se conservarán por obligación legal (normativa fiscal EU, mínimo 5 años) pero serán anonimizados.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Trash2 className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p>Tus generaciones de IA, letras, portadas y assets de promoción se eliminarán permanentemente.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p>Si tienes suscripción activa, se cancelará al final del período de facturación actual.</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Para confirmar, escribe tu email: <span className="font-mono text-xs text-muted-foreground">{user?.email}</span>
              </Label>
              <Input
                value={emailConfirm}
                onChange={e => setEmailConfirm(e.target.value)}
                placeholder="tu@email.com"
                type="email"
              />
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Consulta nuestra{' '}
              <a href="/privacy" target="_blank" className="underline text-primary">
                política de privacidad
              </a>{' '}
              para más información sobre la gestión de tus datos.
            </p>

            <DialogFooter className="mt-6 flex gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Volver</Button>
              <Button
                onClick={handleStep2}
                disabled={emailConfirm.trim().toLowerCase() !== (user?.email || '').toLowerCase()}
              >
                Continuar
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader className="space-y-2 pb-4">
              <DialogTitle className="text-xl text-destructive">Confirmación final</DialogTitle>
              <DialogDescription>
                Esta acción es irreversible. Todos tus datos personales serán eliminados permanentemente.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
              <p className="font-medium text-destructive">¿Estás completamente seguro?</p>
              <p className="mt-1 text-muted-foreground">
                No podrás recuperar tu cuenta, generaciones, ni créditos después de esta acción.
              </p>
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>Volver</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Eliminando cuenta...
                  </>
                ) : (
                  'Eliminar mi cuenta permanentemente'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
