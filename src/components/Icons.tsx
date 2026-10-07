import type { SVGProps } from 'react';

const base = (props: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3c3 4 6 7 6 10.5A6 6 0 0 1 6 13.5C6 10 9 7 12 3z" /></svg>
);
export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const CheckInIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.5l2.3 2.3 4.7-5" /></svg>
);
export const InsightsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 20V11M12 20V5M19 20v-6" /></svg>
);
export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.2 7l2.6 1.5M17.2 15.5l2.6 1.5M4.2 17l2.6-1.5M17.2 8.5L19.8 7" /></svg>
);
/** iOS Safari "Share" glyph, used in install instructions. */
export const ShareIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ className: 'share-icon', ...p })}><path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" /></svg>
);
export const PlusSquareIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ className: 'share-icon', ...p })}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></svg>
);
