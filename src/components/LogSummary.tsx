import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FLOW_OPTIONS, MOOD_OPTIONS, SYMPTOM_OPTIONS, emojiFor, labelFor } from '../lib/constants';
import type { DailyLog } from '../lib/database.types';
import type { ISODate } from '../lib/cycle';
import { formatWater } from '../lib/units';
import { FlowIcon, PlusIcon } from './Icons';

/** Compact read-only view of one day's check-in, or an "add log" prompt. */
export function LogSummary({ log, date, isToday }: { log: DailyLog | null | undefined; date: ISODate; isToday: boolean }) {
  const href = isToday ? '/check-in' : `/check-in?date=${date}`;
  if (!log) {
    return (
      <div className="empty">
        <strong>No record</strong>
        <span className="small faint">Tap to add {isToday ? "today's" : 'a'} log</span>
        <Link to={href} className="btn btn--small" style={{ marginTop: 6 }}>
          <PlusIcon /> Add log
        </Link>
      </div>
    );
  }
  const items: { icon: ReactNode; label: string }[] = [];
  if (log.flow_intensity) items.push({ icon: <FlowIcon level={log.flow_intensity} />, label: labelFor(FLOW_OPTIONS, log.flow_intensity) });
  if (log.mood) items.push({ icon: emojiFor(MOOD_OPTIONS, log.mood), label: labelFor(MOOD_OPTIONS, log.mood) });
  log.symptoms.slice(0, 6).forEach((s) => items.push({ icon: emojiFor(SYMPTOM_OPTIONS, s), label: labelFor(SYMPTOM_OPTIONS, s) }));
  return (
    <div className="stack">
      {items.length > 0 && (
        <div className="pick-grid">
          {items.map((it) => (
            <span key={it.label} className="pick">
              <span className="pick__icon">{it.icon}</span>
              {it.label}
            </span>
          ))}
        </div>
      )}
      {log.notes && <p className="small muted">{log.notes}</p>}
      <div className="stat-grid">
        <div className="stat"><span className="stat__value">{formatWater(log.water_intake ?? 0)}</span><span className="stat__label">Water</span><span className="stat__art">💧</span></div>
        <div className="stat"><span className="stat__value">{log.sleep_hours != null ? `${log.sleep_hours} h` : '–'}</span><span className="stat__label">Sleep</span><span className="stat__art">😴</span></div>
      </div>
      <Link to={href} className="btn btn--soft btn--small">Edit log</Link>
    </div>
  );
}
