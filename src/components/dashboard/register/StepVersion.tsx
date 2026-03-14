import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VERSION_TYPES, type WizardData } from './types';

interface StepVersionProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepVersion({ data, onUpdate, onNext, onBack }: StepVersionProps) {
  const valid = !!data.versionType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Información de la versión</h2>
        <p className="text-sm text-muted-foreground mt-1">Describe esta versión de tu obra.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Tipo de versión *</Label>
          <Select value={data.versionType} onValueChange={(v) => onUpdate({ versionType: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar tipo de versión" /></SelectTrigger>
            <SelectContent>
              {VERSION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Título de la versión <span className="text-muted-foreground">(opcional)</span></Label>
          <Input
            value={data.versionTitle}
            onChange={(e) => onUpdate({ versionTitle: e.target.value })}
            placeholder="Ej: Remix acústico"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Descripción <span className="text-muted-foreground">(opcional)</span></Label>
          <Textarea
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={3}
            placeholder="Describe brevemente esta versión..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>Atrás</Button>
        <Button variant="hero" onClick={onNext} disabled={!valid}>Continuar</Button>
      </div>
    </div>
  );
}
