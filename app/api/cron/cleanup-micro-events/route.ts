import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
    // 1. Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Count before deleting so we can report how many were removed
    const { count, error: countError } = await adminClient
        .from('pet_micro_events')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoff);

    if (countError) {
        console.error('[cleanup-micro-events] count error', countError);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }

    const { error: deleteError } = await adminClient
        .from('pet_micro_events')
        .delete()
        .lt('created_at', cutoff);

    if (deleteError) {
        console.error('[cleanup-micro-events] delete error', deleteError);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: count ?? 0 });
}
