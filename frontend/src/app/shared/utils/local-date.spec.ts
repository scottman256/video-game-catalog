import { todayAsIsoDate } from './local-date';

describe('todayAsIsoDate', () => {
  it('formats the local date with zero-padded month and day', () => {
    expect(todayAsIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the local date late in the evening rather than the UTC date', () => {
    expect(todayAsIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});
