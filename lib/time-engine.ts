
import { differenceInDays, differenceInHours, differenceInMinutes, addDays } from 'date-fns';
import { TIME_RATIO } from '@/lib/time-constants';

export const ZONE_NAMES: Record<string, string> = {
    'arrival_gate': 'The Arriving Gate',
    'meadow': 'Starry Meadow',
    'forest': 'Whispering Forest',
    'lake': 'Crystal Lake',
    'cloud_peaks': 'Cloud Peaks',
};

export const EVENT_TYPES: Record<string, string> = {
    'arrival': 'Arrival',
    'exploration': 'Exploration',
    'npc_interaction': 'New Friend',
    'daily_life': 'Daily Life',
    'guardian_thought': 'Thinking of You',
    'letter_received': 'Letter from Home',
};

/**
 * Calculates the current day in ToThereOn based on the pet's start date (passed_date or created_at).
 * Logic: 3 Earth Days = 1 ToThereOn Day (TIME_RATIO from time-constants.ts).
 *
 * @param startDate The date when the pet entered ToThereOn (passed_date) or was registered.
 * @param timeOffsetHours Optional offset in hours to simulate time passing (Admin Feature).
 * @returns Object containing the current ToThereOn day and other time-related info.
 */
export function calculateToThereOnTime(startDate: string | Date, timeOffsetHours: number = 0) {
    const start = new Date(startDate);
    const now = new Date(); // In real app, this is "User's Present"

    // Apply offset: A positive offset means "more time has passed", effectively pushing "start" further back
    // OR we can just add hours to "now"
    // Let's say we want to jump 1 day into the future. That means we behave as if "now" is "now + 1 day".
    // Earth time calculation
    const effectiveNow = new Date(now.getTime() + (timeOffsetHours * 60 * 60 * 1000));

    const diffMs = effectiveNow.getTime() - start.getTime();
    const earthDaysPassed = diffMs / (1000 * 60 * 60 * 24);

    // Core Logic: TIME_RATIO Earth Days = 1 ToThereOn Day
    const toThereOnDaysPassed = earthDaysPassed / TIME_RATIO;

    // The "Current Day" is 1-based (Day 1, Day 2...). 
    // If < 0 time passed (future date?), default to Day 1.
    const currentDay = Math.max(1, Math.floor(toThereOnDaysPassed) + 1);

    // Calculate progress within the current ToThereOn Day (0 to 1)
    const progress = Math.max(0, toThereOnDaysPassed - Math.floor(toThereOnDaysPassed));

    return {
        earthDaysPassed,
        toThereOnDaysPassed,
        currentDay,
        progress,
    };
}

// Wrapper for simple day access
export function calculateToThereOnDay(startDate: string | Date, timeOffsetHours: number = 0): number {
    return calculateToThereOnTime(startDate, timeOffsetHours).currentDay;
}

export function getToThereOnDayProgress(startDate: string | Date, timeOffsetHours: number = 0): number {
    const { progress } = calculateToThereOnTime(startDate, timeOffsetHours);
    return Math.round(progress * 100);
}

export function getTimeUntilNextDay(startDate: string | Date, timeOffsetHours: number = 0): string {
    const { toThereOnDaysPassed } = calculateToThereOnTime(startDate, timeOffsetHours);
    const nextDay = Math.floor(toThereOnDaysPassed) + 1;
    // nextDay in ToThereOn = nextDay * TIME_RATIO Earth Days from start
    const nextDayEarthTime = addDays(new Date(startDate), nextDay * TIME_RATIO);

    const now = new Date();
    const effectiveNow = new Date(now.getTime() + (timeOffsetHours * 60 * 60 * 1000));
    const minutesLeft = differenceInMinutes(nextDayEarthTime, effectiveNow);

    if (minutesLeft > 60 * 24) {
        return `${Math.ceil(minutesLeft / (60 * 24))} days`;
    }
    if (minutesLeft > 60) {
        return `${Math.ceil(minutesLeft / 60)} hours`;
    }
    return `${Math.max(0, minutesLeft)} minutes`;
}

export function getZoneForDay(day: number): string {
    // Simple zone progression
    if (day <= 1) return 'arrival_gate';
    if (day <= 3) return 'meadow';
    if (day <= 7) return 'forest';
    if (day <= 14) return 'lake';
    return 'cloud_peaks';
}

/**
 * Validates if the user can send a letter based on cooldown.
 * Policy: 7-day (168h) cooldown between sends for all tiers.
 */
export function checkLetterCooldown(lastSentAt: string | null): boolean {
    if (!lastSentAt) return true;
    const lastSent = new Date(lastSentAt);
    const now = new Date();
    const hoursSinceLast = differenceInHours(now, lastSent);
    return hoursSinceLast >= 168;
}
