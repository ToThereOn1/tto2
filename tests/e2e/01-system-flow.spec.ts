import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { personas } from '../fixtures/5-personas-setup';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * 01 - System Flow: Auth Bypass, Pet Registration, and Upgrade Prompt
 * 
 * Google OAuth cannot be automated in Playwright, so we use Supabase Admin SDK 
 * to create a test user and inject auth COOKIES (not localStorage!) into the 
 * browser context. Supabase SSR reads auth from cookies via middleware.
 */

test.describe.configure({ mode: 'serial' });

// Supabase Admin client (Service Role Key bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_EMAIL = `qa-tester-${Date.now()}@tothereon.test`;
const TEST_PASSWORD = 'MasterQaPassword123!';
let testUserId = '';

// Extract project ref from Supabase URL for cookie naming
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL!
    .replace('https://', '')
    .split('.')[0];

/**
 * Inject Supabase auth session as cookies into the browser context.
 * This mimics what @supabase/ssr does internally.
 * 
 * The cookie format: sb-<projectRef>-auth-token = base64(JSON session)
 * For large tokens, it's chunked: sb-<ref>-auth-token.0, .1, etc.
 */
async function injectAuthCookies(context: BrowserContext) {
    const { data: signInData, error } = await supabaseAdmin.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    if (error || !signInData.session) {
        throw new Error(`Failed to sign in: ${error?.message}`);
    }

    const session = signInData.session;

    // Build the session object that @supabase/ssr expects in cookies
    const sessionPayload = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: 'bearer',
        type: 'access',
        user: session.user,
    });

    // Encode as base64 (Supabase SSR stores it this way)
    const encoded = Buffer.from(sessionPayload).toString('base64');

    // Cookie name pattern used by @supabase/ssr
    const cookieName = `sb-${PROJECT_REF}-auth-token`;

    // Split into chunks of ~3500 chars (cookie size limit)
    const CHUNK_SIZE = 3500;
    const chunks: string[] = [];
    for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
        chunks.push(encoded.substring(i, i + CHUNK_SIZE));
    }

    const cookies = [];
    if (chunks.length === 1) {
        cookies.push({
            name: cookieName,
            value: `base64-${encoded}`,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax' as const,
        });
    } else {
        for (let i = 0; i < chunks.length; i++) {
            cookies.push({
                name: `${cookieName}.${i}`,
                value: `base64-${chunks[i]}`,
                domain: 'localhost',
                path: '/',
                httpOnly: false,
                secure: false,
                sameSite: 'Lax' as const,
            });
        }
    }

    await context.addCookies(cookies);
    console.log(`[Auth] Injected ${cookies.length} auth cookie(s) for ${TEST_EMAIL}`);
}

test.describe('Ecosystem Flow: Auth, Pet Registration, and Upgrade Prompt', () => {
    const targetPet = personas[0]; // Oliver

    test('Setup: Create test user via Supabase Admin and verify dashboard access', async ({ page, context }) => {
        // 1. Create user via Admin API (bypasses Google OAuth)
        const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            email_confirm: true,
        });

        expect(createErr).toBeNull();
        expect(userData.user).toBeTruthy();
        testUserId = userData.user!.id;

        // 2. Create a row in the 'users' table
        await supabaseAdmin.from('users').upsert({
            id: testUserId,
            email: TEST_EMAIL,
            subscription_tier: 'free',
            letter_quota: 0,
        });

        console.log(`[01] Test user created: ${testUserId}`);

        // 3. Inject auth cookies into browser context
        await injectAuthCookies(context);

        // 4. Navigate to dashboard — middleware should see the cookies and let us through
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Verify we're on the dashboard (not redirected to login)
        const url = page.url();
        console.log(`[01] Current URL after navigation: ${url}`);
        await expect(page).toHaveURL(/\/dashboard/);
        console.log(`[01] ✅ Dashboard access confirmed! Auth injection works.`);
    });

    test('User can navigate to Pet Registration page', async ({ page, context }) => {
        await injectAuthCookies(context);
        await page.goto('/dashboard/register');
        await page.waitForLoadState('networkidle');

        // Should see the PetRegistrationForm (not "Pet Limit Reached")
        await expect(page).toHaveURL(/\/dashboard\/register/);
        console.log('[01] ✅ Pet Registration page loaded successfully.');
    });

    test('User hits Pet Limit → Upgrade prompt appears', async ({ page, context }) => {
        // 1. Insert a pet via Supabase Admin to fill the free tier limit
        const { error: insertErr } = await supabaseAdmin.from('pets').insert({
            user_id: testUserId,
            name: targetPet.name,
            species: targetPet.species,
            breed: targetPet.breed,
            gender: targetPet.gender,
            birth_date: targetPet.birth_date,
            passed_date: targetPet.passed_date,
            weight_kg: parseFloat(targetPet.weight_kg),
            persona_generated: false,
            photos: [],
        });

        expect(insertErr).toBeNull();
        console.log(`[01] Pet "${targetPet.name}" inserted for user ${testUserId}.`);

        // 2. Navigate to register page — should see "Pet Limit Reached"
        await injectAuthCookies(context);
        await page.goto('/dashboard/register');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('text=Pet Limit Reached')).toBeVisible({ timeout: 15000 });
        console.log('[01] ✅ "Pet Limit Reached" upgrade prompt verified!');

        // 3. Verify "Upgrade Plan" link exists
        const upgradeLink = page.locator('a:has-text("Upgrade Plan")');
        await expect(upgradeLink).toBeVisible();
        console.log('[01] ✅ "Upgrade Plan" link is visible. System flow test complete!');
    });

    // Cleanup
    test.afterAll(async () => {
        if (testUserId) {
            await supabaseAdmin.from('pets').delete().eq('user_id', testUserId);
            await supabaseAdmin.from('users').delete().eq('id', testUserId);
            await supabaseAdmin.auth.admin.deleteUser(testUserId);
            console.log(`[01 Cleanup] Test user ${testUserId} and data deleted.`);
        }
    });
});
