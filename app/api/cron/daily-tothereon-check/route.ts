import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { extractLastSentence } from '@/lib/utils/sentence-parser';
import type { SentenceLang } from '@/lib/utils/sentence-parser';
import { extractNarrativeSummary } from '@/lib/narrative-extractor';
import { getActiveImprint } from '@/lib/letter-imprint';
import type { ActiveImprint } from '@/lib/letter-imprint';
import {
    generateStatusEvent,
    calculateTothereonDay,
    determineEventType,
    calculateIntelligenceScore,
    calculateLearningStage,
} from '@/lib/event-generator';
import type { StatusEventContext } from '@/lib/event-generator';
import { detectUserLanguage } from '@/lib/language-detector';
import { getCurrentZone } from '@/lib/zone-manager';
import type { PersonaProfile, DimensionalScores, HealingMission, NarrativeData } from '@/lib/types/database';
import { LETTER_PIPELINE, FEED_FREQUENCY } from '@/lib/time-constants';
// Living Universe services
import { WorldStateService } from '@/lib/universe/world-state';
import { InteractionService } from '@/lib/universe/interaction-service';
import { WitnessService } from '@/lib/universe/witness-service';
import { NPCService } from '@/lib/universe/npc-service';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─── DEFENSE FIX 1: Chunk 크기 설정 ────────────────────────────────────────
// 한 번의 CRON 실행에서 처리할 최대 pet 수.
// 50마리 x (LLM ~3초) = ~150초 → 여전히 timeout 가능.
// 20마리씩 청크하면 ~60초로 Vercel Pro 한계 안에 들어옴.
const CHUNK_SIZE = 20;

