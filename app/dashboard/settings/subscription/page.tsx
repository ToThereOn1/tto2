'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PRICING_PLANS, PLAN_LETTER_LIMITS } from '@/lib/constants/plans'
import { differenceInDays, format } from 'date-fns'
import { CheckCircle2, AlertCircle, Clock, Mail, Calendar, Zap, ArrowUpRight } from 'lucide-react'

interface SubscriptionData {
    tier: string
    status: string
    current_period_end: string | null
    cancel_at: string | null
}

interface QuotaData {
    letters_sent: number
    letters_allowed: number
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }> = {
        active:   { label: 'Active',   color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   Icon: CheckCircle2 },
        trialing: { label: 'Trial',    color: '#0284c7', bg: 'rgba(2,132,199,0.08)',   Icon: Clock },
        past_due: { label: 'Past Due', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   Icon: AlertCircle },
        canceled: { label: 'Canceled', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', Icon: AlertCircle },
    }
    const c = config[status] ?? config.active
    const Icon = c.Icon
    return (
        <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
            style={{ color: c.color, background: c.bg }}
        >
            <Icon className="w-3.5 h-3.5" />
            {c.label}
        </span>
    )
}

function Skeleton({ w, h }: { w: string; h: string }) {
    return (
        <div
            className="rounded-lg animate-pulse"
            style={{ width: w, height: h, background: 'var(--color-border-light)' }}
        />
    )
}

