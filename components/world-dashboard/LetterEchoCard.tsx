'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { GENTLE_FADE_IN, REDUCED_MOTION_FALLBACK } from '@/lib/motion-presets';

interface LetterEchoCardProps {
    echoContent: string;
    daysAgo: number;
    zone: string;
    language?: string;
}

const RIPPLE_LABELS: Record<string, string> = {
    en: 'A ripple from your letter',
    ko: '편지의 파문',
    ja: '手紙の波紋',
};

export function LetterEchoCard({ echoContent, daysAgo, zone: _zone, language = 'en' }: LetterEchoCardProps) {
    const prefersReducedMotion = useReducedMotion();

    if (daysAgo > 5) return null;

    const opacity = Math.max(0.4, 1 - daysAgo * 0.12);
    const lang = RIPPLE_LABELS[language] ? language : 'en';
    const rippleLabel = RIPPLE_LABELS[lang];
    const animationProps = prefersReducedMotion ? REDUCED_MOTION_FALLBACK : GENTLE_FADE_IN;

    return (
        <motion.div
            style={{ opacity }}
            initial={animationProps.initial}
            animate={animationProps.animate}
            transition={animationProps.transition}
            className="rounded-2xl p-4 bg-gradient-to-br from-cyan-50/80 to-blue-50/60 border border-cyan-100/50"
        >
            <div className="flex items-start gap-3">
                <Mail size={14} className="text-cyan-500 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">
                        {rippleLabel}
                    </span>
                    <p className="text-sm text-cyan-900 italic">{echoContent}</p>
                </div>
            </div>
        </motion.div>
    );
}
