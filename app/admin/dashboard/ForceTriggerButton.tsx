'use client'

import { useState } from 'react'
import { Zap, Loader2, CheckCircle } from 'lucide-react'

interface TriggerResult {
    success: boolean
    transitions: Array<{
        letterId: string
        petName: string
        from: string
        to: string
    }>
    error?: string
}

export function ForceTriggerButton() {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<TriggerResult | null>(null)

    const handleTrigger = async () => {
        setIsLoading(true)
        setResult(null)

        try {
            const response = await fetch('/api/admin/scheduler/force-trigger', {
                method: 'POST',
            })
            const data = await response.json()
            setResult(data)
        } catch (error) {
            setResult({
                success: false,
                transitions: [],
                error: '스케줄러 실행에 실패했습니다'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div>
            <button
                onClick={handleTrigger}
                disabled={isLoading}
                className="flex items-center gap-3 px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>처리중...</span>
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <span>⚡ 스케줄러 강제 실행 상태 점검</span>
                    </span>
                )}
            </button>

            {result && (
                <div className={`mt-6 p-4 rounded-xl ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {result.success ? (
                        <>
                            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                <CheckCircle className="w-5 h-5" />
                                스케줄러 작업이 성공적으로 완료되었습니다
                            </div>
                            {result.transitions.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-green-600">{result.transitions.length}통의 편지 상태가 변경되었습니다:</p>
                                    <ul className="text-sm text-green-700 space-y-1">
                                        {result.transitions.map((t, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <span className="font-medium">{t.petName}</span>
                                                <span className="text-green-500">•</span>
                                                <span className="px-2 py-0.5 bg-green-100 rounded text-xs">{t.from}</span>
                                                <span>→</span>
                                                <span className="px-2 py-0.5 bg-green-200 rounded text-xs">{t.to}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <p className="text-sm text-green-600">현재 상태가 변경될 조건에 해당하는 편지가 없습니다.</p>
                            )}
                        </>
                    ) : (
                        <p className="text-red-700">{result.error}</p>
                    )}
                </div>
            )}
        </div>
    )
}
