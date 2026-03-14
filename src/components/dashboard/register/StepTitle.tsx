import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WORK_TYPES, type WizardData } from './types';

interface StepTitleProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTitle({ data, onUpdate, onNext, onBack }: StepTitleProps) {
  const valid = data.title.trim() && data.workType;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Información de la obra</h2>
        <p className="text-sm text-muted-foreground mt-1">Describe tu obra.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Título de la obra *</Label>
          <Input
            value={data.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ej: Mi canción favorita"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Tipo de obra *</Label>
          <Select value={data.workType} onValueChange={(v) => onUpdate({ workType: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
            <SelectContent>
              {WORK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Descripción <span className="text-muted-foreground">(opcional)</span></Label>
          <Textarea
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={3}
            placeholder="Describe brevemente tu obra..."
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
