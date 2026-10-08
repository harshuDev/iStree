import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { filled?: boolean };

const base = ({ filled, ...props }: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  'data-filled': filled ? '' : undefined,
  ...props,
});
const fill = (filled?: boolean) => (filled ? 'currentColor' : 'none');

/* ---- brand ---- */
export const LogoMark = (p: P) => (
  <svg {...base(p)} viewBox="0 0 32 32" strokeWidth={2.6}>
    <path d="M24.5 7.5A11 11 0 1 0 27 16" />
    <path d="M16 9c3 3.8 4.8 6.6 4.8 9a4.8 4.8 0 0 1-9.6 0c0-2.4 1.8-5.2 4.8-9z" fill="currentColor" stroke="none" />
    <circle cx="26" cy="11" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);

/* ---- navigation ---- */
export const HomeIcon = ({ filled, ...p }: P) => (
  <svg {...base(p)}><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z" fill={fill(filled)} /></svg>
);
export const CalendarIcon = ({ filled, ...p }: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" fill={fill(filled)} />
    <path d="M3.5 10h17M8 3v4M16 3v4" stroke={filled ? 'var(--surface)' : 'currentColor'} />
    {filled && <path d="M8 3v4M16 3v4" />}
  </svg>
);
export const LogIcon = ({ filled, ...p }: P) => (
  <svg {...base(p)}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="3" fill={fill(filled)} />
    <path d="M12 8.5v7M8.5 12h7" stroke={filled ? 'var(--surface)' : 'currentColor'} />
  </svg>
);
export const InsightsIcon = ({ filled, ...p }: P) => (
  <svg {...base(p)}>
    <rect x="4" y="11" width="4" height="9" rx="1.5" fill={fill(filled)} />
    <rect x="10" y="4" width="4" height="16" rx="1.5" fill={fill(filled)} />
    <rect x="16" y="14" width="4" height="6" rx="1.5" fill={fill(filled)} />
  </svg>
);
export const UserIcon = ({ filled, ...p }: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" fill={fill(filled)} />
    <path d="M4.5 20.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5z" fill={fill(filled)} />
  </svg>
);

/* ---- UI ---- */
export const ChevronLeft = (p: P) => <svg {...base(p)}><path d="m15 5-7 7 7 7" /></svg>;
export const ChevronRight = (p: P) => <svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>;
export const CloseIcon = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const PlusIcon = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const EditIcon = (p: P) => <svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>;
export const MailIcon = (p: P) => <svg {...base(p)}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>;
export const LockIcon = (p: P) => <svg {...base(p)}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>;
export const EyeIcon = (p: P) => <svg {...base(p)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>;
export const EyeOffIcon = (p: P) => <svg {...base(p)}><path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.7M6.5 7.6A16.4 16.4 0 0 0 2.5 12S6 18 12 18c1.6 0 3-.4 4.2-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
export const DropIcon = ({ filled = true, ...p }: P) => (
  <svg {...base(p)}><path d="M12 3c3.8 4.7 6 8 6 11a6 6 0 0 1-12 0c0-3 2.2-6.3 6-11z" fill={fill(filled)} /></svg>
);
export const BellIcon = (p: P) => <svg {...base(p)}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>;
export const SunMoonIcon = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" /></svg>;
export const SlidersIcon = (p: P) => <svg {...base(p)}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>;
export const ShieldIcon = (p: P) => <svg {...base(p)}><path d="M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>;
export const DownloadIcon = (p: P) => <svg {...base(p)}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" /></svg>;
export const LogoutIcon = (p: P) => <svg {...base(p)}><path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" /></svg>;
export const TrashIcon = (p: P) => <svg {...base(p)}><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" /></svg>;
export const PhoneIcon = (p: P) => <svg {...base(p)}><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></svg>;
export const KeyIcon = (p: P) => <svg {...base(p)}><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 7l2 2M14 9l2 2" /></svg>;
export const MoonIcon = (p: P) => <svg {...base(p)}><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" /></svg>;
export const BoltIcon = (p: P) => <svg {...base(p)}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg>;

/** iOS Safari "Share" glyph, used in install instructions. */
export const ShareIcon = (p: P) => (
  <svg {...base({ className: 'share-icon', ...p })}><path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" /></svg>
);
export const PlusSquareIcon = (p: P) => (
  <svg {...base({ className: 'share-icon', ...p })}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></svg>
);

/** Flow intensity: number of drops grows with the flow. */
export function FlowIcon({ level }: { level: 'none' | 'spotting' | 'light' | 'medium' | 'heavy' }) {
  const drop = (x: number, y: number, s: number, key: string) => (
    <path key={key} d={`M${x} ${y - 7 * s}c${3 * s} ${3.8 * s} ${4.6 * s} ${6.4 * s} ${4.6 * s} ${8.6 * s}a${4.6 * s} ${4.6 * s} 0 0 1-${9.2 * s} 0c0-${2.2 * s} ${1.6 * s}-${4.8 * s} ${4.6 * s}-${8.6 * s}z`} fill="var(--primary)" />
  );
  const shapes = {
    none: [<circle key="n" cx="16" cy="16" r="7" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeDasharray="3 3" />],
    spotting: [<circle key="a" cx="12" cy="14" r="2.2" fill="var(--primary)" />, <circle key="b" cx="19" cy="12" r="1.6" fill="var(--primary)" />, <circle key="c" cx="17" cy="19" r="1.9" fill="var(--primary)" />],
    light: [drop(16, 15, 1, 'l')],
    medium: [drop(12, 16, 0.85, 'a'), drop(20.5, 13, 0.75, 'b')],
    heavy: [drop(10.5, 17, 0.8, 'a'), drop(20, 12, 0.7, 'b'), drop(21, 22, 0.55, 'c')],
  };
  return (
    <svg viewBox="0 0 32 32" aria-hidden width="30" height="30">
      {shapes[level]}
    </svg>
  );
}
