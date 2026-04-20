/**
 * Micro-Event Engine
 * Pure selection and interpolation logic — no LLM calls.
 */

import {
    MicroEventContext,
    MicroEventOutput,
    MicroEventTemplate,
    PersonalityBucket,
    TimeOfDay,
    koreanParticle,
} from './micro-event-types';
import { MICRO_EVENT_TEMPLATES } from './micro-event-templates';
import { getCurrentZone, getZoneDisplayName, getTimeOfDay as _getTimeOfDay } from './zone-manager';

// Re-export for cron consumer convenience
export { getCurrentZone, getZoneDisplayName };

export function getTimeOfDay(): TimeOfDay {
    return _getTimeOfDay() as TimeOfDay;
}

// ─── Personality bucket ───────────────────────────────────────────────────────

export function getPersonalityBucket(scores: {
    socialEnergy: number;
    curiosityDrive: number;
    playfulnessIntensity: number;
    emotionalResilience: number;
}): PersonalityBucket {
    const { socialEnergy, curiosityDrive, playfulnessIntensity, emotionalResilience } = scores;
    if (socialEnergy < 35 && emotionalResilience < 40) return 'shy';
    if (playfulnessIntensity > 70) return 'playful';
    if (curiosityDrive > 70) return 'curious';
    if (socialEnergy > 65) return 'bold';
    return 'balanced';
}

// ─── Template filtering ───────────────────────────────────────────────────────

export function filterTemplates(
    ctx: MicroEventContext,
    recentTemplateIds: Set<string>,
): MicroEventTemplate[] {
    return MICRO_EVENT_TEMPLATES.filter((t) => {
        // Anti-repetition
        if (recentTemplateIds.has(t.id)) return false;

        // Species
        if (!t.species.includes('any') && !t.species.includes(ctx.species as 'dog' | 'cat')) return false;

        // Personality bucket
        if (t.personalityBuckets !== 'all' && !t.personalityBuckets.includes(ctx.personalityBucket)) return false;

        // Time of day
        if (t.timeOfDay !== 'all' && !t.timeOfDay.includes(ctx.timeOfDay)) return false;

        // Zone
        if (t.zones !== 'all' && !t.zones.includes(ctx.currentZone)) return false;

        // NPC requirement
        if (t.requiresNpc && ctx.activeNpc === null) return false;

        // Letter echo requirement
        if (t.requiresLetterEcho && ctx.letterEcho === null) return false;

        return true;
    });
}

// ─── Template weighting ───────────────────────────────────────────────────────

export function weightTemplate(template: MicroEventTemplate, ctx: MicroEventContext): number {
    let weight = 1.0;
    const tags = template.tags;
    const bucket = ctx.personalityBucket;
    const resilience = ctx.emotionalResilience;

    if (bucket === 'shy' && (tags.includes('solitary') || tags.includes('quiet'))) weight *= 2.0;
    if (bucket === 'curious' && (tags.includes('discovery') || tags.includes('exploration'))) weight *= 1.8;
    if (bucket === 'playful' && (tags.includes('movement') || tags.includes('playful'))) weight *= 1.8;
    if (bucket === 'bold' && (tags.includes('social') || tags.includes('adventure'))) weight *= 1.5;
    if (resilience < 40 && tags.includes('quiet')) weight *= 2.0;

    return weight;
}

// ─── Weighted random selection without replacement ────────────────────────────

function weightedSample<T>(
    items: T[],
    weights: number[],
    count: number,
): T[] {
    let pool = items.map((item, i) => ({ item, weight: weights[i] }));
    const result: T[] = [];

    while (result.length < count && pool.length > 0) {
        const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
        if (totalWeight <= 0) break;

        let rand = Math.random() * totalWeight;
        let chosen = -1;
        for (let i = 0; i < pool.length; i++) {
            rand -= pool[i].weight;
            if (rand <= 0) {
                chosen = i;
                break;
            }
        }
        if (chosen === -1) chosen = pool.length - 1;

        result.push(pool[chosen].item);
        pool = pool.filter((_, idx) => idx !== chosen);
    }

    return result;
}

