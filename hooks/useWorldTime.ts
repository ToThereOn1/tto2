'use client';

import { useState, useEffect } from 'react';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getLocalTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

export function useWorldTime() {
    const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTimeOfDay(getLocalTimeOfDay());
        setMounted(true);

        const interval = setInterval(() => {
            setTimeOfDay(getLocalTimeOfDay());
        }, 10 * 60 * 1000); // re-check every 10 minutes

        return () => clearInterval(interval);
    }, []);

    return { timeOfDay, hour: new Date().getHours(), mounted };
}
