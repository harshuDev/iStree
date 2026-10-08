import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FlowIcon } from '../components/Icons';
import { WaterDrop } from '../components/WaterDrop';
import { ErrorNote, PickGrid, SectionTitle, Spinner, Stepper, Switch, TopBar } from '../components/ui';
import { useCycleState, useDailyLog, useSaveDailyLog } from '../hooks/queries';
import { ENERGY_LABELS, FLOW_OPTIONS, MOOD_OPTIONS, SYMPTOM_OPTIONS } from '../lib/constants';
import { addDays, phaseForDate, PHASE_LABEL, toDayNumber, type ISODate } from '../lib/cycle';
import type { DailyLog, FlowIntensity } from '../lib/database.types';
import { formatDate } from '../lib/dates';
import { cancelLocalReminder, scheduleLocalReminder, useLocalReminders } from '../lib/localReminders';
import { DAILY_WATER_GOAL_ML, formatWater, GLASS_ML, LOCALE } from '../lib/units';

interface FormState {
  flow_intensity: FlowIntensity | null;
  mood: string | null;
  symptoms: string[];
  water_intake: number; // ml
  sleep_hours: number;
  energy_level: number | null;
  rested: boolean;
  notes: string;
}

const fromLog = (log: DailyLog | null | undefined): FormState => ({
  flow_intensity: log?.flow_intensity ?? null,
  mood: log?.mood ?? null,
  symptoms: log?.symptoms ?? [],
  water_intake: log?.water_intake ?? 0,
  sleep_hours: log?.sleep_hours != null ? Number(log.sleep_hours) : 7,
  energy_level: log?.energy_level ?? null,
  rested: log?.rested ?? false,
  notes: log?.notes ?? '',
});

