import { useMemo, useState } from 'react';
import { Calendar } from '../components/Calendar';
import { LogSummary } from '../components/LogSummary';
import { EditIcon } from '../components/Icons';
import { ErrorNote, SectionTitle, Sheet, Spinner, TopBar } from '../components/ui';
import { useCycleState, useDailyLogs, useDeleteCycle, useLogPeriodEnd, useLogPeriodStart } from '../hooks/queries';
import { addDays, diffDays, phaseForDate, PHASE_LABEL, type ISODate } from '../lib/cycle';
import { formatDate } from '../lib/dates';
import { completedCycles } from '../lib/insights';
import { fertilityChance } from '../lib/phaseVisuals';

export function CyclePage() {
  const { loading, cycles, settings, today, context: ctx, cycleLength, periodLength } = useCycleState();
  const { data: logs = [] } = useDailyLogs(addDays(today, -120));
  const [selected, setSelected] = useState<ISODate>(today);
  const [editing, setEditing] = useState(false);
  const logStart = useLogPeriodStart();
  const logEnd = useLogPeriodEnd();
  const deleteCycle = useDeleteCycle();

  const loggedDates = useMemo(() => new Set(logs.map((l) => l.date)), [logs]);
  const s = settings ?? { average_cycle_length: 28, average_period_length: 5, use_computed_averages: true };
  const history = useMemo(() => completedCycles(cycles).reverse().slice(0, 8), [cycles]);

  if (loading) return <div className="splash"><Spinner /></div>;

  const isFuture = selected > today;
  const selectedCycle = cycles.find((c) => c.start_date === selected);
  const containing = cycles.find((c) => c.start_date <= selected);
  const canEnd = !!containing && !selectedCycle && diffDays(selected, containing.start_date) <= 15;
  const phase = phaseForDate(cycles, s, selected);
  const cycleDay = containing ? diffDays(selected, containing.start_date) + 1 : null;
  const chance = containing ? fertilityChance(cycles, s, selected, today) : null;
  const log = logs.find((l) => l.date === selected);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setEditing(false);
    } catch {
      /* shown via the mutation's error state */
    }
  };

  return (
    <div className="page">
      <TopBar title="Calendar" />

      <section className="card">
        <Calendar cycles={cycles} settings={s} today={today} selected={selected} onSelect={setSelected} loggedDates={loggedDates} />
      </section>

      <section className="card">
        <div className="row row--between">
          <div className="stack" style={{ gap: 2 }}>
            <h2>{formatDate(selected, 'long')}</h2>
            <span className="small faint">
              {cycleDay ? `Cycle day ${cycleDay}` : 'No cycle logged yet'}
              {phase ? ` · ${PHASE_LABEL[phase]} phase${isFuture ? ' (predicted)' : ''}` : ''}
            </span>
          </div>
          {!isFuture && (
            <button type="button" className="btn btn--soft btn--tiny" onClick={() => setEditing(true)}>
              <EditIcon /> Edit
            </button>
          )}
        </div>
        {chance && (
          <div className="row small" style={{ gap: 8 }}>
            <span className={`badge badge--${chance.toLowerCase()}`}>{chance}</span>
            <span className="muted">Chance of getting pregnant</span>
          </div>
        )}
        {!isFuture ? (
          <LogSummary log={log} date={selected} isToday={selected === today} />
        ) : (
          <p className="small faint">You can log days up to today.</p>
        )}
      </section>

      {ctx && (
        <section className="stat-grid">
          <div className="stat"><span className="stat__value">{formatDate(ctx.nextPeriodStart)}</span><span className="stat__label">Next period (est.)</span><span className="stat__art">🩸</span></div>
          <div className="stat"><span className="stat__value">{formatDate(ctx.ovulationDate)}</span><span className="stat__label">Ovulation (est.)</span><span className="stat__art">☀️</span></div>
          <div className="stat"><span className="stat__value">{periodLength} days</span><span className="stat__label">Average period</span></div>
          <div className="stat"><span className="stat__value">{cycleLength} days</span><span className="stat__label">Average cycle</span></div>
        </section>
      )}

      <SectionTitle title="My cycles" />
      <section className="card">
        {history.length === 0 ? (
          <p className="small faint">Your cycle history appears here once you've logged two periods.</p>
        ) : (
          <div>
            {history.map((p) => {
              const ov = Math.max(p.length - 14, (p.periodLength ?? periodLength) + 1);
              const pct = (d: number) => `${(d / p.length) * 100}%`;
              return (
                <div key={p.start} className="history-row">
                  <span className="small bold">{formatDate(p.start)} – {formatDate(addDays(p.start, p.length - 1))}</span>
                  <span className="small bold">{p.length} days</span>
                  <div className="history-track" aria-label={`Period ${p.periodLength ?? '?'} days, cycle ${p.length} days`}>
                    <span className="history-track__fertile" style={{ left: pct(ov - 5), width: pct(7) }} />
                    <span className="history-track__period" style={{ width: pct(p.periodLength ?? periodLength) }} />
                    <span className="history-track__ovulation" style={{ left: `calc(${pct(ov)} - 4px)` }} />
                  </div>
                </div>
              );
            })}
            <div className="legend" style={{ paddingTop: 8 }}>
              <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--period)' }} />Period</span>
              <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--yellow)' }} />Fertile (est.)</span>
              <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--orange)', borderRadius: '50%' }} />Ovulation (est.)</span>
            </div>
          </div>
        )}
        <p className="tiny faint">Estimates for wellbeing planning only — not a method of contraception.</p>
      </section>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit period">
        <p className="center small muted">{formatDate(selected, 'long')}</p>
        {!selectedCycle && (
          <button className="btn btn--block" onClick={() => act(() => logStart.mutateAsync(selected))} disabled={logStart.isPending}>
            Period started this day
          </button>
        )}
        {canEnd && (
          <button className="btn btn--secondary btn--block" onClick={() => act(() => logEnd.mutateAsync(selected))} disabled={logEnd.isPending}>
            Period ended this day
          </button>
        )}
        {selectedCycle && (
          <button
            className="btn btn--danger btn--block"
            onClick={() => confirm('Remove this period from your history?') && act(() => deleteCycle.mutateAsync(selectedCycle.id))}
            disabled={deleteCycle.isPending}
          >
            Remove this period
          </button>
        )}
        <ErrorNote error={logStart.error ?? logEnd.error ?? deleteCycle.error} />
      </Sheet>
    </div>
  );
}
