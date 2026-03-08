import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function SupportPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold">Soporte</h2>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-primary" /> Contactar con soporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-medium">Mensaje enviado</p>
              <p className="text-sm text-muted-foreground">Te responderemos lo antes posible.</p>
              <Button variant="outline" size="sm" onClick={() => setSent(false)}>Enviar otro mensaje</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Categoría</Label>
                <Select defaultValue="general">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="billing">Facturación</SelectItem>
                    <SelectItem value="technical">Problema técnico</SelectItem>
                    <SelectItem value="registration">Registro de obras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Asunto</Label>
                <Input required className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mensaje</Label>
                <Textarea required rows={5} className="text-sm" />
              </div>
              <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Enviar</>}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
