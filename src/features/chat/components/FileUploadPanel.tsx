import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { FileUp } from 'lucide-react';
import TextFallback from './TextFallback';

export interface FileUploadPanelProps {
  acceptTypes?: string;
  allowSkip?: boolean;
  onUpload: (file: File) => void;
  onSkip: () => void;
  onTextSend?: (text: string) => void;
  onMicStart?: () => void;
  onMicStop?: () => void;
  isRecording?: boolean;
}

/**
 * FileUploadPanel — dashed drop zone with drag-over state.
 * Single-responsibility: receive a File and hand it upstream via onUpload.
 * TextFallback is delegated to its own component (SRP).
 */
export default function FileUploadPanel({
  acceptTypes = '.pdf,.doc,.docx,.txt,image/*',
  allowSkip = true,
  onUpload,
  onSkip,
  onTextSend,
  onMicStart,
  onMicStop,
  isRecording = false,
}: FileUploadPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

  const validateAndUpload = useCallback(
    (file: File) => {
      if (file.size > MAX_BYTES) {
        setError('File too large — max 10 MB.');
        return;
      }
      setError(null);
      onUpload(file);
    },
    [onUpload],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [validateAndUpload],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndUpload(file);
      // Reset so the same file can be re-selected if needed
      e.target.value = '';
    },
    [validateAndUpload],
  );

  const handleZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload file — click or drag a file here"
        onClick={handleZoneClick}
        onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleZoneClick() : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'flex flex-col items-center justify-center gap-2 p-8 rounded-xl cursor-pointer',
          'border-2 border-dashed transition-all duration-200 select-none min-h-[44px]',
          isDragOver
            ? 'border-orange bg-orange/5'
            : 'border-border bg-surface hover:border-orange/50 hover:bg-surface',
        ].join(' ')}
      >
        <FileUp
          size={28}
          className={isDragOver ? 'text-orange' : 'text-text-muted'}
        />
        <p className="text-sm font-medium text-text text-center">
          Drop files here or tap to browse
        </p>
        <p className="text-xs text-text-muted text-center">
          PDF, images, docs — up to 10 MB
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-orange-light">{error}</p>
      )}

      {/* Skip */}
      {allowSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="self-start px-4 py-2.5 bg-transparent border border-border rounded-xl text-text-muted text-sm transition-all duration-200 hover:border-orange/40 hover:text-text min-h-[44px]"
        >
          Skip for now
        </button>
      )}

      {/* Integrated text fallback */}
      {onTextSend && (
        <TextFallback
          placeholder="Or describe what you'd share…"
          onSend={onTextSend}
          onMicStart={onMicStart ?? (() => {})}
          onMicStop={onMicStop ?? (() => {})}
          isRecording={isRecording}
        />
      )}
    </div>
  );
}
