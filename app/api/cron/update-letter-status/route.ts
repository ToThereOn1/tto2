
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLetterReply } from '@/lib/reply-generator';
import { LETTER_PIPELINE, LETTER_STATUSES } from '@/lib/time-constants';

// Vercel Cron Authentication
function isAuthenticated(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * Letter Status Pipeline — Option A (세계관 몰입형)
 *
 * 0h:   sent
 * 0-72h: crossing_the_waterway (우주 수로를 횡단 중)
 * 72h:  arrived_at_tothereon (ToThereOn 도착)
 * 96h:  reading_your_heart (마음 읽는 중)
 * 120h: writing_reply → AI 생성 트리거 → pending_review
 * 168h: visible to user (7일 고정)
 */
export async function GET(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    try {
        // 1. Fetch active user-sent letters (not yet completed cycle)
        const { data: letters, error } = await supabase
            .from('letters')
            .select('id, created_at, status, pet_id')
            .eq('sender_type', 'user')
            .in('status', [
                LETTER_STATUSES.SENT,
                LETTER_STATUSES.CROSSING,
                LETTER_STATUSES.ARRIVED,
                LETTER_STATUSES.READING,
                LETTER_STATUSES.WRITING,
            ]);

        if (error) throw error;
        if (!letters || letters.length === 0) {
            return NextResponse.json({ message: 'No active letters to update' });
        }

        const updates = [];
        const triggered = [];
        const errors = [];

        for (const letter of letters) {
            const now = new Date().getTime();
            const sentTime = new Date(letter.created_at).getTime();
            const hoursPassed = (now - sentTime) / (1000 * 60 * 60);

            let newStatus = letter.status;

            // State Transition Logic — Option A 세계관 몰입형
            if (hoursPassed >= LETTER_PIPELINE.WRITING_REPLY) {
                // 120h+ → AI 생성 트리거
                newStatus = LETTER_STATUSES.PENDING_REVIEW;
            } else if (hoursPassed >= LETTER_PIPELINE.READING_YOUR_HEART) {
                // 96h+ → 마음 읽는 중
                newStatus = LETTER_STATUSES.READING;
            } else if (hoursPassed >= LETTER_PIPELINE.ARRIVED_AT_TOTHEREON) {
                // 72h+ → ToThereOn 도착
                newStatus = LETTER_STATUSES.ARRIVED;
            } else if (hoursPassed >= 1) {
                // 1h+ → 우주 수로 횡단 중 (sent에서 1시간 후 전환)
                newStatus = LETTER_STATUSES.CROSSING;
            }

            // Only update if status changed
            if (newStatus !== letter.status) {
                const { error: updateError } = await supabase
                    .from('letters')
                    .update({ status: newStatus })
                    .eq('id', letter.id);

                if (updateError) {
                    errors.push({ id: letter.id, error: updateError.message });
                    continue;
                }

                updates.push({ id: letter.id, from: letter.status, to: newStatus });

                // CRITICAL TRIGGER: If reached pending_review (120h), generate reply
                if (newStatus === LETTER_STATUSES.PENDING_REVIEW) {
                    try {
                        await generateLetterReply(letter.id, letter.pet_id);
                        triggered.push(letter.id);
                    } catch (genError: any) {
                        console.error(`Failed to generate reply for letter ${letter.id}:`, genError);
                        errors.push({ id: letter.id, error: `Reply Gen Failed: ${genError.message}` });
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: letters.length,
            updated_count: updates.length,
            triggered_replies: triggered.length,
            updates,
            errors
        });

    } catch (err: any) {
        console.error('Cron Job Failed:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
