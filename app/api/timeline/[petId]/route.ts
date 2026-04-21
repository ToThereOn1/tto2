import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { LETTER_PIPELINE } from '@/lib/time-constants';

export const dynamic = 'force-dynamic';

// Type definitions for Timeline Items
type TimelineItem = {
    id: string;
    type: 'letter' | 'status';
    subtype: 'sent' | 'received' | 'status_update';
    title: string;
    content: string;
    description?: string;
    zone?: string;
    created_at: string;
    metadata?: any;
    is_read?: boolean;
    sender_type?: 'user' | 'pet';
};

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ petId: string }> }
) {
    try {
        const { petId } = await context.params;
        const supabase = await createClient();

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 0. Fetch Pet Info (ownership enforced via user_id filter)
        const { data: pet, error: petError } = await supabase
            .from('pets')
            .select('*')
            .eq('id', petId)
            .eq('user_id', user.id)
            .single();

        if (petError || !pet) throw new Error('Pet not found');

        // 1. Calculate Timeline Stats
        const { calculateToThereOnTime, getTimeUntilNextDay } = await import('@/lib/time-engine-v2');
        const { getCurrentZone, getZoneDisplayName, getTimeOfDay, getTimeAtmosphere } = await import('@/lib/zone-manager');
        const startDate = pet.passed_date || pet.created_at;
        const timeOffset = pet.time_offset_hours || 0;

        const { currentDay, progress } = calculateToThereOnTime(startDate, timeOffset);
        const currentZone = getCurrentZone(currentDay);
        const timeUntilNext = getTimeUntilNextDay(startDate, timeOffset);

        const timelineStats = {
            startDate,
            currentDay,
            progress: Math.round(progress * 100),
            timeUntilNext,
            currentZone,
            currentZoneName: getZoneDisplayName(currentZone)
        };

        // 2. Fetch Status Events (Literary Feed)
        // Use adminClient to bypass RLS on pet_status_events.
        // Security is guaranteed by the pet ownership check above (supabase regular client).
        const adminClient = createAdminClient();
        const { data: statusEvents, error: statusError } = await adminClient
            .from('pet_status_events')
            .select('*')
            .eq('pet_id', petId)
            .neq('event_type', 'daily_whisper')
            .order('tothereon_day', { ascending: false })
            .limit(50);

        if (statusError) {
            console.error('[timeline] pet_status_events fetch error:', statusError.message);
        }
        const safeStatusEvents = statusEvents || [];

        // 2b. Fetch Micro-Events
        const { data: microEvents } = await adminClient
            .from('pet_micro_events')
            .select('*')
            .eq('pet_id', petId)
            .order('created_at', { ascending: false })
            .limit(50);

        // 3. Fetch Letters (Mailbox Feed)
        // User letters (sent by user)
        const { data: sentLetters, error: sentError } = await supabase
            .from('letters')
            .select('*')
            .eq('pet_id', petId)
            .eq('sender_type', 'user')
            .order('created_at', { ascending: false }); // Latest first

        // Pet letters (replies) - Check 'approved' (Reserved) and 'sent' (Already Delivered)
        // We'll process 'approved' ones to see if they should be 'sent' now.
        const { data: petLetters, error: petErrorData } = await supabase
            .from('letters')
            .select('*')
            .eq('pet_id', petId)
            .eq('sender_type', 'pet')
            .in('status', ['approved', 'sent'])
            .order('created_at', { ascending: false });

        const userLetters = sentLetters || [];
        const rawPetLetters = petLetters || [];
        const deliverablePetLetters: any[] = [];

        // Process Pet Letters for Lazy Delivery
        for (const letter of rawPetLetters) {
            // If already sent, just add it
            if (letter.status === 'sent') {
                deliverablePetLetters.push(letter);
                continue;
            }

            // If approved, check if 7 days have passed
            if (letter.status === 'approved') {
                // Find the anchor user letter (latest one created BEFORE this reply)
                // Since userLetters is sorted desc, find the first one with date < reply.date
                const replyDate = new Date(letter.created_at);
                const anchorUserLetter = userLetters.find((ul: any) => new Date(ul.created_at) < replyDate);

                // If no user letter found (heuristic fallback), use reply date itself
                const anchorDate = anchorUserLetter ? new Date(anchorUserLetter.created_at) : replyDate;

                // Calculate Effective Now
                const offsetHours = pet.time_offset_hours || 0;
                const now = Date.now();
                const effectiveNow = now + (offsetHours * 60 * 60 * 1000);

                // Diff in hours
                const diffHours = (effectiveNow - anchorDate.getTime()) / (1000 * 60 * 60);

                // Check visibility threshold (LETTER_PIPELINE.VISIBLE_TO_USER hours)
                if (diffHours >= LETTER_PIPELINE.VISIBLE_TO_USER) {
                    // Update DB to 'sent' (Lazy Trigger)
                    await supabase.from('letters').update({ status: 'sent' }).eq('id', letter.id);

                    // Add to deliverable list with updated status
                    deliverablePetLetters.push({ ...letter, status: 'sent' });
                }
                // Else: Still reserved. Do not add to list. 
            }
        }

        // 4. Transform to Timeline Items
        const events: any[] = [];

        // Transform Status Events
        safeStatusEvents.forEach((event: any) => {
            events.push({
                id: event.id,
                toThereOnDay: event.tothereon_day,
                tothereon_day: event.tothereon_day,
                type: 'status',
                subtype: 'status_update',
                eventType: event.event_type,
                event_type: event.event_type,
                typeName: event.event_title || 'Daily Update',
                title: event.event_title || `Day ${event.tothereon_day}`,
                description: event.event_description || '',
                event_description: event.event_description || '',
                content: event.event_description || '',
                zone: event.zone || 'memory_village',
                zoneName: getZoneDisplayName(event.zone || 'crystal_meadow'),
                createdAt: event.created_at,
                created_at: event.created_at,
                isMock: false,
                mood: event.mood || 'peaceful',
                metadata: event.metadata,
                language: event.event_language,
                npcInvolved: event.npc_involved || null,
                npc_involved: event.npc_involved || null,
            });
        });

        // Transform Sent Letters (User -> Pet)
        userLetters.forEach((letter: any) => {
            events.push({
                id: letter.id,
                type: 'letter',
                subtype: 'sent',
                sender_type: 'user',
                typeName: 'Letter Sent',
                title: `Letter to ${pet.name}`,
                content: letter.content,
                createdAt: letter.created_at,
                created_at: letter.created_at,
                is_read: true,
                isMock: false
            });
        });

        // Transform Received Letters (Pet -> User)
        deliverablePetLetters.forEach((letter: any) => {
            events.push({
                id: letter.id,
                type: 'letter',
                subtype: 'received',
                sender_type: 'pet',
                typeName: 'Reply Received',
                title: `Letter from ${pet.name}`,
                content: letter.content,
                createdAt: letter.created_at,
                created_at: letter.created_at,
                is_read: letter.is_read || false,
                isMock: false,
                current_tothereon_day: letter.current_tothereon_day ?? null,
            });
        });

        // 5. Sort by Date Descending
        events.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Return the structure PetStatusFeed AND MailboxPage expects
        const serverTimeOfDay = getTimeOfDay();
        return NextResponse.json({
            pet: {
                id: pet.id,
                name: pet.name,
                species: pet.species,
                breed: pet.breed,
                photos: pet.photos || [],
                time_offset_hours: pet.time_offset_hours,
                passed_date: pet.passed_date || null,
                writing_mastery_day: pet.writing_mastery_day ?? 5,
            },
            timeline: timelineStats,
            events: events,
            microEvents: microEvents || [],
            worldState: {
                timeOfDay: serverTimeOfDay,  // server UTC — client overrides via useWorldTime
                atmosphere: getTimeAtmosphere(serverTimeOfDay),
                currentZoneName: getZoneDisplayName(currentZone),
            },
            success: true
        });

    } catch (error) {
        console.error('[timeline]', error);
        return NextResponse.json(
            { error: 'Failed to fetch timeline' },
            { status: 500 }
        );
    }
}
