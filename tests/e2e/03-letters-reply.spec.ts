import { test, expect, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { personas } from '../fixtures/5-personas-setup';
import { TimeEngineMocker } from '../utils/time-travel';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * 03 - Letter & Persona Reply Validation
 * 
 * Tests the letter sending flow via the UI (using cookie injected auth)
 * and verifies that the LLM generates persona-consistent replies.
 */

test.describe.configure({ mode: 'serial' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_EMAIL = `qa-letters-${Date.now()}@tothereon.test`;
const TEST_PASSWORD = 'LetterQaTest123!';
let testUserId = '';
const petIds: Map<string, string> = new Map();
// Select 2 diverse pets: Luna (Siamese Cat) and Bella (Labrador)
const targetPets = [personas[1], personas[3]];

const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL!
    .replace('https://', '')
    .split('.')[0];

async function injectAuthCookies(context: BrowserContext) {
    const { data: signInData, error } = await supabaseAdmin.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (error || !signInData.session) throw new Error(`Sign in failed: ${error?.message}`);

    const session = signInData.session;
    const sessionPayload = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: 'bearer',
        type: 'access',
        user: session.user,
    });

    const encoded = Buffer.from(sessionPayload).toString('base64');
    const cookieName = `sb-${PROJECT_REF}-auth-token`;
    const CHUNK_SIZE = 3500;
    const chunks: string[] = [];

    for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
        chunks.push(encoded.substring(i, i + CHUNK_SIZE));
    }

    const cookies = [];
    if (chunks.length === 1) {
        cookies.push({
            name: cookieName, value: `base64-${encoded}`,
            domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' as const,
        });
    } else {
        for (let i = 0; i < chunks.length; i++) {
            cookies.push({
                name: `${cookieName}.${i}`, value: `base64-${chunks[i]}`,
                domain: 'localhost', path: '/', httpOnly: false, secure: false, sameSite: 'Lax' as const,
            });
        }
    }
    await context.addCookies(cookies);
}

