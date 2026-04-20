'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { STAGGER_CONTAINER, STAGGER_ITEM, REDUCED_MOTION_FALLBACK } from '@/lib/motion-presets';
import type { TimeOfDay } from '@/lib/world-dashboard-constants';
import { TimeSectionHeader } from './TimeSectionHeader';
import { MicroEventCard } from '@/components/feed/MicroEventCard';

interface FeedEvent {
    id: string;
    event_description?: string;
    content?: string;
    event_type?: string;
    zone?: string;
    mood?: string;
    npc_involved?: string;
    created_at: string;
    tothereon_day: number;
}

interface MicroEvent {
    id: string;
    content: string;
    category: string;
    time_of_day: string;
    npc_involved: string | null;
    zone: string;
    created_at: string;
    tothereon_day: number;
    language: string;
}

interface WorldActivityStreamProps {
    events: FeedEvent[];
    microEvents: MicroEvent[];
    currentTimeOfDay: TimeOfDay;
    petName: string;
    language?: string;
}

type UnifiedItem = {
    id: string;
    content: string;
    type: 'event' | 'micro';
    timeOfDay: TimeOfDay;
    createdAt: string;
    zone: string;
    mood: string | null;
    npcInvolved: string | null;
    category?: string;
    language?: string;
};

const TIME_OF_DAY_ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];

function getTimeOfDayFromUtcHour(dateStr: string): TimeOfDay {
    const hour = new Date(dateStr).getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

export function WorldActivityStream({
    events,
    microEvents,
    currentTimeOfDay,
    petName: _petName,
    language = 'en',
}: WorldActivityStreamProps) {
    const shouldReduceMotion = useReducedMotion();

    const unified = useMemo<UnifiedItem[]>(() => {
        const fromEvents: UnifiedItem[] = events.map((e) => ({
            id: e.id,
            content: e.event_description ?? e.content ?? '',
            type: 'event',
            timeOfDay: getTimeOfDayFromUtcHour(e.created_at),
            createdAt: e.created_at,
            zone: e.zone ?? '',
            mood: e.mood ?? null,
            npcInvolved: e.npc_involved ?? null,
        }));

        const fromMicro: UnifiedItem[] = microEvents.map((m) => ({
            id: m.id,
            content: m.content,
            type: 'micro',
            timeOfDay: (m.time_of_day as TimeOfDay) ?? getTimeOfDayFromUtcHour(m.created_at),
            createdAt: m.created_at,
            zone: m.zone,
            mood: null,
            npcInvolved: m.npc_involved,
            category: m.category,
            language: m.language,
        }));

        return [...fromEvents, ...fromMicro]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 25);
    }, [events, microEvents]);

    const grouped = useMemo(() => {
        const map = new Map<TimeOfDay, UnifiedItem[]>();
        for (const item of unified) {
            const existing = map.get(item.timeOfDay) ?? [];
            map.set(item.timeOfDay, [...existing, item]);
        }
        return map;
    }, [unified]);

    // Order groups: currentTimeOfDay first, then others in reverse chronological order
    const orderedKeys = useMemo<TimeOfDay[]>(() => {
        const present = Array.from(grouped.keys());
        const currentIdx = TIME_OF_DAY_ORDER.indexOf(currentTimeOfDay);
        // Reverse chrono order from currentTimeOfDay going backwards
        const otherOrder: TimeOfDay[] = [];
        for (let i = currentIdx - 1; i >= 0; i--) {
            otherOrder.push(TIME_OF_DAY_ORDER[i]);
        }
        for (let i = TIME_OF_DAY_ORDER.length - 1; i > currentIdx; i--) {
            otherOrder.push(TIME_OF_DAY_ORDER[i]);
        }
        const result: TimeOfDay[] = [];
        if (present.includes(currentTimeOfDay)) result.push(currentTimeOfDay);
        for (const key of otherOrder) {
            if (present.includes(key)) result.push(key);
        }
        return result;
    }, [grouped, currentTimeOfDay]);

    const containerProps = shouldReduceMotion ? REDUCED_MOTION_FALLBACK : STAGGER_CONTAINER;
    const itemProps = shouldReduceMotion ? {} : STAGGER_ITEM;

    if (unified.length === 0) {
        return (
            <div className="rounded-3xl p-8 bg-white/60 border border-white/40 text-center">
                <p className="text-sm text-slate-400 italic">The world is quiet right now.</p>
            </div>
        );
    }

    return (
        <motion.div
            className="flex flex-col gap-1"
            {...containerProps}
        >
            {orderedKeys.map((tod) => {
                const items = grouped.get(tod) ?? [];
                return (
                    <motion.div key={tod} {...itemProps}>
                        <TimeSectionHeader
                            timeOfDay={tod}
                            isCurrent={tod === currentTimeOfDay}
                            language={language}
                        />
                        <div className="flex flex-col gap-3">
                            {items.map((item) => {
                                if (item.type === 'micro') {
                                    return (
                                        <motion.div key={item.id} {...itemProps}>
                                            <MicroEventCard
                                                content={item.content}
                                                category={item.category ?? 'world_ambient'}
                                                timeOfDay={item.timeOfDay}
                                                npcInvolved={item.npcInvolved}
                                                createdAt={item.createdAt}
                                                zone={item.zone}
                                                language={item.language ?? language}
                                            />
                                        </motion.div>
                                    );
                                }

                                return (
                                    <motion.div key={item.id} {...itemProps}>
                                        <div className="rounded-3xl p-5 bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm">
                                            {item.mood && (
                                                <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 mb-2">
                                                    {item.mood}
                                                </span>
                                            )}
                                            <p className="text-sm text-slate-800 leading-relaxed">{item.content}</p>
                                            <span className="text-[10px] text-slate-400 mt-2 block">
                                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
