/**
 * GET /api/feed-comments/[eventId] — Fetch comments + replies for a feed event
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ eventId: string }> },
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { eventId } = await params;

        const adminClient = createAdminClient();

        // Verify event belongs to user's pet
        const { data: event } = await adminClient
            .from('pet_status_events')
            .select('id, pet_id')
            .eq('id', eventId)
            .single();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Verify pet ownership
        const { data: pet } = await supabase
            .from('pets')
            .select('id')
            .eq('id', event.pet_id)
            .eq('user_id', user.id)
            .single();

        if (!pet) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        // Fetch comments with replies
        const { data: comments } = await adminClient
            .from('feed_comments')
            .select('id, content, language, created_at')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });

        if (!comments || comments.length === 0) {
            return NextResponse.json({ comments: [] });
        }

        const commentIds = comments.map(c => c.id);
        const { data: replies } = await adminClient
            .from('comment_replies')
            .select('id, comment_id, content, status, delivered_at, rag_stored')
            .in('comment_id', commentIds);

        const replyMap = new Map(
            (replies || []).map(r => [r.comment_id, r])
        );

        const result = comments.map(c => {
            const reply = replyMap.get(c.id);
            // QA 실패 답변은 숨김 — "생각 중" 상태로 표시
            const visibleReply = reply && reply.status === 'delivered'
                ? { content: reply.content, delivered_at: reply.delivered_at }
                : reply && (reply.status === 'pending' || reply.status === 'generating')
                    ? { content: null, status: 'thinking' as const }
                    : reply && reply.status === 'flagged'
                        ? { content: null, status: 'thinking' as const } // flagged = hidden, shown as "thinking"
                        : null;

            return {
                id: c.id,
                content: c.content,
                language: c.language,
                createdAt: c.created_at,
                reply: visibleReply,
            };
        });

        return NextResponse.json({ comments: result });
    } catch (error) {
        console.error('[FeedComments GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
