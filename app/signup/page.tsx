'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { ConsentModal } from '@/components/ui/ConsentModal'
import { TERMS_VERSION, REQUIRED_CONSENT_ITEMS } from '@/lib/constants/terms'

export default function SignUpPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [consentOpen, setConsentOpen] = useState(false)
    const [pendingProvider, setPendingProvider] = useState<'google' | 'facebook' | null>(null)

    const initiateSignUp = (provider: 'google' | 'facebook') => {
        setPendingProvider(provider)
        setConsentOpen(true)
    }

    const handleConsentAccepted = async () => {
        // Persist consent data to sessionStorage — ConsentSaver will save to DB after OAuth completes
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('consent_pending', JSON.stringify({
                terms_version: TERMS_VERSION,
                consented_at: new Date().toISOString(),
                consent_items: [...REQUIRED_CONSENT_ITEMS],
            }))
        }
        setConsentOpen(false)
        if (!pendingProvider) return
        setIsLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: pendingProvider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (err) {
            setError(`Failed to sign up with ${pendingProvider === 'google' ? 'Google' : 'Facebook'}. Please try again.`)
            console.error(err)
        } finally {
            setIsLoading(false)
            setPendingProvider(null)
        }
    }

    const handleGoogleSignUp = () => initiateSignUp('google')
    const handleFacebookSignUp = () => initiateSignUp('facebook')

    return (
        <>
        <ConsentModal isOpen={consentOpen} onAccept={handleConsentAccepted} />
        <main
            className="min-h-screen flex items-center justify-center p-6"
            style={{
                background: 'var(--color-background)',
            }}
        >
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center group">
                        <Image src="/logo-ci.svg" alt="ToThereOn" width={180} height={50} className="flex-shrink-0 h-10 w-auto group-hover:scale-105 transition-transform" priority />
                    </Link>
                </div>

                {/* Sign Up Card */}
                <div className="step-card">
                    <h2
                        className="text-2xl font-semibold text-center mb-2"
                        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}
                    >
                        Create Account
                    </h2>
                    <p
                        className="text-center mb-8"
                        style={{ color: 'var(--color-text-secondary)', fontSize: '16px' }}
                    >
                        Begin your journey of connection with your beloved pet
                    </p>

                    {error && (
                        <div
                            className="p-4 rounded-xl mb-6 text-center text-sm"
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Benefits */}
                    <div
                        className="p-4 rounded-xl mb-6"
                        style={{
                            background: 'rgba(74, 144, 226, 0.05)',
                        }}
                    >
                        <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <li className="flex items-center gap-2">
                                <span style={{ color: 'var(--color-primary)' }}>✓</span>
                                Register your companion — free to start
                            </li>
                            <li className="flex items-center gap-2">
                                <span style={{ color: 'var(--color-primary)' }}>✓</span>
                                Weekly updates from their world
                            </li>
                            <li className="flex items-center gap-2">
                                <span style={{ color: 'var(--color-primary)' }}>✓</span>
                                Send and receive letters
                            </li>
                        </ul>
                    </div>

                    {/* OAuth Buttons */}
                    <div className="space-y-4">
                        <button
                            onClick={handleGoogleSignUp}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl border transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: '#FFFFFF',
                                borderColor: 'var(--color-border)',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            <span
                                className="font-medium"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                Sign up with Google
                            </span>
                        </button>

                        <button
                            onClick={handleFacebookSignUp}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: '#1877F2' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span className="font-medium text-white">
                                Sign up with Facebook
                            </span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div
                            className="flex-1 h-px"
                            style={{ background: 'var(--color-border)' }}
                        />
                        <span
                            className="text-sm"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            or
                        </span>
                        <div
                            className="flex-1 h-px"
                            style={{ background: 'var(--color-border)' }}
                        />
                    </div>

                    {/* Login Link */}
                    <p
                        className="text-center"
                        style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}
                    >
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            Sign In
                        </Link>
                    </p>
                </div>

                {/* Terms */}
                <p
                    className="text-center mt-6 text-xs leading-relaxed"
                    style={{ color: 'var(--color-text-tertiary)' }}
                >
                    You will be asked to confirm a few things before proceeding.{' '}
                    <Link href="/terms" className="underline">Terms of Service</Link>
                    {' '}·{' '}
                    <Link href="/privacy" className="underline">Privacy Policy</Link>
                </p>

                {/* Back to Home */}
                <p className="text-center mt-4">
                    <Link
                        href="/"
                        className="text-sm hover:underline"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        ← Back to Home
                    </Link>
                </p>
            </div>
        </main>
        </>
    )
}
