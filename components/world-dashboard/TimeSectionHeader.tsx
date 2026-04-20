'use client';

import { Sun, Sunrise, Sunset, Moon } from 'lucide-react';
import { TIME_LABELS, type TimeOfDay } from '@/lib/world-dashboard-constants';

interface TimeSectionHeaderProps {
    timeOfDay: TimeOfDay;
    isCurrent: boolean;
    language?: string;
}

const ICONS = {
    morning: Sunrise,
    afternoon: Sun,
    evening: Sunset,
    night: Moon,
} as const;

export function TimeSectionHeader({ timeOfDay, isCurrent, language = 'en' }: TimeSectionHeaderProps) {
    const Icon = ICONS[timeOfDay];
    const lang = (language === 'ko' || language === 'ja') ? language : 'en';
    const label = TIME_LABELS[timeOfDay][lang];
    const isNight = timeOfDay === 'night';

    return (
        <div className="flex items-center gap-2 py-3">
            <Icon size={14} className={isNight ? 'text-indigo-400' : 'text-slate-400'} />
            <span className={`text-xs font-semibold ${isNight ? 'text-slate-400' : 'text-slate-500'}`}>
                {label}
            </span>
            {isCurrent && (
                <>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-600 font-bold">Now</span>
                </>
            )}
            <div className={`flex-1 h-px ${isNight ? 'bg-slate-700' : 'bg-slate-200'}`} />
        </div>
    );
}
