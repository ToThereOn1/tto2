'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Mail, Sparkles, Wind, PawPrint, Eye, Clock } from 'lucide-react';
import { getNpcDisplayName } from '@/lib/npc-constants';
import { getZoneDisplayName } from '@/lib/zone-manager';
import type { SupportedLanguage } from '@/lib/micro-event-types';

interface FeedEvent {
    id: string;
    content?: string;
    event_description?: string;
    type?: string;
    zone?: string;
    mood?: string;
    npc_involved?: string;
    created_at: string;
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
    currentTimeOfDay: string;
    petName: string;
    petPhotoUrl?: string | null;
    language?: string;
}

type UnifiedPost = {
    id: string;
    content: string;
    sourceType: 'llm' | 'micro';
    category?: string;
    createdAt: string;
    zone: string;
    mood: string | null;
    npcInvolved: string | null;
    language: string;
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    atmosphere: Wind,
    pet_action: PawPrint,
    npc_sighting: Eye,
    letter_echo: Mail,
    world_ambient: Sparkles,
    time_marker: Clock,
};

const AMBIENT_CATEGORIES = new Set(['atmosphere', 'world_ambient']);

function safeTimeAgo(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return formatDistanceToNow(d, { addSuffix: true });
    } catch {
        return '';
    }
}

const MOOD_COLORS: Record<string, string> = {
    peaceful: 'bg-sky-50 text-sky-600',
    playful: 'bg-amber-50 text-amber-600',
    curious: 'bg-emerald-50 text-emerald-600',
    nostalgic: 'bg-violet-50 text-violet-600',
    joyful: 'bg-rose-50 text-rose-600',
    reflective: 'bg-slate-100 text-slate-500',
};

interface FeedPostProps {
    post: UnifiedPost;
    petName: string;
    petPhotoUrl?: string | null;
    language: string;
}

function FeedPost({ post, petName, petPhotoUrl, language }: FeedPostProps) {
    const isAmbient = post.category ? AMBIENT_CATEGORIES.has(post.category) : false;
    const isLlm = post.sourceType === 'llm';
    const isLetterEcho = post.category === 'letter_echo';
    const Icon = post.category ? (CATEGORY_ICONS[post.category] ?? null) : null;
    const lang = (post.language || language || 'en') as SupportedLanguage;
    const npcDisplay = post.npcInvolved ? getNpcDisplayName(post.npcInvolved, lang) : null;
    const zoneDisplay = post.zone ? getZoneDisplayName(post.zone) : null;
    const timeAgo = safeTimeAgo(post.createdAt);
    const moodColor = post.mood ? (MOOD_COLORS[post.mood] ?? 'bg-slate-100 text-slate-500') : null;

    return (
        <div
            className={`flex gap-3 px-4 py-4 border-b border-slate-100 transition-colors ${
                isLetterEcho
                    ? 'bg-cyan-50/40'
                    : 'hover:bg-slate-50/60'
            }`}
        >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center text-base ring-1 ring-slate-200">
                {petPhotoUrl ? (
                    <img src={petPhotoUrl} alt={petName} className="w-full h-full object-cover" />
                ) : (
                    '🐾'
                )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="font-semibold text-[14px] text-slate-900 leading-none">{petName}</span>
                    {timeAgo && (
                        <>
                            <span className="text-slate-300 text-xs select-none">·</span>
                            <span className="text-[12px] text-slate-400">{timeAgo}</span>
                        </>
                    )}
                    {post.mood && isLlm && moodColor && (
                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${moodColor}`}>
                            {post.mood}
                        </span>
                    )}
                </div>

                {/* Content */}
                <p
                    className={`text-[14px] leading-[1.65] break-words ${
                        isAmbient
                            ? 'text-slate-400 italic'
                            : isLlm
                            ? 'text-slate-800'
                            : 'text-slate-600'
                    }`}
                >
                    {post.content}
                </p>

                {/* Footer metadata */}
                {(npcDisplay || zoneDisplay) && (
                    <p className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        {npcDisplay && <span>with {npcDisplay}</span>}
                        {npcDisplay && zoneDisplay && <span className="select-none">·</span>}
                        {zoneDisplay && <span>{zoneDisplay}</span>}
                    </p>
                )}
            </div>

            {/* Category icon (micro-events only) */}
            {!isLlm && Icon && (
                <Icon size={12} className="text-slate-300 shrink-0 mt-1.5" />
            )}
        </div>
    );
}

export function WorldActivityStream({
    events,
    microEvents,
    currentTimeOfDay: _unused,
    petName,
    petPhotoUrl,
    language = 'en',
}: WorldActivityStreamProps) {
    const posts = useMemo<UnifiedPost[]>(() => {
        const fromEvents: UnifiedPost[] = events.map((e) => ({
            id: e.id,
            content: e.event_description || e.content || '',
            sourceType: 'llm',
            createdAt: e.created_at || '',
            zone: e.zone || '',
            mood: e.mood || null,
            npcInvolved: e.npc_involved || null,
            language,
        }));

        const fromMicro: UnifiedPost[] = microEvents.map((m) => ({
            id: m.id,
            content: m.content,
            sourceType: 'micro',
            category: m.category,
            createdAt: m.created_at,
            zone: m.zone,
            mood: null,
            npcInvolved: m.npc_involved,
            language: m.language || language,
        }));

        return [...fromEvents, ...fromMicro]
            .filter((p) => {
                if (!p.createdAt) return false;
                const d = new Date(p.createdAt);
                return !isNaN(d.getTime());
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 40);
    }, [events, microEvents, language]);

    if (posts.length === 0) {
        return (
            <div className="px-4 py-16 text-center">
                <p className="text-sm text-slate-400 italic">The world is quiet right now.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100">
            {posts.map((post) => (
                <FeedPost
                    key={post.id}
                    post={post}
                    petName={petName}
                    petPhotoUrl={petPhotoUrl}
                    language={language}
                />
            ))}
        </div>
    );
}
