/**
 * POST /api/feed-comments — Create a comment on a feed event
 *
 * Creates the comment + schedules a pet reply (2-6h random delay).
 * If reply limit exceeded, comment is saved but no reply scheduled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeComment } from '@/lib/comment-sanitizer';
import { COMMENT_LIMITS, FEED_FREQUENCY } from '@/lib/time-constants';
import type { PlanTier } from '@/lib/constants/plans';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { eventId, petId, content, language } = body as {
            eventId?: string;
            petId?: string;
            content?: string;
            language?: string;
        };

        if (!eventId || !petId || !content) {
            return NextResponse.json({ error: 'Missing eventId, petId, or content' }, { status: 400 });
        }

        // Sanitize comment
        const sanitized = sanitizeComment(content);
        if (!sanitized.ok) {
            return NextResponse.json(
                { error: `Comment rejected: ${sanitized.rejectionReason}` },
                { status: 422 },
            );
        }

        // Verify pet ownership
        const { data: pet } = await supabase
            .from('pets')
            .select('id, name')
            .eq('id', petId)
            .eq('user_id', user.id)
            .single();

        if (!pet) {
            return NextResponse.json({ error: 'Pet not found or not owned' }, { status: 404 });
        }

        // Verify event belongs to this pet
        const adminClient = createAdminClient();
        const { data: event } = await adminClient
            .from('pet_status_events')
            .select('id')
            .eq('id', eventId)
            .eq('pet_id', petId)
            .single();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Check reply limit for this feed cycle
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('tier')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .single();

        const tier: PlanTier = (sub?.tier as PlanTier) || 'free';
        const maxReplies = COMMENT_LIMITS.MAX_REPLIES_PER_CYCLE[tier] ?? COMMENT_LIMITS.MAX_REPLIES_PER_CYCLE.free;

        // Count replies in current feed cycle (last FEED_FREQUENCY days)
        const cycleDays = FEED_FREQUENCY[tier] || 3;
        const cycleStart = new Date(Date.now() - cycleDays * 24 * 60 * 60 * 1000).toISOString();

        const { count: replyCount } = await adminClient
            .from('comment_replies')
            .select('id', { count: 'exact', head: true })
            .eq('pet_id', petId)
            .gte('created_at', cycleStart)
            .in('status', ['pending', 'generating', 'delivered']);

        const currentReplies = replyCount ?? 0;
        const canGetReply = currentReplies < maxReplies;

        // Insert comment
        const { data: comment, error: insertError } = await adminClient
            .from('feed_comments')
            .insert({
                pet_id: petId,
                user_id: user.id,
                event_id: eventId,
                content: sanitized.sanitized,
                language: language || 'en',
            })
            .select('id, created_at')
            .single();

        if (insertError || !comment) {
            console.error('[FeedComments] Insert error:', insertError);
            return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
        }

        // Schedule reply only if within limit
        if (canGetReply) {
            const delayHours = COMMENT_LIMITS.REPLY_DELAY_MIN_HOURS
                + Math.random() * (COMMENT_LIMITS.REPLY_DELAY_MAX_HOURS - COMMENT_LIMITS.REPLY_DELAY_MIN_HOURS);
            const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

            await adminClient
                .from('comment_replies')
                .insert({
                    comment_id: comment.id,
                    pet_id: petId,
                    status: 'pending',
                    scheduled_at: scheduledAt.toISOString(),
                });
        }

        return NextResponse.json({
            success: true,
            commentId: comment.id,
            replyScheduled: canGetReply,
            replyStatus: canGetReply ? 'pending' : 'read_only',
            remainingReplies: Math.max(0, maxReplies - currentReplies - (canGetReply ? 1 : 0)),
        });
    } catch (error) {
        console.error('[FeedComments] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
