'use client'

import { getDiscoveryCopy, getCanonicalZone, type NpcTag } from '@/lib/discovery-copy'
import { NpcChip } from '@/components/feed/NpcTooltip'

interface DiscoveryStateProps {
    petName: string
    currentDay: number
    petId: string
    /** When true, hides the heading/subtext and renders only the location + NPC widget */
    compact?: boolean
    /** Story So Far stats */
    letterCount?: number
    friendCount?: number
}

function NpcPill({ npc }: { npc: NpcTag }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-xs text-amber-800 font-medium">
            <span>{npc.emoji}</span>
            <NpcChip name={npc.name} />
            <span className="text-amber-500">· {npc.role}</span>
        </span>
    )
}

export function DiscoveryState({
    petName, currentDay, compact = false, letterCount = 0, friendCount = 0,
}: DiscoveryStateProps) {
    const copy = getDiscoveryCopy(petName, currentDay)
    const zone = getCanonicalZone(currentDay)

    return (
        <div className="animate-in fade-in duration-1000 motion-reduce:animate-none space-y-4">
            {/* Story So Far stats row */}
            {!compact && currentDay > 0 && (
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                        Day {currentDay} in ToThereOn World
                    </span>
                    {letterCount > 0 && (
                        <span>
                            <span className="text-amber-600 font-semibold">{letterCount}</span> {letterCount === 1 ? 'letter' : 'letters'} exchanged
                        </span>
                    )}
                    {friendCount > 0 && (
                        <span>
                            <span className="text-emerald-600 font-semibold">{friendCount}</span> {friendCount === 1 ? 'friend' : 'friends'} met
                        </span>
                    )}
                </div>
            )}

            {/* Heading + subtext — hidden in compact mode */}
            {!compact && (
                <div className="space-y-3">
                    <h2 className="text-xl font-bold text-slate-900 leading-snug">
                        {copy.heading}
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        {copy.subtext}
                    </p>
                </div>
            )}

            {/* Current Zone card */}
            <div className={compact
                ? "bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-3"
                : "bg-amber-50 border border-amber-100 rounded-2xl p-4"
            }>
                {compact ? (
                    <>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 shrink-0">📍</span>
                        <span className="text-sm font-semibold text-slate-800">{zone.name}</span>
                        <span className="text-xs text-slate-400 hidden sm:block truncate">{zone.description}</span>
                    </>
                ) : (
                    <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">
                            Current Location
                        </p>
                        <h3 className="text-sm font-semibold text-slate-800 mb-1">{zone.name}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{zone.description}</p>
                    </>
                )}
            </div>

            {/* NPC tags */}
            <div>
                {!compact && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                        Nearby
                    </p>
                )}
                <div className="flex flex-wrap gap-2">
                    {copy.activeNpcs.map(npc => (
                        <NpcPill key={npc.name} npc={npc} />
                    ))}
                </div>
            </div>
        </div>
    )
}
