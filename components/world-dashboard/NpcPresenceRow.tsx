'use client';

import { getNpcDisplayName, ZONE_NPCS } from '@/lib/npc-constants';
import type { SupportedLanguage } from '@/lib/micro-event-types';

interface NpcPresenceRowProps {
    currentZone: string;
    language?: SupportedLanguage;
    recentNpcNames?: string[];
}

const NEARBY_LABELS: Record<SupportedLanguage, string> = {
    en: 'Nearby',
    ko: '근처에',
    ja: '近くに',
};

export function NpcPresenceRow({ currentZone, language = 'en', recentNpcNames = [] }: NpcPresenceRowProps) {
    const npcs = ZONE_NPCS[currentZone];

    if (!npcs || npcs.length === 0) return null;

    const sectionLabel = NEARBY_LABELS[language];

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {sectionLabel}
            </span>
            <div className="flex gap-2 overflow-x-auto">
                {npcs.map((npcName) => {
                    const isRecent = recentNpcNames.includes(npcName);
                    return (
                        <div
                            key={npcName}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 border border-white/40 text-xs font-medium text-slate-700 shrink-0"
                        >
                            {isRecent && (
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            )}
                            {getNpcDisplayName(npcName, language)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
