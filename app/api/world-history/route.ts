import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { WorldStateService } from '@/lib/universe/world-state';

/**
 * GET /api/world-history
 *
 * Query Parameters:
 *   day     — BD 날짜 (숫자). 예: ?day=50
 *   zone    — 구역 필터 (옵션). 예: ?day=50&zone=crystal_meadow
 *   pet_id  — 특정 pet의 이벤트 기록. 예: ?pet_id=xxx&from=1&to=30
 *   from    — BD 날짜 범위 시작 (pet_id와 함께 사용)
 *   to      — BD 날짜 범위 끝   (pet_id와 함께 사용)
 *   limit   — 최대 반환 개수 (기본 100)
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Admin-only: require CRON_SECRET bearer token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);
    const dayParam = searchParams.get('day');
    const zoneId = searchParams.get('zone') || undefined;
    const petId = searchParams.get('pet_id') || undefined;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '100'), 500);

    const adminClient = createAdminClient();
    const worldState = new WorldStateService();

    try {
        // Case 1: 특정 Pet의 이벤트 기록 조회
        if (petId) {
            const fromDay = fromParam ? parseInt(fromParam) : 1;
            const toDay = toParam ? parseInt(toParam) : 9999;

            const { data, error } = await adminClient
                .from('world_event_log')
                .select('*')
                .contains('participants', JSON.stringify([{ pet_id: petId }]))
                .gte('bd_day', fromDay)
                .lte('bd_day', toDay)
                .order('bd_day', { ascending: true })
                .limit(limit);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({
                type: 'pet_history',
                pet_id: petId,
                from_bd: fromDay,
                to_bd: toDay,
                total: data?.length || 0,
                events: data || [],
            });
        }

        // Case 2: 특정 BD Day의 세계 이벤트 조회
        if (dayParam) {
            const bdDay = parseInt(dayParam);
            if (isNaN(bdDay) || bdDay < 1) {
                return NextResponse.json({ error: 'Invalid day parameter' }, { status: 400 });
            }

            const events = await worldState.getWorldHistory(bdDay, { zoneId, limit });

            return NextResponse.json({
                type: 'world_history',
                bd_day: bdDay,
                zone: zoneId || 'all',
                total: events.length,
                events,
            });
        }

        // Case 3: 현재 세계 상태 조회 (파라미터 없을 때)
        const { data: worldStateData } = await adminClient
            .from('world_state')
            .select('*')
            .limit(1)
            .maybeSingle();

        const { data: recentEvents } = await adminClient
            .from('world_event_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        return NextResponse.json({
            type: 'current_state',
            world_state: worldStateData,
            recent_events: recentEvents || [],
        });

    } catch (err: any) {
        console.error('[WorldHistory API] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
