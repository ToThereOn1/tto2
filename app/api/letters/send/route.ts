import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { calculateToThereOnTime } from '@/lib/time-engine-v2'
import { generateLetterReply } from '@/lib/reply-generator'
import { smartUpdateVisualDNA } from '@/lib/visual-dna'
import { createLetterEchoEvent } from '@/lib/letter-echo'

export async function POST(request: Request) {
    try {
        const { petId, content, fontStyle, photos } = await request.json()
        const supabase = await createClient()

        // 1. Auth Check
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Content Validation
        if (typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }
        if (content.length > 5000) {
            return NextResponse.json({ error: 'Content too long (max 5000 characters)' }, { status: 400 })
        }

        // 3. Pet Ownership Check
        const { data: pet, error: petError } = await supabase
            .from('pets')
            .select('id, name, species, breed, passed_date, created_at')
            .eq('id', petId)
            .eq('user_id', user.id)
            .single()

        if (petError || !pet) {
            return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
        }

        // Admin bypass: admin_users 테이블에 있으면 쿼터 체크 없이 직접 insert
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

        // STANDARD FLOW: Atomic Transaction via RPC
        const startDate = pet.passed_date || pet.created_at
        const timeInfo = calculateToThereOnTime(startDate)

        if (adminUser) {
            const { data: adminLetter, error: adminInsertError } = await supabaseAdmin
                .from('letters')
                .insert({
                    user_id: user.id,
                    pet_id: petId,
                    content,
                    font_style: fontStyle || null,
                    photos: photos || null,
                    sender_type: 'user',
                    status: 'sent',
                    current_tothereon_day: timeInfo.currentDay,
                })
                .select('id')
                .single()

            if (adminInsertError || !adminLetter) {
                return NextResponse.json({ error: 'Failed to save letter' }, { status: 500 })
            }

            try {
                await generateLetterReply(adminLetter.id, petId)
            } catch (e) {
                console.error('[Admin] Reply generation failed', e)
            }

            createLetterEchoEvent({
                petId,
                petName: pet.name,
                species: pet.species,
                breed: pet.breed,
                currentDay: timeInfo.currentDay,
            }).catch(e => console.error('[letter-echo]', e));

            return NextResponse.json({ success: true, letter_id: adminLetter.id, remaining: 999 })
        }

        const { data: result, error: rpcError } = await supabase.rpc('send_letter_transaction', {
            p_user_id: user.id,
            p_pet_id: petId,
            p_content: content,
            p_font_style: fontStyle,
            p_photos: photos,
            p_current_tothereon_day: timeInfo.currentDay
        });

        if (rpcError) {
            console.error('RPC Transaction Error:', rpcError);
            console.error('[send-letter] RPC transaction failed:', rpcError.message);
            return NextResponse.json({ error: 'Failed to send letter. Please try again.' }, { status: 500 });
        }

        // Result handling
        // send_letter_transaction returns JSONB
        // { success: boolean, error?: string, code?: string, letter_id?: uuid }

        if (result.error) {
            return NextResponse.json(
                { error: result.error, code: result.code, next_available_at: result.next_available_at },
                { status: result.code === 'COOLDOWN_ACTIVE' ? 429 : 403 }
            );
        }

        // Trigger AI Reply (Async)
        try {
            if (result.letter_id) {
                console.log(`Triggering reply for ${result.letter_id}`);
                await generateLetterReply(result.letter_id, petId);
            }
        } catch (e: any) {
            console.error('Reply generation failed', e);

            // QA FIX: AI Fallback Logic
            // If the generation fails immediately here, we need to mark the letter as 'failed' 
            // so the user knows, and we should refund their quota.
            if (result.letter_id) {
                // 1. Mark letter as failed
                await supabaseAdmin.from('letters')
                    .update({ status: 'failed' })
                    .eq('id', result.letter_id);

                // 2. Refund Quota — use correct quota key (YYYY-MM for free, billing period for paid)
                let refundQuotaKey: string
                const { data: refundUserData } = await supabaseAdmin
                    .from('users').select('subscription_tier').eq('id', user.id).single()
                const refundTier = (refundUserData?.subscription_tier || 'free').toLowerCase()
                if (refundTier === 'free') {
                    refundQuotaKey = new Date().toISOString().slice(0, 7)  // YYYY-MM calendar month
                } else {
                    const { data: refundSub } = await supabaseAdmin
                        .from('subscriptions').select('current_period_start')
                        .eq('user_id', user.id).in('status', ['active', 'trialing']).single()
                    refundQuotaKey = refundSub?.current_period_start
                        ? new Date(refundSub.current_period_start).toISOString().slice(0, 10)
                        : ''  // No billing period found: skip refund (quota lookup will return nothing)
                }
                const { data: currentQuota } = await supabaseAdmin
                    .from('letter_quota')
                    .select('letters_sent')
                    .eq('user_id', user.id)
                    .eq('pet_id', petId)
                    .eq('month', refundQuotaKey)
                    .single()

                if (currentQuota && currentQuota.letters_sent > 0) {
                    await supabaseAdmin
                        .from('letter_quota')
                        .update({ letters_sent: currentQuota.letters_sent - 1 })
                        .eq('user_id', user.id)
                        .eq('pet_id', petId)
                        .eq('month', refundQuotaKey)
                }
            }

            // Return a specific partial success/failure so frontend can handle it
            return NextResponse.json({
                success: false,
                error: 'Letter saved, but AI reply generation failed. We have refunded your quota.',
                letter_id: result.letter_id,
                remaining: result.remaining + 1 // Reflect the refund in UI
            }, { status: 500 });
        }

        createLetterEchoEvent({
            petId,
            petName: pet.name,
            species: pet.species,
            breed: pet.breed,
            currentDay: timeInfo.currentDay,
        }).catch(e => console.error('[letter-echo]', e));

        // Visual DNA Smart Update (Fire-and-forget)
        if (photos && photos.length > 0) {
            const { data: currentPet } = await supabase
                .from('pets')
                .select('visual_description')
                .eq('id', petId)
                .single()

            if (currentPet?.visual_description) {
                smartUpdateVisualDNA(petId, currentPet.visual_description, photos[0])
                    .catch(err => console.error('Visual DNA Update Error:', err))
            }
        }

        return NextResponse.json({ success: true, letter_id: result.letter_id, remaining: result.remaining });

    } catch (error: any) {
        console.error('Send API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
