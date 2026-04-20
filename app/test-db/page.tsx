'use client'

import { useEffect, useState } from 'react'
import { createClient, isMockClient } from '@/lib/supabase/client'
import { getEnvStatus } from '@/lib/check-env'
import Link from 'next/link'

interface TestResult {
    status: 'pending' | 'success' | 'error' | 'mock'
    message: string
    details?: string
    latency?: number
}

export default function TestDBPage() {
    const [envStatus, setEnvStatus] = useState<{
        configured: boolean
        supabaseUrl: boolean
        supabaseKey: boolean
    } | null>(null)

    const [dbTest, setDbTest] = useState<TestResult>({
        status: 'pending',
        message: 'Waiting to test...',
    })

    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Check environment status on mount
        setEnvStatus(getEnvStatus())
    }, [])

    const runConnectionTest = async () => {
        setIsLoading(true)
        setDbTest({ status: 'pending', message: 'Testing connection...' })

        const startTime = Date.now()

        try {
            const supabase = createClient()

            // Check if using mock client
            if (isMockClient(supabase)) {
                setDbTest({
                    status: 'mock',
                    message: '⚠️ Mock Mode Active',
                    details: 'Environment variables not configured. Using mock data.',
                })
                return
            }

            // Create timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Gateway Timeout: Database did not respond within 5 seconds'))
                }, 5000)
            })

            // Actual DB ping
            const dbPromise = supabase
                .from('users')
                .select('count', { count: 'exact', head: true })

            // Race between timeout and actual call
            const { count, error } = await Promise.race([dbPromise, timeoutPromise])

            const latency = Date.now() - startTime

            if (error) {
                // Check if it's a "relation does not exist" error (table not created yet)
                if (error.message?.includes('does not exist')) {
                    setDbTest({
                        status: 'success',
                        message: '✅ DB Connected (Table not found)',
                        details: 'Connection successful, but the "users" table does not exist yet. Please create the database tables.',
                        latency,
                    })
                } else {
                    setDbTest({
                        status: 'error',
                        message: '❌ Connection Failed',
                        details: error.message,
                        latency,
                    })
                }
            } else {
                setDbTest({
                    status: 'success',
                    message: '✅ DB Connected',
                    details: `Successfully connected. Users count: ${count ?? 0}`,
                    latency,
                })
            }
        } catch (err) {
            const latency = Date.now() - startTime
            const message = err instanceof Error ? err.message : 'Unknown error'

            setDbTest({
                status: 'error',
                message: '❌ Connection Failed',
                details: message,
                latency,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main
            className="min-h-screen p-8"
            style={{
                background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F4F8 50%, #E8EEF5 100%)',
            }}
        >
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="text-sm hover:underline mb-4 inline-block"
                        style={{ color: 'var(--color-primary)' }}
                    >
                        ← Back to Home
                    </Link>
                    <h1
                        className="text-3xl font-bold mb-2"
                        style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}
                    >
                        🔧 System Health Check
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Verify environment configuration and database connection
                    </p>
                </div>

                {/* Environment Variables Check */}
                <section className="step-card mb-6">
                    <h2
                        className="text-xl font-semibold mb-4"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        1. Environment Variables
                    </h2>

                    {envStatus ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className={envStatus.supabaseUrl ? 'text-green-500' : 'text-red-500'}>
                                    {envStatus.supabaseUrl ? '✅' : '❌'}
                                </span>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                    NEXT_PUBLIC_SUPABASE_URL
                                </code>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={envStatus.supabaseKey ? 'text-green-500' : 'text-red-500'}>
                                    {envStatus.supabaseKey ? '✅' : '❌'}
                                </span>
                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                                </code>
                            </div>

                            <div
                                className="mt-4 p-4 rounded-xl"
                                style={{
                                    background: envStatus.configured
                                        ? 'rgba(34, 197, 94, 0.1)'
                                        : 'rgba(239, 68, 68, 0.1)',
                                }}
                            >
                                <p
                                    className="font-medium"
                                    style={{
                                        color: envStatus.configured ? '#22C55E' : '#EF4444'
                                    }}
                                >
                                    {envStatus.configured
                                        ? '✅ Environment configured'
                                        : '❌ Environment not configured - Mock mode will be used'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="skeleton h-24 rounded-xl" />
                    )}
                </section>

                {/* Database Connection Test */}
                <section className="step-card mb-6">
                    <h2
                        className="text-xl font-semibold mb-4"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        2. Database Connection (Smoke Test)
                    </h2>

                    <button
                        onClick={runConnectionTest}
                        disabled={isLoading}
                        className="button-primary mb-6"
                    >
                        {isLoading ? 'Testing...' : 'Run Connection Test'}
                    </button>

                    <div
                        className="p-4 rounded-xl"
                        style={{
                            background: dbTest.status === 'success'
                                ? 'rgba(34, 197, 94, 0.1)'
                                : dbTest.status === 'error'
                                    ? 'rgba(239, 68, 68, 0.1)'
                                    : dbTest.status === 'mock'
                                        ? 'rgba(234, 179, 8, 0.1)'
                                        : 'rgba(107, 114, 128, 0.1)',
                        }}
                    >
                        <p
                            className="font-semibold text-lg mb-2"
                            style={{
                                color: dbTest.status === 'success'
                                    ? '#22C55E'
                                    : dbTest.status === 'error'
                                        ? '#EF4444'
                                        : dbTest.status === 'mock'
                                            ? '#EAB308'
                                            : 'var(--color-text-secondary)',
                            }}
                        >
                            {dbTest.message}
                        </p>
                        {dbTest.details && (
                            <p
                                className="text-sm"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {dbTest.details}
                            </p>
                        )}
                        {dbTest.latency !== undefined && (
                            <p
                                className="text-xs mt-2"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                Latency: {dbTest.latency}ms
                            </p>
                        )}
                    </div>
                </section>

                {/* Timeout Configuration Info */}
                <section className="step-card">
                    <h2
                        className="text-xl font-semibold mb-4"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        3. Timeout Settings
                    </h2>

                    <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span>Supabase DB Operations</span>
                            <code className="bg-gray-100 px-2 py-1 rounded">5,000ms</code>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span>Supabase Auth Operations</span>
                            <code className="bg-gray-100 px-2 py-1 rounded">8,000ms</code>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span>LLM API Calls</span>
                            <code className="bg-gray-100 px-2 py-1 rounded">30,000ms</code>
                        </div>
                        <div className="flex justify-between py-2">
                            <span>Default Timeout</span>
                            <code className="bg-gray-100 px-2 py-1 rounded">10,000ms</code>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}
