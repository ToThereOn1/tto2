'use client'

import { memo } from 'react'

interface ZoneMilestoneCardProps {
    zone: string
    day: number
}

const ZONE_INFO: Record<string, {
    emoji: string
    name: string
    description: string
    bg: string
    border: string
    text: string
    badge: string
    badgeText: string
}> = {
    eternity_forest: {
        emoji: '🌲',
        name: 'Eternity Forest',
        description: 'Ancient trees that remember everything. Every step through the roots feels like walking through a memory.',
        bg: 'bg-gradient-to-br from-emerald-50/90 to-green-100/60',
        border: 'border-emerald-200/60',
        text: 'text-emerald-900',
        badge: 'bg-emerald-100 text-emerald-700',
        badgeText: 'Deeper in',
    },
    crystal_lake: {
        emoji: '💎',
        name: 'Crystal Lake',
        description: 'The still water where reflections surface without being asked. A favorite gathering place for those who have begun to settle.',
        bg: 'bg-gradient-to-br from-sky-50/90 to-blue-100/60',
        border: 'border-sky-200/60',
        text: 'text-sky-900',
        badge: 'bg-sky-100 text-sky-700',
        badgeText: 'Settling in',
    },
    sunset_hill: {
        emoji: '🌅',
        name: 'Sunset Hill',
        description: "Where residents gather as the light changes. Old Finn keeps his market nearby and the stories are long.",
        bg: 'bg-gradient-to-br from-amber-50/90 to-orange-100/60',
        border: 'border-amber-200/60',
        text: 'text-amber-900',
        badge: 'bg-amber-100 text-amber-700',
        badgeText: 'At home now',
    },
    all_zones: {
        emoji: '✨',
        name: 'All of ToThereOn World',
        description: 'A familiar face everywhere — Crystal Meadow, Eternity Forest, the Lake, the Hill. Known by all.',
        bg: 'bg-gradient-to-br from-violet-50/90 to-purple-100/60',
        border: 'border-violet-200/60',
        text: 'text-violet-900',
        badge: 'bg-violet-100 text-violet-700',
        badgeText: 'Well known',
    },
}

export const ZoneMilestoneCard = memo(function ZoneMilestoneCard({ zone, day }: ZoneMilestoneCardProps) {
    const info = ZONE_INFO[zone]
    if (!info) return null

    return (
        <div className="flex items-center gap-4 py-2 animate-in fade-in zoom-in-95 duration-700" role="separator" aria-label={`Entered ${info.name}`}>
            {/* Left line */}
            <div className="flex-1 h-px bg-slate-100" />

            {/* Center card */}
            <div className={`
                flex flex-col items-center gap-2 px-8 py-5 rounded-[24px] border
                ${info.bg} ${info.border} backdrop-blur-sm
                shadow-md w-full max-w-sm text-center
            `}>
                <div
                    className="text-4xl mb-3 animate-bounce"
                    style={{ animationDuration: '2s', animationIterationCount: '3' }}
                >{info.emoji}</div>
                <div>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-0.5 ${info.badge} px-2 py-0.5 rounded-full inline-block`}>
                        {info.badgeText} · Day {day}
                    </p>
                    <h3 className={`text-sm font-extrabold tracking-tight mt-1 ${info.text}`}>
                        {info.name}
                    </h3>
                    <p className={`text-xs leading-relaxed mt-1 opacity-75 ${info.text}`}>
                        {info.description}
                    </p>
                </div>
            </div>

            {/* Right line */}
            <div className="flex-1 h-px bg-slate-100" />
        </div>
    )
})
