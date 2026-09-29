export function formatHoursPlayed(hours: number): string {
  const formatted = hours.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return `${formatted} ${hours === 1 ? 'hr' : 'hrs'} played`;
}
