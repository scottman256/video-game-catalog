import { LibraryEntry } from '../../core/models/library-entry.model';

export interface LibrarySummary {
  gameCount: number;
  hoursPlayed: number;
  completedCount: number;
  fullyCompletedCount: number;
}

/** Completed counts include 100% games, since a game can't be 100% completed without being completed. */
export function summarizeLibrary(entries: LibraryEntry[]): LibrarySummary {
  return {
    gameCount: entries.length,
    hoursPlayed: totalHoursPlayed(entries),
    completedCount: entries.filter((entry) => entry.completed_on !== null).length,
    fullyCompletedCount: entries.filter((entry) => entry.fully_completed_on !== null).length,
  };
}

/** Rounded to one decimal place so floating-point addition doesn't show up as 12.600000000000001. */
function totalHoursPlayed(entries: LibraryEntry[]): number {
  const total = entries.reduce((sum, entry) => sum + Number(entry.hours_played ?? 0), 0);
  return Math.round(total * 10) / 10;
}
