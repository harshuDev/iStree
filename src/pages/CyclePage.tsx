import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '../components/Calendar';
import { ErrorNote, Sheet, Spinner } from '../components/ui';
import { useCycleState, useDailyLogs, useDeleteCycle, useLogPeriodEnd, useLogPeriodStart } from '../hooks/queries';
import { addDays, diffDays, phaseForDate, PHASE_LABEL, type ISODate } from '../lib/cycle';
import { formatDate } from '../lib/dates';

export function CyclePage() {
  const navigate = useNavigate();
  const { loading, cycles, settings, today, context: ctx, cycleLength, periodLength } = useCycleState();
  const { data: logs = [] } = useDailyLogs(addDays(today, -120));
  const [selected, setSelected] = useState<ISODate | null>(null);
  const logStart = useLogPeriodStart();
  const logEnd = useLogPeriodEnd();
  const deleteCycle = useDeleteCycle();

  const loggedDates = useMemo(() => new Set(logs.map((l) => l.date)), [logs]);
  const s = settings ?? { average_cycle_length: 28, average_period_length: 5, use_computed_averages: true };

  if (loading) return <div className="splash"><Spinner /></div>;

  const isFuture = selected !== null && selected > today;
  const selectedCycle = selected ? cycles.find((c) => c.start_date === selected) : undefined;
  const containing = selected ? cycles.find((c) => c.start_date <= selected) : undefined;
  const canEnd = !!containing && !selectedCycle && diffDays(selected!, containing.start_date) <= 15;
  const selectedPhase = selected ? phaseForDate(cycles, s, selected) : null;

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setSelected(null);
    } catch {
      /* shown via the mutation's error state */
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Your cycle</h1>
        <p>
          {ctx
            ? `Day ${ctx.dayOfCycle} · ${PHASE_LABEL[ctx.phase]} · cycle ≈ ${cycleLength} days, period ≈ ${periodLength} days`
            : 'Tap a day to log when your period started.'}
        </p>
      </header>

      <section className="card">
        <Calendar cycles={cycles} settings={s} today={today} selected={selected} onSelect={setSelected} loggedDates={loggedDates} />
      </section>

      {ctx && (
        <section className="card">
          <h2>Coming up</h2>
          <div className="stat-grid">
            <div className="stat"><div className="stat__value stat__value--sm">{formatDate(ctx.nextPeriodStart)}</div><div className="stat__label">Next period (est.)</div></div>
            <div className="stat"><div className="stat__value stat__value--sm">{formatDate(ctx.fertileStart)}–{formatDate(ctx.fertileEnd)}</div><div className="stat__label">Fertile window (est.)</div></div>
          </div>
          <p className="small muted">Estimates for wellbeing planning only — not a method of contraception.</p>
        </section>
      )}

      <section className="card">
        <h2>History</h2>
        {cycles.length === 0 ? (
          <p className="muted small">No periods logged yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>Started</th><th className="num">Period</th><th className="num">Cycle</th></tr>
            </thead>
            <tbody>
              {cycles.slice(0, 12).map((c) => (
                <tr key={c.id}>
                  <td>{formatDate(c.start_date)}</td>
                  <td className="num">{c.end_date ? `${diffDays(c.end_date, c.start_date) + 1} d` : '—'}</td>
                  <td className="num">{c.cycle_length ? `${c.cycle_length} d` : 'current'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title="Day options">
        {selected && (
          <>
            <h2>{formatDate(selected, 'long')}</h2>
            {selectedPhase && <p className="muted small">{PHASE_LABEL[selectedPhase]} phase{isFuture ? ' (predicted)' : ''}</p>}
            {!isFuture && !selectedCycle && (
              <button className="btn btn--block" onClick={() => act(() => logStart.mutateAsync(selected))} disabled={logStart.isPending}>
                Period started this day
              </button>
            )}
            {!isFuture && canEnd && (
              <button className="btn btn--secondary btn--block" onClick={() => act(() => logEnd.mutateAsync(selected))} disabled={logEnd.isPending}>
                Period ended this day
              </button>
            )}
            {!isFuture && (
              <button className="btn btn--secondary btn--block" onClick={() => navigate(`/check-in?date=${selected}`)}>
                {loggedDates.has(selected) ? 'View check-in' : 'Add check-in'}
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
            {isFuture && <p className="muted small">You can log days up to today.</p>}
            <ErrorNote error={logStart.error ?? logEnd.error ?? deleteCycle.error} />
          </>
        )}
      </Sheet>
    </div>
  );
}
