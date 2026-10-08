import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CycleRing } from '../components/CycleRing';
import { LogSummary } from '../components/LogSummary';
import { NotificationsCard } from '../components/NotificationsCard';
import { PhaseSheet } from '../components/PhaseSheet';
import { ErrorNote, SectionTitle, Spinner, TopBar } from '../components/ui';
import { CalendarIcon, DropIcon } from '../components/Icons';
import { useCycleState, useDailyLog, useLogPeriodEnd, useLogPeriodStart } from '../hooks/queries';
import { PHASE_LABEL, type Phase } from '../lib/cycle';
import { formatDate } from '../lib/dates';
import { getPushState } from '../lib/push';
import { PHASE_ART, PHASE_COLOR, PHASE_ORDER } from '../lib/phaseVisuals';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function TodayPage() {
  const { loading, context: ctx, settings, today } = useCycleState();
  const { data: log } = useDailyLog(today);
  const logStart = useLogPeriodStart();
  const logEnd = useLogPeriodEnd();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [openPhase, setOpenPhase] = useState<Phase | null>(null);

  useEffect(() => {
    void getPushState().then((s) => setShowPushPrompt(s === 'prompt'));
  }, []);

  if (loading) return <div className="splash"><Spinner /></div>;

  const name = settings?.display_name;
  const periodOngoing = ctx?.phase === 'menstrual' && ctx.currentStart !== today;

  return (
    <div className="page">
      <TopBar title="iStree" right={<Link to="/cycle" className="icon-btn" aria-label="Open calendar"><CalendarIcon /></Link>} />

      <div className="center">
        <h1 style={{ fontSize: '1.35rem' }}>{greeting()}{name ? `, ${name}` : ''} 👋</h1>
        <p className="small faint">{formatDate(today, 'long')}</p>
      </div>

      {showPushPrompt && <NotificationsCard compact />}

      <section className="card ring-card">
        {ctx ? (
          <CycleRing ctx={ctx} />
        ) : (
          <div className="empty" style={{ padding: '24px 0' }}>
            <span style={{ fontSize: '3rem' }}>🌸</span>
            <strong>Welcome to iStree</strong>
            <span className="small faint">Log the first day of your period to see your cycle, phase and predictions.</span>
          </div>
        )}
        {periodOngoing ? (
          <button className="btn btn--small" onClick={() => logEnd.mutate(today)} disabled={logEnd.isPending}>
            <DropIcon /> Period ended today
          </button>
        ) : ctx?.currentStart !== today ? (
          <button className="btn btn--small" onClick={() => logStart.mutate(today)} disabled={logStart.isPending}>
            <DropIcon /> Period started today
          </button>
        ) : (
          <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary-strong)' }}>Period logged for today ✓</span>
        )}
        <Link to="/cycle" className="link-btn">Edit period</Link>
        <ErrorNote error={logStart.error ?? logEnd.error} />
      </section>

      <SectionTitle title="Menstrual cycle phases" />
      <div className="h-scroll">
        {PHASE_ORDER.map((p, i) => (
          <button key={p} type="button" className={`phase-card${ctx?.phase === p ? ' is-current' : ''}`} onClick={() => setOpenPhase(p)}>
            <span className="row" style={{ gap: 8 }}>
              <span className="num-badge" style={{ background: PHASE_COLOR[p] }}>{i + 1}</span>
              <strong className="small">{PHASE_LABEL[p]}</strong>
            </span>
            <span className="phase-card__art" style={{ background: PHASE_ART[p].bg }}>{PHASE_ART[p].emoji}</span>
            <span className="tiny faint">{ctx?.phase === p ? 'Current phase' : 'Tap to learn more'}</span>
          </button>
        ))}
      </div>

      <SectionTitle title="Today's log" action={log ? <Link to="/check-in">Edit</Link> : undefined} />
      <section className="card">
        <LogSummary log={log} date={today} isToday />
      </section>

      <PhaseSheet phase={openPhase} current={ctx?.phase ?? null} onClose={() => setOpenPhase(null)} />
    </div>
  );
}