export default function SubscriptionPage() {
    const [loading, setLoading] = useState(true)
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
    const [quota, setQuota] = useState<QuotaData>({ letters_sent: 0, letters_allowed: 0 })
    const [tier, setTier] = useState<string>('free')

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Check subscriptions table for active subscription
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('tier, status, current_period_end, cancel_at')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing', 'past_due'])
                .maybeSingle()

            // 2. Resolve tier with fallback to users.subscription_tier
            let resolvedTier = sub?.tier || null
            if (!resolvedTier) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('subscription_tier')
                    .eq('id', user.id)
                    .maybeSingle()
                resolvedTier = userData?.subscription_tier || 'free'
            }
            resolvedTier = (resolvedTier as string).toLowerCase()
            setTier(resolvedTier)

            if (sub) {
                setSubscription({
                    tier: resolvedTier,
                    status: sub.status,
                    current_period_end: sub.current_period_end,
                    cancel_at: sub.cancel_at,
                })
            }

            // 3. Count letters sent this calendar month
            const monthStart = new Date()
            monthStart.setDate(1)
            monthStart.setHours(0, 0, 0, 0)

            const { count: sentCount } = await supabase
                .from('letters')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('sender_type', 'user')
                .gte('created_at', monthStart.toISOString())

            const allowed = PLAN_LETTER_LIMITS[resolvedTier as keyof typeof PLAN_LETTER_LIMITS] ?? 0
            setQuota({ letters_sent: sentCount ?? 0, letters_allowed: allowed })
            setLoading(false)
        }

        fetchData()
    }, [])

    const planConfig = PRICING_PLANS[tier as keyof typeof PRICING_PLANS] ?? PRICING_PLANS.free
    const isFree = tier === 'free'
    const renewalDate = subscription?.cancel_at
        ? new Date(subscription.cancel_at)
        : subscription?.current_period_end
        ? new Date(subscription.current_period_end)
        : null
    const daysUntilRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null
    const quotaPercent = quota.letters_allowed > 0
        ? Math.min(100, Math.round((quota.letters_sent / quota.letters_allowed) * 100))
        : 0
    const quotaBarColor = quotaPercent >= 90 ? '#dc2626' : quotaPercent >= 70 ? '#f59e0b' : '#4A90E2'

    return (
        <main className="container" style={{ paddingTop: '120px', maxWidth: '800px' }}>
            <h1 className="text-h2 mb-8">Subscription</h1>

            {/* ── Current Plan ─────────────────────────────────────────── */}
            <div className="step-card mb-6">
                <h2 className="text-xl font-bold mb-5">Current Plan</h2>

                {loading ? (
                    <div className="space-y-3">
                        <Skeleton w="180px" h="32px" />
                        <Skeleton w="120px" h="20px" />
                    </div>
                ) : (
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>
                                    {(planConfig as any).name ?? tier.charAt(0).toUpperCase() + tier.slice(1)}
                                </h3>
                                {!isFree && subscription && (
                                    <StatusBadge status={subscription.status} />
                                )}
                            </div>
                            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                {isFree
                                    ? 'Free — no billing'
                                    : `$${(planConfig as any).price_usd ?? '9.99'}/month`
                                }
                            </p>

                            {renewalDate && (
                                <div
                                    className="flex items-center gap-1.5 mt-3 text-sm"
                                    style={{ color: subscription?.cancel_at ? '#dc2626' : 'var(--color-text-secondary)' }}
                                >
                                    <Calendar className="w-4 h-4 shrink-0" />
                                    {subscription?.cancel_at
                                        ? `Cancels on ${format(renewalDate, 'MMM d, yyyy')}`
                                        : `Renews on ${format(renewalDate, 'MMM d, yyyy')}`
                                    }
                                    {daysUntilRenewal !== null && daysUntilRenewal >= 0 && (
                                        <span
                                            className="ml-1 text-xs px-2 py-0.5 rounded-full"
                                            style={{ background: 'var(--color-border-light)', color: 'var(--color-text-tertiary)' }}
                                        >
                                            {daysUntilRenewal === 0 ? 'Today' : `${daysUntilRenewal}d left`}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {!isFree && (
                            <div className="shrink-0 space-y-1 text-sm text-right" style={{ color: 'var(--color-text-secondary)' }}>
                                <div className="flex items-center justify-end gap-1.5">
                                    <Mail className="w-4 h-4" />
                                    <span>{quota.letters_allowed} letters / month</span>
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                    <Zap className="w-4 h-4" />
                                    <span>Feed twice a week</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 mt-6 pt-6 flex-wrap" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                    <Link href="/pricing">
                        <button className="button-secondary-active flex items-center gap-1.5">
                            {isFree ? 'Upgrade Plan' : 'Change Plan'}
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </Link>
                    {!isFree && subscription?.status === 'active' && !subscription?.cancel_at && (
                        <Link href="/dashboard/settings/account">
                            <button
                                className="text-sm px-4 py-2 rounded-xl transition-colors"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                Cancel subscription
                            </button>
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Letter Quota ──────────────────────────────────────────── */}
            <div className="step-card mb-6">
                <h2 className="text-xl font-bold mb-5">Letter Quota — This Month</h2>

                {loading ? (
                    <div className="space-y-3">
                        <Skeleton w="100%" h="16px" />
                        <Skeleton w="60%" h="14px" />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-3 text-sm">
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                {quota.letters_sent} of {quota.letters_allowed} letters sent this month
                            </span>
                            <span className="font-semibold" style={{ color: quotaBarColor }}>
                                {Math.max(0, quota.letters_allowed - quota.letters_sent)} remaining
                            </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border-light)' }}>
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${quotaPercent}%`,
                                    background: `linear-gradient(90deg, ${quotaBarColor}99, ${quotaBarColor})`,
                                }}
                            />
                        </div>
                        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                            Quota resets on the 1st of each month.
                        </p>
                        {isFree && (
                            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                Free plan includes 2 letters per month.{' '}
                                <Link href="/pricing" className="underline" style={{ color: 'var(--color-primary)' }}>
                                    Upgrade for 4 letters →
                                </Link>
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* ── Plan Features (paid only) ──────────────────────────────── */}
            {!isFree && !loading && (
                <div className="step-card mb-6">
                    <h2 className="text-xl font-bold mb-4">What&apos;s Included</h2>
                    <ul className="space-y-2.5">
                        {((planConfig as any).features ?? []).map((feature: string) => (
                            <li key={feature} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#16a34a' }} />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Upgrade CTA (free users only) ─────────────────────────── */}
            {isFree && !loading && (
                <div
                    className="step-card mb-6"
                    style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid #bae6fd' }}
                >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h2 className="text-lg font-bold mb-1" style={{ color: '#0c4a6e' }}>
                                Upgrade to Basic
                            </h2>
                            <p className="text-sm mb-4" style={{ color: '#075985' }}>
                                Write 4 letters a month and receive heartfelt replies.<br />
                                Status feed updates twice a week.
                            </p>
                            <Link href="/pricing">
                                <button
                                    className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:-translate-y-0.5"
                                    style={{ background: 'linear-gradient(135deg, #0284C7, #38BDF8)' }}
                                >
                                    See Plans →
                                </button>
                            </Link>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-3xl font-bold" style={{ color: '#0284C7' }}>$9.99</p>
                            <p className="text-xs" style={{ color: '#0369a1' }}>/month</p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
