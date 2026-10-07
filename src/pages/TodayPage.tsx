import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PhaseRing, PHASE_COLOR } from '../components/PhaseRing';
import { NotificationsCard } from '../components/NotificationsCard';
import { ErrorNote, Spinner } from '../components/ui';
import { useCycleState, useDailyLog, useLogPeriodEnd, useLogPeriodStart } from '../hooks/queries';
import { PHASE_GUIDE, PHASE_LABEL } from '../lib/cycle';
import { formatDate } from '../lib/dates';
import { getPushState } from '../lib/push';
import { formatWater } from '../lib/units';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function TodayPage() {
  const { loading, context: ctx, settings, today, source } = useCycleState();
  const { data: log } = useDailyLog(today);
  const logStart = useLogPeriodStart();
  const logEnd = useLogPeriodEnd();
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    void getPushState().then((s) => setShowPushPrompt(s === 'prompt'));
  }, []);

  if (loading) return <div className="splash"><Spinner /></div>;

  const name = settings?.display_name;
  const guide = ctx ? PHASE_GUIDE[ctx.phase] : null;
  const periodOngoing = ctx?.phase === 'menstrual' && ctx.currentStart !== today;

  return (
    <div className="page">
      <header className="page-header">
        <p className="small">{formatDate(today, 'long')}</p>
        <h1>{greeting()}{name ? `, ${name}` : ''}</h1>
      </header>

      {showPushPrompt && <NotificationsCard compact />}

      {ctx && guide ? (
        <section className="card phase-card" aria-labelledby="phase-title">
          <div className="row">
            <PhaseRing ctx={ctx} />
            <div className="stack" style={{ gap: 6 }}>
              <span className="badge" style={{ alignSelf: 'flex-start' }}>
                <span className="dot" style={{ background: PHASE_COLOR[ctx.phase] }} />
                {PHASE_LABEL[ctx.phase]} phase
              </span>
              <h2 id="phase-title" className="phase-name">{guide.tagline}</h2>
              <p className="small muted">
                {ctx.daysLate > 0
                  ? `Period is ${ctx.daysLate} day${ctx.daysLate === 1 ? '' : 's'} later than predicted`
                  : ctx.daysUntilNextPeriod === 0
                    ? 'Period may start today'
                    : `Next period in ~${ctx.daysUntilNextPeriod} days · ${formatDate(ctx.nextPeriodStart)}`}
              </p>
            </div>
          </div>
          <p className="small muted">{guide.about}</p>
          {source === 'settings' && (
            <p className="small muted">Predictions use your typical {ctx.cycleLength}-day cycle until you log two full cycles.</p>
          )}
        </section>
      ) : (
        <section className="card card--soft">
          <h2>Welcome to iStree</h2>
          <p className="muted">Log the first day of your period to see your phase, predictions and tailored tips.</p>
        </section>
      )}

      <div className="row" style={{ flexWrap: 'wrap' }}>
        {periodOngoing ? (
          <button className="btn" onClick={() => logEnd.mutate(today)} disabled={logEnd.isPending}>
            My period ended today
          </button>
        ) : ctx?.currentStart !== today ? (
          <button className="btn" onClick={() => logStart.mutate(today)} disabled={logStart.isPending}>
            My period started today
          </button>
        ) : (
          <span className="badge">Period logged for today ✓</span>
        )}
        <Link to="/check-in" className="btn btn--secondary">
          {log ? 'Edit check-in' : 'Daily check-in'}
        </Link>
      </div>
      <ErrorNote error={logStart.error ?? logEnd.error} />

      {guide && (
        <section className="card">
          <h2>Care for this phase</h2>
          <div className="stack">
            <div>
              <h3>🍲 Eat</h3>
              <ul className="guide-list">{guide.eat.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
            <div>
              <h3>🚶 Move</h3>
              <p className="muted">{guide.move}</p>
            </div>
            <div>
              <h3>🌙 Rest</h3>
              <p className="muted">{guide.rest}</p>
            </div>
          </div>
        </section>
      )}

      {log && (
        <section className="card">
          <div className="row row--between">
            <h2>Today so far</h2>
            <Link to="/check-in" className="small">Edit</Link>
          </div>
          <div className="stat-grid">
            <div className="stat"><div className="stat__value">{formatWater(log.water_intake ?? 0)}</div><div className="stat__label">water</div></div>
            <div className="stat"><div className="stat__value">{log.sleep_hours ?? '–'}</div><div className="stat__label">hours of sleep</div></div>
          </div>
        </section>
      )}
    </div>
  );
}
