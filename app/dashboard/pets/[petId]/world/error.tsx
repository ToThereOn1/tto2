'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function WorldError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[WorldPage error boundary]', error.message, error.digest)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-4">
            <p className="text-slate-500 text-sm">
                The Waterway is quiet right now. Something went wrong loading this world.
            </p>
            <p className="text-xs text-slate-400 font-mono">{error.message}</p>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                    Try again
                </button>
                <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                    Back to dashboard
                </Link>
            </div>
        </div>
    )
}
