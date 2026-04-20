/**
 * NPCService — Living Universe Phase 4
 * 
 * NPC의 유상태(stateful) 관리 시스템.
 * - 시간대별 NPC 위치 스케줄
 * - Pet 성격에 따른 반응 차별화
 * - NPC 상호작용 기록 누적
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { DimensionalScores } from '@/lib/types/database';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NPCState {
    npc_id: string;
    npc_name: string;
    current_zone: string;
    current_location: string | null;
    mood: string;
    current_activity: string | null;
    interaction_count: number;
}

/**
 * v2: NPC의 시간대별 스케줄 엔트리.
 * 기존 필드(timeOfDay, location, activity, mood) 보존,
 * v2 optional 필드(reactingToPetId, hookForTomorrow) 추가.
 */
export interface NPCScheduleEntry {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    location: string;
    activity: string;
    mood: string;
    // v2: 어제 이 펫과 만났다면 오늘 그 펫에 반응
    reactingToPetId?: string;
    // v2: 다음 이벤트를 위한 복선 문구
    hookForTomorrow?: string;
}

// 최근 상호작용 메모리 캐시 (npcId → { petId, petName, summary })
// tickNPCSchedule 실행 간 상태 유지 (프로세스 재시작 시 초기화됨)
const recentInteractionCache = new Map<string, { petId: string; petName?: string; summary: string }>();

// ─── Service ─────────────────────────────────────────────────────────────────

export class NPCService {
    private adminClient = createAdminClient();

    /**
     * NPC의 현재 상태 반환.
     * npc_state 테이블이 없으면 하드코딩 기본값 사용 (Phase 1 호환).
     */
    async getNPCState(npcId: string): Promise<NPCState | null> {
        try {
            const { data, error } = await this.adminClient
                .from('npc_state')
                .select('*')
                .eq('npc_id', npcId)
                .maybeSingle();

            if (error || !data) return null;

            return {
                npc_id: data.npc_id,
                npc_name: data.npc_name,
                current_zone: data.current_zone,
                current_location: data.current_location,
                mood: data.mood,
                current_activity: data.current_activity,
                interaction_count: (data.interaction_log as any[])?.length || 0,
            };
        } catch (err) {
            console.error('[NPCService] getNPCState error:', err);
            return null;
        }
    }

    /**
     * 현재 구역에 있는 모든 NPC 반환.
     * zone-manager.ts의 selectNPC()를 보강하는 데 사용.
     */
    async getNPCsInZone(zoneId: string): Promise<NPCState[]> {
        try {
            const { data, error } = await this.adminClient
                .from('npc_state')
                .select('*')
                .eq('current_zone', zoneId);

            if (error || !data) return [];

            return data.map((row: any) => ({
                npc_id: row.npc_id,
                npc_name: row.npc_name,
                current_zone: row.current_zone,
                current_location: row.current_location,
                mood: row.mood,
                current_activity: row.current_activity,
                interaction_count: (row.interaction_log as any[])?.length || 0,
            }));
        } catch (err) {
            console.error('[NPCService] getNPCsInZone error:', err);
            return [];
        }
    }

