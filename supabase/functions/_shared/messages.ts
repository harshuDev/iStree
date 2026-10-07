// Phase-aware copy shared by the Edge Function (push) and the web app (local
// notifications + UI). Tone: warm, practical, never clinical or alarming.
import type { Phase } from './cycle.ts';

export type ReminderKind =
  | 'phase_change'
  | 'period_forecast'
  | 'checkin'
  | 'hydration'
  | 'sleep'
  | 'rest_nudge'
  | 'water_nudge';

export interface PhaseGuide {
  tagline: string;
  about: string;
  eat: string[];
  move: string;
  rest: string;
}

export const PHASE_GUIDE: Record<Phase, PhaseGuide> = {
  menstrual: {
    tagline: 'Slow down and replenish',
    about: 'Hormones are at their lowest. It is normal to feel tired or turned inward.',
    eat: ['Iron-rich foods like lentils, spinach, dates', 'Warm soups and stews', 'Ginger or chamomile tea for cramps'],
    move: 'Gentle walks, stretching or yin yoga',
    rest: 'Aim for an extra 30–60 minutes of sleep if you can',
  },
  follicular: {
    tagline: 'Energy is rising',
    about: 'Estrogen climbs and many people feel lighter, more creative and social.',
    eat: ['Fresh vegetables and sprouts', 'Fermented foods like yogurt or kimchi', 'Lean protein and whole grains'],
    move: 'A good time to try something new or more intense',
    rest: 'Keep a steady sleep schedule to ride the energy well',
  },
  ovulation: {
    tagline: 'Peak energy and confidence',
    about: 'Estrogen peaks around ovulation. You may feel strong and outgoing.',
    eat: ['Fibre-rich veg and fruit', 'Anti-inflammatory foods like berries and leafy greens', 'Plenty of water'],
    move: 'High-energy workouts or long walks feel great now',
    rest: 'Wind down screens early — high energy can make it harder to sleep',
  },
  luteal: {
    tagline: 'Turn inward and nourish',
    about: 'Progesterone rises. Cravings, bloating or mood shifts can appear before your period.',
    eat: ['Complex carbs like oats and sweet potato', 'Magnesium: nuts, seeds, dark chocolate', 'Reduce salt and caffeine if bloated'],
    move: 'Moderate movement — pilates, swimming, easy cycling',
    rest: 'Protect your sleep; a calm evening routine helps with PMS',
  },
};

interface Message {
  title: string;
  body: string;
}

type MessageSet = Record<Phase, Message[]>;

const PHASE_CHANGE: MessageSet = {
  menstrual: [{ title: 'Your period phase has begun', body: 'Be gentle with yourself today. Warm food, water and rest go a long way.' }],
  follicular: [{ title: 'Hello, follicular phase', body: 'Energy tends to rise from here — a nice time to plan and try new things.' }],
  ovulation: [{ title: 'You are around ovulation', body: 'Energy often peaks now. Stay hydrated and enjoy it.' }],
  luteal: [{ title: 'Entering your luteal phase', body: 'Your body is preparing. Nourishing meals and good sleep help with PMS.' }],
};

const HYDRATION: MessageSet = {
  menstrual: [
    { title: 'Time for some water', body: 'Staying hydrated can ease cramps and headaches. Warm water counts too.' },
    { title: 'A glass of water?', body: 'Your body is working hard — a warm drink can be soothing right now.' },
  ],
  follicular: [
    { title: 'Hydration check', body: 'Keep that rising energy going with a glass of water.' },
    { title: 'Water break', body: 'A quick glass now keeps you sharp for the afternoon.' },
  ],
  ovulation: [
    { title: 'Drink up', body: 'Your body temperature runs a little higher now — water helps.' },
    { title: 'Hydration check', body: 'High-energy days need extra water. Grab a glass.' },
  ],
  luteal: [
    { title: 'Water can help with bloating', body: 'It sounds backwards, but staying hydrated reduces water retention.' },
    { title: 'Time for a glass of water', body: 'Swap one coffee for water or herbal tea today.' },
  ],
};

const SLEEP: MessageSet = {
  menstrual: [{ title: 'Time to wind down', body: 'Your body is asking for rest. An early night will help tomorrow.' }],
  follicular: [{ title: 'Wind-down time', body: 'Consistent sleep now sets you up for the rest of your cycle.' }],
  ovulation: [{ title: 'Time to put screens away', body: 'High energy can make it hard to switch off — try a calm routine.' }],
  luteal: [{ title: 'Protect your sleep tonight', body: 'Good sleep softens PMS. Dim the lights and wind down.' }],
};

const CHECKIN: MessageSet = {
  menstrual: [{ title: 'How are you feeling today?', body: 'Log your flow and symptoms — it takes 20 seconds.' }],
  follicular: [{ title: 'Quick check-in?', body: 'Note your mood and energy to spot patterns over time.' }],
  ovulation: [{ title: 'Daily check-in', body: 'How is your energy today? Take a moment to log it.' }],
  luteal: [{ title: 'Time for your check-in', body: 'Tracking mood and cravings now helps you understand your PMS.' }],
};

const REST: MessageSet = {
  menstrual: [{ title: 'Pause for a moment', body: 'Close your eyes, breathe slowly, and let your shoulders drop.' }],
  follicular: [{ title: 'Quick reset', body: 'Stand up, stretch and take three deep breaths.' }],
  ovulation: [{ title: 'Take a breather', body: 'Even on high-energy days, a short pause keeps you balanced.' }],
  luteal: [{ title: 'Rest is productive', body: 'Take five minutes for yourself — you have earned it.' }],
};

/** Deterministic rotation so the same day always shows the same variant. */
function pick(list: Message[], seed: number): Message {
  return list[Math.abs(seed) % list.length];
}

export function reminderMessage(
  kind: ReminderKind,
  phase: Phase,
  opts: { seed?: number; daysUntilPeriod?: number } = {},
): Message {
  const seed = opts.seed ?? 0;
  switch (kind) {
    case 'phase_change':
      return pick(PHASE_CHANGE[phase], seed);
    case 'period_forecast': {
      const d = opts.daysUntilPeriod ?? 2;
      return {
        title: d <= 0 ? 'Your period may start today' : `Your period may start in ${d} day${d === 1 ? '' : 's'}`,
        body: 'A gentle heads-up: pack supplies and plan some rest if you can.',
      };
    }
    case 'hydration':
    case 'water_nudge':
      return pick(HYDRATION[phase], seed);
    case 'sleep':
      return pick(SLEEP[phase], seed);
    case 'checkin':
      return pick(CHECKIN[phase], seed);
    case 'rest_nudge':
      return pick(REST[phase], seed);
  }
}
