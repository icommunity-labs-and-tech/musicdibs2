import { useRef, useCallback, useState } from 'react';
import { Upload, X, FileUp, Music, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const filesArray = Array.from(newFiles);
      if (filesArray.length === 0) return;
      const primary = data.file || filesArray[0];
      const merged = [...data.files, ...filesArray];
      const unique = merged.filter((f, i, arr) =>
        arr.findIndex(x => x.name === f.name && x.size === f.size) === i
      );
      onUpdate({ file: primary, files: unique, aiAudioUrl: null });
    },
    [onUpdate, data.file, data.files]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = data.files.filter((_, i) => i !== index);
      const newPrimary = newFiles.length > 0 ? newFiles[0] : null;
      onUpdate({ file: newPrimary, files: newFiles });
    },
    [onUpdate, data.files]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const hasFile = data.files.length > 0 || data.aiAudioUrl;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('wizard.file.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('wizard.file.subtitle')}</p>
      </div>

      {data.aiAudioUrl && data.files.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <Music className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{t('wizard.file.aiAudioLabel')}</p>
            <p className="text-xs text-muted-foreground">{t('wizard.file.aiAudioSub')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            {t('wizard.file.change')}
          </Button>
        </div>
      ) : data.files.length > 0 ? (
        <div className="space-y-2">
          {data.files.map((f, idx) => (
            <div key={`${f.name}-${f.size}`} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileUp className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeFile(idx)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
            <Plus className="h-4 w-4 mr-1" /> {t('wizard.file.addMore')}
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
            <p className="text-sm font-medium">{t('wizard.file.dragHere')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('wizard.file.clickSelect')}</p>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => {
        if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
        e.target.value = '';
      }} />

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>{t('wizard.back')}</Button>
        <Button variant="hero" onClick={onNext} disabled={!hasFile}>{t('wizard.continue')}</Button>
      </div>
    </div>
  );
}
