// Indian metric conventions: millilitres / litres for liquids, en-IN formatting.

export const LOCALE = 'en-IN';
export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

export const GLASS_ML = 250;
export const DAILY_WATER_GOAL_ML = 2500;

const litres = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const litres1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 750 → "750 ml", 1500 → "1.5 L". */
export function formatWater(ml: number): string {
  return ml < 1000 ? `${Math.round(ml)} ml` : `${litres.format(ml / 1000)} L`;
}

/** Always litres with one decimal, for averages and tables: 1840 → "1.8 L". */
export function formatLitres(ml: number): string {
  return `${litres1.format(ml / 1000)} L`;
}
