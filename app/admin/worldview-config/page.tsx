
'use client';

import JsonEditor from '@/components/admin/JsonEditor';
import { WORLDBOOK } from '@/lib/worldview-constants';

const DEFAULT_WORLDVIEW_CONFIG = {
    zones: [
        WORLDBOOK.ZONES.CENTRAL_PLAZA,
        ...WORLDBOOK.ZONES.LIVING_AREAS
    ],
    time_rules: {
        ratio: WORLDBOOK.TIME.RATIO,
        description: WORLDBOOK.TIME.CALCULATION
    },
    universe_layers: WORLDBOOK.UNIVERSE.LAYERS,
    core_rules: WORLDBOOK.UNIVERSE.RULES
};

export default function WorldviewConfigPage() {
    return (
        <div className="max-w-5xl mx-auto">
            <JsonEditor
                configKey="worldview_config"
                configType="worldview"
                defaultData={DEFAULT_WORLDVIEW_CONFIG}
                title="Worldview Configuration (세계관 설정)"
                description="지역, 시간 규칙 및 글로벌 이벤트 설정을 관리합니다."
            />
        </div>
    );
}
