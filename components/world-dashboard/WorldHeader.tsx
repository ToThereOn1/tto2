'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { LIVING_PAINTING_ENTER, AMBIENT_BREATHE, REDUCED_MOTION_FALLBACK } from '@/lib/motion-presets';
import { TIME_OF_DAY_PALETTES, SEASON_CONFIG, TIME_LABELS, type TimeOfDay, type Season } from '@/lib/world-dashboard-constants';
import { getZoneEmoji } from '@/lib/zone-manager';

interface WorldHeaderProps {
    petName: string;
    petPhotoUrl: string | null;
    toThereOnDay: number;
    currentZone: string;
    currentZoneName: string;
    timeOfDay: TimeOfDay;
    season: Season;
    mounted: boolean;
}

const TIME_ICONS: Record<TimeOfDay, React.ComponentType<{ size?: number; className?: string }>> = {
    morning: Sunrise,
    afternoon: Sun,
    evening: Sunset,
    night: Moon,
};

const STAR_POSITIONS = [
    { top: '12%', left: '8%', delay: '0s' },
    { top: '25%', left: '20%', delay: '0.4s' },
    { top: '10%', left: '55%', delay: '0.8s' },
    { top: '30%', left: '72%', delay: '0.2s' },
    { top: '18%', left: '85%', delay: '1.1s' },
    { top: '40%', left: '40%', delay: '0.6s' },
    { top: '8%', left: '35%', delay: '1.4s' },
    { top: '35%', left: '90%', delay: '0.3s' },
    { top: '22%', left: '62%', delay: '0.9s' },
];

export function WorldHeader({
    petName,
    toThereOnDay,
    currentZone,
    currentZoneName,
    timeOfDay,
    season,
    mounted,
}: WorldHeaderProps) {
    const shouldReduceMotion = useReducedMotion();
    const palette = TIME_OF_DAY_PALETTES[timeOfDay];
    const TimeIcon = TIME_ICONS[timeOfDay];
    const zoneEmoji = getZoneEmoji(currentZone);
    const seasonConfig = SEASON_CONFIG[season];
    const timeLabel = TIME_LABELS[timeOfDay].en;

    if (!mounted) {
        return (
            <section className="relative h-40 md:h-48 overflow-hidden bg-slate-50 rounded-2xl">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <div className="h-5 w-32 bg-slate-200 rounded-full animate-pulse" />
                    <div className="h-4 w-20 bg-slate-200 rounded-full animate-pulse mt-1" />
                </div>
            </section>
        );
    }

    const motionProps = shouldReduceMotion ? REDUCED_MOTION_FALLBACK : { ...LIVING_PAINTING_ENTER, ...AMBIENT_BREATHE };

    return (
        <motion.section
            className={`relative h-40 md:h-48 overflow-hidden rounded-2xl ${palette.bg}`}
            {...(shouldReduceMotion ? REDUCED_MOTION_FALLBACK : LIVING_PAINTING_ENTER)}
        >
            {!shouldReduceMotion && (
                <motion.div
                    className="absolute inset-0"
                    animate={AMBIENT_BREATHE.animate}
                    transition={AMBIENT_BREATHE.transition}
                />
            )}

            {timeOfDay === 'night' && !shouldReduceMotion && STAR_POSITIONS.map((pos, i) => (
                <span
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-white animate-pulse"
                    style={{ top: pos.top, left: pos.left, animationDelay: pos.delay }}
                />
            ))}

            <div className="relative h-full flex flex-col justify-between p-4 md:p-5">
                <div className="flex items-start justify-between">
                    <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white drop-shadow">
                        Day {toThereOnDay}
                    </span>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${palette.textSecondary} bg-white/20 backdrop-blur-md rounded-full px-3 py-1`}>
                        <TimeIcon size={12} className={palette.icon} />
                        <span>{timeLabel} in {currentZoneName}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                    <p className={`text-xl font-bold ${palette.text} drop-shadow`}>
                        {zoneEmoji} {petName}
                    </p>
                </div>

                <div className="flex justify-center">
                    <span className={`text-[10px] uppercase tracking-widest opacity-60 ${palette.text}`}>
                        {seasonConfig.name}
                    </span>
                </div>
            </div>
        </motion.section>
    );
}
