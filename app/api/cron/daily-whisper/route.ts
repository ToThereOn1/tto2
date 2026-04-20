import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateWhisper } from '@/lib/whisper-generator'
import type { WhisperLang } from '@/lib/whisper-generator'
import { detectUserLanguage } from '@/lib/language-detector'
import { calculateTothereonDay } from '@/lib/event-generator'

// Vercel Cron Authentication
function isAuthenticated(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    try {
        // Fetch all active pets with persona generated
        const { data: pets, error: petsError } = await adminClient
            .from('pets')
            .select('id, name, user_id, passed_date')
            .eq('persona_generated', true)

        if (petsError) throw petsError

        if (!pets || pets.length === 0) {
            return NextResponse.json({ success: true, processed: 0, message: 'No active pets found' })
        }

        const results: Array<{ pet: string; lang: string; whisper: string; status: string }> = []
        const errors: Array<{ pet: string; error: string }> = []

        for (const pet of pets) {
            try {
                // Detect language from most recent letter or DR responses
                const { data: recentLetter } = await adminClient
                    .from('letters')
                    .select('content, created_at')
                    .eq('pet_id', pet.id)
                    .eq('sender_type', 'user')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                let drData: any = null
                if (!recentLetter) {
                    const { data } = await adminClient
                        .from('deep_remembrance_responses')
                        .select('responses')
                        .eq('pet_id', pet.id)
                        .maybeSingle()
                    if (data?.responses) {
                        drData = { deep_remembrance_responses: { responses: data.responses } }
                    }
                }

                const detectedLang = detectUserLanguage(drData || {}, null, recentLetter)
                // Map detected lang to WhisperLang (default 'en' for unsupported)
                const lang: WhisperLang =
                    detectedLang === 'ko' ? 'ko'
                    : detectedLang === 'ja' ? 'ja'
                    : 'en'

                const whisper = generateWhisper(lang)

                console.log(`[daily-whisper] ${pet.name} (${lang}): ${whisper}`)

                // DB에 whisper 저장 (pet_status_events 테이블)
                const today = new Date().toISOString().slice(0, 10)
                const currentDay = pet.passed_date ? calculateTothereonDay(pet.passed_date) : 0
                const { error: insertError } = await adminClient
                    .from('pet_status_events')
                    .insert({
                        pet_id: pet.id,
                        event_type: 'daily_whisper',
                        event_title: 'Daily Whisper',
                        event_description: whisper,
                        tothereon_day: currentDay,
                        metadata: { lang, whisper: true, date: today },
                    } as any)

                if (insertError) {
                    console.warn(`[daily-whisper] DB insert warn for ${pet.name}:`, insertError.message)
                }

                results.push({ pet: pet.name, lang, whisper, status: 'ok' })
            } catch (petErr: any) {
                console.error(`[daily-whisper] Error for pet ${pet.id}:`, petErr)
                errors.push({ pet: pet.name, error: petErr.message })
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            error_count: errors.length,
            results,
            errors,
        })

    } catch (err: any) {
        console.error('[daily-whisper] Cron job failed:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
