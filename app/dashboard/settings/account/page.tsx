'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AccountSettingsPage() {
    const router = useRouter()
    const [confirmText, setConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)

    const handleDeleteAccount = async () => {
        if (confirmText !== 'DELETE') return

        setIsDeleting(true)
        setError(null)

        try {
            const res = await fetch('/api/account', { method: 'DELETE' })
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete account')
            }

            // Sign out and redirect to home
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/?account=deleted')
        } catch (err: any) {
            setError(err.message)
            setIsDeleting(false)
        }
    }

    return (
        <main className="container" style={{ paddingTop: '120px', maxWidth: '800px' }}>
            <h1 className="text-h2 mb-8">Account</h1>

            {/* Legal Documents */}
            <div className="step-card mb-6">
                <h2 className="text-xl font-bold mb-4">Legal</h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium">Terms of Service</p>
                            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Last updated March 5, 2026</p>
                        </div>
                        <Link
                            href="/terms"
                            target="_blank"
                            className="text-sm font-medium hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            View →
                        </Link>
                    </div>
                    <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                        <div>
                            <p className="font-medium">Privacy Policy</p>
                            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Last updated March 5, 2026</p>
                        </div>
                        <Link
                            href="/privacy"
                            target="_blank"
                            className="text-sm font-medium hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            View →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Data Rights */}
            <div className="step-card mb-6">
                <h2 className="text-xl font-bold mb-2">Your Data Rights</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Under GDPR and CCPA, you have the right to access, correct, or delete your personal data at any time.
                    For data export requests, contact <strong>privacy@tothereon.com</strong>.
                </p>
                <div className="flex gap-3 flex-wrap">
                    <a
                        href="mailto:privacy@tothereon.com?subject=Data Access Request"
                        className="button-secondary-active text-sm"
                    >
                        Request Data Export
                    </a>
                    <a
                        href="mailto:support@tothereon.com?subject=Data Correction Request"
                        className="button-secondary-active text-sm"
                    >
                        Request Data Correction
                    </a>
                </div>
            </div>

            {/* Danger Zone */}
            <div
                className="step-card mb-6"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: '1px', borderStyle: 'solid' }}
            >
                <h2 className="text-xl font-bold mb-2" style={{ color: '#EF4444' }}>Danger Zone</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Permanently delete your account and all associated data, including your pet's persona, all generated letters,
                    and your profile. <strong>This action is irreversible.</strong> Per our Terms of Service, data will be
                    permanently removed within 30 days.
                </p>

                {!showConfirm ? (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#EF4444',
                        }}
                    >
                        Delete My Account
                    </button>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Type <strong>DELETE</strong> to confirm permanent account deletion:
                        </p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type DELETE to confirm"
                            className="w-full px-4 py-3 rounded-xl border text-sm font-mono"
                            style={{
                                borderColor: confirmText === 'DELETE' ? '#EF4444' : 'var(--color-border)',
                                outline: 'none',
                            }}
                        />
                        {error && (
                            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={confirmText !== 'DELETE' || isDeleting}
                                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: confirmText === 'DELETE' ? '#EF4444' : 'rgba(239, 68, 68, 0.1)',
                                    color: confirmText === 'DELETE' ? 'white' : '#EF4444',
                                }}
                            >
                                {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
                            </button>
                            <button
                                onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null) }}
                                className="px-4 py-2 rounded-xl text-sm font-medium"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}
