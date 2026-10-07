import { useMemo, useState } from 'react';
import { CountBars, CycleLengthChart } from '../components/charts';
import { PHASE_COLOR } from '../components/PhaseRing';
import { Spinner } from '../components/ui';
import { useCycleState, useDailyLogs } from '../hooks/queries';
import { labelFor, MOOD_OPTIONS, SYMPTOM_OPTIONS } from '../lib/constants';
import { addDays, PHASE_LABEL } from '../lib/cycle';
import { formatDate } from '../lib/dates';
import { averagesByPhase, completedCycles, countByKey, summarize } from '../lib/insights';
import { formatLitres } from '../lib/units';

const RANGES = [
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '1 year' },
];

export function InsightsPage() {
  const [months, setMonths] = useState(6);
  const [showTable, setShowTable] = useState(false);
  const { loading, cycles, settings, today } = useCycleState();
  const from = addDays(today, -months * 30);
  const { data: logs = [], isLoading: logsLoading } = useDailyLogs(from);

  const data = useMemo(() => {
    const s = settings ?? { average_cycle_length: 28, average_period_length: 5, use_computed_averages: true };
    const points = completedCycles(cycles).filter((p) => p.start >= from);
    return {
      points,
      summary: summarize(points),
      symptoms: countByKey(logs, cycles, s, (l) => l.symptoms).slice(0, 8),
      moods: countByKey(logs, cycles, s, (l) => (l.mood ? [l.mood] : [])),
      phases: averagesByPhase(logs, cycles, s),
    };
  }, [cycles, settings, logs, from]);

  if (loading || logsLoading) return <div className="splash"><Spinner /></div>;
  const { points, summary, symptoms, moods, phases } = data;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Insights</h1>
        <p>Patterns from your logs. The more you check in, the clearer they get.</p>
      </header>

      <div className="segmented" role="group" aria-label="Time range">
        {RANGES.map((r) => (
          <button key={r.months} type="button" aria-pressed={months === r.months} onClick={() => setMonths(r.months)}>
            {r.label}
          </button>
        ))}
      </div>

      <section className="stat-grid" aria-label="Cycle summary">
        <div className="stat"><div className="stat__value">{summary.avgCycle ?? '–'}</div><div className="stat__label">avg cycle (days)</div></div>
        <div className="stat"><div className="stat__value">{summary.avgPeriod ?? '–'}</div><div className="stat__label">avg period (days)</div></div>
        <div className="stat">
          <div className="stat__value">{summary.shortest !== null ? `${summary.shortest}–${summary.longest}` : '–'}</div>
          <div className="stat__label">cycle range (days)</div>
        </div>
        <div className="stat"><div className="stat__value">{logs.length}</div><div className="stat__label">check-ins</div></div>
      </section>

      <section className="card">
        <div className="row row--between">
          <h2>Cycle length</h2>
          {points.length > 0 && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setShowTable((v) => !v)}>
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
        {points.length < 2 ? (
          <p className="muted small">Log at least two periods to see how your cycle length changes over time.</p>
        ) : showTable ? (
          <table className="data">
            <thead><tr><th>Started</th><th className="num">Cycle</th><th className="num">Period</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.start}><td>{formatDate(p.start)}</td><td className="num">{p.length} d</td><td className="num">{p.periodLength ? `${p.periodLength} d` : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <CycleLengthChart points={points} average={summary.avgCycle} />
        )}
        {summary.shortest !== null && summary.longest! - summary.shortest > 7 && (
          <p className="small muted">Your cycle length varied by more than 7 days. That's common, but worth mentioning to a doctor if it's new for you.</p>
        )}
      </section>

      <section className="card">
        <h2>Most common symptoms</h2>
        {symptoms.length === 0 ? (
          <p className="muted small">No symptoms logged in this period.</p>
        ) : (
          <>
            <CountBars rows={symptoms.map((r) => ({ label: labelFor(SYMPTOM_OPTIONS, r.key), count: r.count }))} />
            <ul className="guide-list small">
              {symptoms.slice(0, 3).filter((r) => r.topPhase).map((r) => (
                <li key={r.key}>
                  {labelFor(SYMPTOM_OPTIONS, r.key)} shows up most in your <strong>{PHASE_LABEL[r.topPhase!].toLowerCase()}</strong> phase
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Mood</h2>
        {moods.length === 0 ? (
          <p className="muted small">No moods logged in this period.</p>
        ) : (
          <CountBars rows={moods.map((r) => ({ label: labelFor(MOOD_OPTIONS, r.key), count: r.count }))} />
        )}
      </section>

      <section className="card">
        <h2>By phase</h2>
        <table className="data">
          <thead>
            <tr><th>Phase</th><th className="num">Sleep</th><th className="num">Water</th><th className="num">Energy</th></tr>
          </thead>
          <tbody>
            {phases.map((p) => (
              <tr key={p.phase}>
                <td>
                  <span className="row" style={{ gap: 6 }}>
                    <span className="dot" style={{ background: PHASE_COLOR[p.phase] }} />
                    {PHASE_LABEL[p.phase]}
                  </span>
                </td>
                <td className="num">{p.sleep !== null ? `${p.sleep} h` : '–'}</td>
                <td className="num">{p.water !== null ? formatLitres(p.water) : '–'}</td>
                <td className="num">{p.energy !== null ? `${p.energy}/5` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">Averages of your check-ins in each phase.</p>
      </section>
    </div>
  );
}
