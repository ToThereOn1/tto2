'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { Toaster, toast } from 'sonner'

function LoginContent() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleGoogleLogin = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) throw error
        } catch (err) {
            const message = 'Failed to sign in with Google. Please try again.'
            setError(message)
            toast.error(message)
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleFacebookLogin = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'facebook',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) throw error
        } catch (err) {
            const message = 'Failed to sign in with Facebook. Please try again.'
            setError(message)
            toast.error(message)
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main
            className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
            style={{
                background: 'var(--color-background)',
            }}
        >
            <Toaster position="top-center" />

            {/* Background Glows */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full -z-10 blur-[80px]"
                style={{
                    background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
                }}
            />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
                className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full -z-10 blur-[80px]"
                style={{
                    background: 'radial-gradient(circle, var(--color-primary-light) 0%, transparent 70%)',
                }}
            />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-10 flex flex-col items-center"
                >
                    <Link href="/" className="group inline-flex items-center mb-2">
                        <Image src="/logo-ci.svg" alt="ToThereOn" width={180} height={50} className="flex-shrink-0 h-10 w-auto group-hover:scale-105 transition-transform" priority />
                    </Link>
                    <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50" />
                </motion.div>

                {/* Login Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="glass-effect p-10 md:p-12 mb-6 backdrop-blur-xl bg-white/70 border border-white/30 shadow-xl"
                    style={{
                        borderRadius: '32px',
                    }}
                >
                    <div className="text-center mb-10">
                        <h2
                            className="text-2xl md:text-3xl font-bold mb-3"
                            style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}
                        >
                            Welcome Home
                        </h2>
                        <p
                            className="text-sm md:text-base leading-relaxed"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            Stay connected with the souls who <br className="hidden md:block" /> guided your journey.
                        </p>
                    </div>

                    {error && (
                        <div
                            className="p-4 rounded-2xl mb-8 text-center text-sm font-medium bg-red-50 text-red-500 border border-red-100"
                        >
                            {error}
                        </div>
                    )}

                    {/* OAuth Buttons */}
                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-4 py-4 px-6 rounded-2xl border transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed group bg-white/50 border-[var(--color-border)]"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin w-5 h-5 text-gray-500" />
                            ) : (
                                <>
                                    <svg width="22" height="22" viewBox="0 0 24 24">
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
                                        className="font-bold text-[15px] tracking-wide"
                                        style={{ color: 'var(--color-text-primary)' }}
                                    >
                                        Continue with Google
                                    </span>
                                </>
                            )}
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: "0 10px 30px -10px rgba(24, 119, 242, 0.3)" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleFacebookLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-4 py-4 px-6 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-[#1877F2] to-[#166FE5] text-white"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin w-5 h-5 text-white" />
                            ) : (
                                <>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    <span className="font-bold text-[15px] uppercase tracking-wider">
                                        Continue with Facebook
                                    </span>
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Implicit Consent - Legal Disclaimer */}
                    <p className="px-8 text-center text-xs text-muted-foreground mt-4 opacity-90">
                        By clicking continue, you agree to our{" "}
                        <Link
                            href="/terms"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/privacy"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p>

                    {/* Divider */}
                    <div className="flex items-center gap-6 my-10">
                        <div
                            className="flex-1 h-px"
                            style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.1), transparent)' }}
                        />
                        <span
                            className="text-xs font-bold uppercase tracking-widest opacity-50"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            or
                        </span>
                        <div
                            className="flex-1 h-px"
                            style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.1), transparent)' }}
                        />
                    </div>

                    {/* Sign Up Link */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-center"
                        style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}
                    >
                        New to ToThereOn?{' '}
                        <Link
                            href="/signup"
                            className="font-bold hover:text-[var(--color-primary)] transition-colors underline-offset-4 hover:underline"
                        >
                            Create an Account
                        </Link>
                    </motion.p>
                </motion.div>

                {/* Footer Links */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-center justify-between px-4"
                >
                    <Link
                        href="/"
                        className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        <ArrowLeft className="w-3 h-3" /> Back to Sanctuary
                    </Link>
                    <Link
                        href="/support"
                        className="text-xs font-bold uppercase tracking-widest hover:opacity-70 transition-opacity flex items-center gap-2"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        Need Help?
                    </Link>
                </motion.div>
            </div>
        </main>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-400" /></div>}>
            <LoginContent />
        </Suspense>
    )
}
