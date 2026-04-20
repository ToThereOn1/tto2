import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

import { PLAN_PET_LIMITS, PLAN_LETTER_LIMITS, getTierFromVariantId, PlanTier } from '@/lib/constants/plans'

export async function POST(request: Request) {
    try {
        const body = await request.text()
        const signature = request.headers.get('X-Signature')

        if (!signature) {
            return new Response('No signature', { status: 401 })
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '')
            .update(body)
            .digest('hex')

        if (signature !== expectedSignature) {
            return new Response('Invalid signature', { status: 401 })
        }

        const event = JSON.parse(body)
        const eventName = event.meta.event_name
        const data = event.data
        const attributes = data.attributes
        const userId = event.meta.custom_data?.user_id

        if (!userId && eventName !== 'order_created') {
            console.error('No user_id in webhook metadata')
            return new Response('Missing payload', { status: 400 })
        }

        const supabase = createAdminClient()

        switch (eventName) {
            case 'subscription_created':
            case 'subscription_updated': {
                const variantId = attributes.variant_id?.toString() || ''
                const tier: PlanTier = getTierFromVariantId(variantId)

                // 1. Update Subscriptions table
                await supabase.from('subscriptions').upsert({
                    user_id: userId,
                    lemon_squeezy_subscription_id: data.id,
                    lemon_squeezy_customer_id: String(attributes.customer_id),
                    tier: tier,
                    status: attributes.status,
                    current_period_start: attributes.renews_at ? new Date(new Date(attributes.renews_at).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() : null,
                    current_period_end: attributes.renews_at,
                    cancel_at: attributes.ends_at,
                    cancelled_at: attributes.cancelled ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'lemon_squeezy_subscription_id' })

                // 2. Update User profile and Letter Quotas
                if (attributes.status === 'active' || attributes.status === 'trialing') {
                    const petLimit = PLAN_PET_LIMITS[tier] || 1
                    await supabase.from('users').update({
                        subscription_tier: tier,
                        max_pets_allowed: petLimit,
                        pet_limit: petLimit,
                        updated_at: new Date().toISOString()
                    }).eq('id', userId)

                    // Create quota per pet using billing period key (YYYY-MM-DD)
                    // This runs on both subscription_created and subscription_updated (renewal)
                    const { data: pets } = await supabase.from('pets').select('id').eq('user_id', userId)
                    if (pets && pets.length > 0) {
                        const periodStart = attributes.renews_at
                            ? new Date(new Date(attributes.renews_at).getTime() - 30 * 24 * 60 * 60 * 1000)
                            : new Date()
                        const billingPeriodKey = periodStart.toISOString().slice(0, 10) // YYYY-MM-DD
                        const allowedLetters = PLAN_LETTER_LIMITS[tier] || 0

                        for (const pet of pets) {
                            // Read existing record to preserve letters_sent if this is
                            // a mid-period update (not a renewal with a new billing key)
                            const { data: existing } = await supabase
                                .from('letter_quota')
                                .select('letters_sent')
                                .eq('user_id', userId)
                                .eq('pet_id', pet.id)
                                .eq('month', billingPeriodKey)
                                .single()

                            await supabase
                                .from('letter_quota')
                                .upsert({
                                    user_id: userId,
                                    pet_id: pet.id,
                                    month: billingPeriodKey,
                                    letters_allowed: allowedLetters,
                                    letters_sent: existing?.letters_sent ?? 0,
                                    updated_at: new Date().toISOString()
                                }, { onConflict: 'user_id, pet_id, month' })
                        }
                    }
                }
                break
            }

            case 'subscription_cancelled':
            case 'subscription_expired': {
                await supabase.from('subscriptions').update({
                    status: attributes.status,
                    cancelled_at: attributes.cancelled ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString()
                }).eq('lemon_squeezy_subscription_id', data.id)

                if (attributes.status === 'expired') {
                    await supabase.from('users').update({
                        subscription_tier: 'free',
                        max_pets_allowed: PLAN_PET_LIMITS['free'],
                        pet_limit: PLAN_PET_LIMITS['free'],
                        updated_at: new Date().toISOString()
                    }).eq('id', userId)
                    // Free tier uses 'lifetime' quota (managed separately, no overwrite needed)
                    // The 'lifetime' quota record is created on first write page visit
                }
                break
            }

            case 'subscription_payment_success': {
                await supabase.from('payment_history').insert({
                    user_id: userId,
                    lemon_squeezy_order_id: String(attributes.order_id),
                    amount_usd: attributes.total_usd / 100,
                    currency: attributes.currency,
                    status: 'paid',
                    receipt_url: attributes.receipt_url,
                })
                break
            }
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return new Response('Webhook error', { status: 500 })
    }
}
