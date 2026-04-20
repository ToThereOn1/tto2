
'use client';

import JsonEditor from '@/components/admin/JsonEditor';
import { WORLDBOOK } from '@/lib/worldview-constants';
import { CANON_NPCS } from '@/lib/world-bible';

const DEFAULT_NPC_LIST = {
    npcs: [
        ...CANON_NPCS.map(g => ({
            id: g.id,
            name: `${g.name} (${g.species})`,
            role: g.role,
            zone: Array.isArray(g.zones) ? g.zones[0] : 'Various',
            personality: g.speaking_style,
            dialogues: { greeting: `Welcome to ToThereOn. I am ${g.name}.` }
        })),
        ...WORLDBOOK.EVENT_NPCS.map(n => ({
            id: n.id,
            name: `${n.name} (${n.species})`,
            role: 'Companion NPC',
            zone: 'Various',
            personality: `${n.personality} - ${n.trait}`,
            dialogues: { greeting: `Hi! I'm ${n.name}!` }
        }))
    ]
};

export default function NPCManagerPage() {
    return (
        <div className="max-w-5xl mx-auto">
            <JsonEditor
                configKey="npc_list"
                configType="npc"
                defaultData={DEFAULT_NPC_LIST}
                title="NPC Manager (NPC 페르소나 관리)"
                description="NPC 캐릭터, 역할, 주요 활동 지역 및 대화를 관리합니다."
            />
        </div>
    );
}
