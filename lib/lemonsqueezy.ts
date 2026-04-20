/**
 * Lemon Squeezy API Utility
 * Implementation of core functions to interact with Lemon Squeezy REST API (v1)
 */

const API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
const API_BASE = 'https://api.lemonsqueezy.com/v1';

if (!API_KEY) {
    console.warn('LEMON_SQUEEZY_API_KEY is missing');
}

export async function createLemonSqueezyCheckout({
    productId,
    userId,
    userEmail,
    successUrl,
    cancelUrl,
}: {
    productId: string;
    userId: string;
    userEmail?: string;
    successUrl: string;
    cancelUrl: string;
}) {
    if (!STORE_ID) throw new Error('LEMON_SQUEEZY_STORE_ID is missing');

    const response = await fetch(`${API_BASE}/checkouts`, {
        method: 'POST',
        headers: {
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        custom: {
                            user_id: userId,
                        },
                        email: userEmail,
                    },
                    product_options: {
                        redirect_url: successUrl,
                    },
                    checkout_options: {
                        // redirect_url is preferred over success_url in v1
                    }
                },
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: STORE_ID,
                        },
                    },
                    variant: {
                        data: {
                            type: 'variants',
                            id: productId,
                        },
                    },
                },
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Lemon Squeezy API Error:', data);
        throw new Error(data.errors?.[0]?.detail || 'Failed to create checkout');
    }

    return data.data.attributes.url;
}
