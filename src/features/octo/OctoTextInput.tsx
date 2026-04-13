import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Mic, Square, Paperclip, X, Play, Pause } from 'lucide-react';
import type { RequirementsPayload } from './types';

interface OctoTextInputProps {
  placeholder?: string;
  onSubmit: (payload: RequirementsPayload) => void;
  visible: boolean;
}

export default function OctoTextInput({
  placeholder = 'Tell me about your project...',
  onSubmit,
  visible,
}: OctoTextInputProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (voiceUrl) URL.revokeObjectURL(voiceUrl);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
    };
  }, [voiceUrl]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 10 * 1024 * 1024) {
          setError('Recording too large — try a shorter message.');
          return;
        }
        setVoiceBlob(blob);
        const url = URL.createObjectURL(blob);
        setVoiceUrl(url);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);

      // Auto-stop after 5 minutes (300 seconds)
      // Call stop directly on the recorder ref to avoid stale-closure issues
      // with the stopRecording callback (which captures recording state at definition time).
      maxDurationTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setRecording(false);
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          setError('Maximum 5-minute recording reached.');
        }
        maxDurationTimerRef.current = null;
      }, 300_000);
    } catch {
      setError('Mic access denied. You can still type or attach a file.');
    }
  }, []);

  const stopRecording = useCallback((reason?: 'max-duration') => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }
      if (reason === 'max-duration') {
        setError('Maximum 5-minute recording reached.');
      }
    }
  }, [recording]);

  const discardVoice = useCallback(() => {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceBlob(null);
    setVoiceUrl(null);
    setRecordingDuration(0);
    setPlaying(false);
  }, [voiceUrl]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }, [playing]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        setError('File too large — max 10MB.');
        return;
      }
      setFile(f);
      setError(null);
    }
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!text.trim() && !voiceBlob && !file) {
        setError('Add some text, record a voice note, or attach a file.');
        return;
      }
      onSubmit({ text: text.trim(), voiceNote: voiceBlob, file });
    },
    [text, voiceBlob, file, onSubmit]
  );

  if (!visible) return null;

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 max-w-2xl mx-auto animate-fade-up">
      {/* Text input */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={4}
          maxLength={5000}
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted/50 focus:outline-none focus:border-orange/50 focus:ring-1 focus:ring-orange/20 transition-all resize-none"
        />
        {text.length > 4000 && (
          <p className="mt-1 text-xs text-text-muted/60 text-right">
            {text.length} / 5000
          </p>
        )}
      </div>

      {/* Voice note preview */}
      {voiceBlob && voiceUrl && (
        <div className="mt-3 flex items-center gap-3 p-3 bg-surface border border-orange/30 rounded-xl animate-fade-in">
          <button
            type="button"
            onClick={togglePlayback}
            className="w-9 h-9 rounded-full bg-orange text-bg flex items-center justify-center hover:bg-orange-light transition-colors"
          >
            {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <div className="flex-1">
            <div className="text-sm font-medium text-text">Voice note</div>
            <div className="text-xs text-text-muted">{formatDuration(recordingDuration)}</div>
          </div>
          <button
            type="button"
            onClick={discardVoice}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-orange/40 transition-all"
            aria-label="Remove voice note"
          >
            <X size={14} />
          </button>
          <audio ref={audioRef} src={voiceUrl} onEnded={() => setPlaying(false)} />
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="mt-3 flex items-center gap-3 p-3 bg-surface border border-orange/30 rounded-xl animate-fade-in">
          <div className="w-9 h-9 rounded-lg bg-orange-dim flex items-center justify-center">
            <Paperclip size={14} className="text-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text truncate">{file.name}</div>
            <div className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</div>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-orange/40 transition-all"
            aria-label="Remove file"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-3 text-xs text-orange-light">{error}</p>}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Voice record button */}
          {!voiceBlob && (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-300 text-sm font-medium ${
                recording
                  ? 'border-orange bg-orange/10 text-orange'
                  : 'border-border text-text-muted hover:border-orange/40 hover:text-text'
              }`}
            >
              {recording ? <Square size={14} /> : <Mic size={14} />}
              {recording ? `Recording ${formatDuration(recordingDuration)}` : 'Voice note'}
            </button>
          )}

          {/* File attach button */}
          {!file && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-text-muted hover:border-orange/40 hover:text-text transition-all duration-300 text-sm font-medium"
              >
                <Paperclip size={14} />
                Attach spec
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
        </div>

        <button
          type="submit"
          className="btn-glow group flex items-center gap-2 px-6 py-3 bg-orange text-bg font-semibold rounded-full transition-all duration-300 hover:bg-orange-light hover:shadow-lg hover:shadow-orange/20"
        >
          Send
          <Send size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </form>
  );
}
