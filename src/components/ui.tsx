import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LogoMark } from './Icons';

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

/** App header: brand mark (or a custom left action), centred title, optional right action. */
export function TopBar({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      <div>{left ?? <LogoMark className="topbar__mark" />}</div>
      <h1 className="topbar__title">{title}</h1>
      <div style={{ justifySelf: 'end' }}>{right}</div>
    </header>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action}
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
        <span className="bold">{label}</span>
        {description && <span className="tiny faint">{description}</span>}
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

/** Grid of round icon buttons (flow, moods, symptoms). */
export function PickGrid<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
  label,
}: {
  options: readonly { value: T; label: string; icon: ReactNode }[];
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
    <div className="pick-grid" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="pick" aria-pressed={value.includes(o.value)} onClick={() => toggle(o.value)}>
          <span className="pick__icon" aria-hidden>{o.icon}</span>
          {o.label}
        </button>
      ))}
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
  options: readonly { value: T; label: string }[];
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
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Settings-style row: icon, label (+hint), trailing value/control, optional chevron/link. */
export function ListRow({
  icon,
  label,
  hint,
  value,
  to,
  onClick,
  trailing,
  danger,
  sub,
}: {
  sub?: boolean;
  icon?: ReactNode;
  label: string;
  hint?: string;
  value?: ReactNode;
  to?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  const body = (
    <>
      {icon && <span className="list-row__icon">{icon}</span>}
      <span className="list-row__body">
        <span>{label}</span>
        {hint && <span className="list-row__hint">{hint}</span>}
      </span>
      {value !== undefined && <span className="list-row__value">{value}</span>}
      {trailing}
      {(to || onClick) && !trailing && <ChevronRight className="list-row__chevron" />}
    </>
  );
  const cls = `list-row${danger ? ' list-row--danger' : ''}${sub ? ' list-row--sub' : ''}`;
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" className={cls} onClick={onClick}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="alert alert--error">{error instanceof Error ? error.message : String(error)}</div>;
}
