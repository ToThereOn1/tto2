'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Mail, Pen, BookOpen, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GENTLE_FADE_IN, REDUCED_MOTION_FALLBACK } from '@/lib/motion-presets';

interface LetterStatusWidgetProps {
    petId: string;
    petName: string;
    lastSentAt: string | null;
    hasUnreadReply: boolean;
    canWriteLetter: boolean;
    language?: string;
}

type LetterState = 'reply_ready' | 'in_transit' | 'idle';

function getLetterState(lastSentAt: string | null, hasUnreadReply: boolean): LetterState {
    if (hasUnreadReply) return 'reply_ready';
    if (lastSentAt) return 'in_transit';
    return 'idle';
}

function getKoreanSubjectMarker(name: string): string {
    const lastChar = name[name.length - 1];
    if (!lastChar) return '은';
    const code = lastChar.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return '은';
    return (code - 0xAC00) % 28 === 0 ? '는' : '은';
}

export function LetterStatusWidget({
    petId,
    petName,
    lastSentAt,
    hasUnreadReply,
    canWriteLetter,
    language = 'en',
}: LetterStatusWidgetProps) {
    const shouldReduceMotion = useReducedMotion();
    const state = getLetterState(lastSentAt, hasUnreadReply);
    const motionProps = shouldReduceMotion ? REDUCED_MOTION_FALLBACK : GENTLE_FADE_IN;

    if (state === 'reply_ready') {
        const message =
            language === 'ko' ? `${petName}에게서 편지가 왔다` :
            language === 'ja' ? `${petName}から手紙が届いた` :
            `A letter has arrived from ${petName}`;

        return (
            <motion.div
                className="rounded-2xl overflow-hidden border bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60 p-5 flex flex-col gap-3"
                {...motionProps}
            >
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500 shrink-0" />
                    <p className="text-sm font-semibold text-amber-900">{message}</p>
                </div>
                <Link
                    href="/mailbox"
                    className="self-start rounded-full bg-amber-600 text-white px-5 py-2 text-sm font-semibold hover:bg-amber-700 transition-colors"
                >
                    {language === 'ko' ? '편지함 열기' : language === 'ja' ? 'メールボックスを開く' : 'Open Mailbox'}
                </Link>
            </motion.div>
        );
    }

    if (state === 'in_transit') {
        const message =
            language === 'ko' ? '편지가 수로를 건너는 중' :
            language === 'ja' ? '手紙が水の道を渡っている' :
            'Your letter is crossing the Waterway';
        const subtext =
            language === 'ko' ? '도착할 때 도착할 것이다' :
            language === 'ja' ? '届く時に届く' :
            'It will arrive when it arrives';

        return (
            <motion.div
                className="rounded-2xl overflow-hidden border bg-slate-50 border-slate-100 p-5 flex flex-col gap-2"
                {...motionProps}
            >
                <div className="flex items-center gap-2">
                    <Mail size={16} className="text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-600">{message}</p>
                </div>
                <p className="text-xs text-slate-400 italic pl-6">{subtext}</p>
            </motion.div>
        );
    }

    // idle
    const idleMessage =
        language === 'ko' ? `${petName}${getKoreanSubjectMarker(petName)} 수로 곁에 있다` :
        language === 'ja' ? `${petName}は水の道のそばにいる` :
        `${petName} is by the Waterway`;

    return (
        <motion.div
            className="rounded-2xl overflow-hidden border bg-white/70 border-slate-100 p-5 flex flex-col gap-3"
            {...motionProps}
        >
            <div className="flex items-center gap-2">
                <Send size={16} className="text-slate-400 shrink-0" />
                <p className="text-sm text-slate-600">{idleMessage}</p>
            </div>
            {canWriteLetter ? (
                <Link
                    href={`/pets/${petId}/write`}
                    className="self-start rounded-full bg-blue-600 text-white px-5 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    {language === 'ko' ? '편지 보내기' : language === 'ja' ? '手紙を送る' : 'Send a Letter'}
                </Link>
            ) : (
                <Link href="/pricing" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    {language === 'ko' ? '편지를 보내려면 업그레이드하세요' :
                     language === 'ja' ? '手紙を送るにはアップグレードしてください' :
                     'Upgrade to send letters'}
                </Link>
            )}
        </motion.div>
    );
}
