import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateToThereOnTime } from '@/lib/time-engine';
import { getCurrentZone, getZoneDisplayName } from '@/lib/zone-manager';
import {
    generateMicroEvents,
    getTimeOfDay,
    getPersonalityBucket,
} from '@/lib/micro-event-engine';
import type { MicroEventContext, SupportedLanguage } from '@/lib/micro-event-types';
import { ZONE_NPCS, NPC_DISPLAY_NAMES } from '@/lib/npc-constants';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CHUNK_SIZE = 30;
const EVENTS_PER_RUN = 2;
const DAILY_CAP = 8;

// ─── Type interfaces ──────────────────────────────────────────────────────────

interface PersonaRow {
    dimensional_scores: Record<string, number> | null;
    narrative_data: Record<string, string> | null;
}

interface PetRow {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    passed_date: string | null;
    created_at: string;
    time_offset_hours: number | null;
    user_id: string;
    pet_personas: PersonaRow[] | PersonaRow | null;
}

function pickZoneNpc(zone: string): { name: string; displayName: Record<'en' | 'ko' | 'ja', string>; activity: string } | null {
    const npcNames = ZONE_NPCS[zone];
    if (!npcNames || npcNames.length === 0) return null;
    const name = npcNames[Math.floor(Math.random() * npcNames.length)];
    const displayName = NPC_DISPLAY_NAMES[name];
    if (!displayName) return null;
    return { name, displayName, activity: 'nearby' };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const adminClient = createAdminClient();

    try {
        // Dedup guard: skip if events were generated in last 30 minutes
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { count: veryRecentCount } = await adminClient
            .from('pet_micro_events')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyMinAgo);

        if ((veryRecentCount ?? 0) > 10) {
            return NextResponse.json({
                success: true,
                skipped: true,
                reason: 'Duplicate cron invocation detected',
            });
        }

        // 1. Fetch all active pets with personas
        const { data: allPets, error: petsError } = await adminClient
            .from('pets')
            .select('id, name, species, breed, passed_date, created_at, time_offset_hours, user_id, pet_personas(dimensional_scores, narrative_data)')
            .eq('persona_generated', true);

        if (petsError || !allPets || allPets.length === 0) {
            return NextResponse.json({
                success: true,
                processed: 0,
                message: petsError?.message ?? 'No active pets found',
            });
        }

        const todayUTC = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        let totalInserted = 0;
        let totalSkipped = 0;
        const errors: string[] = [];

        // 2. Process in chunks
        for (let offset = 0; offset < allPets.length; offset += CHUNK_SIZE) {
            const chunk = allPets.slice(offset, offset + CHUNK_SIZE) as PetRow[];

            // Batch: daily count per pet
            const chunkPetIds = chunk.map((p: PetRow) => p.id);
            const dayStart = `${todayUTC}T00:00:00.000Z`;
            const dayEnd = `${todayUTC}T23:59:59.999Z`;

            const { data: todayCountRows } = await adminClient
                .from('pet_micro_events')
                .select('pet_id')
                .in('pet_id', chunkPetIds)
                .gte('created_at', dayStart)
                .lte('created_at', dayEnd);

            const dailyCountMap = new Map<string, number>();
            for (const row of (todayCountRows ?? []) as Array<{ pet_id: string }>) {
                dailyCountMap.set(row.pet_id, (dailyCountMap.get(row.pet_id) ?? 0) + 1);
            }

            // Batch: recent template ids (last 48h) per pet for anti-repetition
            const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
            const { data: recentTemplateRows } = await adminClient
                .from('pet_micro_events')
                .select('pet_id, template_id')
                .in('pet_id', chunkPetIds)
                .gte('created_at', cutoff48h);

            const recentTemplateMap = new Map<string, Set<string>>();
            for (const row of (recentTemplateRows ?? []) as Array<{ pet_id: string; template_id: string }>) {
                if (!recentTemplateMap.has(row.pet_id)) {
                    recentTemplateMap.set(row.pet_id, new Set());
                }
                recentTemplateMap.get(row.pet_id)!.add(row.template_id);
            }

            // Batch: recent letter per pet (last 72h) — avoids N+1 query
            const { data: recentLetterRows } = await adminClient
                .from('letters')
                .select('pet_id, created_at')
                .in('pet_id', chunkPetIds)
                .eq('sender_type', 'user')
                .gte('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false });

            const letterByPet = new Map<string, string>();
            for (const row of (recentLetterRows ?? []) as Array<{ pet_id: string; created_at: string }>) {
                if (!letterByPet.has(row.pet_id)) {
                    letterByPet.set(row.pet_id, row.created_at);
                }
            }

            for (const pet of chunk) {
                try {
                    // Skip Day 0 (arrival day)
                    if (!pet.passed_date) continue;
                    const startDate = pet.passed_date || pet.created_at;
                    const { currentDay } = calculateToThereOnTime(startDate, pet.time_offset_hours ?? 0);
                    if (currentDay <= 0) {
                        totalSkipped++;
                        continue;
                    }

                    // Skip milestone days (zone transition days) — LLM pipeline owns these
                    const MILESTONE_DAYS = new Set([1, 3, 10, 30, 100]);
                    if (MILESTONE_DAYS.has(currentDay)) {
                        totalSkipped++;
                        continue;
                    }

                    // Check daily cap
                    const todayCount = dailyCountMap.get(pet.id) ?? 0;
                    if (todayCount >= DAILY_CAP) {
                        totalSkipped++;
                        continue;
                    }

                    const remaining = Math.min(EVENTS_PER_RUN, DAILY_CAP - todayCount);
                    if (remaining <= 0) {
                        totalSkipped++;
                        continue;
                    }

                    // Persona extraction — Supabase join may return array or object
                    const persona: PersonaRow | null = Array.isArray(pet.pet_personas)
                        ? (pet.pet_personas[0] ?? null)
                        : (pet.pet_personas ?? null);
                    const rawScores: Record<string, number> = persona?.dimensional_scores ?? {};
                    const narrativeData: Record<string, string> = persona?.narrative_data ?? {};

                    const dimensionalScores = {
                        socialEnergy: rawScores.social_energy ?? 50,
                        curiosityDrive: rawScores.curiosity_drive ?? 50,
                        playfulnessIntensity: rawScores.playfulness_intensity ?? 50,
                        emotionalResilience: rawScores.emotional_resilience ?? 50,
                    };

                    const currentZone = getCurrentZone(currentDay);
                    const timeOfDay = getTimeOfDay();
                    const personalityBucket = getPersonalityBucket(dimensionalScores);

                    // Letter echo: use batched map — only set in 24-72h window
                    let letterEcho: MicroEventContext['letterEcho'] = null;
                    const lastLetterAt = letterByPet.get(pet.id);
                    if (lastLetterAt) {
                        const letterAgeMs = Date.now() - new Date(lastLetterAt).getTime();
                        const letterAgeHours = letterAgeMs / (1000 * 60 * 60);
                        if (letterAgeHours >= 24 && letterAgeHours <= 72) {
                            letterEcho = { emotion: 'warmth', intensity: 0.7 };
                        }
                    }

                    // NPC in zone
                    const npcRaw = pickZoneNpc(currentZone);
                    const activeNpc = npcRaw
                        ? { name: npcRaw.name, displayName: npcRaw.displayName, activity: npcRaw.activity }
                        : null;

                    const lang: SupportedLanguage = narrativeData.language === 'Korean' ? 'ko'
                        : narrativeData.language === 'Japanese' ? 'ja'
                        : 'en';

                    const ctx: MicroEventContext = {
                        petName: pet.name,
                        species: pet.species ?? 'dog',
                        breed: pet.breed ?? null,
                        currentDay,
                        currentZone,
                        zoneDisplayName: getZoneDisplayName(currentZone),
                        timeOfDay,
                        language: lang,
                        personalityBucket,
                        socialEnergy: dimensionalScores.socialEnergy,
                        curiosityDrive: dimensionalScores.curiosityDrive,
                        playfulnessIntensity: dimensionalScores.playfulnessIntensity,
                        emotionalResilience: dimensionalScores.emotionalResilience,
                        activeNpc,
                        letterEcho,
                        secretHabit: narrativeData.secret_habit ?? null,
                        preciousMemory: narrativeData.precious_memory ?? null,
                    };

                    const recentTemplateIds = recentTemplateMap.get(pet.id) ?? new Set<string>();
                    const events = generateMicroEvents(ctx, recentTemplateIds, remaining);

                    if (events.length === 0) {
                        totalSkipped++;
                        continue;
                    }

                    // Stagger created_at into PAST by random 0-90 min offset per event
                    const now = Date.now();
                    const rows = events.map((ev, idx) => {
                        const offsetMs = Math.floor(Math.random() * 90 * 60 * 1000);
                        const staggeredAt = new Date(now - offsetMs - idx * 60000).toISOString();
                        return {
                            pet_id: pet.id,
                            category: ev.category,
                            template_id: ev.templateId,
                            content: ev.content,
                            zone: ev.zone,
                            mood: ev.mood,
                            npc_involved: ev.npcInvolved,
                            time_of_day: ev.timeOfDay,
                            tothereon_day: ev.tothereonDay,
                            language: ev.language,
                            metadata: {} as Record<string, unknown>,
                            created_at: staggeredAt,
                        };
                    });

                    const { error: insertError } = await adminClient
                        .from('pet_micro_events')
                        .insert(rows);

                    if (insertError) {
                        errors.push(`${pet.id}: ${insertError.message}`);
                    } else {
                        totalInserted += rows.length;
                    }

                } catch (petError) {
                    errors.push(`${pet.id}: ${String(petError)}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            inserted: totalInserted,
            skipped: totalSkipped,
            total_pets: allPets.length,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('[micro-events cron]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
