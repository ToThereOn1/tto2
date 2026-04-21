'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorldAtmosphere } from '@/hooks/useWorldAtmosphere';
import { WorldHeader } from './WorldHeader';
import { WorldActivityStream } from './WorldActivityStream';
import { LetterStatusWidget } from './LetterStatusWidget';

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

function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-20 bg-white border-b border-slate-100">
                <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-24 bg-slate-200 rounded-full animate-pulse" />
                        <div className="h-2.5 w-12 bg-slate-200 rounded-full animate-pulse" />
                    </div>
                </div>
            </div>
            <div className="max-w-xl mx-auto px-4 py-3 space-y-0">
                <div className="h-16 rounded-2xl bg-slate-200 animate-pulse mb-3" />
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 py-4 border-b border-slate-100">
                        <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2 pt-0.5">
                            <div className="h-3 w-28 bg-slate-200 rounded-full animate-pulse" />
                            <div className="h-3 w-full bg-slate-200 rounded-full animate-pulse" />
                            <div className="h-3 w-2/3 bg-slate-200 rounded-full animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
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

    const currentDay = data?.timeline.currentDay ?? 1;
    const currentZone = data?.timeline.currentZone ?? 'crystal_meadow';
    const { timeOfDay, mounted } = useWorldAtmosphere(currentDay, currentZone);

    if (isLoading) return <LoadingSkeleton />;

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-sm text-slate-400 italic text-center px-4">
                    The Waterway is quiet right now.
                </p>
            </div>
        );
    }

    const { pet, timeline, events, microEvents } = data;
    const petPhotoUrl = pet.photos?.[0] ?? null;

    const rawData = data as unknown as Record<string, unknown>;
    const userLetters = (rawData.userLetters ?? rawData.sentLetters ?? []) as Array<{ created_at: string }>;
    const petLetters = (rawData.petLetters ?? rawData.deliverablePetLetters ?? []) as Array<{ status: string }>;
    const lastSentAt = userLetters[0]?.created_at ?? null;
    const hasUnreadReply = petLetters.some((l) => l.status === 'sent' || l.status === 'approved');

    return (
        <div className="min-h-screen bg-slate-50">
            <WorldHeader
                petName={pet.name}
                petPhotoUrl={petPhotoUrl}
                toThereOnDay={timeline.currentDay}
                currentZoneName={timeline.currentZoneName}
                timeOfDay={timeOfDay}
                mounted={mounted}
            />

            <div className="max-w-xl mx-auto">
                <div className="px-4 pt-3">
                    <LetterStatusWidget
                        petId={petId}
                        petName={pet.name}
                        lastSentAt={lastSentAt}
                        hasUnreadReply={hasUnreadReply}
                        canWriteLetter={canWriteLetter}
                    />
                </div>

                <div className="mt-2 bg-white border-t border-slate-100">
                    <WorldActivityStream
                        events={events}
                        microEvents={microEvents}
                        currentTimeOfDay={timeOfDay}
                        petName={pet.name}
                        petPhotoUrl={petPhotoUrl}
                    />
                </div>
            </div>
        </div>
    );
}
