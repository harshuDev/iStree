import { diffDays, PHASE_LABEL, type CycleContext } from '../lib/cycle';
import { ordinal } from '../lib/phaseVisuals';

/**
 * Lunari-style cycle dial. One trip round the ring = one cycle (day 1 at the top,
 * clockwise). Pink arc = period, yellow arc = fertile window, orange dot =
 * estimated ovulation, white knob = today.
 */
export function CycleRing({ ctx }: { ctx: CycleContext }) {
  const size = 300;
  const c = size / 2;
  const r = 128;
  const len = ctx.cycleLength;
  const day = Math.min(ctx.dayOfCycle, len); // 1-based, clamped when late
  const periodDays = diffDays(ctx.periodEnd, ctx.currentStart) + 1;
  const fertileFrom = diffDays(ctx.fertileStart, ctx.currentStart);
  const fertileDays = diffDays(ctx.fertileEnd, ctx.fertileStart) + 1;
  const ovOffset = diffDays(ctx.ovulationDate, ctx.currentStart);

  const point = (offsetDays: number, radius = r) => {
    const a = (offsetDays / len) * 2 * Math.PI - Math.PI / 2;
    return { x: c + radius * Math.cos(a), y: c + radius * Math.sin(a) };
  };
  const arc = (from: number, days: number, color: string, key: string) => (
    <circle
      key={key}
      cx={c}
      cy={c}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={18}
      strokeLinecap="round"
      pathLength={len}
      strokeDasharray={`${Math.max(days - 0.35, 0.01)} ${len}`}
      strokeDashoffset={-(from + 0.175)}
      transform={`rotate(-90 ${c} ${c})`}
    />
  );

  const knob = point(day - 0.5);
  const ov = point(ovOffset + 0.5);
  const daysToOvulation = ovOffset - (ctx.dayOfCycle - 1);

  let label: string = PHASE_LABEL[ctx.phase];
  let sub: string;
  if (ctx.phase === 'menstrual') label = 'Period';
  if (ctx.daysLate > 0) sub = `Period late · ${ctx.daysLate} day${ctx.daysLate === 1 ? '' : 's'}`;
  else if (daysToOvulation > 1) sub = `Ovulation · ${daysToOvulation} days left`;
  else if (ctx.phase === 'ovulation') sub = 'Fertile window · high chance';
  else sub = ctx.daysUntilNextPeriod === 0 ? 'Period may start today' : `Period · ${ctx.daysUntilNextPeriod} days left`;

  return (
    <svg
      className="cycle-ring"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${label}, day ${ctx.dayOfCycle} of about ${len}. ${sub}.`}
    >
      <circle className="cycle-ring__track" cx={c} cy={c} r={r} fill="none" strokeWidth={18} />
      {Array.from({ length: len }, (_, i) => {
        const a = point(i, r - 24);
        const b = point(i, r - (i % 7 === 0 ? 33 : 29));
        return <line key={i} className="cycle-ring__tick" x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={2} strokeLinecap="round" />;
      })}
      {arc(fertileFrom, fertileDays, 'var(--yellow)', 'fertile')}
      {arc(0, periodDays, 'var(--period)', 'period')}
      <circle cx={ov.x} cy={ov.y} r={6} fill="var(--orange)" stroke="var(--surface)" strokeWidth={3} />
      <circle cx={knob.x} cy={knob.y} r={13} fill="var(--surface)" stroke="var(--primary)" strokeWidth={5} />

      <path
        d={`M${c} ${c - 66}c5 6.2 7.8 10.6 7.8 14.2a7.8 7.8 0 0 1-15.6 0c0-3.6 2.8-8 7.8-14.2z`}
        fill="var(--primary)"
      />
      <text className="cycle-ring__label" x={c} y={c - 26} textAnchor="middle">{label}</text>
      <text x={c} y={c + 30} textAnchor="middle">
        <tspan className="cycle-ring__big">{ordinal(ctx.dayOfCycle)}</tspan>
        <tspan className="cycle-ring__unit" dx={4}>day</tspan>
      </text>
      <text className="cycle-ring__sub" x={c} y={c + 58} textAnchor="middle">{sub}</text>
    </svg>
  );
}
