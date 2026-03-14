import { useRef, useCallback, useState } from 'react';
import { Upload, X, FileUp, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WizardData } from './types';

interface StepFileProps {
  data: WizardData;
  onUpdate: (d: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepFile({ data, onUpdate, onNext, onBack }: StepFileProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (f: File) => onUpdate({ file: f, aiAudioUrl: null }),
    [onUpdate]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const hasFile = data.file || data.aiAudioUrl;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Subir archivo</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Se generará una huella digital del archivo para certificar su autoría.
        </p>
      </div>

      {data.aiAudioUrl && !data.file ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Music className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Audio generado con AI MusicDibs Studio</p>
            <p className="text-xs text-muted-foreground">Se usará automáticamente</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            Cambiar
          </Button>
        </div>
      ) : data.file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileUp className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{data.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(data.file.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onUpdate({ file: null })}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Arrastra tu archivo aquí</p>
            <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar</p>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
      }} />

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>Atrás</Button>
        <Button variant="hero" onClick={onNext} disabled={!hasFile}>Continuar</Button>
      </div>
    </div>
  );
}
