import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables for the test utility
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase credentials in .env.local for time-travel utility.');
}

// Create a Supabase admin client using the Service Role Key to bypass RLS policies
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

/**
 * Utility to manipulate the `created_at` timestamp of a pet in the database.
 * This effectively simulates "Time Travel" by pushing the pet's original creation date
 * further into the past, allowing the Cron job to generate feeds for D+7, D+14, etc.
 */
export class TimeEngineMocker {

    /**
     * Rewinds the pet's `created_at` timestamp by a specified number of days.
     * 
     * @param petId The ID of the pet to time travel.
     * @param daysToRewind The number of days to push the creation date back (e.g., 7 for one week).
     * @returns The updated `created_at` string.
     */
    static async rewindPetTime(petId: string, daysToRewind: number): Promise<string> {

        // 1. Fetch current pet to get its actual 'created_at' if we want to rewind relative to it,
        // or just set it exactly relative to NOW. We will set it relative to NOW for precise testing.
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysToRewind);
        const isoDateString = targetDate.toISOString();

        console.log(`[Time Travel] Rewinding pet ${petId} by ${daysToRewind} days to ${isoDateString}...`);

        // 2. Update the `created_at` using admin privileges
        const { error } = await supabaseAdmin
            .from('pets')
            .update({ created_at: isoDateString })
            .eq('id', petId);

        if (error) {
            console.error(`[Time Travel Error] Failed to update pet ${petId}:`, error.message);
            throw new Error(`Time Engine Mocker failed: ${error.message}`);
        }

        console.log(`[Time Travel] Successfully moved pet ${petId} to D-${daysToRewind}.`);
        return isoDateString;
    }

    /**
     * Triggers the Cron feed generator for a specific pet.
     * This calls the API route directly to force generation instead of waiting for the schedule.
     * 
     * @param baseURL The base URL of the local dev server (e.g., http://localhost:3000)
     * @param secret The cron secret to bypass auth
     */
    static async triggerFeedCron(baseURL: string, secret: string): Promise<boolean> {
        console.log(`[Time Travel] Forcing Cron Trigger for feeds...`);
        try {
            const response = await fetch(`${baseURL}/api/cron/daily-tothereon-check`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${secret}`
                }
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`[Time Travel Error] Cron trigger failed with status ${response.status}: ${text}`);
                return false;
            }

            console.log(`[Time Travel] Cron trigger executed successfully.`);
            return true;
        } catch (e) {
            console.error(`[Time Travel Error] Cron trigger fetch failed:`, e);
            return false;
        }
    }

    /**
     * Helper to delay execution to prevent rate limiting APIs.
     */
    static async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
