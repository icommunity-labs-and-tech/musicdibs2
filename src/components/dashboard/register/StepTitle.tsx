import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WORK_TYPES, type WizardData } from './types';

interface StepTitleProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTitle({ data, onUpdate, onNext, onBack }: StepTitleProps) {
  const valid = data.title.trim() && data.workType;
  const [generatingDesc, setGeneratingDesc] = useState(false);

  const handleGenerateDescription = async () => {
    if (!data.title.trim()) {
      toast.error('Escribe un título primero para generar la descripción');
      return;
    }
    setGeneratingDesc(true);
    try {
      const workTypeLabel = WORK_TYPES.find(t => t.value === data.workType)?.label || data.workType;
      const context = [
        `Título: "${data.title}"`,
        data.workType ? `Tipo: ${workTypeLabel}` : '',
      ].filter(Boolean).join('. ');

      const basePrompt = data.description
        ? `Mejora y expande esta descripción de una obra musical: "${data.description}". Contexto: ${context}. Genera 2-3 frases descriptivas manteniendo la esencia original.`
        : `Genera una descripción breve y profesional (2-3 frases) para una obra musical con este contexto: ${context}. La descripción debe ser atractiva y describir el carácter de la obra.`;

      const { data: result, error } = await supabase.functions.invoke('improve-prompt', {
        body: { prompt: basePrompt, mode: 'song' },
      });

      if (error) throw error;
      const improved = result?.improved || result?.result;
      if (improved) {
        onUpdate({ description: improved });
        toast.success('Descripción generada');
      } else {
        toast.error('No se pudo generar la descripción');
      }
    } catch {
      toast.error('Error al generar la descripción');
    }
    setGeneratingDesc(false);
  };

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
          <div className="flex items-center justify-between">
            <Label className="text-sm">Descripción <span className="text-muted-foreground">(opcional)</span></Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-primary"
              disabled={generatingDesc || !data.title.trim()}
              onClick={handleGenerateDescription}
            >
              {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {generatingDesc ? 'Generando...' : 'Generar con IA'}
            </Button>
          </div>
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