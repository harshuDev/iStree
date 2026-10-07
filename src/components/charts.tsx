import { useState } from 'react';
import { formatDate } from '../lib/dates';
import type { CyclePoint } from '../lib/insights';

/** Vertical bars of cycle length per cycle, with a dashed average line. Single series → one hue, no legend. */
export function CycleLengthChart({ points, average }: { points: CyclePoint[]; average: number | null }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 320;
  const H = 160;
  const pad = { top: 12, right: 8, bottom: 22, left: 28 };
  const maxY = Math.max(40, ...points.map((p) => p.length)) + 2;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.min(28, slot - 2); // >= 2px surface gap between bars
  const y = (v: number) => pad.top + innerH - (v / maxY) * innerH;
  const ticks = [0, 10, 20, 30, 40].filter((t) => t <= maxY);
  const shown = active !== null ? points[active] : null;

  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="chart-tooltip" aria-live="polite">
        {shown ? `Started ${formatDate(shown.start)} · ${shown.length} days` : 'Tap a bar for details'}
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cycle length per cycle in days">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          const top = y(p.length);
          const h = y(0) - top;
          const r = Math.min(4, h);
          // Rounded data-end, square baseline.
          const d = `M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${y(0)} Z`;
          return (
            <g key={p.start}>
              {/* Hit target taller than the mark */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(i)} />
              <path className="bar" d={d} tabIndex={0} onFocus={() => setActive(i)} onBlur={() => setActive(null)} aria-label={`${formatDate(p.start)}: ${p.length} days`} style={{ pointerEvents: 'none', opacity: active === null || active === i ? 1 : 0.55 }} />
              {(i === 0 || i === points.length - 1) && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle">{formatDate(p.start)}</text>
              )}
            </g>
          );
        })}
        {average !== null && (
          <g>
            <line className="avg-line" x1={pad.left} x2={W - pad.right} y1={y(average)} y2={y(average)} />
            <text x={W - pad.right} y={y(average) - 4} textAnchor="end">avg {average} d</text>
          </g>
        )}
      </svg>
    </div>
  );
}

/** Horizontal labeled bars for counts (symptoms, moods). */
export function CountBars({ rows, max }: { rows: { label: string; count: number; hint?: string }[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bar-row" title={r.hint}>
          <span className="bar-row__label">{r.label}</span>
          <span className="bar-row__track">
            <span className="bar-row__fill" style={{ width: `${(r.count / top) * 100}%`, display: 'block' }} />
          </span>
          <span className="bar-row__value">{r.count}</span>
        </div>
      ))}
    </div>
  );
}
