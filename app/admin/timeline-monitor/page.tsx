
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { getToThereOnDayProgress } from '@/lib/time-engine'; // Assuming this function exists or mimics logic

export default function TimelineMonitorPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [pets, setPets] = useState<any[]>([]);

    const fetchTimelines = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('pets')
            .select(`
                id, name, created_at, passed_date,
                pet_timelines (current_day, current_zone, last_calculated_at)
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPets(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTimelines();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Timeline Monitor (시간 관제)</h1>
                <button
                    onClick={fetchTimelines}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    새로고침
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">펫 이름</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">현실 등록 시작일</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ToThereOn 경과일</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">현재 체류 구역</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">진행율 상황</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">피드 확인</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <Loader2 className="animate-spin mx-auto text-slate-400" />
                                </td>
                            </tr>
                        ) : pets.map((pet) => {
                            const timeline = Array.isArray(pet.pet_timelines) ? pet.pet_timelines[0] : pet.pet_timelines;
                            const day = timeline?.current_day || 0;
                            const zone = timeline?.current_zone || 'Unknown';

                            // Use real progress calculation
                            const startDate = pet.passed_date || pet.created_at;
                            let progress = 0;
                            try {
                                // Dynamic import or use if available in client context (lib logic is pure JS mostly)
                                const now = new Date();
                                const start = new Date(startDate);
                                const diffMs = now.getTime() - start.getTime();
                                const earthDays = diffMs / (1000 * 60 * 60 * 24);
                                const toThereOnDays = earthDays / 3; // TIME_RATIO = 3
                                progress = (toThereOnDays - Math.floor(toThereOnDays)) * 100;
                            } catch (e) { progress = 0; }

                            return (
                                <tr key={pet.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {pet.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(startDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            Day {day}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {zone}
                                    </td>
                                    <td className="px-6 py-4 w-48">
                                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.max(5, progress)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 block text-right">다음 과정까지 {Math.round(progress)}% 남았습니다.</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a
                                            href={`/dashboard/pets/${pet.id}/status`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                        >
                                            피드 보기 ↗
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
