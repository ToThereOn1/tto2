'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorldAtmosphere } from '@/hooks/useWorldAtmosphere';
import { SEASON_CONFIG } from '@/lib/world-dashboard-constants';
import { WorldHeader } from './WorldHeader';
import { PetLocationHero } from './PetLocationHero';
import { NpcPresenceRow } from './NpcPresenceRow';
import { WorldActivityStream } from './WorldActivityStream';
import { LetterStatusWidget } from './LetterStatusWidget';
import { LetterEchoCard } from './LetterEchoCard';

interface WorldDashboardProps {
    petId: string;
    canWriteLetter: boolean;
}

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

interface TimelineData {
    pet: {
        name: string;
        photos?: string[];
        species?: string;
    };
    timeline: {
        currentDay: number;
        currentZone: string;
        currentZoneName: string;
    };
    events: FeedEvent[];
    microEvents: MicroEvent[];
    worldState: {
        atmosphere?: string;
    };
}

export function WorldDashboard({ petId, canWriteLetter }: WorldDashboardProps) {
    const [data, setData] = useState<TimelineData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch(`/api/timeline/${petId}`);
            if (!res.ok) throw new Error('fetch');
            setData(await res.json());
            setError(false);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [petId]);

    useEffect(() => {
        fetchData();
        const handler = () => {
            if (document.visibilityState === 'visible') fetchData();
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [fetchData]);

    // Safe fallbacks for atmosphere hook — always call hooks unconditionally
    const currentDay = data?.timeline.currentDay ?? 1;
    const currentZone = data?.timeline.currentZone ?? 'crystal_meadow';

    const { timeOfDay, season, palette, seasonConfig, mounted } = useWorldAtmosphere(currentDay, currentZone);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                    <div className="h-40 rounded-2xl bg-slate-200 animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 h-40 rounded-3xl bg-slate-200 animate-pulse" />
                        <div className="h-40 rounded-2xl bg-slate-200 animate-pulse" />
                    </div>
                    <div className="h-12 rounded-2xl bg-slate-200 animate-pulse" />
                    <div className="h-32 rounded-3xl bg-slate-200 animate-pulse" />
                    <div className="h-24 rounded-3xl bg-slate-200 animate-pulse" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        const petName = data?.pet.name ?? 'Your pet';
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-sm text-slate-400 italic text-center px-4">
                    The Waterway is quiet right now. {petName} is somewhere nearby.
                </p>
            </div>
        );
    }

    const { pet, timeline, events, microEvents, worldState } = data;

    const seasonConfigFull = SEASON_CONFIG[season];

    // Letter status: derive from API response (safe access for optional fields)
    const rawData = data as unknown as Record<string, unknown>;
    const userLetters = (rawData.userLetters ?? rawData.sentLetters ?? []) as Array<{ created_at: string }>;
    const petLetters = (rawData.petLetters ?? rawData.deliverablePetLetters ?? []) as Array<{ status: string }>;
    const lastSentAt = userLetters[0]?.created_at ?? null;
    const hasUnreadReply = petLetters.some((l) => l.status === 'sent' || l.status === 'approved');

    // Letter echo: most recent micro-event with category 'letter_echo'
    const letterEcho = microEvents.find((m) => m.category === 'letter_echo') ?? null;

    // Recent NPCs: unique npc_involved from last 5 events that have npc_involved
    const recentNpcs = Array.from(
        new Set(
            events
                .slice(0, 5)
                .map((e) => e.npc_involved)
                .filter((n): n is string => !!n)
        )
    );

    return (
        <div className={`min-h-screen transition-colors duration-1000 ${mounted ? palette.bg : 'bg-slate-50'}`}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
                <WorldHeader
                    petName={pet.name}
                    petPhotoUrl={pet.photos?.[0] ?? null}
                    toThereOnDay={timeline.currentDay}
                    currentZone={timeline.currentZone}
                    currentZoneName={timeline.currentZoneName}
                    timeOfDay={timeOfDay}
                    season={season}
                    mounted={mounted}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <PetLocationHero
                            zoneKey={timeline.currentZone}
                            zoneName={timeline.currentZoneName}
                            latestActivity={events[0]?.event_description ?? microEvents[0]?.content ?? null}
                            mood={events[0]?.mood ?? null}
                            worldSpark={worldState.atmosphere ?? null}
                            seasonAtmosphere={seasonConfigFull.atmosphere}
                        />
                    </div>
                    <LetterStatusWidget
                        petId={petId}
                        petName={pet.name}
                        lastSentAt={lastSentAt}
                        hasUnreadReply={hasUnreadReply}
                        canWriteLetter={canWriteLetter}
                    />
                </div>

                {letterEcho && (
                    <LetterEchoCard
                        echoContent={letterEcho.content}
                        daysAgo={timeline.currentDay - letterEcho.tothereon_day}
                        zone={letterEcho.zone}
                    />
                )}

                <NpcPresenceRow
                    currentZone={timeline.currentZone}
                    recentNpcNames={recentNpcs}
                />

                <WorldActivityStream
                    events={events}
                    microEvents={microEvents}
                    currentTimeOfDay={timeOfDay}
                    petName={pet.name}
                />
            </div>
        </div>
    );
}
