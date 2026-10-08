import { useMemo, useState, type ReactNode } from 'react';
import { BarChart, CycleLengthChart } from '../components/charts';
import { ChevronLeft, ChevronRight, FlowIcon } from '../components/Icons';
import { SectionTitle, Spinner, TopBar } from '../components/ui';
import { useCycleState, useDailyLogs } from '../hooks/queries';
import { FLOW_OPTIONS, MOOD_OPTIONS, SYMPTOM_OPTIONS, emojiFor, labelFor } from '../lib/constants';
import { addDays, PHASE_LABEL } from '../lib/cycle';
import type { FlowIntensity } from '../lib/database.types';
import { formatDate } from '../lib/dates';
import { averagesByPhase, completedCycles, countByKey, summarize } from '../lib/insights';
import { PHASE_COLOR } from '../lib/phaseVisuals';
import { DAILY_WATER_GOAL_ML, formatLitres } from '../lib/units';

const RANGES = [
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '1 year' },
];

export function InsightsPage() {
  const [tab, setTab] = useState<'count' | 'health'>('count');
  const [months, setMonths] = useState(6);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const { loading, cycles, settings, today } = useCycleState();
  const { data: allLogs = [], isLoading: logsLoading } = useDailyLogs(addDays(today, -365));

  const from = addDays(today, -months * 30);
  const data = useMemo(() => {
    const s = settings ?? { average_cycle_length: 28, average_period_length: 5, use_computed_averages: true };
    const logs = allLogs.filter((l) => l.date >= from);
    const points = completedCycles(cycles).filter((p) => p.start >= from);
    return {
      logs,
      points,
      summary: summarize(points),
      flows: countByKey(logs, cycles, s, (l) => (l.flow_intensity && l.flow_intensity !== 'none' ? [l.flow_intensity] : [])),
      symptoms: countByKey(logs, cycles, s, (l) => l.symptoms),
      moods: countByKey(logs, cycles, s, (l) => (l.mood ? [l.mood] : [])),
      phases: averagesByPhase(allLogs, cycles, s),
    };
  }, [cycles, settings, allLogs, from]);

  if (loading || logsLoading) return <div className="splash"><Spinner /></div>;
  const { logs, points, summary, flows, symptoms, moods, phases } = data;

  // Health tab: a 7-day window ending today (or N weeks back).
  const weekEnd = addDays(today, -7 * weekOffset);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekEnd, i - 6));
  const byDate = new Map(allLogs.map((l) => [l.date, l]));
  const weekLabel = `${formatDate(week[0])} – ${formatDate(week[6])}`;

  return (
    <div className="page">
      <TopBar title="Insights" />

      <div className="segmented" role="group" aria-label="Insights view">
        <button type="button" aria-pressed={tab === 'count'} onClick={() => setTab('count')}>Log count</button>
        <button type="button" aria-pressed={tab === 'health'} onClick={() => setTab('health')}>Health</button>
      </div>

      {tab === 'count' ? (
        <>
          <div className="chips" role="group" aria-label="Time range" style={{ justifyContent: 'center' }}>
            {RANGES.map((r) => (
              <button key={r.months} type="button" className="chip" aria-pressed={months === r.months} onClick={() => setMonths(r.months)}>{r.label}</button>
            ))}
          </div>

          <section className="card">
            <SectionTitle title="My cycles" />
            <div className="stat-grid">
              <div className="stat"><span className="stat__value">{summary.avgPeriod ?? '–'} days</span><span className="stat__label">Average period</span><span className="stat__art">🩸</span></div>
              <div className="stat"><span className="stat__value">{summary.avgCycle ?? '–'} days</span><span className="stat__label">Average cycle</span><span className="stat__art">📅</span></div>
              <div className="stat"><span className="stat__value">{summary.shortest !== null ? `${summary.shortest}–${summary.longest}` : '–'}</span><span className="stat__label">Cycle range (days)</span></div>
              <div className="stat"><span className="stat__value">{logs.length}</span><span className="stat__label">Check-ins</span></div>
            </div>
          </section>

          <section className="card">
            <SectionTitle
              title="Cycle length"
              action={points.length > 0 ? <button type="button" className="link-btn" onClick={() => setShowTable((v) => !v)}>{showTable ? 'Chart' : 'Table'}</button> : undefined}
            />
            {points.length < 2 ? (
              <p className="small faint">Log at least two periods to see how your cycle length changes.</p>
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
              <p className="tiny faint">Your cycle length varied by more than 7 days. That's common, but worth mentioning to a doctor if it's new for you.</p>
            )}
          </section>

          <CountCard title="Flow" empty="No flow logged in this period." rows={flows.map((r) => ({ key: r.key, label: labelFor(FLOW_OPTIONS, r.key), count: r.count, icon: <FlowIcon level={r.key as FlowIntensity} /> }))} />
          <CountCard
            title="Symptoms"
            empty="No symptoms logged in this period."
            rows={symptoms.map((r) => ({ key: r.key, label: labelFor(SYMPTOM_OPTIONS, r.key), count: r.count, icon: emojiFor(SYMPTOM_OPTIONS, r.key) }))}
            footer={symptoms.slice(0, 2).filter((r) => r.topPhase).map((r) => `${labelFor(SYMPTOM_OPTIONS, r.key)} shows up most in your ${PHASE_LABEL[r.topPhase!].toLowerCase()} phase`)}
          />
          <CountCard title="Moods" empty="No moods logged in this period." rows={moods.map((r) => ({ key: r.key, label: labelFor(MOOD_OPTIONS, r.key), count: r.count, icon: emojiFor(MOOD_OPTIONS, r.key) }))} />
        </>
      ) : (
        <>
          <div className="range-nav card" style={{ padding: '6px 8px', flexDirection: 'row' }}>
            <button type="button" className="icon-btn" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Previous week"><ChevronLeft /></button>
            <span>{weekLabel}</span>
            <button type="button" className="icon-btn" onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} disabled={weekOffset === 0} aria-label="Next week"><ChevronRight /></button>
          </div>

          <section className="card">
            <SectionTitle title="Water (L)" />
            <BarChart
              data={week.map((d) => ({ key: d, label: formatDate(d, 'weekday').slice(0, 2), title: formatDate(d, 'long'), value: byDate.get(d)?.water_intake ?? null }))}
              color="var(--blue)"
              max={Math.max(3000, ...week.map((d) => byDate.get(d)?.water_intake ?? 0))}
              reference={DAILY_WATER_GOAL_ML}
              referenceLabel={`goal ${formatLitres(DAILY_WATER_GOAL_ML)}`}
              format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}` : v === 0 ? '0' : `${(v / 1000).toFixed(2)}`)}
              ariaLabel="Water drunk per day this week, in litres"
            />
          </section>

          <section className="card">
            <SectionTitle title="Sleep (hours)" />
            <BarChart
              data={week.map((d) => {
                const v = byDate.get(d)?.sleep_hours;
                return { key: d, label: formatDate(d, 'weekday').slice(0, 2), title: formatDate(d, 'long'), value: v != null ? Number(v) : null };
              })}
              color="var(--phase-luteal)"
              max={12}
              reference={8}
              referenceLabel="8 h"
              format={(v) => `${Math.round(v * 10) / 10}`}
              ariaLabel="Hours of sleep per night this week"
            />
          </section>

          <section className="card">
            <SectionTitle title="By phase" />
            <table className="data">
              <thead>
                <tr><th>Phase</th><th className="num">Sleep</th><th className="num">Water</th><th className="num">Energy</th></tr>
              </thead>
              <tbody>
                {phases.map((p) => (
                  <tr key={p.phase}>
                    <td>
                      <span className="row" style={{ gap: 8 }}>
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
            <p className="tiny faint">Averages of your check-ins over the last year.</p>
          </section>
        </>
      )}
    </div>
  );
}

function CountCard({
  title,
  rows,
  empty,
  footer = [],
}: {
  title: string;
  rows: { key: string; label: string; count: number; icon: ReactNode }[];
  empty: string;
  footer?: string[];
}) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 8);
  return (
    <section className="card">
      <SectionTitle title={title} action={rows.length > 8 ? <button type="button" className="link-btn" onClick={() => setAll((v) => !v)}>{all ? 'Show less' : 'View more'}</button> : undefined} />
      {rows.length === 0 ? (
        <p className="small faint">{empty}</p>
      ) : (
        <div className="pick-grid">
          {shown.map((r) => (
            <div key={r.key} className="pick" aria-label={`${r.label}: ${r.count} times`}>
              <span className="pick__icon">{r.icon}</span>
              <span className="pick__count">{r.count}x</span>
              {r.label}
            </div>
          ))}
        </div>
      )}
      {footer.map((f) => <p key={f} className="tiny faint">• {f}</p>)}
    </section>
  );
}
