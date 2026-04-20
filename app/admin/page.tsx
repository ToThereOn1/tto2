
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, Users, UserCheck } from 'lucide-react';

export default function AdminDashboardPage() {
    const supabase = createClient();
    const [stats, setStats] = useState({
        pendingLetters: 0,
        totalPets: 0,
        activeUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

                if (error) throw error;

                if (data) {
                    setStats({
                        pendingLetters: data.pendingLetters || 0,
                        totalPets: data.totalPets || 0,
                        activeUsers: data.activeUsers || 0
                    });
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats', error);
                // Fallback or explicit error handling
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className={`p-4 rounded-full ${color} bg-opacity-10`}>
                <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</h3>
                {loading ? (
                    <div className="h-8 w-16 bg-slate-100 rounded animate-pulse mt-1" />
                ) : (
                    <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="검수 대기중"
                    value={stats.pendingLetters}
                    icon={Mail}
                    color="text-emerald-500 bg-emerald-500"
                />
                <StatCard
                    title="총 등록된 펫"
                    value={stats.totalPets}
                    icon={Users}
                    color="text-indigo-500 bg-indigo-500"
                />
                <StatCard
                    title="활성 유저"
                    value={stats.activeUsers}
                    icon={UserCheck}
                    color="text-blue-500 bg-blue-500"
                />
            </div>

            <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center py-24">
                <div className="max-w-md mx-auto">
                    <h3 className="text-lg font-medium text-slate-900 mb-2">관리자 관제탑에 오신 것을 환영합니다</h3>
                    <p className="text-slate-500 mb-8">
                        사이드바에서 메뉴를 선택하여 콘텐츠를 관리하거나 편지를 검수해주세요.
                    </p>
                </div>
            </div>
        </div>
    );
}
