
import { NextResponse } from 'next/server';

// DEPRECATED: This cron job is disabled in favor of /api/cron/daily-tothereon-check
// which handles the 7-day logic and uses the correct `pet_status_events` table.
// This file is kept as a placeholder to prevent 404s if Vercel Cron still tries to hit it,
// but it will perform no actions.

export async function GET() {
    return NextResponse.json({
        message: 'This cron job is deprecated. Please use /api/cron/daily-tothereon-check.',
        status: 'skipped'
    });
}
