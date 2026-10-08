import type { FlowIntensity } from './database.types';

export const FLOW_OPTIONS: { value: FlowIntensity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export const MOOD_OPTIONS = [
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡' },
  { value: 'sensitive', label: 'Sensitive', emoji: '🥺' },
  { value: 'irritable', label: 'Irritable', emoji: '😤' },
  { value: 'anxious', label: 'Anxious', emoji: '😟' },
  { value: 'low', label: 'Low', emoji: '😔' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
] as const;

export const SYMPTOM_OPTIONS = [
  { value: 'cramps', label: 'Cramps', emoji: '😖' },
  { value: 'headache', label: 'Headache', emoji: '🤕' },
  { value: 'bloating', label: 'Bloating', emoji: '🎈' },
  { value: 'tender_breasts', label: 'Tender breasts', emoji: '💗' },
  { value: 'back_pain', label: 'Back pain', emoji: '🦴' },
  { value: 'acne', label: 'Acne', emoji: '🫧' },
  { value: 'cravings', label: 'Cravings', emoji: '🍫' },
  { value: 'nausea', label: 'Nausea', emoji: '🤢' },
  { value: 'fatigue', label: 'Fatigue', emoji: '🥱' },
  { value: 'insomnia', label: 'Poor sleep', emoji: '🌙' },
  { value: 'discharge', label: 'Discharge', emoji: '💧' },
  { value: 'dizziness', label: 'Dizziness', emoji: '😵‍💫' },
] as const;

export const ENERGY_LABELS = ['Drained', 'Low', 'Okay', 'Good', 'Great'];

export const labelFor = (options: readonly { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label ?? value;

export const emojiFor = (options: readonly { value: string; emoji: string }[], value: string) =>
  options.find((o) => o.value === value)?.emoji ?? '•';
