import { describe, expect, it } from 'vitest';
import { formatLitres, formatWater } from './units';

describe('water formatting (metric)', () => {
  it('uses ml below a litre and L above', () => {
    expect(formatWater(0)).toBe('0 ml');
    expect(formatWater(250)).toBe('250 ml');
    expect(formatWater(1000)).toBe('1 L');
    expect(formatWater(1750)).toBe('1.75 L');
  });

  it('formats averages in litres with one decimal', () => {
    expect(formatLitres(1840)).toBe('1.8 L');
    expect(formatLitres(2000)).toBe('2.0 L');
  });
});
