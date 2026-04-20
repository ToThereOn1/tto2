'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { CARD_ENTER, REDUCED_MOTION_FALLBACK } from '@/lib/motion-presets';
import { ZONE_GRADIENTS } from '@/lib/world-dashboard-constants';
import { getZoneEmoji, getZoneDisplayName } from '@/lib/zone-manager';

interface PetLocationHeroProps {
    zoneKey: string;
    zoneName: string;
    latestActivity: string | null;
    mood: string | null;
    worldSpark: string | null;
    seasonAtmosphere: string | null;
}

const FALLBACK_ZONE_GRADIENT = {
    bg: 'bg-gradient-to-br from-slate-100 via-slate-50 to-white',
    border: 'border-slate-200/60',
    icon: 'text-slate-400',
    label: 'World',
};

export function PetLocationHero({
    zoneKey,
    zoneName,
    latestActivity,
    mood,
    worldSpark,
    seasonAtmosphere,
}: PetLocationHeroProps) {
    const shouldReduceMotion = useReducedMotion();
    const zoneGradient = ZONE_GRADIENTS[zoneKey] ?? FALLBACK_ZONE_GRADIENT;
    const zoneEmoji = getZoneEmoji(zoneKey);
    const displayName = zoneName || getZoneDisplayName(zoneKey);

    return (
        <motion.div
            className={`rounded-3xl overflow-hidden relative border ${zoneGradient.bg} ${zoneGradient.border}`}
            {...(shouldReduceMotion ? REDUCED_MOTION_FALLBACK : CARD_ENTER)}
        >
            <div className="p-5 md:p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl leading-none">{zoneEmoji}</span>
                        <div className="flex items-center gap-1">
                            <MapPin size={14} className={`${zoneGradient.icon} shrink-0`} />
                            <span className="text-lg font-bold text-slate-800">{displayName}</span>
                        </div>
                    </div>

                    {mood && (
                        <span className="bg-white/50 text-xs rounded-full px-2 py-0.5 text-slate-600 font-medium capitalize">
                            {mood}
                        </span>
                    )}
                </div>

                {latestActivity && (
                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-2 italic">
                        {latestActivity}
                    </p>
                )}

                {(worldSpark || seasonAtmosphere) && (
                    <div className="flex flex-col gap-0.5 mt-1">
                        {worldSpark && (
                            <p className="text-xs opacity-60 italic text-slate-600">{worldSpark}</p>
                        )}
                        {seasonAtmosphere && (
                            <p className="text-xs opacity-50 text-slate-500">{seasonAtmosphere}</p>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