const FLOW_PICKS = FLOW_OPTIONS.map((o) => ({ ...o, icon: <FlowIcon level={o.value} /> }));
const MOOD_PICKS = MOOD_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: o.emoji }));
const SYMPTOM_PICKS = SYMPTOM_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: o.emoji }));
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CheckInPage() {
  const [params, setParams] = useSearchParams();
  const { today, cycles, settings, context } = useCycleState();
  const requested = params.get('date');
  const date: ISODate = requested && requested <= today ? requested : today;
  const { data: log, isLoading } = useDailyLog(date);
  const save = useSaveDailyLog();
  const [form, setForm] = useState<FormState>(() => fromLog(null));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading) setForm(fromLog(log));
    setSaved(false);
  }, [log, isLoading, date]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await save.mutateAsync({ date, ...form, notes: form.notes.trim() || null });
    setSaved(true);
  };

  const goTo = (d: ISODate) => {
    if (d <= today) setParams(d === today ? {} : { date: d });
  };

  // Week (Sun–Sat) containing the selected date.
  const weekStart = addDays(date, -new Date(`${date}T00:00:00Z`).getUTCDay());
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const phase = settings ? phaseForDate(cycles, settings, date) : null;

  return (
    <form className="page" onSubmit={submit}>
      <TopBar title="Add log" />

      <section className="card" style={{ gap: 10 }}>
        <div className="row row--between">
          <button type="button" className="icon-btn" onClick={() => goTo(addDays(weekStart, -7))} aria-label="Previous week"><ChevronLeft /></button>
          <div className="center">
            <strong>{date === today ? 'Today' : formatDate(date, 'long')}</strong>
            {phase && <div className="tiny faint">{PHASE_LABEL[phase]} phase</div>}
          </div>
          <button type="button" className="icon-btn" onClick={() => goTo(addDays(weekStart, 7) > today ? today : addDays(weekStart, 7))} disabled={addDays(weekStart, 6) >= today} aria-label="Next week"><ChevronRight /></button>
        </div>
        <div className="date-strip" role="group" aria-label="Choose a day">
          {week.map((d, i) => (
            <span key={`dow-${d}`} className={`date-strip__dow${d === today ? ' date-strip__dow--today' : ''}`}>{d === today ? 'Today' : DOW[i]}</span>
          ))}
          {week.map((d) => (
            <button key={d} type="button" aria-pressed={d === date} disabled={toDayNumber(d) > toDayNumber(today)} onClick={() => goTo(d)} aria-label={formatDate(d, 'long')}>
              {Number(d.slice(8))}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="splash"><Spinner /></div>
      ) : (
        <>
          <section className="card">
            <SectionTitle title="Flow" />
            <div className="pick-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
              {FLOW_PICKS.map((o) => (
                <button key={o.value} type="button" className="pick" aria-pressed={form.flow_intensity === o.value} onClick={() => set('flow_intensity', form.flow_intensity === o.value ? null : o.value)}>
                  <span className="pick__icon" aria-hidden>{o.icon}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <SectionTitle title="Symptoms" />
            <PickGrid label="Symptoms" multiple options={SYMPTOM_PICKS} value={form.symptoms} onChange={(v) => set('symptoms', v)} />
          </section>

          <section className="card">
            <SectionTitle title="Mood" />
            <PickGrid label="Mood" options={MOOD_PICKS} value={form.mood ? [form.mood] : []} onChange={(v) => set('mood', v[0] ?? null)} />
          </section>

          <section className="card">
            <SectionTitle title="Drink water" />
            <div className="water">
              <WaterDrop ml={form.water_intake} goal={DAILY_WATER_GOAL_ML} />
              <div className="water__amount">
                {form.water_intake >= 1000 ? (form.water_intake / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 2 }) : form.water_intake}
                <small>{form.water_intake >= 1000 ? 'L' : 'mL'}</small>
              </div>
              <span className="small faint">Daily goal: {formatWater(DAILY_WATER_GOAL_ML)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="btn btn--secondary btn--small" aria-label="Remove a glass" disabled={form.water_intake === 0} onClick={() => set('water_intake', Math.max(0, form.water_intake - GLASS_ML))}>−</button>
              <button type="button" className="btn btn--blue btn--small" onClick={() => set('water_intake', Math.min(10000, form.water_intake + GLASS_ML))}>💧 Drink (250 mL)</button>
              <button type="button" className="btn btn--secondary btn--small" onClick={() => set('water_intake', Math.min(10000, form.water_intake + 500))}>+500 mL</button>
              <button type="button" className="btn btn--secondary btn--small" onClick={() => set('water_intake', Math.min(10000, form.water_intake + 1000))}>+1 L</button>
            </div>
          </section>

          <section className="card">
            <div className="row row--between">
              <div>
                <h2>Sleep</h2>
                <p className="tiny faint">Last night</p>
              </div>
              <Stepper label="hours of sleep" value={form.sleep_hours} onChange={(v) => set('sleep_hours', v)} min={0} max={24} step={0.5} format={(v) => `${v} h`} />
            </div>
          </section>

          <section className="card">
            <SectionTitle title="Energy & rest" />
            <div className="segmented segmented--plain" role="group" aria-label="Energy level">
              {ENERGY_LABELS.map((label, i) => (
                <button key={label} type="button" aria-pressed={form.energy_level === i + 1} onClick={() => set('energy_level', form.energy_level === i + 1 ? null : i + 1)}>
                  {label}
                </button>
              ))}
            </div>
            <Switch label="I took time to rest today" checked={form.rested} onChange={(v) => set('rested', v)} />
          </section>

          <section className="card">
            <div className="field">
              <label htmlFor="notes">Note</label>
              <textarea id="notes" className="input" maxLength={2000} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="How are you feeling today?" />
            </div>
          </section>

          {date === today && <QuickReminders phase={context?.phase ?? 'follicular'} />}

          <div className="sticky-actions stack" style={{ gap: 8 }}>
            <ErrorNote error={save.error} />
            {saved && <div className="alert alert--success">Saved. Thank you for checking in 🌸</div>}
            <button className="btn btn--block" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : log ? 'Update log' : 'Save'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

function QuickReminders({ phase }: { phase: Parameters<typeof scheduleLocalReminder>[2] }) {
  const reminders = useLocalReminders();
  const allowed = 'Notification' in window && Notification.permission === 'granted';
  if (!allowed) return null;
  return (
    <section className="card">
      <SectionTitle title="Nudge me later" />
      <p className="tiny faint">Works while iStree stays open in the background.</p>
      <div className="chips">
        <button type="button" className="chip" onClick={() => scheduleLocalReminder('water_nudge', 60, phase)}>💧 Water in 1 h</button>
        <button type="button" className="chip" onClick={() => scheduleLocalReminder('rest_nudge', 30, phase)}>🧘 Rest in 30 min</button>
        <button type="button" className="chip" onClick={() => scheduleLocalReminder('water_nudge', 120, phase)}>💧 Water in 2 h</button>
      </div>
      {reminders.map((r) => (
        <div key={r.id} className="row row--between small">
          <span>
            {r.kind === 'rest_nudge' ? 'Rest' : 'Water'} at{' '}
            {new Date(r.fireAt).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })}
          </span>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => cancelLocalReminder(r.id)}>Cancel</button>
        </div>
      ))}
    </section>
  );
}
