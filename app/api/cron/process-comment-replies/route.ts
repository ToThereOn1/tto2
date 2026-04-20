// Cron: Process pending comment replies
// Schedule: every 30 minutes
// Picks up to 10 pending replies (max 1 per pet per tick)
// and generates pet responses via comment-reply-generator.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateCommentReply } from '@/lib/comment-reply-generator';
import { sendReplyNotification } from '@/lib/comment-notifications';

export const maxDuration = 120; // 2 minutes max for Vercel

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const startTime = Date.now();

    try {
        // Fetch pending replies: DISTINCT ON pet_id (max 1 per pet per tick)
        // This prevents burst delivery and ensures natural spacing
        const { data: pendingReplies, error: queryError } = await adminClient
            .rpc('get_pending_comment_replies', { max_count: 10 });

        // Fallback if RPC doesn't exist yet — direct query
        let replies = pendingReplies;
        if (queryError || !replies) {
            const { data: fallbackReplies } = await adminClient
                .from('comment_replies')
                .select('id, comment_id, pet_id')
                .eq('status', 'pending')
                .lte('scheduled_at', new Date().toISOString())
                .order('scheduled_at', { ascending: true })
                .limit(10);

            // Manual DISTINCT ON pet_id — take first per pet
            const seenPets = new Set<string>();
            replies = (fallbackReplies || []).filter(r => {
                if (seenPets.has(r.pet_id)) return false;
                seenPets.add(r.pet_id);
                return true;
            });
        }

        if (!replies || replies.length === 0) {
            return NextResponse.json({
                success: true,
                processed: 0,
                message: 'No pending replies',
            });
        }

        let processed = 0;
        let failed = 0;

        for (const reply of replies) {
            // Check Vercel timeout safety margin (stop 30s before max)
            if (Date.now() - startTime > (maxDuration - 30) * 1000) {
                console.warn('[CommentCron] Approaching timeout, stopping early');
                break;
            }

            try {
                const result = await generateCommentReply(reply.comment_id);
                if (result.success) {
                    processed++;

                    // Send email notification via Resend (fetch-based, no npm package)
                    try {
                        const { data: petData } = await adminClient
                            .from('pets')
                            .select('name, user_id')
                            .eq('id', reply.pet_id)
                            .single();

                        if (petData) {
                            const { data: userData } = await adminClient.auth.admin.getUserById(petData.user_id);
                            if (userData?.user?.email) {
                                await sendReplyNotification({
                                    userEmail: userData.user.email,
                                    petName: petData.name,
                                    petId: reply.pet_id,
                                    replyPreview: result.replyContent || '',
                                });
                            }
                        }
                    } catch (notifyErr) {
                        console.warn('[CommentCron] Email notification failed (non-blocking):', notifyErr);
                    }
                } else {
                    failed++;
                    console.warn(`[CommentCron] Failed for comment ${reply.comment_id}:`, result.error);
                }
            } catch (error) {
                failed++;
                console.error(`[CommentCron] Error processing ${reply.comment_id}:`, error);

                // Mark as failed so it doesn't block the queue
                await adminClient
                    .from('comment_replies')
                    .update({
                        status: 'failed',
                        review_notes: { error: String(error), cron_failed: true },
                    })
                    .eq('id', reply.id);
            }
        }

        const durationMs = Date.now() - startTime;
        console.log(`[CommentCron] Done: ${processed} processed, ${failed} failed, ${durationMs}ms`);

        return NextResponse.json({
            success: true,
            processed,
            failed,
            total: replies.length,
            durationMs,
        });
    } catch (error) {
        console.error('[CommentCron] Fatal error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