export async function GET(request: Request) {
    // 인증 검사
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const adminClient = createAdminClient();
    const worldStateService = new WorldStateService();
    const interactionService = new InteractionService();
    const witnessService = new WitnessService();
    const npcService = new NPCService();

    try {
        // ─── DEFENSE FIX 3: Privacy 필터 적용 ────────────────────────────
        // persona_generated가 true이고 아직 삭제되지 않은 모든 pet 조회.
        // allow_world_interaction 컬럼은 나중에 WorldSnapshot에서 활용.
        const { data: allPets, error: petsError } = await adminClient
            .from('pets')
            .select(`
                id, name, species, breed, relationship, passed_date, user_id,
                allow_world_interaction,
                pet_personas (
                    id, persona_profile, dimensional_scores, healing_mission, narrative_data
                )
            `)
            .eq('persona_generated', true);

        if (petsError || !allPets || allPets.length === 0) {
            return NextResponse.json({
                success: true,
                processed: 0,
                message: petsError?.message || 'No active pets found',
            });
        }

        // ─── DEFENSE FIX 1: Chunked 처리 (오늘 이미 처리된 pet 건너뜀) ──
        // BD Day를 "세계 공통 날짜" 기준으로 결정
        const globalBdDay = calculateTothereonDay(allPets[0].passed_date);

        // 오늘 처리 상태 조회 or 생성
        const { data: procState } = await adminClient
            .from('world_processing_state')
            .select('id, processed_pet_ids, completed, chunk_index, total_pets')
            .eq('bd_day', globalBdDay)
            .maybeSingle();

        // 이미 오늘 처리 완료된 경우 early return
        if (procState?.completed) {
            return NextResponse.json({
                success: true,
                message: `BD ${globalBdDay} already fully processed today.`,
                processed: 0,
                skipped: allPets.length,
            });
        }

        const alreadyProcessed: Set<string> = new Set(procState?.processed_pet_ids || []);

        // 아직 처리되지 않은 pet만 필터
        const pendingPets = allPets.filter(p => !alreadyProcessed.has(p.id));

        if (pendingPets.length === 0) {
            // 모두 처리 완료 → 완료 플래그
            await markCompleted(adminClient, globalBdDay, procState?.id);
            return NextResponse.json({ success: true, message: 'All pets processed.', processed: 0 });
        }

        // 이번 실행에선 chunk만큼만 처리
        const chunk = pendingPets.slice(0, CHUNK_SIZE);
        console.log(`[CRON] BD${globalBdDay}: Processing chunk of ${chunk.length}/${pendingPets.length} remaining pets`);

        // ─── DEFENSE FIX 2: 이중 처리 방지용 Set ─────────────────────────
        // 이번 루프에서 상호작용 이벤트로 처리된 pet 추적.
        // 상대방 순서가 왔을 때 skip.
        const processedByInteraction = new Set<string>();

        // World Snapshot 빌드 (privacy 필터 적용 포함)
        const worldSnapshot = await worldStateService.getWorldSnapshot(globalBdDay);
        console.log(`[Universe] World Snapshot: BD${globalBdDay}`);

        // NPC 스케줄 틱 — pet 루프 전에 NPC 위치/mood/activity 업데이트
        const hour = new Date().getUTCHours();
        const cronTimeOfDay: 'morning' | 'afternoon' | 'evening' = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        await npcService.tickNPCSchedule(cronTimeOfDay);

        let processedCount = 0;
        const results: Array<{ pet: string; day: number; status: string; eventType?: string; error?: string }> = [];
        const newlyProcessedIds: string[] = [];

        // ─── BATCH QUERIES: Replace 3 per-pet queries with 3 bulk queries ───────
        // Reduces 60 DB round-trips (20 pets × 3) down to 3 total.
        const chunkPetIds = chunk.map(p => p.id);

        // Batch 1: today's event existence check.
        // Uses globalBdDay as approximation — in practice all pets share the same currentDay.
        // Per-pet currentDay may differ only if passed_dates vary by >1 real day, which is rare.
        const { data: todayEventRows } = await adminClient
            .from('pet_status_events')
            .select('pet_id')
            .in('pet_id', chunkPetIds)
            .eq('tothereon_day', globalBdDay);
        const todayEventSet = new Set((todayEventRows || []).map((r: { pet_id: string }) => r.pet_id));

        // Batch 2: subscription tiers for all unique users in this chunk.
        const chunkUserIds = [...new Set(chunk.map(p => p.user_id))];
        const { data: userTierRows } = await adminClient
            .from('users')
            .select('id, subscription_tier')
            .in('id', chunkUserIds);
        const userTierMap = new Map<string, string>(
            (userTierRows || []).map((r: { id: string; subscription_tier: string }) => [r.id, r.subscription_tier as string])
        );

        // Batch 3: most recent REAL feed event per pet (exclude daily_whisper entries).
        // daily_whisper is inserted every day with tothereon_day:0 — if included here,
        // daysSinceLast would always be 0-1 and real LLM feed generation would be skipped.
        // Supabase does not support DISTINCT ON, so we de-duplicate in JS.
        const { data: lastFeedRows } = await adminClient
            .from('pet_status_events')
            .select('pet_id, created_at')
            .in('pet_id', chunkPetIds)
            .neq('event_type', 'daily_whisper')
            .order('created_at', { ascending: false });
        const lastFeedMap = new Map<string, string>();
        for (const row of (lastFeedRows || []) as Array<{ pet_id: string; created_at: string }>) {
            if (!lastFeedMap.has(row.pet_id)) {
                lastFeedMap.set(row.pet_id, row.created_at);
            }
        }
        // ─────────────────────────────────────────────────────────────────────────

        for (const pet of chunk) {
            try {
                // ─── DEFENSE FIX 2: 상호작용으로 이미 처리된 pet 건너뜀 ──
                if (processedByInteraction.has(pet.id)) {
                    results.push({ pet: pet.name, day: globalBdDay, status: 'Skipped (interaction partner)' });
                    newlyProcessedIds.push(pet.id);
                    continue;
                }

                const currentDay = calculateTothereonDay(pet.passed_date);
                if (currentDay < 1) continue;

                const realDaysElapsed = Math.ceil(
                    Math.abs(Date.now() - new Date(pet.passed_date).getTime()) / (1000 * 60 * 60 * 24)
                );

                // 오늘 이미 이벤트가 있으면 건너뜀 — uses pre-fetched batch (Batch 1)
                if (todayEventSet.has(pet.id)) {
                    newlyProcessedIds.push(pet.id);
                    continue;
                }

                // 플랜별 피드 빈도 게이팅 — uses pre-fetched batch (Batch 2)
                const userTier = userTierMap.get(pet.user_id) ?? 'free';
                const feedInterval = FEED_FREQUENCY[userTier] ?? FEED_FREQUENCY.free;

                // 마지막 피드 생성일 기준 Earth days 간격 체크 — uses pre-fetched batch (Batch 3)
                const lastFeedCreatedAt = lastFeedMap.get(pet.id);
                if (lastFeedCreatedAt) {
                    const daysSinceLast = Math.floor(
                        (Date.now() - new Date(lastFeedCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (daysSinceLast < feedInterval) {
                        newlyProcessedIds.push(pet.id);
                        continue;
                    }
                }

                const persona = Array.isArray(pet.pet_personas) ? pet.pet_personas[0] : pet.pet_personas;
                if (!persona) continue;

                const personaProfile = persona.persona_profile as PersonaProfile;
                const healingMission = ((persona as any).healing_mission as HealingMission) ?? null;
                const narrativeData = ((persona as any).narrative_data as NarrativeData) ?? null;
                const dimensionalScores = (persona.dimensional_scores || {
                    social_energy: 50, curiosity_drive: 50, affection_style: 50,
                    emotional_resilience: 50, playfulness_intensity: 50,
                    food_motivation: 50, empathy_sensitivity: 50, social_preference: 50,
                }) as DimensionalScores;

                // 최근 편지 통합 조회 — letterPhase + letterImprint 모두 동일 편지에서 추출
                // P0-1 FIX: 기존 2개 분리 쿼리를 1개로 통합하여 서로 다른 편지 참조 방지
                const { data: recentLetterRow } = await adminClient
                    .from('letters')
                    .select('content, created_at, metadata')
                    .eq('pet_id', pet.id)
                    .eq('sender_type', 'user')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const recentLetter = recentLetterRow
                    ? { content: recentLetterRow.content, created_at: recentLetterRow.created_at }
                    : null;

                // letterImprint: 동일 편지의 metadata에서 추출 (별도 쿼리 X)
                const activeImprint: ActiveImprint | null = getActiveImprint(
                    (recentLetterRow?.metadata as Record<string, unknown> | null) ?? null,
                    currentDay,
                );

                // Comment-World Engine v1: fetch recent comment exchanges (delivered only, last 3 days)
                const commentCutoff = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(); // 3 cycles
                const { data: commentExchangeData } = await adminClient
                    .from('feed_comments')
                    .select('content, created_at, event_id')
                    .eq('pet_id', pet.id)
                    .gte('created_at', commentCutoff)
                    .order('created_at', { ascending: false })
                    .limit(5);

                const recentCommentExchanges: Array<{ guardianMessage: string; petReply: string; eventDay: number; eventZone?: string }> = [];
                if (commentExchangeData && commentExchangeData.length > 0) {
                    const commentIds = commentExchangeData.map((c: any) => c.id);
                    const { data: repliesData } = await adminClient
                        .from('comment_replies')
                        .select('comment_id, content')
                        .in('comment_id', commentIds)
                        .eq('status', 'delivered');

                    const replyMap = new Map((repliesData || []).map((r: any) => [r.comment_id, r.content]));

                    // Get event zone/day info for contradiction guard
                    const eventIds = [...new Set(commentExchangeData.map((c: any) => c.event_id))];
                    const { data: eventInfoData } = await adminClient
                        .from('pet_status_events')
                        .select('id, tothereon_day, zone')
                        .in('id', eventIds);
                    const eventInfoMap = new Map((eventInfoData || []).map((e: any) => [e.id, { day: e.tothereon_day, zone: e.zone }]));

                    for (const c of commentExchangeData as any[]) {
                        const reply = replyMap.get(c.id);
                        if (reply) {
                            const eventInfo = eventInfoMap.get(c.event_id);
                            recentCommentExchanges.push({
                                guardianMessage: c.content,
                                petReply: reply,
                                eventDay: eventInfo?.day ?? currentDay,
                                eventZone: eventInfo?.zone,
                            });
                        }
                    }
                }

                const { data: recentEventData } = await adminClient
                    .from('pet_status_events')
                    .select('tothereon_day, event_type, location, npc_involved, event_description, metadata, mood, narrative_summary, unresolved_thread, thread_importance')
                    .eq('pet_id', pet.id)
                    .order('tothereon_day', { ascending: false })
                    .limit(3);

                const recentEvents = (recentEventData || []).map((e: any) => ({
                    day: e.tothereon_day as number,
                    eventType: e.event_type as string,
                    locationName: (e.metadata as any)?.location_name || e.location || undefined,
                    npcName: e.npc_involved || undefined,
                    firstSentence: ((e.event_description || '') as string).split(/[.。!！]/)[0]?.trim() || '',
                    // Causal Chain Engine v1 — rich narrative context
                    narrativeSummary: (e.narrative_summary as string | null) || undefined,
                    unresolvedThread: (e.unresolved_thread as string | null) || undefined,
                    // Thread Decay v2
                    threadImportance: (e.thread_importance as string | null) as 'high' | 'medium' | 'low' | undefined,
                    // Post type variety system
                    postType: (e.metadata as any)?.post_type || undefined,
                }));

                // Causal Chain Engine: yesterday's mood for emotional carryover
                const yesterdayMood = (recentEventData?.[0] as any)?.mood as string | undefined;

                // Known NPC names from recent events — used for first-meeting detection in prompt
                // npc_involved stores the NPC name (e.g. "Professor Clover")
                const knownNpcNames = (recentEventData || [])
                    .map((e: any) => e.npc_involved)
                    .filter(Boolean) as string[];

                let drResponsesForLang: any = null;
                if (!recentLetter) {
                    const { data: drData } = await adminClient
                        .from('deep_remembrance_responses')
                        .select('responses')
                        .eq('pet_id', pet.id)
                        .maybeSingle();
                    if (drData?.responses) {
                        drResponsesForLang = { deep_remembrance_responses: { responses: drData.responses } };
                    }
                }
                const userLanguage = detectUserLanguage(drResponsesForLang || {}, null, recentLetter);

                const hasRecentLetter = !!recentLetter &&
                    (Date.now() - new Date(recentLetter.created_at).getTime() < LETTER_PIPELINE.RELEVANCE_WINDOW * 60 * 60 * 1000);

                // Anti-spoiler gate + letter causality phase calculation (P0-3: 상수 참조)
                let letterReplyVisible = false;
                let letterPhase: 'none' | 'just_received' | 'still_carrying' = 'none';
                let letterAgeHoursVal = 0;
                if (hasRecentLetter && recentLetter) {
                    const letterAgeHours = (Date.now() - new Date(recentLetter.created_at).getTime()) / (1000 * 60 * 60);
                    letterAgeHoursVal = letterAgeHours;
                    letterReplyVisible = letterAgeHours >= LETTER_PIPELINE.VISIBLE_TO_USER;
                    // Letter causality phases (from time-constants.ts)
                    if (letterAgeHours >= LETTER_PIPELINE.PHASE_JUST_RECEIVED && letterAgeHours < LETTER_PIPELINE.PHASE_STILL_CARRYING) {
                        letterPhase = 'just_received';
                    } else if (letterAgeHours >= LETTER_PIPELINE.PHASE_STILL_CARRYING && letterAgeHours < LETTER_PIPELINE.PHASE_EXPIRED) {
                        letterPhase = 'still_carrying';
                    }
                }

                const currentZone = getCurrentZone(currentDay);
                const intelligenceScore = calculateIntelligenceScore(dimensionalScores);
                const { stage: learningStage, speed: learningSpeed, daysUntilMastery } =
                    calculateLearningStage(currentDay, intelligenceScore);
                const eventType = determineEventType(currentDay, hasRecentLetter, dimensionalScores, learningStage, learningSpeed, letterReplyVisible);

                const memoryAnchors: string[] = [];
                if (personaProfile.memory_anchors && Array.isArray(personaProfile.memory_anchors)) {
                    personaProfile.memory_anchors.forEach((anchor: any) => {
                        if (anchor.details) memoryAnchors.push(`${anchor.category}: ${anchor.details}`);
                    });
                }

                let letterContext: StatusEventContext['recentLetter'] = null;
                if (hasRecentLetter && recentLetter) {
                    const content = recentLetter.content || '';
                    const sentences = content.split(/[.!?。！？]+/).filter((s: string) => s.trim().length > 10);
                    letterContext = {
                        content,
                        quotes: sentences.slice(0, 3).map((s: string) => s.trim()),
                        date: new Date(recentLetter.created_at).toLocaleDateString(),
                    };
                }

                // ─── DEFENSE FIX 3: Privacy 필터 적용 ─────────────────────
                // allow_world_interaction=false인 pet은 nearbyPets 컨텍스트에서 제외.
                const allowsInteraction = pet.allow_world_interaction !== false;
                let zonePets = allowsInteraction
                    ? worldSnapshot.getPetsInZone(currentZone)
                        .filter(p => p.pet_id !== pet.id && p.allows_interaction !== false)
                    : [];

                // ─── DEFENSE FIX 4: Context Overflow 방어 ─────────────────
                // nearbyPets를 최대 2마리로 하드 캡.
                // 편지 품질 보호: 보호자-pet 관계가 80% 주인공이어야 함.
                zonePets = zonePets.slice(0, 2);

                // 상호작용 파트너 결정
                const todaysPartner = allowsInteraction
                    ? await interactionService.selectInteractionPartner(
                        pet.id,
                        zonePets.map(p => ({ pet_id: p.pet_id, pet_name: p.pet_name, species: p.species }))
                    )
                    : null;

                const existingRelationships = allowsInteraction
                    ? await interactionService.getRelationships(pet.id)
                    : [];

                // ─── Living Universe: 세계 맥락 조립 ──────────────────────────
                // 같은 존에 있는 아는 pet (shared_memory 포함)
                const nearbyPetsForContext = existingRelationships
                    .filter(r => zonePets.some(zp => zp.pet_id === r.pet_id))
                    .slice(0, 2)
                    .map(r => ({
                        pet_name: r.pet_name,
                        species: r.species,
                        relationship_type: r.relationship_type,
                        last_shared_memory: r.last_shared_memory,
                    }));

                // 오늘 같은 존에서 이미 생성된 이벤트
                const todaysZoneEvents = worldSnapshot.todaysEvents
                    .filter(e => e.zone_id === currentZone && !e.participants.some(p => p.pet_id === pet.id))
                    .slice(-3)
                    .map(e => ({
                        pet_name: e.participants[0]?.pet_name || 'someone',
                        first_sentence: e.first_sentence || e.description.split(/[.。]/)[0]?.trim() || '',
                    }));

                // 현재 존의 NPC 활동 정보
                const zoneNpcs = await npcService.getNPCsInZone(currentZone);
                const primaryNpc = zoneNpcs[0] || null;
                const npcActivityContext = primaryNpc ? {
                    npc_name: primaryNpc.npc_name,
                    mood: primaryNpc.mood,
                    current_activity: primaryNpc.current_activity,
                } : null;

                // Causal Chain Engine: NPC relationship history for prompt context
                // Only relevant when eventType is npc_interaction and a primary NPC is known
                let npcHistory: StatusEventContext['npcHistory'] = null;
                if (eventType === 'npc_interaction' && primaryNpc) {
                    const normalizedNpcId = primaryNpc.npc_name.toLowerCase().replace(/\s/g, '_');
                    npcHistory = await npcService.getPetNPCHistory(normalizedNpcId, pet.id);
                }

                console.log(`[Feed Gen] Day ${currentDay} | ${pet.name} | Type: ${eventType} | Zone: ${currentZone}`);

                const eventResult = await generateStatusEvent({
                    petId: pet.id,
                    petName: pet.name,
                    species: pet.species,
                    breed: pet.breed,
                    relationship: pet.relationship,
                    personaProfile,
                    dimensionalScores,
                    currentDay,
                    realDaysElapsed,
                    currentZone,
                    eventType,
                    userLanguage,
                    languageSource: recentLetter ? 'Recent Letter' : (drResponsesForLang ? 'Deep Remembrance' : 'Default'),
                    recentLetter: letterContext,
                    memoryAnchors,
                    isPremium: false,
                    intelligenceScore,
                    learningStage,
                    learningSpeed,
                    daysUntilMastery,
                    recentEvents,
                    // Living Universe context
                    nearbyPets: nearbyPetsForContext,
                    todaysZoneEvents,
                    npcActivity: npcActivityContext,
                    // NPC first-meeting detection
                    knownNpcNames,
                    // Healing mission & narrative data (v4.0)
                    healingMission,
                    narrativeData,
                    // Letter causality phase (v4.0)
                    letterPhase,
                    letterAgeHours: letterAgeHoursVal,
                    // Causal Chain Engine v1
                    yesterdayMood,
                    npcHistory,
                    // Letter-World Engine v1
                    letterImprint: activeImprint ?? undefined,
                    // Comment-World Engine v1: recent comment exchanges for narrative integration
                    recentComments: recentCommentExchanges,
                });

                // Causal Chain Engine: extract narrative summary from raw LLM output
                // CRITICAL: cleanContent has SUMMARY: line stripped — this is what goes to DB/UI
                const { narrative_summary, unresolved_thread, cleanContent, thread_importance } =
                    extractNarrativeSummary(eventResult.content);

                // DB 저장
                const EVENT_MOOD_MAP: Record<string, string> = {
                    exploration: 'curious',
                    npc_interaction: 'playful',
                    letter_response: 'longing',
                    milestone: 'joyful',
                    daily_routine: 'peaceful',
                }
                const mood = EVENT_MOOD_MAP[eventResult.eventType] ?? 'peaceful'

                const detectedLang = (userLanguage === 'ko' || userLanguage === 'ja' ? userLanguage : 'en') as SentenceLang;
                await adminClient
                    .from('pet_status_events')
                    .insert({
                        pet_id: pet.id,
                        tothereon_day: currentDay,
                        event_type: eventResult.eventType,
                        event_title: `Day ${currentDay}`,
                        // CRITICAL: store cleanContent (SUMMARY: line stripped), NOT raw eventResult.content
                        event_description: cleanContent,
                        mood,
                        event_language: eventResult.language,
                        zone: eventResult.zone,
                        location: eventResult.location,
                        npc_involved: eventResult.npcInvolved,
                        is_learning_event: eventResult.isLearningEvent,
                        learning_stage: eventResult.learningStage,
                        // Causal Chain Engine v1 + Thread Decay v2
                        narrative_summary: narrative_summary || null,
                        unresolved_thread: unresolved_thread || null,
                        thread_importance: thread_importance || 'medium',
                        metadata: {
                            ...eventResult.metadata,
                            hook_sentence: extractLastSentence(cleanContent, detectedLang),
                        },
                    } as any);

                // 세계 로그 기록
                await worldStateService.logWorldEvent({
                    bd_day: currentDay,
                    event_type: 'pet_daily_event',
                    zone_id: eventResult.zone || currentZone,
                    participants: [{ pet_id: pet.id, pet_name: pet.name }],
                    npc_involved: eventResult.npcInvolved ?? undefined,
                    description: eventResult.content,
                });

                // NPC 상호작용 기록 — NPC가 이 pet과의 만남을 기억
                if (eventResult.npcInvolved) {
                    const npcIdNormalized = eventResult.npcInvolved.toLowerCase().replace(/\s/g, '_');
                    const interactionSummary = eventResult.content.split(/[.。!！]/)[0]?.trim() || '';
                    await npcService.recordNPCInteraction(
                        npcIdNormalized,
                        pet.id,
                        pet.name,
                        currentDay,
                        interactionSummary,
                    );
                    // NPC-Pet relationship persistence (Phase 2, T2.3)
                    await npcService.recordNPCMeeting(
                        npcIdNormalized,
                        pet.id,
                        currentDay,
                        interactionSummary,
                    );
                }

                // 관계 기록 + DEFENSE FIX 2: 파트너를 processedByInteraction에 추가
                if (todaysPartner) {
                    await interactionService.recordMeeting(
                        pet.id, todaysPartner.pet_id, currentDay, currentZone,
                        eventResult.content.slice(0, 120)
                    );
                    // 파트너는 이번 루프에서 건너뜀 (이중 처리 방지)
                    processedByInteraction.add(todaysPartner.pet_id);
                }

                // 중요 이벤트 목격자 전파 (최대 2명)
                const isNotableEvent = ['milestone', 'npc_interaction', 'arrival', 'letter_response'].includes(eventResult.eventType);
                if (isNotableEvent && zonePets.length > 0) {
                    const witnessImportance = eventResult.eventType === 'milestone' ? 0.8
                        : eventResult.eventType === 'arrival' ? 0.7 : 0.6;
                    await witnessService.propagateWitness(
                        {
                            bd_day: currentDay,
                            zone_id: currentZone,
                            subject_pet_id: pet.id,
                            subject_pet_name: pet.name,
                            summary: eventResult.content.split(/[.。!！]/)[0]?.trim() || '',
                            event_type: eventResult.eventType === 'milestone' ? 'milestone'
                                : eventResult.eventType === 'arrival' ? 'arrival' : 'special',
                            importance: witnessImportance,
                        },
                        zonePets.slice(0, 2).map(p => p.pet_id) // DEFENSE: 최대 2마리
                    );
                }

                // 마일스톤 소문 전파 — NPC를 통해 다른 존까지 소문이 퍼짐
                if (eventResult.eventType === 'milestone' && eventResult.npcInvolved) {
                    const otherZonePetIds: string[] = [];
                    for (const [zId, zPets] of Object.entries(worldSnapshot.petsByZone)) {
                        if (zId === currentZone) continue;
                        for (const p of zPets) {
                            if (p.allows_interaction && p.pet_id !== pet.id) {
                                otherZonePetIds.push(p.pet_id);
                            }
                        }
                    }
                    if (otherZonePetIds.length > 0) {
                        await witnessService.spreadRumor(
                            {
                                bd_day: currentDay,
                                zone_id: currentZone,
                                subject_pet_id: pet.id,
                                subject_pet_name: pet.name,
                                summary: eventResult.content.split(/[.。!！]/)[0]?.trim() || '',
                                event_type: 'milestone',
                                importance: 0.8,
                            },
                            eventResult.npcInvolved.toLowerCase().replace(/\s/g, '_'),
                            otherZonePetIds.slice(0, 5) // 소문 전파 대상 최대 5마리 제한
                        );
                    }
                }

                processedCount++;
                newlyProcessedIds.push(pet.id);
                results.push({ pet: pet.name, day: currentDay, status: 'Generated', eventType });

            } catch (pError) {
                console.error(`Error processing pet ${pet.id}:`, pError);
                results.push({ pet: pet.name, day: 0, status: 'Error', error: String(pError) });
                newlyProcessedIds.push(pet.id); // 에러 pet도 처리된 것으로 마킹 (무한 재시도 방지)
            }
        }

        // ─── DEFENSE FIX 1: 처리 완료된 pet을 state에 누적 기록 ──────────
        const allProcessedIds = [...alreadyProcessed, ...newlyProcessedIds];
        const isNowComplete = allProcessedIds.length >= allPets.length;

        await adminClient
            .from('world_processing_state')
            .upsert({
                ...(procState?.id ? { id: procState.id } : {}),
                bd_day: globalBdDay,
                processed_pet_ids: allProcessedIds,
                chunk_index: (procState?.chunk_index || 0) + 1,
                total_pets: allPets.length,
                completed: isNowComplete,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'bd_day' });

        return NextResponse.json({
            success: true,
            bd_day: globalBdDay,
            processed: processedCount,
            chunk_size: chunk.length,
            remaining: pendingPets.length - chunk.length,
            total_pets: allPets.length,
            all_done: isNowComplete,
            results,
        });

    } catch (error) {
        console.error('CRON daily check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

async function markCompleted(adminClient: any, bdDay: number, existingId?: string) {
    await adminClient
        .from('world_processing_state')
        .upsert({
            ...(existingId ? { id: existingId } : {}),
            bd_day: bdDay,
            completed: true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'bd_day' });
}