    /**
     * NPC의 현재 활동을 결정적으로(deterministic) 생성.
     * LLM 호출 없음 — NPC별 사전 정의 활동 테이블 + 존 조합.
     */
    generateNPCActivity(npcName: string, zoneId: string, timeOfDay: string): string {
        const activities: Record<string, Record<string, string[]>> = {
            tory: {
                crystal_meadow: ['racing through the butterfly gardens', 'chasing light reflections on crystal flowers', 'rolling in the warm grass near the welcome path'],
                eternity_forest: ['darting between ancient trees', 'sniffing mushroom patches with intense focus', 'following a trail only they can see'],
                crystal_lake: ['splashing at the shallow edge', 'watching fish from a rock', 'shaking off water with tremendous enthusiasm'],
                sunset_hill: ['standing at the ridge, ears forward', 'weaving through sunset-lit stones', 'napping in a warm patch between the rocks'],
            },
            happy: {
                crystal_meadow: ['sitting near the fountain, watching newcomers arrive', 'grooming slowly in a patch of sunlight', 'following a butterfly with mild interest'],
                eternity_forest: ['resting against a tree root', 'watching blue moss glow with half-closed eyes', 'listening to distant forest sounds'],
                crystal_lake: ['sitting at the dock, paws hanging over the edge', 'watching reflections in the still water', 'dozing near the warm stones by the shore'],
                sunset_hill: ['perched on the highest point, very still', 'watching the light change colors', 'sitting with dignity as wind moves through fur'],
            },
            lightning: {
                crystal_meadow: ['zooming past the flower beds in a blur', 'skidding to a stop near the crystal fountain', 'bouncing between newcomers with infectious energy'],
                eternity_forest: ['leaping over roots at full speed', 'chasing echoes deeper into the trees', 'pausing just long enough to sniff something, then bolting again'],
                crystal_lake: ['running laps around the shoreline', 'diving into the shallows and emerging instantly', 'racing their own reflection across the water'],
                sunset_hill: ['sprinting up the ridge trail', 'standing at the peak with tongue out, panting', 'chasing the last ray of light across the stones'],
            },
            // Note: 'kitsune' was removed — not a canonical companion NPC.
            // Replaced with Wind (Shiba Inu, Independent, Free Spirit) and additional canon companions.
            wind: {
                crystal_meadow: ['moving alone through the tall grass without pausing', 'sitting at the meadow edge, watching from a distance', 'appearing at the field border, then vanishing into the grass'],
                eternity_forest: ['moving between shadows without sound', 'sitting perfectly still on a high branch', 'following a trail only they can sense'],
                crystal_lake: ['sitting apart from the others at the far shore', 'watching the water alone, tail curled around paws', 'leaving only paw prints near the waterline'],
                sunset_hill: ['silhouetted against the sunset, motionless', 'navigating the rocks with quiet precision', 'standing at the ridge, ears forward into the wind'],
            },
            cloud: {
                crystal_meadow: ['walking slowly through the flowers, pausing to sniff each one', 'resting between two crystal formations in the shade', 'watching others play from a comfortable distance'],
                eternity_forest: ['padding quietly through the northern grove', 'lying across a wide root with eyes half-closed', 'standing still, listening to distant forest sounds'],
                crystal_lake: ['wading at the shallow edge, unhurried', 'sitting on the dock with paws hanging over the water', 'watching fish move through the clear shallows'],
                sunset_hill: ['lying in the tall grass as wind moves through fur', 'watching clouds from the terrace in perfect stillness', 'sitting at the hilltop, calm and content'],
            },
            choco: {
                crystal_meadow: ['walking thoughtfully along the meadow edge', 'pausing often, as if working something out', 'sitting with quiet attention in the tall grass'],
                eternity_forest: ['exploring the northern grove at a careful pace', 'sitting beside the forest pool in deep stillness', 'examining something small on the ground with focused eyes'],
                crystal_lake: ['resting on warm stones near the quiet cove', 'watching the deep water with calm concentration', 'sitting very still at the lake edge, lost in thought'],
                sunset_hill: ['standing at the wind ridge, fur blown sideways', 'sitting at the sunset terrace as the light changes', 'walking the tall grass field slowly, head low'],
            },
            // ── Canon NPCs ────────────────────────────────────────────────────────
            granny_shell: {
                crystal_meadow: ['sitting on her favorite bench near the entrance, watching newcomers with a warm smile', 'distributing small shells from her basket to curious pets', 'humming an old tune while tending to the flower border'],
                eternity_forest: ['gathering herbs near the northern grove with practiced hands', 'sitting under the oldest tree, telling stories to any pet who stops', 'carefully examining mushroom patches with knowing eyes'],
                crystal_lake: ['mending a small net by the dock, working with quiet concentration', 'sitting at the water\'s edge, feeding the fish with crumbled bits', 'watching the water with a distant, contented expression'],
                sunset_hill: ['at the terrace bench as the light changes, exactly where she always is', 'collecting smooth stones along the ridge path', 'sharing tea from her thermos with any pet who joins her'],
            },
            professor_clover: {
                crystal_meadow: ['sketching the crystal flower formations in a leather journal', 'measuring the angle of light through the meadow with a small instrument', 'explaining the meadow\'s history to anyone who asks (and some who don\'t)'],
                eternity_forest: ['cataloguing the varieties of luminous moss with a small magnifying glass', 'deep in thought at the observation platform, cross-referencing two field notes', 'conducting what appears to be a very serious conversation with a tree'],
                crystal_lake: ['collecting water samples in small vials with careful hands', 'observing the thermal currents from the dock with intense focus', 'annotating a detailed map of the lake\'s underwater geography'],
                sunset_hill: ['studying the atmospheric refraction at dusk with measuring instruments', 'calculating something complex in the margins of an already-full notebook', 'explaining the physics of the sunset to a politely confused pet'],
            },
            pip: {
                crystal_meadow: ['darting between flower beds with a message clutched in one paw', 'organizing the welcome station with tremendous urgency', 'making introductions at twice the necessary speed'],
                eternity_forest: ['running an errand that seems very important but won\'t say what', 'checking on new arrivals at the forest edge with a clipboard', 'delivering something to Professor Clover with great ceremony'],
                crystal_lake: ['posting notices on the dock board with authority', 'organizing the fishing gear with a system only Pip understands', 'greeting each boat that arrives with an official welcome'],
                sunset_hill: ['timing the sunset with a small pocket watch and reporting the results to no one in particular', 'organizing a viewing schedule for the terrace benches', 'running a message up the ridge at full speed'],
            },
            old_finn: {
                crystal_meadow: ['sitting on his usual log near the welcome path, watching everything unfold', 'telling a long story to whoever sat down long enough to hear', 'tending a small fire in a stone ring, slow and deliberate'],
                eternity_forest: ['at his preferred spot near the ancient tree, whittling something from a branch', 'watching the blue moss glow with the patience of someone who\'s seen it many times', 'brewing something in a small pot over coals, unhurried'],
                crystal_lake: ['fishing from the dock with a rod that doesn\'t seem to have been cast recently', 'mending something with thick thread, sitting on his favorite crate', 'watching the horizon with the look of someone who\'s waited before and can wait again'],
                sunset_hill: ['at the stone bench near the ridge, watching the light the way only he does', 'smoking his pipe at the terrace, counting the colors as they change', 'exactly where he was yesterday, and the day before'],
            },
            bun_and_bun: {
                crystal_meadow: ['carrying a basket of fresh rolls toward the welcome area', 'setting up the pop-up baking station near the crystal fountain', 'offering tiny samples to everyone passing with cheerful insistence'],
                eternity_forest: ['delivering a warm parcel to Professor Clover\'s research post', 'gathering wild berries near the northern grove for tomorrow\'s batch', 'consulting with Old Finn about the ancient recipe he mentioned'],
                crystal_lake: ['running the lakeside café counter with two sets of arms moving at once', 'testing a new flavor at the dock with experimental focus', 'arguing cheerfully with each other about which pastry is objectively better'],
                sunset_hill: ['setting up a small sunset snack service at the terrace', 'carrying supplies up the ridge trail with practiced efficiency', 'handing out warm things as the temperature drops at dusk'],
            },
            digby: {
                crystal_meadow: ['excavating a new corner of the meadow with systematic enthusiasm', 'examining a recently unearthed object with a magnifying glass', 'creating an elaborate tunnel entrance near the flower beds'],
                eternity_forest: ['digging near the ancient tree roots, very carefully', 'following an interesting scent through the undergrowth with focus', 'mapping underground passages in a small notebook'],
                crystal_lake: ['examining the lake shore geology with dedicated interest', 'digging along the waterline in a very specific pattern', 'hauling an interesting rock sample up to Professor Clover\'s observation spot'],
                sunset_hill: ['excavating the southern slope with methodical intent', 'discovering something in the soil near the ridge that requires immediate examination', 'creating an emergency burrow for unclear but urgent reasons'],
            },
            // ── Companion NPCs ────────────────────────────────────────────────────
            star: {
                crystal_meadow: ['floating through the flower beds, trailing faint light', 'settling on a high crystal formation, watching quietly', 'drifting near new arrivals, as if keeping watch'],
                eternity_forest: ['moving between the ancient trees like a slow breath', 'resting on a high branch, luminescent and still', 'following a path only star can sense through the deep grove'],
                crystal_lake: ['hovering just above the water surface in the early morning', 'reflecting in the still water alongside the actual stars', 'circling the dock once before settling near a familiar pet'],
                sunset_hill: ['visible from the meadow below, bright against the dimming sky', 'slowly orbiting the highest peak as the light fades', 'becoming more visible as the evening deepens'],
            },
            mong: {
                crystal_meadow: ['ambling through the tall grass at a relaxed pace', 'stopping to investigate an interesting smell near the fountain', 'greeting newcomers with a slow wag and a calm expression'],
                eternity_forest: ['sitting at the forest edge, watching the shadows shift', 'following a scent trail through the northern grove with focus', 'resting near the forest pool, breathing slowly'],
                crystal_lake: ['wading to the ankle in the shallows, content', 'lying near the warm stones with eyes half-open', 'watching the fish from the dock with patient interest'],
                sunset_hill: ['at the top of the ridge, sitting very still', 'walking the tall grass field slowly, nose to the wind', 'watching the light change from the highest terrace'],
            },
            ruby: {
                crystal_meadow: ['moving with quick, decisive steps between garden sections', 'investigating the crystal formations with sharp attention', 'organizing something that didn\'t need organizing, but looks better now'],
                eternity_forest: ['moving through the grove at a brisk pace, purpose-first', 'examining the moss with the attention of someone taking notes', 'circling the ancient tree exactly three times, for reasons'],
                crystal_lake: ['pacing the dock perimeter with energy', 'swimming decisive laps in the shallows before stopping abruptly', 'sitting at the water\'s edge in alert stillness'],
                sunset_hill: ['running the ridge trail at speed, then stopping at the peak to look out', 'investigating the wind-direction stones with sharp interest', 'settling at the terrace edge after satisfying exertion'],
            },
            bokshil: {
                crystal_meadow: ['following whoever seems most interesting with quiet devotion', 'sitting near the fountain with an expression of pure contentment', 'doing what everyone else is doing, because that\'s where the warmth is'],
                eternity_forest: ['never too far from a friendly face in the forest', 'resting against someone who was already resting', 'wandering happily in the general direction of wherever others went'],
                crystal_lake: ['in the shallows near other pets, delighted', 'sitting on the dock with tail moving steadily', 'following the nearest friend from shore to water and back again'],
                sunset_hill: ['sitting next to whoever is at the terrace, uninvited but welcome', 'watching the sunset from a comfortable spot near others', 'the last to leave because leaving means being alone'],
            },
        };

        const npcKey = npcName.toLowerCase();
        const npcActivities = activities[npcKey];

        if (!npcActivities) {
            const defaults = [
                'wandering through the area at their own pace',
                'resting in a familiar spot',
                'watching the world go by with quiet attention',
            ];
            return defaults[Math.floor(Math.random() * defaults.length)];
        }

        const timeIndex: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };
        const idx = timeIndex[timeOfDay] ?? Math.floor(Math.random() * 3);

