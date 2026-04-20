import { TIME_RATIO } from './time-constants';

export const WORLD_EPOCH = new Date('2025-01-01T00:00:00Z');

export function getGlobalToThereOnDay(): number {
    const earthMs = Date.now() - WORLD_EPOCH.getTime();
    const earthDays = earthMs / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.floor(earthDays / TIME_RATIO) + 1);
}

export function getGlobalEarthDaysSinceEpoch(): number {
    return (Date.now() - WORLD_EPOCH.getTime()) / (1000 * 60 * 60 * 24);
}
