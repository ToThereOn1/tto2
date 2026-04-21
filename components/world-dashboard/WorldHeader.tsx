'use client';

import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import type { TimeOfDay } from '@/lib/world-dashboard-constants';

interface WorldHeaderProps {
    petName: string;
    petPhotoUrl: string | null;
    toThereOnDay: number;
    currentZoneName: string;
    timeOfDay: TimeOfDay;
    mounted: boolean;
}

const TIME_ICONS: Record<TimeOfDay, React.ComponentType<{ size?: number; className?: string }>> = {
    morning: Sunrise,
    afternoon: Sun,
    evening: Sunset,
    night: Moon,
};

export function WorldHeader({
    petName,
    petPhotoUrl,
    toThereOnDay,
    currentZoneName,
    timeOfDay,
    mounted,
}: WorldHeaderProps) {
    const TimeIcon = TIME_ICONS[timeOfDay];

    return (
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-xl mx-auto px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0 ring-1 ring-slate-200 flex items-center justify-center text-sm">
                    {petPhotoUrl ? (
                        <img src={petPhotoUrl} alt={petName} className="w-full h-full object-cover" />
                    ) : (
                        '🐾'
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-slate-900 leading-none truncate">{petName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Day {toThereOnDay}</p>
                </div>

                {mounted && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
                        <TimeIcon size={12} />
                        <span className="max-w-[110px] truncate">{currentZoneName}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
