import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Loader2, CheckCircle2, XCircle, FileUp, ExternalLink } from 'lucide-react';
import { verifyFile } from '@/services/dashboardApi';
import type { VerificationResult } from '@/types/dashboard';

export function VerifyRegistration() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const res = await verifyFile(file);
      setResult(res);
    } catch { setResult({ found: false }); }
    setLoading(false);
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" /> Verificar tu registro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Verifica si una obra ha sido registrada con nosotros.
        </p>
        <div
          className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">
            {file ? file.name : 'Seleccionar archivo'}
          </span>
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); }} />

        <Button className="w-full" size="sm" onClick={handleVerify} disabled={!file || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
        </Button>

        {result && (
          result.found ? (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" /> Registro encontrado
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{result.title}</span> — registrado el{' '}
                {new Date(result.registeredAt!).toLocaleDateString('es-ES')}
              </p>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" asChild>
                <a href={result.certificateUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Ver certificado
                </a>
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                <XCircle className="h-4 w-4" /> Registro no encontrado
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Este archivo no está registrado en nuestro sistema.
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
