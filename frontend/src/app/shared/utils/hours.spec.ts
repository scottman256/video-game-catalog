import { formatHoursPlayed } from './hours';

describe('formatHoursPlayed', () => {
  it('uses the singular for exactly one hour', () => {
    expect(formatHoursPlayed(1)).toBe('1 hr played');
  });

  it('uses the plural otherwise, including zero', () => {
    expect(formatHoursPlayed(0)).toBe('0 hrs played');
    expect(formatHoursPlayed(12.5)).toBe('12.5 hrs played');
  });

  it('drops trailing zeros and groups thousands', () => {
    expect(formatHoursPlayed(12.0)).toBe('12 hrs played');
    expect(formatHoursPlayed(1234.5)).toBe('1,234.5 hrs played');
  });
});
