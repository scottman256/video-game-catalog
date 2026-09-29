import { LibraryEntry } from '../../core/models/library-entry.model';
import { NO_FILTERS, filterLibrary, hasActiveFilters, systemsInLibrary } from './library-filter';

const NES = { id: 1, name: 'NES', release_year: 1985 };
const SNES = { id: 2, name: 'SNES', release_year: 1991 };

function entry(id: number, title: string, overrides: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id,
    game: { id: id * 10, title, release_year: 1990, system: NES, box_art_url: null, is_approved: true },
    ownership_type: 'digital',
    price_paid: null,
    added_at: '2026-01-01T00:00:00Z',
    weighted_score: null,
    ...overrides,
  };
}

const MARIO = entry(1, 'Super Mario Bros.', { weighted_score: 4.5 });
const ZELDA = entry(2, 'The Legend of Zelda', { ownership_type: 'physical', weighted_score: 3 });
const METROID = entry(3, 'Super Metroid', {
  game: { id: 30, title: 'Super Metroid', release_year: 1994, system: SNES, box_art_url: null, is_approved: true },
});
const ALL = [MARIO, ZELDA, METROID];

function titles(entries: LibraryEntry[]): string[] {
  return entries.map((e) => e.game.title);
}

describe('filterLibrary', () => {
  it('returns everything with no filters', () => {
    expect(filterLibrary(ALL, NO_FILTERS)).toEqual(ALL);
  });

  it('matches title case-insensitively and ignores surrounding spaces', () => {
    expect(titles(filterLibrary(ALL, { ...NO_FILTERS, titleQuery: '  SUPER ' }))).toEqual([
      'Super Mario Bros.',
      'Super Metroid',
    ]);
  });

  it('filters by system', () => {
    expect(titles(filterLibrary(ALL, { ...NO_FILTERS, systemId: SNES.id }))).toEqual(['Super Metroid']);
  });

  it('filters by ownership type', () => {
    expect(titles(filterLibrary(ALL, { ...NO_FILTERS, ownershipType: 'physical' }))).toEqual(['The Legend of Zelda']);
  });

  it('filters by minimum rating and excludes unrated games', () => {
    expect(titles(filterLibrary(ALL, { ...NO_FILTERS, minRating: 4 }))).toEqual(['Super Mario Bros.']);
  });

  it('filters by maximum rating and excludes unrated games', () => {
    expect(titles(filterLibrary(ALL, { ...NO_FILTERS, maxRating: 3 }))).toEqual(['The Legend of Zelda']);
  });

  it('combines filters', () => {
    const filters = { ...NO_FILTERS, titleQuery: 'super', systemId: NES.id };

    expect(titles(filterLibrary(ALL, filters))).toEqual(['Super Mario Bros.']);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the empty filter set', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });

  it('is true once any filter is set', () => {
    expect(hasActiveFilters({ ...NO_FILTERS, minRating: 2 })).toBe(true);
  });
});

describe('systemsInLibrary', () => {
  it('lists each owned system once, alphabetically', () => {
    expect(systemsInLibrary([METROID, MARIO, ZELDA])).toEqual([NES, SNES]);
  });
});
