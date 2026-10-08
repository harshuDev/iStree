import { useState } from 'react';
import { formatDate } from '../lib/dates';
import type { CyclePoint } from '../lib/insights';

/** Rounded-top bar path anchored to the baseline (4px data-end radius). */
function barPath(x: number, w: number, top: number, base: number) {
  const r = Math.min(6, base - top, w / 2);
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

interface BarDatum {
  key: string;
  label: string; // axis label
  title: string; // tooltip title
  value: number | null;
}

/**
 * Single-series vertical bars with an optional dashed reference line.
 * Single series → one hue, no legend (the card title names it).
 */
export function BarChart({
  data,
  color,
  max,
  reference,
  referenceLabel,
  format,
  ariaLabel,
}: {
  data: BarDatum[];
  color: string;
  max: number;
  reference?: number | null;
  referenceLabel?: string;
  format: (v: number) => string;
  ariaLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const W = 320;
  const H = 170;
  const pad = { top: 14, right: 8, bottom: 22, left: 34 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.min(26, slot - 6);
  const y = (v: number) => pad.top + innerH - (Math.min(v, max) / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const shown = active !== null ? data[active] : null;

  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="chart-tooltip" aria-live="polite">
        {shown ? `${shown.title} · ${shown.value === null ? 'not logged' : format(shown.value)}` : 'Tap a bar for details'}
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          return (
            <g key={d.key}>
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(i)} />
              {d.value !== null && d.value > 0 && (
                <path
                  d={barPath(x, barW, y(d.value), y(0))}
                  fill={color}
                  tabIndex={0}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${d.title}: ${format(d.value)}`}
                  style={{ pointerEvents: 'none', opacity: active === null || active === i ? 1 : 0.45 }}
                />
              )}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
        {reference != null && reference <= max && (
          <g>
            <line className="avg-line" x1={pad.left} x2={W - pad.right} y1={y(reference)} y2={y(reference)} />
            <text x={W - pad.right} y={y(reference) - 5} textAnchor="end">{referenceLabel ?? format(reference)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

/** Cycle length per completed cycle, with the average as a dashed line. */
export function CycleLengthChart({ points, average }: { points: CyclePoint[]; average: number | null }) {
  return (
    <BarChart
      data={points.map((p, i) => ({
        key: p.start,
        label: i === 0 || i === points.length - 1 ? formatDate(p.start) : '',
        title: `Started ${formatDate(p.start)}`,
        value: p.length,
      }))}
      color="var(--primary)"
      max={Math.max(40, ...points.map((p) => p.length))}
      reference={average}
      referenceLabel={average !== null ? `avg ${average} d` : undefined}
      format={(v) => `${Math.round(v)}`}
      ariaLabel="Cycle length per cycle in days"
    />
  );
}

/** Horizontal labeled bars for counts. */
export function CountBars({ rows, max }: { rows: { label: string; count: number }[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bar-row">
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
