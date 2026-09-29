import { LibraryEntry, OwnershipType } from '../../core/models/library-entry.model';
import { GameSystem } from '../../core/models/system.model';

export interface LibraryFilters {
  titleQuery: string;
  systemId: number | null;
  ownershipType: OwnershipType | null;
  minRating: number | null;
  maxRating: number | null;
}

export const NO_FILTERS: LibraryFilters = {
  titleQuery: '',
  systemId: null,
  ownershipType: null,
  minRating: null,
  maxRating: null,
};

export function filterLibrary(entries: LibraryEntry[], filters: LibraryFilters): LibraryEntry[] {
  return entries.filter(
    (entry) =>
      matchesTitle(entry, filters.titleQuery) &&
      (filters.systemId === null || entry.game.system.id === filters.systemId) &&
      (filters.ownershipType === null || entry.ownership_type === filters.ownershipType) &&
      matchesRating(entry.weighted_score, filters),
  );
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return (Object.keys(NO_FILTERS) as (keyof LibraryFilters)[]).some((key) => filters[key] !== NO_FILTERS[key]);
}

/** The distinct systems in the library, alphabetically, so the filter only offers systems the user owns games on. */
export function systemsInLibrary(entries: LibraryEntry[]): GameSystem[] {
  const systemsById = new Map(entries.map((entry) => [entry.game.system.id, entry.game.system]));
  return [...systemsById.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function matchesTitle(entry: LibraryEntry, titleQuery: string): boolean {
  return entry.game.title.toLowerCase().includes(titleQuery.trim().toLowerCase());
}

/** Unrated games are excluded once any rating bound is set, since they can't satisfy it. */
function matchesRating(score: number | null, filters: LibraryFilters): boolean {
  if (filters.minRating === null && filters.maxRating === null) return true;
  if (score === null) return false;
  return score >= (filters.minRating ?? 0) && score <= (filters.maxRating ?? 5);
}
