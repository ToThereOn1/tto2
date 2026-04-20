"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, MapPin, Dog, Users, Calendar, Book, ChevronRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ZoneId = 'crystal_meadow' | 'eternity_forest' | 'crystal_lake' | 'sunset_hill' | 'central_plaza';

const ZONE_META: Record<string, { name: string; emoji: string; color: string }> = {
    crystal_meadow: { name: 'Crystal Meadow', emoji: '🌸', color: 'bg-green-50  border-green-200  text-green-800' },
    eternity_forest: { name: 'Eternity Forest', emoji: '🌲', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    crystal_lake: { name: 'Crystal Lake', emoji: '💎', color: 'bg-blue-50   border-blue-200   text-blue-800' },
    sunset_hill: { name: 'Sunset Hill', emoji: '🌅', color: 'bg-orange-50 border-orange-200 text-orange-800' },
    central_plaza: { name: 'Central Plaza', emoji: '⭐', color: 'bg-purple-50 border-purple-200 text-purple-800' },
};

interface WorldState {
    current_bd: number;
    total_pets: number;
    zone_distribution: Record<string, number>;
    last_tick_at: string;
}

interface WorldEvent {
    id: string;
    bd_day: number;
    event_type: string;
    zone_id: string;
    participants: Array<{ pet_id: string; pet_name: string }>;
    npc_involved: string | null;
    description: string;
    first_sentence: string;
    created_at: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorldMapPage() {
    const [worldState, setWorldState] = useState<WorldState | null>(null);
    const [recentEvents, setRecentEvents] = useState<WorldEvent[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [dayEvents, setDayEvents] = useState<WorldEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [dayLoading, setDayLoading] = useState(false);

    const fetchCurrentState = useCallback(async () => {
        try {
            const res = await fetch('/api/world-history');
            if (!res.ok) return;
            const data = await res.json();
            setWorldState(data.world_state);
            setRecentEvents(data.recent_events || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDayHistory = async (day: number) => {
        setDayLoading(true);
        try {
            const res = await fetch(`/api/world-history?day=${day}`);
            if (!res.ok) return;
            const data = await res.json();
            setDayEvents(data.events || []);
            setSelectedDay(day);
        } catch (err) {
            console.error(err);
        } finally {
            setDayLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentState();
        const interval = setInterval(fetchCurrentState, 30000);
        return () => clearInterval(interval);
    }, [fetchCurrentState]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-400 text-sm animate-pulse">Loading World State...</div>
            </div>
        );
    }

    const totalPets = worldState?.total_pets || 0;
    const zoneDistribution = worldState?.zone_distribution || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-6 md:p-10 text-white">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Globe className="w-8 h-8 text-purple-400" />
                            <h1 className="text-3xl font-bold tracking-tight">ToThereOn World Map</h1>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Living Universe · BD {worldState?.current_bd ?? '—'} · {totalPets} residents
                        </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <p>Last updated</p>
                        <p>{worldState?.last_tick_at
                            ? new Date(worldState.last_tick_at).toLocaleString('ko-KR')
                            : '—'
                        }</p>
                    </div>
                </header>

                {/* Zone Map */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> Zone Distribution
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {Object.entries(ZONE_META).map(([zoneId, meta]) => {
                            const count = zoneDistribution[zoneId] || 0;
                            const pct = totalPets > 0 ? Math.round((count / totalPets) * 100) : 0;
                            return (
                                <div
                                    key={zoneId}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-purple-500/40 transition-all"
                                >
                                    <div className="text-3xl mb-3">{meta.emoji}</div>
                                    <div className="text-sm font-medium text-white">{meta.name}</div>
                                    <div className="mt-2">
                                        <div className="text-2xl font-bold text-purple-300">{count}</div>
                                        <div className="text-xs text-slate-500">{pct}% of residents</div>
                                        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* History Query */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" /> World History Query
                    </h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex gap-3">
                            <input
                                type="number"
                                min={1}
                                placeholder="BD Day (예: 50)"
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = parseInt((e.target as HTMLInputElement).value);
                                        if (!isNaN(val)) fetchDayHistory(val);
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                                    if (input?.value) fetchDayHistory(parseInt(input.value));
                                }}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-colors"
                            >
                                Search
                            </button>
                        </div>

                        {dayLoading && (
                            <div className="mt-4 text-slate-400 text-sm animate-pulse">Searching BD {selectedDay}...</div>
                        )}

                        {!dayLoading && dayEvents.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <div className="text-sm text-slate-400 mb-3">
                                    BD {selectedDay} · {dayEvents.length} events recorded
                                </div>
                                {dayEvents.slice(0, 30).map(event => (
                                    <div key={event.id} className="bg-slate-800/50 rounded-xl p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="text-lg">
                                                {ZONE_META[event.zone_id]?.emoji || '🌍'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-purple-300">
                                                        {ZONE_META[event.zone_id]?.name || event.zone_id}
                                                    </span>
                                                    {event.participants.map(p => (
                                                        <span key={p.pet_id} className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-300">
                                                            {p.pet_name}
                                                        </span>
                                                    ))}
                                                    {event.npc_involved && (
                                                        <span className="text-xs bg-purple-900 px-2 py-0.5 rounded-full text-purple-300">
                                                            NPC: {event.npc_involved}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                                                    {event.first_sentence || event.description?.slice(0, 100)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Recent Events */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <Book className="w-5 h-5" /> Recent World Events
                    </h2>
                    <div className="space-y-2">
                        {recentEvents.length === 0 ? (
                            <div className="text-slate-500 text-sm p-4 bg-white/5 rounded-2xl">
                                No events recorded yet. Run the CRON job to start generating the Living Universe.
                            </div>
                        ) : (
                            recentEvents.map(event => (
                                <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-4">
                                    <div className="text-2xl">{ZONE_META[event.zone_id]?.emoji || '🌍'}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-xs text-purple-400 font-medium">BD {event.bd_day}</span>
                                            <span className="text-xs text-slate-500">{ZONE_META[event.zone_id]?.name || event.zone_id}</span>
                                            {event.participants.map(p => (
                                                <span key={p.pet_id} className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                                                    {p.pet_name}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-sm text-slate-300 line-clamp-2">
                                            {event.first_sentence || event.description?.slice(0, 100)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
}