        const zoneActivities = npcActivities[zoneId] || Object.values(npcActivities)[0] || ['resting quietly'];
        return zoneActivities[Math.min(idx, zoneActivities.length - 1)];
    }

    /**
     * 시간대에 맞춰 NPC 위치 + mood + activity를 업데이트 (CRON에서 호출).
     * v2: 전날 상호작용 기록을 기반으로 reactingToPetId / hookForTomorrow 설정.
     */
    async tickNPCSchedule(timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<void> {
        try {
            const { data: npcs, error } = await this.adminClient
                .from('npc_state')
                .select('npc_id, npc_name, schedule, interaction_log');

            if (error || !npcs) return;

            // v2: 전날 pet_status_events에서 NPC 등장 기록 조회 (최근 24시간)
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: recentEvents } = await this.adminClient
                .from('pet_status_events')
                .select('pet_id, npc_involved, event_description')
                .gte('created_at', yesterday)
                .not('npc_involved', 'is', null)
                .order('created_at', { ascending: true });

            // npcName → 가장 최근 상호작용한 petId 매핑 빌드
            const npcLastPetMap = new Map<string, { petId: string; summary: string }>();
            if (recentEvents) {
                for (const ev of recentEvents) {
                    if (!ev.npc_involved || !ev.pet_id) continue;
                    const key = ev.npc_involved.toLowerCase();
                    // 뒤에 오는 값이 더 최신 (created_at asc 정렬)
                    npcLastPetMap.set(key, {
                        petId: ev.pet_id,
                        summary: typeof ev.event_description === 'string'
                            ? ev.event_description.slice(0, 120)
                            : '',
                    });
                }
            }

            const moodByTime: Record<string, string> = {
                morning: 'curious',
                afternoon: 'relaxed',
                evening: 'reflective',
            };

            // hookForTomorrow 후보 문구 (NPC별 개성 반영)
            const hookTemplates: Record<string, string> = {
                granny_shell: 'Something from yesterday is still with me — I kept one of the smooth stones.',
                professor_clover: 'I left a small mark on the sand field — an unfinished thought. It will still be there.',
                pip: 'I have a message to deliver tomorrow. I have not forgotten.',
                old_finn: 'I told half a story today. The rest keeps.',
                bun_and_bun: 'There is a new recipe to try tomorrow. The ingredient is nearby.',
                digby: 'I found something under the east roots. Left it exactly where it was — for now.',
                default: 'Something from today is not finished yet.',
            };

            for (const npc of npcs) {
                const schedule = npc.schedule as Record<string, string>;
                const targetZone = schedule[timeOfDay];
                if (!targetZone) continue;

                const activity = this.generateNPCActivity(npc.npc_name, targetZone, timeOfDay);
                const npcKey = npc.npc_name.toLowerCase().replace(/\s+/g, '_');

                // v2: 메모리 캐시 우선, 없으면 DB 이벤트 조회 결과 사용
                const cached = recentInteractionCache.get(npc.npc_id);
                const dbResult = npcLastPetMap.get(npc.npc_name.toLowerCase());
                const interactionSource = cached || dbResult;

                // v2: NPCScheduleEntry 구성
                const scheduleEntry: NPCScheduleEntry = {
                    timeOfDay,
                    location: targetZone,
                    activity,
                    mood: moodByTime[timeOfDay] || 'neutral',
                    ...(interactionSource && {
                        reactingToPetId: interactionSource.petId,
                        hookForTomorrow: hookTemplates[npcKey] || hookTemplates.default,
                    }),
                };

                await this.adminClient
                    .from('npc_state')
                    .update({
                        current_zone: scheduleEntry.location,
                        mood: scheduleEntry.mood,
                        current_activity: scheduleEntry.activity,
                        last_updated: new Date().toISOString(),
                    })
                    .eq('npc_id', npc.npc_id);

                // v2: 메모리 캐시 갱신 — 다음 tick에서 연속성 유지
                if (interactionSource) {
                    recentInteractionCache.set(npc.npc_id, interactionSource);
                }

                // v2: schedule_entry를 npc_state에 저장 (컬럼이 있을 때만)
                // schedule_entry 컬럼이 없는 경우 silently skip
                try {
                    await this.adminClient
                        .from('npc_state')
                        .update({ schedule_entry: scheduleEntry })
                        .eq('npc_id', npc.npc_id);
                } catch {
                    // schedule_entry 컬럼 없음 — 무시
                }
            }

            console.log(`[NPCService] v2: Ticked ${npcs.length} NPCs to ${timeOfDay} with activities + reaction context`);
        } catch (err) {
            console.error('[NPCService] tickNPCSchedule error:', err);
        }
    }

    /**
     * v2: 외부에서 recentInteractionCache를 갱신하는 헬퍼.
     * recordNPCInteraction() 호출 시 자동 갱신되므로 직접 호출 불필요.
     */
    updateInteractionCache(npcId: string, petId: string, summary: string): void {
        recentInteractionCache.set(npcId, { petId, summary });
    }

    /**
     * v2: 특정 NPC의 현재 NPCScheduleEntry 반환 (prompt-builder 연동용).
     * DB schedule_entry 컬럼이 없으면 메모리 캐시 기반으로 재구성.
     */
    async getNPCScheduleEntry(npcId: string, npcName: string, timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<NPCScheduleEntry | null> {
        try {
            const { data } = await this.adminClient
                .from('npc_state')
                .select('schedule_entry, current_zone, current_activity, mood')
                .eq('npc_id', npcId)
                .maybeSingle();

            if (data?.schedule_entry) {
                return data.schedule_entry as NPCScheduleEntry;
            }

            // fallback: 현재 상태에서 재구성
            if (!data) return null;
            const cached = recentInteractionCache.get(npcId);
            const npcKey = npcName.toLowerCase().replace(/\s+/g, '_');
            const hookTemplates: Record<string, string> = {
                granny_shell: 'Something from yesterday is still with me — I kept one of the smooth stones.',
                professor_clover: 'I left a small mark on the sand field — an unfinished thought. It will still be there.',
                pip: 'I have a message to deliver tomorrow. I have not forgotten.',
                old_finn: 'I told half a story today. The rest keeps.',
                bun_and_bun: 'There is a new recipe to try tomorrow. The ingredient is nearby.',
                digby: 'I found something under the east roots. Left it exactly where it was — for now.',
                default: 'Something from today is not finished yet.',
            };
            return {
                timeOfDay,
                location: data.current_zone || '',
                activity: data.current_activity || '',
                mood: data.mood || 'neutral',
                ...(cached && {
                    reactingToPetId: cached.petId,
                    hookForTomorrow: hookTemplates[npcKey] || hookTemplates.default,
                }),
            };
        } catch (err) {
            console.error('[NPCService] getNPCScheduleEntry error:', err);
            return null;
        }
    }

    /**
     * Pet 성격에 따른 NPC 반응 스타일을 반환.
     * prompt-builder.ts에서 NPC 반응 묘사에 활용.
     */
    getNPCReactionStyle(
        npcId: string,
        petScores: DimensionalScores
    ): string {
        const isAnxious = petScores.emotional_resilience < 40;
        const isIntroverted = petScores.social_energy < 40;
        const isPlayful = petScores.playfulness_intensity > 60;

        // 내성적이고 불안한 pet에게는 NPC가 조용히 다가감
        if (isAnxious && isIntroverted) {
            return 'approaches slowly, stays at a respectful distance, speaks softly if at all';
        }
        // 활발한 pet에게는 NPC가 적극적으로 반응
        if (isPlayful && !isIntroverted) {
            return 'responds to energy, matches pace, initiates play';
        }
        // 내성적 pet에게는 NPC가 기다림
        if (isIntroverted) {
            return 'does not rush, waits for the pet to initiate, moves predictably';
        }

        return 'friendly and open, takes cues from the pet';
    }

    /**
     * NPC와 pet의 상호작용 기록. 
     * npc_state.interaction_log에 최대 50개 보관.
     */
    async recordNPCInteraction(
        npcId: string,
        petId: string,
        petName: string,
        bdDay: number,
        summary: string
    ): Promise<void> {
        try {
            const { data: npc } = await this.adminClient
                .from('npc_state')
                .select('interaction_log')
                .eq('npc_id', npcId)
                .maybeSingle();

            if (!npc) return;

            const log = ((npc.interaction_log as any[]) || []).slice(-49);
            log.push({ bd_day: bdDay, pet_id: petId, pet_name: petName, summary });

            await this.adminClient
                .from('npc_state')
                .update({
                    interaction_log: log,
                    last_updated: new Date().toISOString(),
                })
                .eq('npc_id', npcId);

            // v2: 메모리 캐시 갱신 — 다음 tick에서 reactingToPetId로 활용
            recentInteractionCache.set(npcId, { petId, summary });
        } catch (err) {
            console.error('[NPCService] recordNPCInteraction error:', err);
        }
    }

    /**
     * Get a pet's interaction history with a specific NPC.
     * Used by the Causal Chain Engine to inject NPC relationship context into feed prompts.
     *
     * @param npcId - snake_case NPC ID (e.g. 'professor_clover', NOT 'Professor Clover')
     * @param petId - UUID of the pet
     * @returns History object with count and last 2 interactions, or null if none
     */
    async getPetNPCHistory(
        npcId: string,
        petId: string
    ): Promise<{ count: number; lastInteractions: Array<{ bd_day: number; summary: string }> } | null> {
        try {
            const { data: npc } = await this.adminClient
                .from('npc_state')
                .select('interaction_log')
                .eq('npc_id', npcId)
                .maybeSingle();

            if (!npc) return null;

            const log = (npc.interaction_log as Array<{ bd_day: number; pet_id: string; pet_name: string; summary: string }>) || [];
            const petLog = log.filter(entry => entry.pet_id === petId);

            if (petLog.length === 0) return null;

            // Return last 2 interactions (most recent first)
            const lastInteractions = petLog
                .slice(-2)
                .reverse()
                .map(entry => ({ bd_day: entry.bd_day, summary: entry.summary }));

            return { count: petLog.length, lastInteractions };
        } catch (err) {
            console.error('[NPCService] getPetNPCHistory error:', err);
            return null;
        }
    }

    // ─── NPC-Pet Relationship Persistence (Phase 2, T2.3) ─────────────────

    /**
     * Records an NPC meeting for a pet. UPSERT: increments interaction_count,
     * appends to shared_memories (FIFO max 5), and transitions relationship_stage.
     */
    async recordNPCMeeting(
        npcId: string,
        petId: string,
        bdDay: number,
        summary: string,
    ): Promise<void> {
        try {
            // Try to fetch existing relationship
            const { data: existing } = await this.adminClient
                .from('npc_pet_relationships')
                .select('id, interaction_count, shared_memories')
                .eq('npc_id', npcId)
                .eq('pet_id', petId)
                .single();

            if (existing) {
                const newCount = existing.interaction_count + 1;
                const memories = Array.isArray(existing.shared_memories)
                    ? existing.shared_memories as Array<{ bd_day: number; summary: string }>
                    : [];
                const updatedMemories = [...memories, { bd_day: bdDay, summary }].slice(-5);
                const stage = newCount >= 3 ? 'familiar' : newCount >= 1 ? 'acquaintance' : 'first_meeting';

                await this.adminClient
                    .from('npc_pet_relationships')
                    .update({
                        interaction_count: newCount,
                        last_interaction_bd: bdDay,
                        relationship_stage: stage,
                        shared_memories: updatedMemories,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);
            } else {
                await this.adminClient
                    .from('npc_pet_relationships')
                    .insert({
                        npc_id: npcId,
                        pet_id: petId,
                        interaction_count: 1,
                        last_interaction_bd: bdDay,
                        relationship_stage: 'first_meeting',
                        shared_memories: [{ bd_day: bdDay, summary }],
                    });
            }
        } catch (err) {
            console.error('[NPCService] recordNPCMeeting error:', err);
        }
    }

    /**
     * Retrieves the NPC-Pet relationship record, or null if no prior meeting.
     */
    async getNPCPetRelationship(
        npcId: string,
        petId: string,
    ): Promise<{
        interaction_count: number;
        relationship_stage: string;
        last_interaction_bd: number;
        shared_memories: Array<{ bd_day: number; summary: string }>;
    } | null> {
        try {
            const { data } = await this.adminClient
                .from('npc_pet_relationships')
                .select('interaction_count, relationship_stage, last_interaction_bd, shared_memories')
                .eq('npc_id', npcId)
                .eq('pet_id', petId)
                .single();

            if (!data) return null;
            return {
                interaction_count: data.interaction_count,
                relationship_stage: data.relationship_stage,
                last_interaction_bd: data.last_interaction_bd,
                shared_memories: (data.shared_memories as Array<{ bd_day: number; summary: string }>) || [],
            };
        } catch (err) {
            console.error('[NPCService] getNPCPetRelationship error:', err);
            return null;
        }
    }
}
