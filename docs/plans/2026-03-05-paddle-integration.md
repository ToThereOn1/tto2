# Paddle Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all Lemon Squeezy payment infrastructure with Paddle Billing (new version), with zero impact on existing subscription data or user experience.

**Architecture:** Paddle Billing (server-side checkout URL generation) → Paddle Webhooks → Supabase DB update. Mirrors the existing Lemon Squeezy flow exactly — same DB shape, same UX, only the payment provider changes.

**Tech Stack:** Next.js App Router, Paddle Billing REST API v1, HMAC-SHA256 webhook verification, Supabase

---

## Prerequisites (Jay must do in Paddle Dashboard)

1. Create **Basic Monthly** price → copy Price ID (e.g. `pri_01abc...`)
2. Create **Basic Yearly** price → copy Price ID
3. Get **API Key** from Developer > Authentication
4. Get **Webhook Secret** from Developer > Webhooks (after registering endpoint)
5. Register webhook endpoint: `https://tothereon.com/api/webhooks/paddle`
6. Select webhook events: `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`

**Add to `.env.local`:**
```
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
PADDLE_BASIC_MONTHLY_ID=pri_01...
PADDLE_BASIC_YEARLY_ID=pri_01...
PADDLE_ENVIRONMENT=production
# (for sandbox testing use: sandbox)
```

---

## Task 1: DB Migration — Add Paddle columns to subscriptions table

**Files:**
- Create: `sql/migration_paddle.sql`

**Step 1: Write the migration SQL**

```sql
-- Add Paddle columns alongside existing Lemon Squeezy columns
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS paddle_transaction_id  TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_sub_id
  ON subscriptions(paddle_subscription_id);
```

**Step 2: Run in Supabase SQL Editor**

Paste the SQL and execute. Verify no errors.

**Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY column_name;
```
Expected: `paddle_subscription_id`, `paddle_customer_id`, `paddle_transaction_id` appear.

---

## Task 2: Replace `lib/constants/plans.ts` — Paddle Price IDs

**Files:**
- Modify: `lib/constants/plans.ts`

**Step 1: Replace Lemon Squeezy variant ID references with Paddle price IDs**

In the `PRICING_PLANS` object, replace:
```ts
// REMOVE these from basic and premium plan objects:
lemon_squeezy_monthly_id: process.env.LEMON_SQUEEZY_BASIC_MONTHLY_ID,
lemon_squeezy_yearly_id:  process.env.LEMON_SQUEEZY_BASIC_YEARLY_ID,
```

With:
```ts
paddle_monthly_id: process.env.PADDLE_BASIC_MONTHLY_ID,
paddle_yearly_id:  process.env.PADDLE_BASIC_YEARLY_ID,
```

**Step 2: Replace `getTierFromVariantId` with `getTierFromPriceId`**

```ts
/** paddle price_id → PlanTier */
export function getTierFromPriceId(priceId: string): PlanTier {
    const basicMonthly  = process.env.PADDLE_BASIC_MONTHLY_ID
    const basicYearly   = process.env.PADDLE_BASIC_YEARLY_ID
    const premiumMonthly = process.env.PADDLE_PREMIUM_MONTHLY_ID
    const premiumYearly  = process.env.PADDLE_PREMIUM_YEARLY_ID
    if (priceId === basicMonthly  || priceId === basicYearly)   return 'basic'
    if (priceId === premiumMonthly || priceId === premiumYearly) return 'premium'
    console.warn(`[Plans] Unknown Paddle price ID: ${priceId}, defaulting to free`)
    return 'free'
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd tothereon && npx tsc --noEmit
```
Expected: No errors related to plans.ts

---

## Task 3: Replace `/api/subscribe/route.ts` — Paddle Checkout

**Files:**
- Modify: `app/api/subscribe/route.ts`

**Step 1: Rewrite the route**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PADDLE_BASE =
    process.env.PADDLE_ENVIRONMENT === 'sandbox'
        ? 'https://sandbox-api.paddle.com'
        : 'https://api.paddle.com'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { tier } = await req.json()

        let priceId: string | undefined
        if (tier === 'basic_monthly') {
            priceId = process.env.PADDLE_BASIC_MONTHLY_ID
        } else if (tier === 'basic_yearly') {
            priceId = process.env.PADDLE_BASIC_YEARLY_ID
        } else {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
        }

        if (!priceId) {
            return NextResponse.json({ error: 'Price ID not configured' }, { status: 500 })
        }

        const apiKey = process.env.PADDLE_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'Paddle API key not configured' }, { status: 500 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tothereon.com'

        const response = await fetch(`${PADDLE_BASE}/transactions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: [{ priceId, quantity: 1 }],
                customData: { userId: user.id },
                successUrl: `${baseUrl}/dashboard?checkout=success`,
                checkoutSettings: { displayMode: 'redirect' },
            }),
        })

        if (!response.ok) {
            const err = await response.json()
            console.error('[subscribe] Paddle error:', err)
            return NextResponse.json({ error: err?.error?.detail ?? 'Checkout failed' }, { status: 500 })
        }

        const data = await response.json()
        const checkoutUrl = data?.data?.checkout?.url

        if (!checkoutUrl) {
            console.error('[subscribe] No checkout URL:', data)
            return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
        }

        return NextResponse.json({ url: checkoutUrl })
    } catch (error) {
        console.error('[subscribe] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
```

**Step 2: Verify TypeScript**
```bash
npx tsc --noEmit
```

---

## Task 4: Create `/api/webhooks/paddle/route.ts` — Paddle Webhook Handler

**Files:**
- Create: `app/api/webhooks/paddle/route.ts`

Paddle webhook signature format:
```
Paddle-Signature: ts=1234567890;h1=<hmac_hex>
```
Verification: `HMAC-SHA256(secret, ts + ":" + rawBody)`

**Step 1: Create the webhook handler**

```ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { PLAN_PET_LIMITS, PLAN_LETTER_LIMITS, getTierFromPriceId, PlanTier } from '@/lib/constants/plans'

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
    // Format: ts=1234;h1=abc
    const parts = Object.fromEntries(
        signatureHeader.split(';').map(p => p.split('=') as [string, string])
    )
    const ts = parts['ts']
    const h1 = parts['h1']
    if (!ts || !h1) return false

    const signed = crypto
        .createHmac('sha256', secret)
        .update(`${ts}:${rawBody}`)
        .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(signed, 'hex'), Buffer.from(h1, 'hex'))
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text()
        const signatureHeader = request.headers.get('Paddle-Signature') ?? ''
        const secret = process.env.PADDLE_WEBHOOK_SECRET ?? ''

        if (!verifyPaddleSignature(rawBody, signatureHeader, secret)) {
            return new Response('Invalid signature', { status: 401 })
        }

        const event = JSON.parse(rawBody)
        const eventType: string = event.event_type        // e.g. "subscription.created"
        const data = event.data
        const customData = data?.custom_data ?? {}
        const userId: string | undefined = customData?.userId

        const supabase = createAdminClient()

        switch (eventType) {
            case 'subscription.created':
            case 'subscription.updated': {
                if (!userId) {
                    console.error('[paddle-webhook] Missing userId in custom_data')
                    return new Response('Missing userId', { status: 400 })
                }

                // Resolve tier from price ID (first item in items array)
                const priceId: string = data.items?.[0]?.price?.id ?? ''
                const tier: PlanTier = getTierFromPriceId(priceId)
                const status: string = data.status   // 'active' | 'trialing' | 'paused' | 'canceled'

                await supabase.from('subscriptions').upsert({
                    user_id: userId,
                    paddle_subscription_id: data.id,
                    paddle_customer_id: data.customer_id,
                    tier,
                    status,
                    current_period_start: data.current_billing_period?.starts_at ?? null,
                    current_period_end:   data.current_billing_period?.ends_at ?? null,
                    cancel_at:            data.scheduled_change?.effective_at ?? null,
                    cancelled_at:         data.canceled_at ?? null,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'paddle_subscription_id' })

                if (status === 'active' || status === 'trialing') {
                    const petLimit = PLAN_PET_LIMITS[tier] || 1
                    await supabase.from('users').update({
                        subscription_tier: tier,
                        max_pets_allowed: petLimit,
                        pet_limit: petLimit,
                        updated_at: new Date().toISOString(),
                    }).eq('id', userId)

                    // Refresh letter quota for each pet
                    const { data: pets } = await supabase.from('pets').select('id').eq('user_id', userId)
                    if (pets && pets.length > 0) {
                        const periodStart = data.current_billing_period?.starts_at
                            ? new Date(data.current_billing_period.starts_at)
                            : new Date()
                        const billingPeriodKey = periodStart.toISOString().slice(0, 10)
                        const allowedLetters = PLAN_LETTER_LIMITS[tier] || 0

                        for (const pet of pets) {
                            const { data: existing } = await supabase
                                .from('letter_quota')
                                .select('letters_sent')
                                .eq('user_id', userId)
                                .eq('pet_id', pet.id)
                                .eq('month', billingPeriodKey)
                                .single()

                            await supabase.from('letter_quota').upsert({
                                user_id: userId,
                                pet_id: pet.id,
                                month: billingPeriodKey,
                                letters_allowed: allowedLetters,
                                letters_sent: existing?.letters_sent ?? 0,
                                updated_at: new Date().toISOString(),
                            }, { onConflict: 'user_id, pet_id, month' })
                        }
                    }
                }
                break
            }

            case 'subscription.canceled': {
                await supabase.from('subscriptions').update({
                    status: 'canceled',
                    cancelled_at: data.canceled_at ?? new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }).eq('paddle_subscription_id', data.id)

                // Downgrade user to free after period ends
                // (Paddle fires subscription.updated with status='canceled' at period end too)
                if (userId && data.status === 'canceled') {
                    await supabase.from('users').update({
                        subscription_tier: 'free',
                        max_pets_allowed: PLAN_PET_LIMITS['free'],
                        pet_limit: PLAN_PET_LIMITS['free'],
                        updated_at: new Date().toISOString(),
                    }).eq('id', userId)
                }
                break
            }

            case 'transaction.completed': {
                if (!userId) break
                const amount = data.details?.totals?.total   // in minor units (cents)
                const currency = data.currency_code

                await supabase.from('payment_history').insert({
                    user_id: userId,
                    paddle_transaction_id: data.id,
                    amount_usd: amount ? Number(amount) / 100 : 0,
                    currency,
                    status: 'paid',
                    receipt_url: data.receipt_url ?? null,
                }).select()
                break
            }

            default:
                // Unhandled event — return 200 to prevent Paddle retries
                console.log(`[paddle-webhook] Unhandled event: ${eventType}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('[paddle-webhook] Error:', error)
        return new Response('Webhook error', { status: 500 })
    }
}
```

---

## Task 5: Replace `/api/cancel-subscription/route.ts` — Paddle Cancel

**Files:**
- Modify: `app/api/cancel-subscription/route.ts`

**Step 1: Rewrite**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PADDLE_BASE =
    process.env.PADDLE_ENVIRONMENT === 'sandbox'
        ? 'https://sandbox-api.paddle.com'
        : 'https://api.paddle.com'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('paddle_subscription_id')
            .eq('user_id', user.id)
            .single()

        if (!subscription?.paddle_subscription_id) {
            return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
        }

        const response = await fetch(
            `${PADDLE_BASE}/subscriptions/${subscription.paddle_subscription_id}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    scheduledChange: {
                        action: 'cancel',
                        effectiveAt: 'next_billing_period',
                    },
                }),
            }
        )

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            console.error('[cancel-subscription] Paddle error:', err)
            throw new Error('Failed to cancel subscription via Paddle')
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[cancel-subscription] Error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
```

---

## Task 6: Verify payment_history table has paddle_transaction_id column

**Files:**
- Create: `sql/migration_payment_history_paddle.sql`

```sql
ALTER TABLE payment_history
  ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_history_paddle_tx
  ON payment_history(paddle_transaction_id);
```

Run in Supabase SQL Editor.

---

## Task 7: Remove Lemon Squeezy env vars, add Paddle env vars

**Files:**
- Modify: `.env.local`

**Remove:**
```
LEMON_SQUEEZY_API_KEY
LEMON_SQUEEZY_STORE_ID
LEMON_SQUEEZY_WEBHOOK_SECRET
LEMON_SQUEEZY_BASIC_MONTHLY_ID
LEMON_SQUEEZY_BASIC_YEARLY_ID
```

**Add:**
```
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...
PADDLE_BASIC_MONTHLY_ID=pri_01...
PADDLE_BASIC_YEARLY_ID=pri_01...
PADDLE_ENVIRONMENT=production
```

---

## Task 8: End-to-End Test Checklist (Sandbox mode)

Set `PADDLE_ENVIRONMENT=sandbox`, use sandbox Price IDs.

- [ ] Click "Subscribe" on pricing page → Paddle hosted checkout opens
- [ ] Complete test payment (use Paddle sandbox card: `4242 4242 4242 4242`)
- [ ] Dashboard shows `?checkout=success` URL param
- [ ] Supabase `subscriptions` table has `paddle_subscription_id` populated
- [ ] Supabase `users` table shows `subscription_tier = 'basic'`
- [ ] Letter quota created for the billing period
- [ ] Cancel subscription → Supabase status updates to `canceled`
- [ ] Webhook signature rejection test: send tampered payload → expect 401

---

---

## Task 9: Update `lib/lemonsqueezy.ts` → `lib/paddle.ts`

**Files:**
- Create: `lib/paddle.ts`
- `lib/lemonsqueezy.ts` — leave in place (not imported anywhere critical; can be deleted later)

```ts
const PADDLE_BASE =
    process.env.PADDLE_ENVIRONMENT === 'sandbox'
        ? 'https://sandbox-api.paddle.com'
        : 'https://api.paddle.com'

export async function createPaddleCheckout({
    priceId,
    userId,
    successUrl,
}: {
    priceId: string
    userId: string
    successUrl: string
}): Promise<string> {
    const apiKey = process.env.PADDLE_API_KEY
    if (!apiKey) throw new Error('PADDLE_API_KEY is missing')

    const response = await fetch(`${PADDLE_BASE}/transactions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            items: [{ priceId, quantity: 1 }],
            customData: { userId },
            successUrl,
            checkoutSettings: { displayMode: 'redirect' },
        }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.detail ?? 'Paddle checkout failed')

    const url = data?.data?.checkout?.url
    if (!url) throw new Error('No checkout URL returned from Paddle')
    return url
}

export async function cancelPaddleSubscription(paddleSubscriptionId: string): Promise<void> {
    const apiKey = process.env.PADDLE_API_KEY
    if (!apiKey) throw new Error('PADDLE_API_KEY is missing')

    const response = await fetch(`${PADDLE_BASE}/subscriptions/${paddleSubscriptionId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            scheduledChange: { action: 'cancel', effectiveAt: 'next_billing_period' },
        }),
    })

    if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error?.detail ?? 'Failed to cancel Paddle subscription')
    }
}
```

---

## Task 10: Update `app/api/auth/delete/route.ts` — Cancel Paddle subscription on account deletion

**Files:**
- Modify: `app/api/auth/delete/route.ts`

Replace the Lemon Squeezy subscription cancellation block with Paddle:

```ts
// Replace LS block:
if (subscription && subscription.lemon_squeezy_subscription_id && subscription.status === 'active') {
    await fetch(`https://api.lemonsqueezy.com/...`, { method: 'DELETE', ... })
}

// With Paddle block:
if (subscription && subscription.paddle_subscription_id && subscription.status === 'active') {
    try {
        await cancelPaddleSubscription(subscription.paddle_subscription_id)
    } catch (err) {
        console.warn('[Account Deletion] Failed to cancel Paddle subscription, proceeding:', err)
    }
}
```

Import `cancelPaddleSubscription` from `@/lib/paddle`.

---

## Task 11: Update `types/database.types.ts` — Add Paddle columns

**Files:**
- Modify: `types/database.types.ts`

In the `subscriptions` table type (Row, Insert, Update), add:
```ts
paddle_subscription_id: string | null
paddle_customer_id: string | null
paddle_transaction_id: string | null
```

In the `payment_history` table type, add:
```ts
paddle_transaction_id: string | null
```

---

## Impact Summary (Complete)

| File | Change |
|------|--------|
| `app/api/subscribe/route.ts` | Full rewrite — LS → Paddle checkout |
| `app/api/webhooks/paddle/route.ts` | NEW — Paddle webhook handler |
| `app/api/cancel-subscription/route.ts` | Full rewrite — LS → Paddle cancel |
| `app/api/auth/delete/route.ts` | Update LS cancel → Paddle cancel |
| `lib/constants/plans.ts` | Replace LS IDs → Paddle price IDs, rename getTierFromVariantId |
| `lib/paddle.ts` | NEW — Paddle API helper |
| `types/database.types.ts` | Add paddle_* columns to types |
| `sql/migration_paddle.sql` | NEW — Add paddle columns to subscriptions |
| `sql/migration_payment_history_paddle.sql` | NEW — Add paddle_transaction_id |
| `.env.local` | Remove LS vars, add Paddle vars |
| `app/(legal)/terms/page.tsx` | Already updated ✅ |
| `app/(legal)/privacy/page.tsx` | Already updated ✅ |

**NOT affected:**
- All UI components (PricingCard, PricingSection) — no changes needed
- Auth flow, dashboard, letters, pets — no changes needed
- DB schema for users, pets, letters, letter_quota — no changes needed
