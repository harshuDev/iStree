import { useMemo, useState } from 'react';
import { buildCalendarMarks, fromDayNumber, toDayNumber, type CycleRecord, type CycleSettings, type ISODate } from '../lib/cycle';
import { formatDate, formatMonth } from '../lib/dates';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    const lead = (new Date(first * 86_400_000).getUTCDay() + 6) % 7; // Monday-first
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
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h2>{formatMonth(cursor.year, cursor.month)}</h2>
        <button type="button" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="calendar__grid">
        {DOW.map((d) => (
          <div key={d} className="calendar__dow" aria-hidden>{d.slice(0, 1)}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="day day--outside" />;
          const m = marks.get(date);
          const cls = [
            'day',
            m?.period && `day--period-${m.period}`,
            m?.fertile && 'day--fertile',
            m?.ovulation && 'day--ovulation',
            date === today && 'day--today',
            date === selected && 'day--selected',
            loggedDates?.has(date) && 'day--has-log',
          ]
            .filter(Boolean)
            .join(' ');
          const desc = [
            m?.period === 'logged' && 'period',
            m?.period === 'predicted' && 'predicted period',
            m?.ovulation && 'estimated ovulation',
            m?.fertile && !m?.ovulation && 'fertile window',
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
            </button>
          );
        })}
      </div>
      <div className="legend" aria-hidden>
        <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--period)' }} />Period</span>
        <span className="legend__item"><span className="legend__swatch" style={{ border: '2px dashed var(--period)' }} />Predicted</span>
        <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--fertile-bg)', borderRadius: 4 }} />Fertile window</span>
        <span className="legend__item"><span className="legend__swatch" style={{ background: 'var(--ovulation)', width: 8, height: 8 }} />Ovulation</span>
      </div>
    </div>
  );
}
