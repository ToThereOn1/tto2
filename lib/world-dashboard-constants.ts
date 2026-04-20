export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type ZoneKey = 'crystal_meadow' | 'eternity_forest' | 'crystal_lake' | 'sunset_hill' | 'central_plaza';
export type Season = 'bloom' | 'warmth' | 'drift' | 'stillness';

export const TIME_OF_DAY_PALETTES: Record<TimeOfDay, {
    bg: string;
    text: string;
    textSecondary: string;
    accent: string;
    cardBg: string;
    cardBorder: string;
    glow: string;
    icon: string;
}> = {
    morning: {
        bg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
        text: 'text-amber-900',
        textSecondary: 'text-amber-700',
        accent: 'text-amber-600',
        cardBg: 'bg-white/70',
        cardBorder: 'border-amber-100/60',
        glow: 'shadow-amber-200/30',
        icon: 'text-amber-500',
    },
    afternoon: {
        bg: 'bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50',
        text: 'text-sky-900',
        textSecondary: 'text-sky-700',
        accent: 'text-sky-600',
        cardBg: 'bg-white/70',
        cardBorder: 'border-sky-100/60',
        glow: 'shadow-sky-200/30',
        icon: 'text-sky-500',
    },
    evening: {
        bg: 'bg-gradient-to-br from-violet-50 via-purple-50 to-rose-50',
        text: 'text-violet-900',
        textSecondary: 'text-rose-700',
        accent: 'text-violet-600',
        cardBg: 'bg-white/60',
        cardBorder: 'border-rose-100/60',
        glow: 'shadow-violet-200/30',
        icon: 'text-violet-500',
    },
    night: {
        bg: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900',
        text: 'text-slate-100',
        textSecondary: 'text-indigo-300',
        accent: 'text-indigo-400',
        cardBg: 'bg-slate-800/70',
        cardBorder: 'border-indigo-500/20',
        glow: 'shadow-indigo-500/20',
        icon: 'text-indigo-400',
    },
};

export const ZONE_GRADIENTS: Record<string, {
    bg: string;
    border: string;
    icon: string;
    label: string;
}> = {
    crystal_meadow: { bg: 'bg-gradient-to-br from-emerald-100 via-green-50 to-teal-50', border: 'border-emerald-200/60', icon: 'text-emerald-500', label: 'Emerald' },
    eternity_forest: { bg: 'bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100', border: 'border-green-300/60', icon: 'text-green-600', label: 'Forest' },
    crystal_lake: { bg: 'bg-gradient-to-br from-cyan-100 via-blue-50 to-sky-100', border: 'border-cyan-200/60', icon: 'text-cyan-500', label: 'Azure' },
    sunset_hill: { bg: 'bg-gradient-to-br from-orange-100 via-amber-50 to-rose-50', border: 'border-orange-200/60', icon: 'text-orange-500', label: 'Sunset' },
    central_plaza: { bg: 'bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-50', border: 'border-yellow-200/60', icon: 'text-yellow-600', label: 'Golden' },
};

export const SEASON_CONFIG: Record<Season, {
    name: string;
    nameKo: string;
    nameJa: string;
    atmosphere: string;
    overlay: string;
}> = {
    bloom: { name: 'Bloom', nameKo: '봄빛', nameJa: '花の季節', atmosphere: 'New buds glow faintly along the paths', overlay: 'bg-green-500/5' },
    warmth: { name: 'Warmth', nameKo: '따스함', nameJa: '暖の季節', atmosphere: 'Warm breezes carry the scent of golden pollen', overlay: 'bg-yellow-500/5' },
    drift: { name: 'Drift', nameKo: '흐름', nameJa: '漂う季節', atmosphere: 'Crystal leaves drift slowly, catching the fading light', overlay: 'bg-orange-500/5' },
    stillness: { name: 'Stillness', nameKo: '고요', nameJa: '静の季節', atmosphere: 'Soft luminescent frost coats every surface', overlay: 'bg-blue-500/5' },
};

export const SEASON_LENGTH_TTO_DAYS = 7;
export const SEASONS: Season[] = ['bloom', 'warmth', 'drift', 'stillness'];

export function getCurrentSeason(toThereOnDay: number): Season {
    const idx = Math.floor(((toThereOnDay - 1) % 28) / SEASON_LENGTH_TTO_DAYS);
    return SEASONS[idx] ?? 'bloom';
}

export const TIME_LABELS: Record<TimeOfDay, { en: string; ko: string; ja: string }> = {
    morning: { en: 'Morning', ko: '아침', ja: '朝' },
    afternoon: { en: 'Afternoon', ko: '낮', ja: '午後' },
    evening: { en: 'Evening', ko: '저녁', ja: '夕方' },
    night: { en: 'Night', ko: '밤', ja: '夜' },
};
