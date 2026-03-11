import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Megaphone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitPromotionRequest } from '@/services/dashboardApi';

export function PromoteWorks() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setStatus('idle');
    const fd = new FormData(e.currentTarget);
    try {
      await submitPromotionRequest({
        artistName: fd.get('artistName') as string,
        mainLink: fd.get('mainLink') as string,
        workTitle: fd.get('workTitle') as string,
        description: fd.get('description') as string,
        promotionGoal: fd.get('promotionGoal') as string,
        socialNetworks: fd.get('socialNetworks') as string,
        consent,
      });
      setStatus('success');
      setTimeout(() => { setOpen(false); setStatus('idle'); setConsent(false); }, 2000);
    } catch { setStatus('error'); }
    setLoading(false);
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> Promociona tus obras
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Por tener una suscripción activa, tienes derecho a promocionarte en nuestras redes sociales.
        </p>
        <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Cada solicitud de promoción consume 1 crédito.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="hero" size="sm">Solicitar post</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Solicitar promoción</DialogTitle>
            </DialogHeader>
            {status === 'success' ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="font-medium">¡Solicitud enviada correctamente!</p>
                <p className="text-sm text-muted-foreground">Te contactaremos pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre artístico</Label>
                  <Input name="artistName" required />
                </div>
                <div className="space-y-2">
                  <Label>Enlace principal</Label>
                  <Input name="mainLink" type="url" placeholder="https://..." required />
                </div>
                <div className="space-y-2">
                  <Label>Título de la obra</Label>
                  <Input name="workTitle" required />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea name="description" rows={3} required />
                </div>
                <div className="space-y-2">
                  <Label>Objetivo de promoción</Label>
                  <Input name="promotionGoal" placeholder="Más streams, visibilidad, etc." required />
                </div>
                <div className="space-y-2">
                  <Label>Redes sociales</Label>
                  <Input name="socialNetworks" placeholder="@usuario en Instagram, TikTok..." />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="consent" checked={consent} onCheckedChange={v => setConsent(!!v)} />
                  <Label htmlFor="consent" className="text-xs leading-tight cursor-pointer">
                    Acepto que MusicDibs utilice mi contenido para promoción en redes sociales
                  </Label>
                </div>
                {status === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> Error al enviar la solicitud
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading || !consent}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar solicitud'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
