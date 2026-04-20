/**
 * WitnessService — Living Universe Phase 3
 * 
 * 중요 이벤트 발생 시 같은 구역의 다른 pet들에게 "목격 기억"을 주입.
 * 이 기억은 RAG를 통해 나중에 편지에 자연스럽게 반영된다.
 */

import { createAdminClient } from '@/lib/supabase/server';

export interface WitnessEvent {
    bd_day: number;
    zone_id: string;
    /** 사건의 주인공 (목격 대상) */
    subject_pet_id: string;
    subject_pet_name: string;
    /** 사건 요약 (1-2 문장, 소문으로 퍼질 내용) */
    summary: string;
    /** 사건의 종류 */
    event_type: 'reunion' | 'milestone' | 'arrival' | 'special' | 'daily';
    /** 이 이벤트가 소문으로 퍼질 중요도 (0-1) */
    importance: number;
}

export class WitnessService {
    private adminClient = createAdminClient();

    /**
     * 같은 구역의 모든 pet에게 목격 기억 삽입.
     * 목격한 내용은 pet_memories에 'witness' 타입으로 저장되어
     * 나중에 RAG 검색 시 편지에 반영된다.
     */
    async propagateWitness(
        event: WitnessEvent,
        witnessedByPetIds: string[]
    ): Promise<void> {
        if (witnessedByPetIds.length === 0 || event.importance < 0.2) return;

        const witnessContent = this.buildWitnessMemory(event);

        try {
            // 각 목격자의 pet_memories에 삽입
            const inserts = witnessedByPetIds
                .filter(id => id !== event.subject_pet_id) // 본인 제외
                .map(petId => ({
                    pet_id: petId,
                    source_type: 'event' as const,
                    content: witnessContent,
                    summary: event.summary,
                }));

            if (inserts.length === 0) return;

            const { error } = await this.adminClient
                .from('pet_memories')
                .insert(inserts);

            if (error) {
                console.warn('[WitnessService] Memory insert failed:', error.message);
            } else {
                console.log(`[WitnessService] Witness memory injected into ${inserts.length} pets for event: "${event.summary}"`);
            }
        } catch (err) {
            console.error('[WitnessService] propagateWitness error:', err);
        }
    }

    /**
     * NPC를 통한 소문 전파.
     * excitement > 0.5인 이벤트는 다른 구역으로도 퍼진다.
     * (예: 토리가 다른 구역의 친구들에게 전달)
     */
    async spreadRumor(
        event: WitnessEvent,
        rumorCarrierNpcId: string,
        targetZonePetIds: string[]
    ): Promise<void> {
        if (event.importance < 0.6 || targetZonePetIds.length === 0) return;

        const rumorContent = this.buildRumorMemory(event, rumorCarrierNpcId);

        try {
            const inserts = targetZonePetIds.map(petId => ({
                pet_id: petId,
                source_type: 'event' as const,
                content: rumorContent,
                summary: `Rumor: ${event.summary}`,
            }));

            if (inserts.length === 0) return;

            const { error } = await this.adminClient
                .from('pet_memories')
                .insert(inserts);

            if (error) {
                console.warn('[WitnessService] Rumor insert failed:', error.message);
            } else {
                console.log(`[WitnessService] Rumor spread to ${inserts.length} pets via NPC ${rumorCarrierNpcId}`);
            }
        } catch (err) {
            console.error('[WitnessService] spreadRumor error:', err);
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private buildWitnessMemory(event: WitnessEvent): string {
        const dayLabel = `BD ${event.bd_day}`;
        switch (event.event_type) {
            case 'reunion':
                return `[${dayLabel}, ${event.zone_id}] I saw ${event.subject_pet_name} meet their guardian today. ${event.summary}`;
            case 'milestone':
                return `[${dayLabel}, ${event.zone_id}] Something special happened to ${event.subject_pet_name}. ${event.summary}`;
            case 'arrival':
                return `[${dayLabel}, ${event.zone_id}] A newcomer named ${event.subject_pet_name} arrived. ${event.summary}`;
            default:
                return `[${dayLabel}, ${event.zone_id}] I noticed ${event.subject_pet_name} today. ${event.summary}`;
        }
    }

    private buildRumorMemory(event: WitnessEvent, npcId: string): string {
        const npcNames: Record<string, string> = {
            tory: 'Tory', happy: 'Happy', lightning: 'Lightning', wind: 'Wind',
            cloud: 'Cloud', choco: 'Choco', star: 'Star', mong: 'Mong',
            ruby: 'Ruby', bokshil: 'Bokshil', old_finn: 'Old Finn', digby: 'Digby',
            granny_shell: 'Granny Shell', professor_clover: 'Professor Clover',
            pip: 'Pip', bun_and_bun: 'Bun & Bun',
        };
        const npcName = npcNames[npcId] || 'a friend';
        return `[BD ${event.bd_day}, rumor] ${npcName} told me about ${event.subject_pet_name}: ${event.summary}`;
    }
}
