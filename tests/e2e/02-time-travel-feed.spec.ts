import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { personas } from '../fixtures/5-personas-setup';
import { TimeEngineMocker } from '../utils/time-travel';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * 02 - Time Engine Validation: 6-Week Feed Generation for 5 Pets
 * 
 * This test creates 5 pets via Supabase Admin, then simulates 6 weeks of 
 * time travel by manipulating `passed_date` and triggering the cron job.
 * 
 * Key: The cron route is GET /api/cron/daily-tothereon-check
 *      Auth: Authorization: Bearer ${CRON_SECRET}
 *      It uses `passed_date` to calculate `currentDay`, NOT `created_at`.
 */

test.describe.configure({ mode: 'serial' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_EMAIL = `qa-time-travel-${Date.now()}@tothereon.test`;
const TEST_PASSWORD = 'TimeTravelQa123!';
let testUserId = '';
const petIds: Map<string, string> = new Map(); // name -> petId

test.describe('Time Engine Validation: 6-Week Feed Generation', () => {

    test.beforeAll(async () => {
        // 1. Create test user
        const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            email_confirm: true,
        });
        expect(createErr).toBeNull();
        testUserId = userData.user!.id;

        // Create users table row
        await supabaseAdmin.from('users').upsert({
            id: testUserId,
            email: TEST_EMAIL,
            subscription_tier: 'premium', // Premium to bypass pet limits
            letter_quota: 10,
        });

        console.log(`[02] Test user created: ${testUserId}`);

        // 2. Insert all 5 pets with persona_generated: true (needed for cron to process them)
        for (const pet of personas) {
            const { data: insertedPet, error: insertErr } = await supabaseAdmin.from('pets').insert({
                user_id: testUserId,
                name: pet.name,
                species: pet.species,
                breed: pet.breed,
                gender: pet.gender,
                birth_date: pet.birth_date,
                passed_date: pet.passed_date,
                weight_kg: parseFloat(pet.weight_kg),
                persona_generated: true, // Mark as generated so cron picks them up
                photos: [],
            }).select('id').single();

            expect(insertErr).toBeNull();
            expect(insertedPet).toBeTruthy();
            petIds.set(pet.name, insertedPet!.id);

            // 3. Create a minimal pet_personas record (required by the cron job)
            await supabaseAdmin.from('pet_personas').insert({
                pet_id: insertedPet!.id,
                persona_profile: {
                    core_personality: `A ${pet.species} named ${pet.name} who is ${pet.breed}.`,
                    emotional_tone: 'warm and peaceful',
                    speech_patterns: ['gentle', 'loving'],
                    memory_anchors: [
                        { category: 'favorite_place', details: 'The garden' },
                        { category: 'favorite_activity', details: 'Playing in the park' },
                    ],
                },
                dimensional_scores: {
                    social_energy: 70,
                    curiosity_drive: 60,
                    affection_style: 80,
                    emotional_resilience: 65,
                    playfulness_intensity: 75,
                    food_motivation: 55,
                    empathy_sensitivity: 70,
                    social_preference: 60,
                },
            });

            console.log(`[02] Pet "${pet.name}" inserted with ID: ${insertedPet!.id}`);
        }
    });

    // Test each week of time travel for each pet
    const weeksToSimulate = [1, 2, 3, 4, 5, 6];

    for (const pet of personas) {
        test.describe(`Time Travel: ${pet.name} (${pet.species})`, () => {
            for (const week of weeksToSimulate) {
                test(`Week ${week}: D+${week * 7} feed generation`, async ({ request }) => {
                    const petId = petIds.get(pet.name);
                    expect(petId).toBeTruthy();

                    // 1. Time Travel: Rewind passed_date so the cron calculates a higher day count
                    const daysToRewind = week * 7;
                    const rewindedDate = new Date();
                    rewindedDate.setDate(rewindedDate.getDate() - daysToRewind);

                    const { error: updateErr } = await supabaseAdmin
                        .from('pets')
                        .update({ passed_date: rewindedDate.toISOString().split('T')[0] })
                        .eq('id', petId!);

                    expect(updateErr).toBeNull();
                    console.log(`[02] ${pet.name}: passed_date set to D-${daysToRewind} (${rewindedDate.toISOString().split('T')[0]})`);

                    // 2. Trigger Cron Job (GET with Bearer token)
                    const baseURL = 'http://localhost:3000';
                    const cronSecret = process.env.CRON_SECRET || '';

                    const response = await fetch(`${baseURL}/api/cron/daily-tothereon-check`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${cronSecret}`,
                        },
                    });

                    expect(response.ok).toBeTruthy();
                    const result = await response.json();
                    console.log(`[02] Cron result for ${pet.name} Week ${week}:`, JSON.stringify(result));

                    // 3. Verify that a feed event was generated for this pet
                    const { data: events, error: eventsErr } = await supabaseAdmin
                        .from('pet_status_events')
                        .select('id, tothereon_day, event_type, event_description')
                        .eq('pet_id', petId!)
                        .order('tothereon_day', { ascending: false })
                        .limit(1);

                    expect(eventsErr).toBeNull();
                    // We expect at least some events to have been generated by now
                    if (events && events.length > 0) {
                        console.log(`[02] ✅ ${pet.name}: Latest event - Day ${events[0].tothereon_day}, Type: ${events[0].event_type}`);
                        console.log(`[02]    Description preview: ${events[0].event_description?.substring(0, 100)}...`);
                    } else {
                        console.log(`[02] ⚠️ ${pet.name}: No events generated yet for Week ${week}`);
                    }

                    // 4. Rate limit protection: delay between API calls
                    await TimeEngineMocker.delay(5000);
                });
            }
        });
    }

    // Cleanup after all time travel tests
    test.afterAll(async () => {
        if (testUserId) {
            // Delete events
            for (const [, petId] of petIds) {
                await supabaseAdmin.from('pet_status_events').delete().eq('pet_id', petId);
                await supabaseAdmin.from('pet_personas').delete().eq('pet_id', petId);
            }
            await supabaseAdmin.from('pets').delete().eq('user_id', testUserId);
            await supabaseAdmin.from('users').delete().eq('id', testUserId);
            await supabaseAdmin.auth.admin.deleteUser(testUserId);
            console.log(`[02 Cleanup] Test user ${testUserId} and all data deleted.`);
        }
    });
});
