import { PHASE_LABEL, type CycleContext, type Phase } from '../lib/cycle';

export const PHASE_COLOR: Record<Phase, string> = {
  menstrual: 'var(--phase-menstrual)',
  follicular: 'var(--phase-follicular)',
  ovulation: 'var(--phase-ovulation)',
  luteal: 'var(--phase-luteal)',
};

/** Ring showing the four phase arcs of the cycle with a marker for today. */
export function PhaseRing({ ctx }: { ctx: CycleContext }) {
  const size = 132;
  const r = 54;
  const c = 2 * Math.PI * r;
  const len = ctx.cycleLength;
  const periodDays = ctx.periodLength;
  const ovStart = Math.round((Date.parse(ctx.ovulationDate) - Date.parse(ctx.currentStart)) / 86_400_000) - 1;
  const segments: { phase: Phase; from: number; to: number }[] = [
    { phase: 'menstrual', from: 0, to: periodDays },
    { phase: 'follicular', from: periodDays, to: ovStart },
    { phase: 'ovulation', from: ovStart, to: ovStart + 3 },
    { phase: 'luteal', from: ovStart + 3, to: len },
  ];
  const gap = 2; // surface gap between arcs
  const day = Math.min(ctx.dayOfCycle, len);
  const angle = ((day - 0.5) / len) * 2 * Math.PI - Math.PI / 2;

  return (
    <svg className="phase-ring" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Day ${ctx.dayOfCycle} of about ${len}, ${PHASE_LABEL[ctx.phase]} phase`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s) => {
          const arc = Math.max(0, ((s.to - s.from) / len) * c - gap);
          return (
            <circle
              key={s.phase}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={PHASE_COLOR[s.phase]}
              strokeOpacity={s.phase === ctx.phase ? 1 : 0.3}
              strokeWidth={10}
              strokeDasharray={`${arc} ${c}`}
              strokeDashoffset={-(s.from / len) * c}
            />
          );
        })}
      </g>
      <circle
        cx={size / 2 + r * Math.cos(angle)}
        cy={size / 2 + r * Math.sin(angle)}
        r={8}
        fill="var(--surface)"
        stroke={PHASE_COLOR[ctx.phase]}
        strokeWidth={3}
      />
      <text x="50%" y="40%" textAnchor="middle" fontSize="12" style={{ fill: 'var(--text-2)' }}>Day</text>
      <text x="50%" y="64%" textAnchor="middle" fontSize="28" fontWeight="700">{ctx.dayOfCycle}</text>
    </svg>
  );
}
