import { TIME_RATIO as _TIME_RATIO } from './time-constants';

export type Season = 'bloom' | 'warmth' | 'drift' | 'stillness';

export const SEASONS: Season[] = ['bloom', 'warmth', 'drift', 'stillness'];
export const SEASON_LENGTH_TTO_DAYS = 7;
export const SEASON_CYCLE_LENGTH = SEASON_LENGTH_TTO_DAYS * SEASONS.length; // 28

export interface SeasonState {
    season: Season;
    dayInSeason: number;      // 1-7
    seasonNumber: number;     // cumulative (1, 2, 3...)
    isTransitionDay: boolean; // first day of a new season
}

export function getSeasonState(toThereOnDay: number): SeasonState {
    const adjustedDay = Math.max(0, toThereOnDay - 1);
    const seasonIndex = Math.floor((adjustedDay % SEASON_CYCLE_LENGTH) / SEASON_LENGTH_TTO_DAYS);
    const dayInSeason = (adjustedDay % SEASON_LENGTH_TTO_DAYS) + 1;
    const seasonNumber = Math.floor(adjustedDay / SEASON_LENGTH_TTO_DAYS) + 1;

    return {
        season: SEASONS[seasonIndex] ?? 'bloom',
        dayInSeason,
        seasonNumber,
        isTransitionDay: dayInSeason === 1,
    };
}

export function getSeasonAtmosphere(season: Season): string {
    const atmospheres: Record<Season, string> = {
        bloom: 'New buds glow faintly along the paths. The air carries a sweetness that was not there yesterday.',
        warmth: 'Warm breezes drift across every surface. The light lingers longer than it used to.',
        drift: 'Crystal leaves detach slowly, catching light as they fall. The world is letting go of something.',
        stillness: 'A soft luminescent frost covers everything. The silence is not empty — it is full.',
    };
    return atmospheres[season];
}

export function getSeasonForPrompt(toThereOnDay: number): string {
    const state = getSeasonState(toThereOnDay);
    return `Current season: ${state.season} (day ${state.dayInSeason} of 7). Atmosphere: ${getSeasonAtmosphere(state.season)}`;
}
