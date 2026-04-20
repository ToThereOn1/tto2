/**
 * InteractionService — Living Universe Phase 2
 * 
 * 같은 구역에 있는 pet들 사이의 상호작용을 결정하고 기록한다.
 * - 관계 생성/업그레이드 (acquaintance → friend → close_friend → best_friend)
 * - 상호작용 이벤트 DB 기록
 * - 이벤트 생성 시 "오늘의 동반자" 컨텍스트 제공
 */

import { createAdminClient } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RelationshipType = 'acquaintance' | 'friend' | 'close_friend' | 'best_friend';

export interface PetRelationship {
    pet_a_id: string;
    pet_b_id: string;
    relationship_type: RelationshipType;
    first_met_bd: number;
    interaction_count: number;
    last_interaction_bd: number | null;
    shared_memories: SharedMemory[];
}

export interface SharedMemory {
    bd_day: number;
    zone: string;
    summary: string;
}

export interface TodaysCompanion {
    pet_id: string;
    pet_name: string;
    species: string;
    relationship_type: RelationshipType;
    interaction_count: number;
    last_shared_memory?: string;
}

// 관계 업그레이드 임계값
const RELATIONSHIP_THRESHOLDS: Record<RelationshipType, number> = {
    acquaintance: 0,
    friend: 3,
    close_friend: 7,
    best_friend: 15,
};

function determineRelationshipType(interactionCount: number): RelationshipType {
    if (interactionCount >= RELATIONSHIP_THRESHOLDS.best_friend) return 'best_friend';
    if (interactionCount >= RELATIONSHIP_THRESHOLDS.close_friend) return 'close_friend';
    if (interactionCount >= RELATIONSHIP_THRESHOLDS.friend) return 'friend';
    return 'acquaintance';
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class InteractionService {
    private adminClient = createAdminClient();

    /**
     * 특정 pet의 현재 관계 목록 조회.
     * 이벤트 생성 시 "오늘의 동반자" 컨텍스트 제공에 사용.
     */
    async getRelationships(petId: string): Promise<TodaysCompanion[]> {
        try {
            // pet_a_id 또는 pet_b_id로 조회 (양방향)
            const { data, error } = await this.adminClient
                .from('pet_relationships')
                .select(`
                    pet_a_id, pet_b_id, relationship_type,
                    interaction_count, last_interaction_bd, shared_memories,
                    pet_a:pets!pet_relationships_pet_a_id_fkey(id, name, species),
                    pet_b:pets!pet_relationships_pet_b_id_fkey(id, name, species)
                `)
                .or(`pet_a_id.eq.${petId},pet_b_id.eq.${petId}`)
                .order('interaction_count', { ascending: false })
                .limit(5);

            if (error || !data) return [];

            return data.map((row: any) => {
                const isA = row.pet_a_id === petId;
                const other = isA ? row.pet_b : row.pet_a;
                const memories: SharedMemory[] = row.shared_memories || [];
                return {
                    pet_id: other.id,
                    pet_name: other.name,
                    species: other.species,
                    relationship_type: row.relationship_type as RelationshipType,
                    interaction_count: row.interaction_count,
                    last_shared_memory: memories.at(-1)?.summary,
                };
            });
        } catch (err) {
            console.error('[InteractionService] getRelationships error:', err);
            return [];
        }
    }

    /**
     * 두 pet이 같은 구역에서 만났을 때 호출.
     * 새 관계를 생성하거나 기존 관계를 업그레이드한다.
     */
    async recordMeeting(
        petAId: string,
        petBId: string,
        bdDay: number,
        zoneId: string,
        eventSummary: string
    ): Promise<void> {
        try {
            // 정렬: 항상 작은 ID가 pet_a (중복 방지)
            const [aId, bId] = [petAId, petBId].sort();

            const sharedMemory: SharedMemory = {
                bd_day: bdDay,
                zone: zoneId,
                summary: eventSummary.slice(0, 120),
            };

            // 기존 관계 조회
            const { data: existing } = await this.adminClient
                .from('pet_relationships')
                .select('id, interaction_count, shared_memories')
                .eq('pet_a_id', aId)
                .eq('pet_b_id', bId)
                .maybeSingle();

            if (existing) {
                // 기존 관계 업데이트
                const newCount = existing.interaction_count + 1;
                const newType = determineRelationshipType(newCount);
                const memories: SharedMemory[] = [
                    ...(existing.shared_memories || []).slice(-19),
                    sharedMemory,
                ];

                await this.adminClient
                    .from('pet_relationships')
                    .update({
                        interaction_count: newCount,
                        relationship_type: newType,
                        last_interaction_bd: bdDay,
                        shared_memories: memories,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);

                console.log(`[Interaction] ${aId} ↔ ${bId}: count=${newCount}, type=${newType}`);
            } else {
                // 첫 만남 — 새 관계 생성 (upsert to prevent duplicate key on concurrent cron runs)
                await this.adminClient
                    .from('pet_relationships')
                    .upsert({
                        pet_a_id: aId,
                        pet_b_id: bId,
                        relationship_type: 'acquaintance',
                        first_met_bd: bdDay,
                        interaction_count: 1,
                        last_interaction_bd: bdDay,
                        shared_memories: [sharedMemory],
                    }, { onConflict: 'pet_a_id,pet_b_id', ignoreDuplicates: true });

                console.log(`[Interaction] First meeting: ${aId} ↔ ${bId} at ${zoneId}`);
            }
        } catch (err) {
            console.error('[InteractionService] recordMeeting error:', err);
        }
    }

    /**
     * 같은 구역의 pet 목록에서 오늘의 상호작용 파트너를 결정.
     * 관계가 깊을수록 만날 확률 + 선택 가중치 증가.
     */
    async selectInteractionPartner(
        petId: string,
        zonePets: Array<{ pet_id: string; pet_name: string; species: string }>
    ): Promise<{ pet_id: string; pet_name: string; species: string } | null> {
        if (zonePets.length === 0) return null;

        // 관계 조회 → 가중치 맵 생성
        const relationships = await this.getRelationships(petId);
        const relMap = new Map(relationships.map(r => [r.pet_id, r]));

        // 기본 35% + 아는 pet이 존에 있으면 보너스 +20%
        const hasKnownPetInZone = zonePets.some(p => relMap.has(p.pet_id));
        const interactionChance = 0.35 + (hasKnownPetInZone ? 0.20 : 0);
        if (Math.random() > interactionChance) return null;

        // 가중 선택: 관계가 깊을수록 가중치 높음, 새 만남도 가능
        const weights = zonePets.map(p => {
            const rel = relMap.get(p.pet_id);
            if (!rel) return 1;  // 새 만남
            switch (rel.relationship_type) {
                case 'best_friend': return 8;
                case 'close_friend': return 5;
                case 'friend': return 3;
                default: return 2;  // acquaintance
            }
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        for (let i = 0; i < zonePets.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return zonePets[i];
        }
        return zonePets[zonePets.length - 1];
    }
}