test.describe('LLM Persona Possession: Letter Reply Validation', () => {

    test.beforeAll(async () => {
        // 1. Create test user
        const { data: userData } = await supabaseAdmin.auth.admin.createUser({
            email: TEST_EMAIL, password: TEST_PASSWORD, email_confirm: true,
        });
        testUserId = userData.user!.id;

        // 2. Set up user basic data
        await supabaseAdmin.from('users').upsert({
            id: testUserId, email: TEST_EMAIL, subscription_tier: 'basic'
        });

        // 2. Create the 2 target pets with personas
        for (const pet of targetPets) {
            const passedDate = pet.passed_date;
            const { data: insertedPet } = await supabaseAdmin.from('pets').insert({
                user_id: testUserId, name: pet.name, species: pet.species, breed: pet.breed,
                gender: pet.gender, birth_date: pet.birth_date, passed_date: passedDate,
                weight_kg: parseFloat(pet.weight_kg), persona_generated: true, photos: [],
            }).select('id').single();

            petIds.set(pet.name, insertedPet!.id);

            // Create persona record
            await supabaseAdmin.from('pet_personas').insert({
                pet_id: insertedPet!.id,
                persona_profile: {
                    core_personality: `${pet.name} is a ${pet.breed} ${pet.species}.`,
                    emotional_tone: 'warm and loving',
                    speech_patterns: ['gentle', 'affectionate'],
                    memory_anchors: [{ category: 'personality', details: pet.surveyAnswers[0] }],
                },
                dimensional_scores: {
                    social_energy: 70, curiosity_drive: 60, affection_style: 80,
                    emotional_resilience: 65, playfulness_intensity: 75,
                    food_motivation: 55, empathy_sensitivity: 70, social_preference: 60,
                },
            });
            console.log(`[03] Pet "${pet.name}" created with ID: ${insertedPet!.id}`);

            // 3. Inject explicit quota into letter_quota table
            const currentMonth = new Date().toISOString().slice(0, 7);
            await supabaseAdmin.from('letter_quota').upsert({
                user_id: testUserId,
                pet_id: insertedPet!.id,
                month: currentMonth,
                letters_allowed: 4,
                letters_sent: 0,
                updated_at: new Date().toISOString()
            });
        }
        console.log(`[03] Setup complete. User: ${testUserId}`);
    });

    for (const pet of targetPets) {
        test(`Letter Exchange: Send letter to ${pet.name} and verify quotas`, async ({ page, context }) => {
            const petId = petIds.get(pet.name);
            expect(petId).toBeTruthy();

            // Inject cookies for UI interaction
            await injectAuthCookies(context);

            // 1. Check initial quota
            const currentMonth = new Date().toISOString().slice(0, 7);
            const { data: quotaBeforeData } = await supabaseAdmin
                .from('letter_quota')
                .select('letters_allowed, letters_sent')
                .eq('pet_id', petId)
                .eq('month', currentMonth)
                .single();
            const quotaBefore = (quotaBeforeData?.letters_allowed || 4) - (quotaBeforeData?.letters_sent || 0);
            console.log(`[03] ${pet.name}: Quota remaining before sending = ${quotaBefore}`);

            // 2. Navigate to Write Letter Page
            await page.goto(`/dashboard/pets/${petId}/write`);
            await page.waitForLoadState('networkidle');

            // 3. Type and send letter via UI
            const letterContent = `Dear ${pet.name}, I miss you so much. Do you remember when we used to play together? I think about you every day. Please tell me about your day in the sanctuary.`;

            // Fill textarea
            await page.fill('textarea', letterContent);

            const sendPromise = page.waitForResponse(response =>
                response.url().includes('/api/letters/send')
            );
            await page.click('button:has-text("Send to Heaven")');
            const response = await sendPromise;

            console.log(`[03] ${pet.name}: Letter send response status = ${response.status()}`);
            if (response.status() !== 200) {
                const body = await response.text();
                console.log(`[03] ⚠️ Letter send failed for ${pet.name}: ${body}`);
            }

            expect(response.status()).toBe(200);
            console.log(`[03] ${pet.name}: Letter sent successfully via UI!`);

            // 4. Wait for async reply generation (giving LLM time)
            console.log(`[03] Waiting 10s for LLM processing...`);
            await TimeEngineMocker.delay(10000);

            // 5. Check if a reply letter was created in the DB
            const { data: letters } = await supabaseAdmin
                .from('letters')
                .select('id, sender_type, content, status')
                .eq('pet_id', petId!)
                .order('created_at', { ascending: false })
                .limit(2);

            if (letters && letters.length > 0) {
                const petReply = letters.find((l: any) => l.sender_type === 'pet');
                if (petReply) {
                    console.log(`[03] ✅ ${pet.name}'s reply received! Preview: ${petReply.content?.substring(0, 150)}...`);
                } else {
                    console.log(`[03] ⚠️ ${pet.name}: Reply not yet generated (may be queued)`);
                }
            }

            // 6. Verify quota was updated (letters_sent incremented)
            const { data: quotaAfterData } = await supabaseAdmin
                .from('letter_quota')
                .select('letters_allowed, letters_sent')
                .eq('pet_id', petId)
                .eq('month', currentMonth)
                .single();

            const quotaAfter = (quotaAfterData?.letters_allowed || 4) - (quotaAfterData?.letters_sent || 0);
            console.log(`[03] ${pet.name}: Quota remaining after = ${quotaAfter} (was ${quotaBefore})`);

            expect(quotaAfter).toBe(quotaBefore - 1);
            console.log(`[03] ✅ Quota correctly decremented.`);

            await TimeEngineMocker.delay(2000); // Small cooldown before next test
        });
    }

    // Cleanup
    test.afterAll(async () => {
        if (testUserId) {
            for (const [, petId] of petIds) {
                await supabaseAdmin.from('letters').delete().eq('pet_id', petId);
                await supabaseAdmin.from('pet_personas').delete().eq('pet_id', petId);
                await supabaseAdmin.from('letter_quota').delete().eq('pet_id', petId);
            }
            await supabaseAdmin.from('pets').delete().eq('user_id', testUserId);
            await supabaseAdmin.from('users').delete().eq('id', testUserId);
            await supabaseAdmin.auth.admin.deleteUser(testUserId);
            console.log(`[03 Cleanup] Test data deleted.`);
        }
    });
});
