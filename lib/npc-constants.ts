import type { SupportedLanguage } from './micro-event-types';

export interface NpcInfo {
    name: string;
    displayName: Record<SupportedLanguage, string>;
    zones: string[];
    activity: string;
}

export const NPC_DISPLAY_NAMES: Record<string, Record<SupportedLanguage, string>> = {
    'Granny Shell': { en: 'Granny Shell', ko: '느림보 할망', ja: 'グラニー・シェル' },
    'Professor Clover': { en: 'Professor Clover', ko: '콩선생', ja: 'クローバー先生' },
    'Pip': { en: 'Pip', ko: '달래', ja: 'ピップ' },
    'Old Finn': { en: 'Old Finn', ko: '꼬리상인', ja: 'フィン老人' },
    'Bun & Bun': { en: 'Bun & Bun', ko: '뭉실·몽실', ja: 'バンとバン' },
    'Digby': { en: 'Digby', ko: '굴돌이', ja: 'ディグビー' },
    'Lune': { en: 'Lune', ko: '은빛', ja: 'ルーン' },
};

export const ZONE_NPCS: Record<string, string[]> = {
    crystal_meadow: ['Granny Shell', 'Pip'],
    eternity_forest: ['Professor Clover', 'Pip', 'Old Finn'],
    crystal_lake: ['Old Finn', 'Bun & Bun', 'Digby'],
    sunset_hill: ['Lune', 'Digby'],
};

export function getNpcDisplayName(npcName: string, lang: SupportedLanguage): string {
    return NPC_DISPLAY_NAMES[npcName]?.[lang] ?? npcName;
}
