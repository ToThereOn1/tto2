// UpgradeNudge — Pet 등록 한도 초과 시 표시되는 업그레이드 유도 컴포넌트

import Link from 'next/link'

interface UpgradeNudgeProps {
    message: string
    subMessage: string
    ctaText: string
    ctaHref: string
}

export function UpgradeNudge({ message, subMessage, ctaText, ctaHref }: UpgradeNudgeProps) {
    return (
        <div className="mt-4 p-5 rounded-2xl bg-purple-50 border border-purple-100">
            <p className="text-sm font-semibold text-purple-800">{message}</p>
            <p className="text-xs text-purple-600 mt-1">{subMessage}</p>
            <Link
                href={ctaHref}
                className="mt-3 inline-block text-xs font-bold text-white bg-purple-600
                           px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors"
            >
                {ctaText} →
            </Link>
        </div>
    )
}
