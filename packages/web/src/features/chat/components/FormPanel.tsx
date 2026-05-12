import { useState, useCallback, FormEvent } from 'react';
import TextFallback from './TextFallback';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  required?: boolean;
  placeholder?: string;
}

export interface FormPanelProps {
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void;
  onTextSend?: (text: string) => void;
  onMicStart?: () => void;
  onMicStop?: () => void;
  isRecording?: boolean;
}

/**
 * FormPanel — renders a list of labeled form fields dynamically.
 * Validates required fields before submission (OCP: new field types
 * can be added without modifying this component's validation logic).
 */
export default function FormPanel({
  fields,
  onSubmit,
  onTextSend,
  onMicStart,
  onMicStop,
  isRecording = false,
}: FormPanelProps) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.name, ''])),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleChange = useCallback(
    (name: string, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleBlur = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const isFieldInvalid = (field: FormField): boolean =>
    !!field.required && !values[field.name]?.trim();

  const hasErrors = fields.some(isFieldInvalid);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setSubmitAttempted(true);
      // Mark all fields touched so errors become visible
      setTouched(Object.fromEntries(fields.map((f) => [f.name, true])));
      if (hasErrors) return;
      onSubmit(values);
    },
    [fields, hasErrors, onSubmit, values],
  );

  const showError = (field: FormField): boolean =>
    isFieldInvalid(field) && (touched[field.name] || submitAttempted);

  const inputBase =
    'w-full px-3.5 py-2.5 bg-surface border rounded-xl text-text text-sm placeholder:text-text-muted/50 focus:outline-none focus:ring-1 transition-all min-h-[44px]';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 animate-fade-up">
      {fields.map((field) => {
        const invalid = showError(field);
        const borderClass = invalid
          ? 'border-orange/60 focus:border-orange focus:ring-orange/20'
          : 'border-border focus:border-orange/50 focus:ring-orange/20';

        return (
          <div key={field.name} className="flex flex-col gap-1">
            <label
              htmlFor={`form-field-${field.name}`}
              className="text-[11px] uppercase tracking-wider text-text-muted font-medium"
            >
              {field.label}
              {field.required && (
                <span className="ml-1 text-orange" aria-hidden="true">*</span>
              )}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                id={`form-field-${field.name}`}
                name={field.name}
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                onBlur={() => handleBlur(field.name)}
                placeholder={field.placeholder}
                rows={3}
                required={field.required}
                aria-invalid={invalid}
                className={`${inputBase} ${borderClass} resize-none`}
              />
            ) : (
              <input
                id={`form-field-${field.name}`}
                name={field.name}
                type={field.type}
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                onBlur={() => handleBlur(field.name)}
                placeholder={field.placeholder}
                required={field.required}
                aria-invalid={invalid}
                className={`${inputBase} ${borderClass}`}
              />
            )}

            {invalid && (
              <p className="text-xs text-orange-light" role="alert">
                {field.label} is required.
              </p>
            )}
          </div>
        );
      })}

      <button
        type="submit"
        className="px-6 py-3 bg-orange text-bg font-semibold rounded-xl transition-all duration-200 hover:bg-orange-light min-h-[44px] self-start"
      >
        Submit
      </button>

      {/* Integrated text fallback */}
      {onTextSend && (
        <TextFallback
          placeholder="Or describe your answer…"
          onSend={onTextSend}
          onMicStart={onMicStart ?? (() => {})}
          onMicStop={onMicStop ?? (() => {})}
          isRecording={isRecording}
        />
      )}
    </form>
  );
}
