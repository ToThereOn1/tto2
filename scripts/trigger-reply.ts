/**
 * scripts/trigger-reply.ts
 *
 * Inserts a random test user letter then triggers reply letter generation
 * via the admin test-generate endpoint.
 *
 * Usage:
 *   npx tsx scripts/trigger-reply.ts <petId>
 *
 * Requires:
 *   CRON_SECRET in .env.local
 *   Dev server running at http://localhost:3000 (or set BASE_URL env)
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET

async function main() {
    const petId = process.argv[2]

    if (!petId) {
        console.error('Usage: npx tsx scripts/trigger-reply.ts <petId>')
        process.exit(1)
    }

    if (!CRON_SECRET) {
        console.error('ERROR: CRON_SECRET not found in .env.local')
        process.exit(1)
    }

    console.log(`Triggering reply generation for pet: ${petId}`)
    console.log(`Endpoint: ${BASE_URL}/api/admin/test-generate\n`)

    const res = await fetch(`${BASE_URL}/api/admin/test-generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ action: 'reply', petId }),
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
        console.error('ERROR:', data.error || `HTTP ${res.status}`)
        process.exit(1)
    }

    const r = data.result
    console.log('=== Reply Generated Successfully ===\n')
    console.log(`Pet:      ${r.petName}`)
    console.log(`Status:   ${r.status}`)
    console.log(`Tokens:   ${r.tokens?.total ?? 'n/a'}`)
    console.log(`Letter:   ${r.letterId}`)
    console.log('\n--- User Letter (Test Input) ---\n')
    console.log(r.userLetterContent)
    console.log('\n--- Pet Reply ---\n')
    console.log(r.replyContent)
    console.log('\n--------------------------')
    console.log('\nRun eval:  npx tsx scripts/eval-output.ts', petId)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
