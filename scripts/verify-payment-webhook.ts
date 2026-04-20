import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || 'test_secret'
const WEBHOOK_URL = 'http://localhost:1025/api/webhooks/lemon-squeezy' // Using standard port or whatever is current

async function testWebhook() {
    const payload = {
        meta: {
            event_name: 'subscription_created',
            custom_data: {
                user_id: 'd9b0a1a1-1234-5678-9abc-def012345678' // Replace with a real user ID from your local DB for real testing
            }
        },
        data: {
            id: 'sub_test_123',
            type: 'subscriptions',
            attributes: {
                customer_id: 99999,
                variant_name: 'Basic Plan',
                status: 'active',
                renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                ends_at: null,
                cancelled: false
            }
        }
    }

    const body = JSON.stringify(payload)
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex')

    console.log('🚀 Sending mock subscription_created webhook...')

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Signature': signature
            },
            body: body
        })

        const data = await response.json()
        console.log('✅ Response:', response.status, data)
    } catch (err) {
        console.error('❌ Error:', err)
    }
}

testWebhook()