// ─── Select templates with category spacing ───────────────────────────────────

export function selectTemplates(
    ctx: MicroEventContext,
    recentTemplateIds: Set<string>,
    count: number,
): MicroEventTemplate[] {
    const candidates = filterTemplates(ctx, recentTemplateIds);
    if (candidates.length === 0) {
        console.warn('[micro-events] Template pool exhausted for pet', {
            zone: ctx.currentZone,
            timeOfDay: ctx.timeOfDay,
            species: ctx.species,
            personalityBucket: ctx.personalityBucket,
            recentCount: recentTemplateIds.size,
        });
        return [];
    }

    const weights = candidates.map((t) => weightTemplate(t, ctx));
    const sampled = weightedSample(candidates, weights, Math.min(count * 3, candidates.length));

    // Enforce category spacing: no two consecutive same category
    const spaced: MicroEventTemplate[] = [];
    for (const t of sampled) {
        if (spaced.length === 0 || spaced[spaced.length - 1].category !== t.category) {
            spaced.push(t);
        }
        if (spaced.length >= count) break;
    }

    // If spacing reduced below count, fill remainder ignoring spacing
    if (spaced.length < count) {
        for (const t of sampled) {
            if (!spaced.includes(t)) {
                spaced.push(t);
            }
            if (spaced.length >= count) break;
        }
    }

    return spaced.slice(0, count);
}

// ─── Template interpolation ───────────────────────────────────────────────────

export function interpolateTemplate(
    template: MicroEventTemplate,
    ctx: MicroEventContext,
): string | null {
    const raw = template.text[ctx.language];
    if (!raw) return null;

    // Guard: if template uses {secretHabit} and ctx.secretHabit is null, skip
    if (raw.includes('{secretHabit}') && !ctx.secretHabit) return null;
    // Guard: if template uses {preciousMemory} and ctx.preciousMemory is null, skip
    if (raw.includes('{preciousMemory}') && !ctx.preciousMemory) return null;

    let text = raw
        .replace(/\{petName\}/g, ctx.petName)
        .replace(/\{zoneName\}/g, ctx.zoneDisplayName)
        // {npcName} is kept for future templates that inline NPC names directly in text
        .replace(/\{npcName\}/g, ctx.activeNpc?.displayName[ctx.language] ?? '')
        .replace(/\{secretHabit\}/g, ctx.secretHabit ?? '')
        .replace(/\{preciousMemory\}/g, ctx.preciousMemory ?? '');

    // Korean particle resolution
    if (ctx.language === 'ko') {
        text = text
            .replace(/\{eun\}/g, koreanParticle(ctx.petName, 'eun'))
            .replace(/\{i\}/g, koreanParticle(ctx.activeNpc?.displayName.ko ?? ctx.petName, 'i'))
            .replace(/\{eul\}/g, koreanParticle(ctx.petName, 'eul'));
    }

    return text;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function generateMicroEvents(
    ctx: MicroEventContext,
    recentTemplateIds: Set<string>,
    count: number,
): MicroEventOutput[] {
    const templates = selectTemplates(ctx, recentTemplateIds, count);
    const outputs: MicroEventOutput[] = [];

    for (const template of templates) {
        const content = interpolateTemplate(template, ctx);
        if (!content) continue;

        outputs.push({
            templateId: template.id,
            category: template.category,
            content,
            mood: template.mood,
            npcInvolved: template.requiresNpc ? (ctx.activeNpc?.name ?? null) : null,
            zone: ctx.currentZone,
            timeOfDay: ctx.timeOfDay,
            tothereonDay: ctx.currentDay,
            language: ctx.language,
        });
    }

    return outputs;
}
