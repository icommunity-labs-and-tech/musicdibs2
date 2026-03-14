import { FileUp, Users, Music, Info, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { WORK_TYPES, VERSION_TYPES, CREATOR_ROLES, type WizardData } from './types';

interface StepSummaryProps {
  data: WizardData;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

function labelFor(arr: readonly { value: string; label: string }[], val: string) {
  return arr.find((x) => x.value === val)?.label ?? val;
}

export function StepSummary({ data, loading, onSubmit, onBack }: StepSummaryProps) {
  const isVersion = data.flow === 'version';
  const title = isVersion ? (data.versionTitle || data.parentWorkTitle || 'Versión') : data.title;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Resumen del registro</h2>
        <p className="text-sm text-muted-foreground mt-1">Revisa la información antes de confirmar.</p>
      </div>

      <div className="space-y-3">
        {isVersion && data.parentWorkTitle && (
          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <Music className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Obra original</p>
                <p className="text-sm font-medium">{data.parentWorkTitle}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{data.file?.name ?? 'Audio AI generado'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Título:</span> {title}
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>{' '}
                {isVersion
                  ? labelFor(VERSION_TYPES, data.versionType)
                  : labelFor(WORK_TYPES, data.workType)}
              </div>
              {data.description && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Descripción:</span> {data.description}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Creadores ({data.creators.length})</p>
            </div>
            {data.creators.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium">{c.name}</span>
                {c.roles.map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px] h-5">
                    {CREATOR_ROLES.find((x) => x.value === r)?.label ?? r}
                  </Badge>
                ))}
                {c.percentage !== null && c.percentage > 0 && (
                  <span className="text-muted-foreground">{c.percentage}%</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm">
            Este registro consumirá <strong>{FEATURE_COSTS.register_work} crédito</strong>.
            {isVersion && ' Esta versión quedará vinculada a la obra original en tu catálogo.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>Atrás</Button>
        <Button variant="hero" onClick={onSubmit} disabled={loading} className="min-w-[180px]">
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registrando...</>
          ) : (
            isVersion ? 'Registrar versión' : 'Registrar obra'
          )}
        </Button>
      </div>
    </div>
  );
}
