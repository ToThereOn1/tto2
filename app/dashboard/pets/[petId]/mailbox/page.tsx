
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { PLAN_LETTER_LIMITS } from '@/lib/constants/plans';

import MailboxSidebar from '@/components/mailbox/MailboxSidebar';
import MailboxList from '@/components/mailbox/MailboxList';
import LetterReadModal from '@/components/timeline/LetterReadModal';
import StreakBadge from '@/components/mailbox/StreakBadge';
import { calculateStreak } from '@/lib/streak-calculator';

export default function MailboxPage() {
    const params = useParams();
    const router = useRouter();
    const petId = params?.petId as string;

    const [loading, setLoading] = useState(true);
    const [petInfo, setPetInfo] = useState<{
        name: string;
        photo_url?: string;
        time_offset_hours?: number;
        writing_mastery_day?: number;
    } | null>(null);
    const [inbox, setInbox] = useState<any[]>([]);
    const [sent, setSent] = useState<any[]>([]);
    const [canWriteLetter, setCanWriteLetter] = useState(false);
    const [userTier, setUserTier] = useState<string>('free');
    const [onCooldown, setOnCooldown] = useState(false);
    const [cooldownUntil, setCooldownUntil] = useState<string | undefined>();

    // Timeline State (Active Letter Tracking)
    const [activeLetter, setActiveLetter] = useState<any | null>(null);

    // Reader Modal State
    const [modalLetter, setModalLetter] = useState<{
        content: string;
        date: string;
        type: 'received' | 'sent';
        currentTothereonDay?: number;
    } | null>(null);

    useEffect(() => {
        if (!petId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Timeline Data from API
                const res = await fetch(`/api/timeline/${petId}`);
                if (!res.ok) throw new Error('Failed to fetch data');
                const json = await res.json();

                // Set Pet Info
                if (json.pet) {
                    setPetInfo({
                        name: json.pet.name,
                        photo_url: (json.pet.photos && json.pet.photos.length > 0) ? json.pet.photos[0] : undefined,
                        time_offset_hours: json.pet.time_offset_hours,
                        writing_mastery_day: json.pet.writing_mastery_day ?? 5,
                    });
                }

                // Split Events into Inbox (Pet Replies) and Sent (User Letters)
                const events = json.events || [];
                const received = events.filter((e: any) => e.subtype === 'received' || e.type === 'letter' && e.sender_type === 'pet');
                const sentLetters = events.filter((e: any) => e.subtype === 'sent' || e.type === 'letter' && e.sender_type === 'user');

                setInbox(received);
                setSent(sentLetters);

                // Determine Last Sent Letter for Tracker (Initial Load)
                if (sentLetters.length > 0) {
                    setActiveLetter(sentLetters[0]);
                } else {
                    setActiveLetter(null);
                }

                // Calculate cooldown from last sent letter (7-day window)
                const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
                if (sentLetters.length > 0) {
                    const lastSentAt = new Date(sentLetters[0].createdAt).getTime();
                    const expiry = lastSentAt + COOLDOWN_MS;
                    if (expiry > Date.now()) {
                        setOnCooldown(true);
                        setCooldownUntil(new Date(expiry).toISOString());
                    }
                }

                // Check subscription tier for letter writing permission
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Check subscriptions table first (maybeSingle avoids error on 0 rows)
                    const { data: sub } = await supabase
                        .from('subscriptions')
                        .select('tier')
                        .eq('user_id', user.id)
                        .in('status', ['active', 'trialing'])
                        .maybeSingle();

                    let tier = sub?.tier || null;
                    if (!tier) {
                        // Fallback: check users.subscription_tier
                        const { data: userData } = await supabase
                            .from('users')
                            .select('subscription_tier')
                            .eq('id', user.id)
                            .maybeSingle();
                        tier = userData?.subscription_tier || 'free';
                    }
                    tier = (tier as string).toLowerCase();
                    const letterLimit = PLAN_LETTER_LIMITS[tier as keyof typeof PLAN_LETTER_LIMITS] ?? 0;
                    const canWrite = letterLimit > 0;
                    setCanWriteLetter(canWrite);
                    setUserTier(tier);
                    console.log('[MailboxPage] Subscription check:', { tier, letterLimit, canWrite, userId: user.id });
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [petId]);

    const handleReadLetter = (content: string, date: string, type: 'received' | 'sent') => {
        // received 편지면 current_tothereon_day 조회
        let currentTothereonDay: number | undefined;
        if (type === 'received') {
            const matched = inbox.find((l: any) => l.createdAt === date || l.content === content);
            currentTothereonDay = matched?.current_tothereon_day ?? undefined;
        }
        setModalLetter({ content, date, type, currentTothereonDay });
        // Also update timeline if it's a sent letter
        if (type === 'sent') {
            const letter = sent.find(l => l.createdAt === date);
            if (letter) setActiveLetter(letter);
        }
    };

    const handleSelectLetter = (letter: any) => {
        setActiveLetter(letter);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fffcf5]">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
        );
    }

    if (!petInfo) return null;

    // Check if active letter has a reply
    const hasReply = activeLetter ? inbox.some((reply: any) => {
        // Simple heuristic: Reply created AFTER letter (and maybe logic to link them later)
        return new Date(reply.createdAt) > new Date(activeLetter.createdAt);
    }) : false;

    return (
        <div className="min-h-screen bg-[#fffcf5] p-4 md:p-8">
            {/* Header / Nav */}
            <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Dashboard</span>
                </Link>
                <div className="text-center">
                    <h1 className="text-xl font-serif font-bold text-gray-800 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-amber-500" />
                        {petInfo.name}'s Mailbox
                    </h1>
                    {sent.length > 0 && (
                        <div className="mt-1">
                            <StreakBadge
                                streak={calculateStreak(
                                    sent.map((l: any) => ({ created_at: l.createdAt as string }))
                                )}
                            />
                        </div>
                    )}
                </div>
                <div className="w-20" /> {/* Spacer for balance */}
            </div>

            {/* Free → Basic upgrade nudge: shown after first reply received */}
            {userTier === 'free' && inbox.length > 0 && (
                <div className="max-w-6xl mx-auto mb-4 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                    <p className="text-sm text-amber-800 font-medium">
                        They wrote back. <span className="font-normal text-amber-700">Basic lets you write 4 times a month and hear from them twice a week.</span>
                    </p>
                    <Link
                        href="/pricing"
                        className="shrink-0 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 transition-colors px-3 py-1.5 rounded-full"
                    >
                        Stay closer →
                    </Link>
                </div>
            )}

            {/* Split Layout */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">

                {/* Left Panel: Sidebar (Fixed 30% ~ 4 cols) */}
                <div className="md:col-span-4 h-full">
                    <MailboxSidebar
                        petName={petInfo.name}
                        petPhotoUrl={petInfo.photo_url}
                        activeLetter={activeLetter}
                        timeOffsetHours={petInfo.time_offset_hours}
                        hasReply={hasReply}
                    />
                </div>

                {/* Right Panel: List (Fluid 70% ~ 8 cols) */}
                <div className="md:col-span-8 h-full">
                    <MailboxList
                        inbox={inbox}
                        sent={sent}
                        petName={petInfo.name}
                        petId={petId}
                        onReadLetter={handleReadLetter}
                        onSelectLetter={handleSelectLetter}
                        canWriteLetter={canWriteLetter}
                        onCooldown={onCooldown}
                        cooldownUntil={cooldownUntil}
                    />
                </div>
            </div>

            {/* Read Letter Modal */}
            <LetterReadModal
                isOpen={!!modalLetter}
                onClose={() => setModalLetter(null)}
                content={modalLetter?.content || ''}
                petName={petInfo.name}
                petPhotoUrl={petInfo.photo_url}
                sentDate={modalLetter?.date || ''}
                type={modalLetter?.type || 'received'}
                currentTothereonDay={modalLetter?.currentTothereonDay}
                writingMasteryDay={petInfo.writing_mastery_day}
            />
        </div>
    );
}
