import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { tier } = body;

        console.log('[subscribe] Received tier:', tier, 'user:', user.id);

        let variantId: string | undefined;
        if (tier === 'basic_monthly') {
            variantId = process.env.LEMON_SQUEEZY_BASIC_MONTHLY_ID;
        } else if (tier === 'basic_yearly') {
            variantId = process.env.LEMON_SQUEEZY_BASIC_YEARLY_ID;
        } else {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        if (!variantId) {
            return NextResponse.json({ error: 'Variant ID is not configured' }, { status: 500 });
        }

        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Lemon Squeezy API Key is not configured' }, { status: 500 });
        }

        // ─── Resolve Store ID from API ─────────────────────────────────────
        // Always fetches from the Lemon Squeezy /stores endpoint so the
        // correct store is used regardless of env var state.
        // LEMON_SQUEEZY_STORE_ID (if set) is only used to select among
        // multiple stores; it is never trusted blindly as the final value.
        const lsHeaders = {
            'Accept': 'application/vnd.api+json',
            'Authorization': `Bearer ${apiKey}`,
        };

        const storesRes = await fetch('https://api.lemonsqueezy.com/v1/stores', {
            headers: lsHeaders,
        });

        if (!storesRes.ok) {
            const err = await storesRes.text();
            console.error('[subscribe] Failed to fetch stores:', err);
            return NextResponse.json({ error: 'Failed to connect to Lemon Squeezy' }, { status: 502 });
        }

        const storesData = await storesRes.json();
        const stores: Array<{ id: string | number }> = storesData?.data ?? [];

        if (stores.length === 0) {
            return NextResponse.json({ error: 'No Lemon Squeezy store found for this account' }, { status: 500 });
        }

        const envStoreId = process.env.LEMON_SQUEEZY_STORE_ID?.trim();
        let storeId: string;

        if (envStoreId) {
            // Prefer the env var store if it actually exists in this account
            const matched = stores.find(s => s.id.toString() === envStoreId);
            storeId = matched ? envStoreId : stores[0].id.toString();
            if (!matched) {
                console.warn(`[subscribe] LEMON_SQUEEZY_STORE_ID=${envStoreId} not found in account — using store ${storeId} instead`);
            }
        } else {
            storeId = stores[0].id.toString();
        }

        console.log(`[subscribe] Using variantId=${variantId} storeId=${storeId} (${stores.length} store(s) in account)`);

        // ─── Build & Send Checkout ─────────────────────────────────────────
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tothereon.com';
        const successUrl = `${baseUrl}/dashboard?checkout=success`;

        const checkoutPayload = {
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        custom: { user_id: user.id },
                    },
                    product_options: {
                        redirect_url: successUrl,
                    },
                    checkout_options: { embed: false },
                },
                relationships: {
                    variant: {
                        data: { type: 'variants', id: variantId },
                    },
                    store: {
                        data: { type: 'stores', id: storeId },
                    },
                },
            },
        };

        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: { ...lsHeaders, 'Content-Type': 'application/vnd.api+json' },
            body: JSON.stringify(checkoutPayload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[subscribe] Checkout error:', JSON.stringify(errorData, null, 2));
            const lsError = errorData?.errors?.[0]?.detail ?? errorData?.error ?? 'Failed to create checkout';
            return NextResponse.json({ error: lsError }, { status: 500 });
        }

        const data = await response.json();
        const checkoutUrl = data?.data?.attributes?.url;

        if (!checkoutUrl) {
            console.error('[subscribe] No URL in response:', data);
            return NextResponse.json({ error: 'Checkout URL not returned by Lemon Squeezy' }, { status: 500 });
        }

        return NextResponse.json({ url: checkoutUrl });

    } catch (error) {
        console.error('[subscribe] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
