/**
 * WorldStateService — Living Universe Phase 1 (+ Defense v2)
 *
 * 전체 ToThereOn 세계의 상태를 관리하는 서비스 레이어.
 * - 모든 pet의 위치를 추적
 * - 구역별 pet 분포 계산 (Privacy opt-out 필터 포함)
 * - 세계 이벤트 영구 기록
 * - 이벤트 생성 전 WorldSnapshot 제공
 *
 * DEFENSE v2 변경사항:
 * - PetInZone에 allows_interaction 플래그 추가
 * - getWorldSnapshot()이 opt-out pet을 서로의 구역 목록에서 제외
 */

import { createAdminClient } from '@/lib/supabase/server';
import { calculateToThereOnTime } from '@/lib/time-engine-v2';
import { getCurrentZone } from '@/lib/zone-manager';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PetInZone {
    pet_id: string;
    pet_name: string;
    species: string;
    zone_id: string;
    current_bd_day: number;
    /** DEFENSE FIX 3: false이면 이 pet은 다른 pet의 컨텍스트에 절대 등장하지 않음 */
    allows_interaction: boolean;
}

export interface WorldEvent {
    bd_day: number;
    event_type: 'pet_daily_event' | 'pet_interaction' | 'npc_event' | 'world_event';
    zone_id: string;
    location_id?: string;
    participants: Array<{ pet_id: string; pet_name: string }>;
    npc_involved?: string;
    description: string;
    first_sentence?: string;
    impact?: Record<string, unknown>;
}

