import { useId } from 'react';

/** Drop that fills with water as you approach the daily goal. */
export function WaterDrop({ ml, goal }: { ml: number; goal: number }) {
  const id = useId();
  const level = Math.max(0, Math.min(1, ml / goal));
  const top = 128 - level * 112; // fill height inside the drop's 16..128 span
  const drop = 'M50 6C72 34 88 56 88 80a38 38 0 0 1-76 0C12 56 28 34 50 6z';
  return (
    <svg className="water__drop" viewBox="0 0 100 124" role="img" aria-label={`${Math.round(level * 100)}% of today's water goal`}>
      <defs>
        <clipPath id={id}>
          <path d={drop} />
        </clipPath>
      </defs>
      <path d={drop} fill="var(--surface-2)" />
      <g clipPath={`url(#${id})`}>
        <path
          d={`M0 ${top} Q 25 ${top - 7} 50 ${top} T 100 ${top} V 130 H 0 Z`}
          fill="var(--blue)"
          style={{ transition: 'all 0.4s ease' }}
        />
        <path d={`M0 ${top + 4} Q 25 ${top + 11} 50 ${top + 4} T 100 ${top + 4} V 130 H 0 Z`} fill="var(--blue)" opacity="0.6" />
      </g>
      <path d="M30 70c0-10 5-19 11-27" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.55" />
    </svg>
  );
}
