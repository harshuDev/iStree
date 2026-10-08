import { useMemo, useState } from 'react';
import { buildCalendarMarks, fromDayNumber, toDayNumber, type CycleRecord, type CycleSettings, type ISODate } from '../lib/cycle';
import { formatDate, formatMonth } from '../lib/dates';
import { ChevronLeft, ChevronRight } from './Icons';

// Weeks start on Sunday, as on Indian calendars.
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  cycles: readonly CycleRecord[];
  settings: CycleSettings;
  today: ISODate;
  selected: ISODate | null;
  onSelect: (date: ISODate) => void;
  loggedDates?: Set<ISODate>;
}

export function Calendar({ cycles, settings, today, selected, onSelect, loggedDates }: Props) {
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  const { cells, marks } = useMemo(() => {
    const first = Date.UTC(cursor.year, cursor.month, 1) / 86_400_000;
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const lead = new Date(first * 86_400_000).getUTCDay(); // Sunday-first
    const cells: (ISODate | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => fromDayNumber(first + i)),
    ];
    const marks = buildCalendarMarks(
      cycles,
      settings,
      fromDayNumber(first),
      fromDayNumber(first + daysInMonth - 1),
      today,
      // Enough predicted cycles to cover the month being viewed.
      Math.max(3, Math.ceil((first + daysInMonth - toDayNumber(today)) / 21)),
    );
    return { cells, marks };
  }, [cursor, cycles, settings, today]);

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  return (
    <div className="calendar">
      <div className="calendar__head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft /></button>
        <h2>{formatMonth(cursor.year, cursor.month)}</h2>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></button>
      </div>
      <div className="calendar__grid">
        {DOW.map((d) => (
          <div key={d} className="calendar__dow" aria-hidden>{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="day day--outside" />;
          const m = marks.get(date);
          const cls = [
            'day',
            m?.period ? `day--period-${m.period}` : m?.ovulation ? 'day--ovulation' : m?.fertile ? 'day--fertile' : '',
            date === today && 'day--today',
            date === selected && 'day--selected',
          ]
            .filter(Boolean)
            .join(' ');
          const desc = [
            m?.period === 'logged' && 'period',
            m?.period === 'predicted' && 'predicted period',
            m?.ovulation && 'estimated ovulation',
            m?.fertile && !m?.ovulation && 'fertile window',
            loggedDates?.has(date) && 'has a log',
            date === today && 'today',
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <button
              key={date}
              type="button"
              className={cls}
              onClick={() => onSelect(date)}
              aria-label={`${formatDate(date, 'long')}${desc ? `, ${desc}` : ''}`}
              aria-pressed={date === selected}
            >
              <span>{Number(date.slice(8))}</span>
              {loggedDates?.has(date) ? <i className="day__dot" /> : <i style={{ height: 4 }} />}
            </button>
          );
        })}
      </div>
      <div className="legend" aria-hidden>
        <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--period)' }} />Period</span>
        <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--period-soft)' }} />Predicted</span>
        <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--fertile)', boxShadow: 'inset 0 0 0 1px var(--yellow)' }} />Fertile</span>
        <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--ovulation)' }} />Ovulation</span>
        <span className="legend__item"><i className="day__dot" style={{ opacity: 1, background: 'var(--text-2)' }} />Logged</span>
      </div>
    </div>
  );
}
