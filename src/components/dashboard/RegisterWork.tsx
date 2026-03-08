import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle2, AlertCircle, ShieldAlert, FileUp } from 'lucide-react';
import { registerWork } from '@/services/dashboardApi';
import type { DashboardSummary } from '@/types/dashboard';

const workTypes = [
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Vídeo' },
  { value: 'image', label: 'Imagen' },
  { value: 'document', label: 'Documento' },
  { value: 'other', label: 'Otro' },
];

export function RegisterWork({ summary }: { summary: DashboardSummary | null }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [ownership, setOwnership] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [workType, setWorkType] = useState('');
  const [resultId, setResultId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const kycBlocked = summary && summary.kycStatus !== 'verified';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setStatus('idle');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await registerWork({
        title: fd.get('title') as string,
        type: workType as any,
        author: fd.get('author') as string,
        description: fd.get('description') as string,
        file,
        ownershipDeclaration: ownership,
      });
      setResultId(res.registrationId);
      setStatus('success');
    } catch { setStatus('error'); }
    setLoading(false);
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" /> Registrar obra
        </CardTitle>
      </CardHeader>
      <CardContent>
        {kycBlocked ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              <span className="font-medium text-sm">Verificación de identidad requerida</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Tu verificación de identidad puede tardar hasta 48 horas en estar lista.
              Si ha pasado más tiempo, contáctanos.
            </p>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Estado: {summary?.kycStatus === 'pending' ? 'Pendiente' : 'No verificado'}
            </Badge>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-medium text-sm">Registro en proceso</p>
            <p className="text-xs text-muted-foreground">ID: {resultId}</p>
            <Button variant="outline" size="sm" onClick={() => { setStatus('idle'); setFile(null); setOwnership(false); }}>
              Registrar otra obra
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-muted-foreground">1 registro = 1 crédito</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Título de la obra</Label>
              <Input name="title" required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de obra</Label>
              <Select value={workType} onValueChange={setWorkType} required>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {workTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Autor o titular</Label>
              <Input name="author" required className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea name="description" rows={2} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Archivo original</Label>
              <div
                className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">
                  {file ? file.name : 'Seleccionar archivo'}
                </span>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ownership" checked={ownership} onCheckedChange={v => setOwnership(!!v)} />
              <Label htmlFor="ownership" className="text-xs leading-tight cursor-pointer">
                Declaro ser titular legítimo de esta obra
              </Label>
            </div>
            {status === 'error' && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" /> Error al registrar la obra
              </div>
            )}
            <Button type="submit" className="w-full" size="sm" disabled={loading || !ownership || !file || !workType}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar obra'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
