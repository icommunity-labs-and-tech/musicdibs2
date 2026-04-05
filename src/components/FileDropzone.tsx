import { useCallback, useState, useRef } from 'react';
import { Upload, X, FileAudio, Image as ImageIcon, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  maxSize?: number;
  currentFile?: File | null;
  preview?: string | null;
  label?: string;
  description?: string;
  disabled?: boolean;
  fileType?: 'image' | 'audio' | 'any';
  className?: string;
}

export const FileDropzone = ({
  onFileSelect,
  onRemove,
  accept = '*/*',
  maxSize = 10,
  currentFile,
  preview,
  label,
  description,
  disabled = false,
  fileType = 'any',
  className,
}: FileDropzoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `El archivo debe ser menor a ${maxSize}MB`;
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileSelect(file);
  }, [onFileSelect, maxSize]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFile(files[0]);
  }, [disabled, handleFile]);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const hasContent = preview || currentFile;

  const renderIcon = () => {
    if (fileType === 'image') return <ImageIcon className="h-6 w-6 text-primary" />;
    if (fileType === 'audio') return <FileAudio className="h-6 w-6 text-primary" />;
    return <Upload className="h-6 w-6 text-primary" />;
  };

  const formatHints = () => {
    if (fileType === 'image') return `JPG, PNG o WEBP (máx. ${maxSize}MB)`;
    if (fileType === 'audio') return `MP3, WAV o FLAC (máx. ${maxSize}MB)`;
    return `máx. ${maxSize}MB`;
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label>{label}</Label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {/* Image preview */}
      {fileType === 'image' && preview ? (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleClick}>
              Cambiar
            </Button>
            {onRemove && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : currentFile ? (
        /* Audio / generic file preview */
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {fileType === 'audio' ? (
              <FileAudio className="h-4 w-4 text-primary" />
            ) : (
              <FileUp className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(currentFile.size)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleClick} className="text-xs">
              Cambiar
            </Button>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Empty state with drag & drop */
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {renderIcon()}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragging ? 'Suelta el archivo aquí' : 'Haz clic o arrastra un archivo'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatHints()}</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};
