/** The user's local calendar date as YYYY-MM-DD (toISOString would give the UTC date, which can be a day off). */
export function todayAsIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
