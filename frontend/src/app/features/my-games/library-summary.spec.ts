import { LibraryEntry } from '../../core/models/library-entry.model';
import { summarizeLibrary } from './library-summary';

function entry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: 1,
    game: {
      id: 10,
      title: 'Mario',
      release_year: 1985,
      system: { id: 1, name: 'NES', release_year: 1985 },
      box_art_url: null,
      is_approved: true,
    },
    ownership_type: 'digital',
    price_paid: null,
    added_at: '2026-01-01T00:00:00Z',
    weighted_score: null,
    completed_on: null,
    fully_completed_on: null,
    hours_played: null,
    ...overrides,
  };
}

describe('summarizeLibrary', () => {
  it('is all zeros for an empty library', () => {
    expect(summarizeLibrary([])).toEqual({
      gameCount: 0,
      hoursPlayed: 0,
      completedCount: 0,
      fullyCompletedCount: 0,
    });
  });

  it('adds up hours, treating games with no hours logged as zero', () => {
    const summary = summarizeLibrary([entry({ hours_played: '10.5' }), entry(), entry({ hours_played: '2.0' })]);

    expect(summary.hoursPlayed).toBe(12.5);
  });

  it('avoids floating-point noise in the total', () => {
    expect(summarizeLibrary([entry({ hours_played: '0.1' }), entry({ hours_played: '0.2' })]).hoursPlayed).toBe(0.3);
  });

  it('counts 100% games as completed too', () => {
    const summary = summarizeLibrary([
      entry({ completed_on: '2026-09-01' }),
      entry({ completed_on: '2026-09-01', fully_completed_on: '2026-09-20' }),
      entry(),
    ]);

    expect(summary).toEqual(
      expect.objectContaining({ gameCount: 3, completedCount: 2, fullyCompletedCount: 1 }),
    );
  });
});