export interface WorldSnapshot {
    /** BD 기준 현재 날짜 */
    globalBdDay: number;
    /** 구역별 pet 목록 */
    petsByZone: Record<string, PetInZone[]>;
    /** 오늘 이미 발생한 이벤트들 (소문/목격용) */
    todaysEvents: WorldEvent[];
    /** 특정 zone에 있는 pet들 반환 */
    getPetsInZone: (zoneId: string) => PetInZone[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class WorldStateService {
    private adminClient = createAdminClient();

    /**
     * 이벤트 생성 루프 시작 전 호출.
     * 모든 pet의 위치를 기반으로 WorldSnapshot을 구성한다.
     */
    async getWorldSnapshot(globalBdDay: number): Promise<WorldSnapshot> {
        try {
            // 1. 모든 활성 pet + 위치 조회 (Privacy 컬럼 포함)
            const { data: pets, error } = await this.adminClient
                .from('pets')
                .select('id, name, species, passed_date, created_at, allow_world_interaction')
                .eq('persona_generated', true);

            if (error || !pets) {
                console.error('[WorldState] Failed to fetch pets:', error);
                return this.emptySnapshot(globalBdDay);
            }

            // 2. 각 pet의 현재 zone 계산 및 pet_locations upsert
            const petsByZone: Record<string, PetInZone[]> = {};
            const locationUpserts: Array<{
                pet_id: string;
                zone_id: string;
                location_id: null;
            }> = [];

            for (const pet of pets) {
                const startDate = pet.passed_date || pet.created_at;
                const { currentDay } = calculateToThereOnTime(startDate);
                const zoneId = getCurrentZone(currentDay);
                const allowsInteraction = pet.allow_world_interaction !== false;

                if (!petsByZone[zoneId]) petsByZone[zoneId] = [];
                petsByZone[zoneId].push({
                    pet_id: pet.id,
                    pet_name: pet.name,
                    species: pet.species,
                    zone_id: zoneId,
                    current_bd_day: currentDay,
                    allows_interaction: allowsInteraction,
                });

                locationUpserts.push({
                    pet_id: pet.id,
                    zone_id: zoneId,
                    location_id: null,
                });
            }

            // DEFENSE FIX 3: getPetsInZone()는 opt-in pet만 반환
            // opt-out pet은 자신의 존재는 기록되지만 타 pet에게 노출 안 됨.

            // 3. pet_locations 일괄 upsert (배치)
            if (locationUpserts.length > 0) {
                const { error: upsertErr } = await this.adminClient
                    .from('pet_locations')
                    .upsert(locationUpserts, { onConflict: 'pet_id' });

                if (upsertErr) {
                    console.warn('[WorldState] pet_locations upsert failed:', upsertErr.message);
                }
            }

            // 4. 오늘의 이벤트 조회
            const { data: todaysEventRows } = await this.adminClient
                .from('world_event_log')
                .select('*')
                .eq('bd_day', globalBdDay)
                .order('created_at', { ascending: true })
                .limit(50);

            const todaysEvents: WorldEvent[] = (todaysEventRows || []).map((row: any) => ({
                bd_day: row.bd_day,
                event_type: row.event_type,
                zone_id: row.zone_id,
                location_id: row.location_id,
                participants: row.participants || [],
                npc_involved: row.npc_involved,
                description: row.description,
                first_sentence: row.first_sentence,
                impact: row.impact || {},
            }));

            // 5. world_state 업데이트
            const zoneDistribution: Record<string, number> = {};
            for (const [zoneId, zonePets] of Object.entries(petsByZone)) {
                zoneDistribution[zoneId] = zonePets.length;
            }

            await this.adminClient
                .from('world_state')
                .update({
                    current_bd: globalBdDay,
                    total_pets: pets.length,
                    zone_distribution: zoneDistribution,
                    last_tick_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows

            console.log(`[WorldState] Snapshot built: ${pets.length} pets across ${Object.keys(petsByZone).length} zones`);

            return {
                globalBdDay,
                petsByZone,
                todaysEvents,
                // DEFENSE FIX 3: opt-out pet은 서로의 getPetsInZone 결과에서 제외
                getPetsInZone: (zoneId: string) =>
                    (petsByZone[zoneId] || []).filter(p => p.allows_interaction),
            };

        } catch (err) {
            console.error('[WorldState] Snapshot failed:', err);
            return this.emptySnapshot(globalBdDay);
        }
    }

    /**
     * 이벤트 생성 완료 후 호출.
     * World Event Log에 영구 기록.
     */
    async logWorldEvent(event: WorldEvent): Promise<void> {
        try {
            const firstSentence = event.description
                ? event.description.split(/[.。!！?？]/)[0]?.trim() || event.description.slice(0, 80)
                : '';

            const { error } = await this.adminClient
                .from('world_event_log')
                .insert({
                    bd_day: event.bd_day,
                    event_type: event.event_type,
                    zone_id: event.zone_id,
                    location_id: event.location_id ?? null,
                    participants: event.participants,
                    npc_involved: event.npc_involved ?? null,
                    description: event.description,
                    first_sentence: firstSentence,
                    impact: event.impact ?? {},
                });

            if (error) {
                console.warn('[WorldState] logWorldEvent failed:', error.message);
            }
        } catch (err) {
            console.error('[WorldState] logWorldEvent error:', err);
        }
    }

    /**
     * 특정 BD 날짜의 세계 이벤트 기록 조회 (Phase 5 API용)
     */
    async getWorldHistory(
        bdDay: number,
        options?: { zoneId?: string; limit?: number }
    ): Promise<WorldEvent[]> {
        let query = this.adminClient
            .from('world_event_log')
            .select('*')
            .eq('bd_day', bdDay)
            .order('created_at', { ascending: true })
            .limit(options?.limit ?? 100);

        if (options?.zoneId) {
            query = query.eq('zone_id', options.zoneId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[WorldState] getWorldHistory error:', error);
            return [];
        }

        return (data || []).map((row: any) => ({
            bd_day: row.bd_day,
            event_type: row.event_type,
            zone_id: row.zone_id,
            location_id: row.location_id,
            participants: row.participants || [],
            npc_involved: row.npc_involved,
            description: row.description,
            first_sentence: row.first_sentence,
            impact: row.impact || {},
        }));
    }

    /**
     * 빈 스냅샷 반환 (에러 시 기존 동작 유지)
     */
    private emptySnapshot(globalBdDay: number): WorldSnapshot {
        return {
            globalBdDay,
            petsByZone: {},
            todaysEvents: [],
            getPetsInZone: () => [],
        };
    }
}
