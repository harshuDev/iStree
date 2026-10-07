import { useEffect, type ReactNode } from 'react';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="spinner" role="status" aria-label={label} />;
}

export function Splash() {
  return (
    <div className="splash">
      <Spinner />
    </div>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="switch-row">
      <span className="stack" style={{ gap: 2 }}>
        <span>{label}</span>
        {description && <span className="small muted">{description}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step))} disabled={value <= min}>
        −
      </button>
      <output aria-live="polite">{format(value)}</output>
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step))} disabled={value >= max}>
        +
      </button>
    </div>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  label,
}: {
  options: readonly { value: T; label: string; emoji?: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  multiple?: boolean;
  label: string;
}) {
  const toggle = (v: T) => {
    if (multiple) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    else onChange(value.includes(v) ? [] : [v]);
  };
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={value.includes(o.value)} onClick={() => toggle(o.value)}>
          {o.emoji && <span aria-hidden>{o.emoji}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grabber" />
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="alert alert--error">{error instanceof Error ? error.message : String(error)}</div>;
}
