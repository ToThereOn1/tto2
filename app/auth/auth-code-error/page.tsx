'use client'

import Link from 'next/link'

export default function AuthCodeError() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-3">
                        Authentication Error
                    </h1>

                    <p className="text-stone-400 mb-6">
                        Something went wrong during sign-in.<br />
                        Please try again.
                    </p>

                    <div className="space-y-3">
                        <Link
                            href="/login"
                            className="block w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-900 font-medium rounded-xl transition-colors"
                        >
                            Try Again
                        </Link>

                        <Link
                            href="/"
                            className="block w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
