import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, Zap, TrendingUp, Clock } from 'lucide-react'
import { ForceTriggerButton } from './ForceTriggerButton'

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    // Admin check (simplified - in production use proper role system)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get pending letters count
    const { count: pendingCount } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_review', 'borderline_review'])
        .eq('sender_type', 'pet')

    // Get total letters today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count: todayCount } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

    // Get letters by status
    const { data: statusCounts } = await supabase
        .from('letters')
        .select('status')
        .eq('sender_type', 'pet')

    const statusBreakdown = (statusCounts || []).reduce((acc: Record<string, number>, letter: { status: string }) => {
        acc[letter.status] = (acc[letter.status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">운영자 대시보드</h1>
                    <p className="text-gray-600">편지 전송 및 검수 워크플로우 현황 모니터링</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">검수 대기중</p>
                                <p className="text-2xl font-bold text-gray-900">{pendingCount || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">오늘 생성된 편지</p>
                                <p className="text-2xl font-bold text-gray-900">{todayCount || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">전송 진행중</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {(statusBreakdown['sent'] || 0) +
                                        (statusBreakdown['arrived_tothereon'] || 0) +
                                        (statusBreakdown['delivered'] || 0) +
                                        (statusBreakdown['writing_reply'] || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">검수 완료</p>
                                <p className="text-2xl font-bold text-gray-900">{statusBreakdown['approved'] || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Scheduler Section */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">시간 기반 스케줄러</h2>
                    <p className="text-gray-600 mb-6">
                        경과 시간에 따른 편지 상태 변경 스케줄러를 수동으로 강제 실행합니다.<br />
                        운영 환경에서는 크론(Cron) 작업으로 매일 자동 실행됩니다.
                    </p>

                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                        <h3 className="font-medium text-gray-900 mb-3">상태 변화 워크플로우</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">sent</span>
                            <span className="text-gray-400">→ 48h →</span>
                            <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full">arrived_tothereon</span>
                            <span className="text-gray-400">→ 24h →</span>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">delivered</span>
                            <span className="text-gray-400">→ 24h →</span>
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">writing_reply</span>
                            <span className="text-gray-400">→ 24h →</span>
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">pending_review</span>
                            <span className="text-gray-400">→</span>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full">borderline_review</span>
                            <span className="text-gray-400">→ 운영자 검수 →</span>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">approved</span>
                        </div>
                    </div>

                    <ForceTriggerButton />
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 실행</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link
                            href="/admin/letters"
                            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                        >
                            <Mail className="w-8 h-8 text-purple-600" />
                            <div>
                                <h3 className="font-medium text-gray-900">편지 검수하기</h3>
                                <p className="text-sm text-gray-500">
                                    현재 {pendingCount || 0}통의 편지가 검수를 기다리고 있습니다.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
