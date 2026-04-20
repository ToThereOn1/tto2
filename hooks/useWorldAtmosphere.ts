'use client';

import { useWorldTime } from './useWorldTime';
import {
    TIME_OF_DAY_PALETTES,
    ZONE_GRADIENTS,
    SEASON_CONFIG,
    getCurrentSeason,
} from '@/lib/world-dashboard-constants';
import type { TimeOfDay, Season, ZoneKey } from '@/lib/world-dashboard-constants';

export function useWorldAtmosphere(toThereOnDay: number, zoneKey: string) {
    const { timeOfDay, mounted } = useWorldTime();
    const season = getCurrentSeason(toThereOnDay);

    const palette = TIME_OF_DAY_PALETTES[timeOfDay];
    const zoneGradient = ZONE_GRADIENTS[zoneKey as ZoneKey] ?? ZONE_GRADIENTS.crystal_meadow;
    const seasonConfig = SEASON_CONFIG[season];

    return {
        timeOfDay,
        season,
        palette,
        zoneGradient,
        seasonConfig,
        mounted,
    };
}
