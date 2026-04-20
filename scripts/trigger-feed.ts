/**
 * scripts/trigger-feed.ts
 *
 * Triggers AI feed event generation for a test pet via the admin endpoint.
 * Always force-regenerates (deletes existing event for today first).
 *
 * Usage:
 *   npx tsx scripts/trigger-feed.ts <petId>
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
        console.error('Usage: npx tsx scripts/trigger-feed.ts <petId>')
        console.error('Run seed-test-pet.ts first to get a petId.')
        process.exit(1)
    }

    if (!CRON_SECRET) {
        console.error('ERROR: CRON_SECRET not found in .env.local')
        process.exit(1)
    }

    console.log(`Triggering feed generation for pet: ${petId}`)
    console.log(`Endpoint: ${BASE_URL}/api/admin/test-generate\n`)

    const res = await fetch(`${BASE_URL}/api/admin/test-generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ action: 'feed', petId }),
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
        console.error('ERROR:', data.error || `HTTP ${res.status}`)
        process.exit(1)
    }

    const r = data.result
    console.log('=== Feed Generated Successfully ===\n')
    console.log(`Pet:        ${r.petName}`)
    console.log(`Day:        ToThereOn Day ${r.tothereonDay}`)
    console.log(`Zone:       ${r.zone}`)
    console.log(`Event Type: ${r.eventType}`)
    console.log(`Language:   ${r.userLanguage}`)
    console.log(`Tokens:     ${r.tokens?.total ?? 'n/a'}`)
    console.log(`Event ID:   ${r.eventId}`)
    console.log('\n--- Generated Content ---\n')
    console.log(r.content)
    console.log('\n--------------------------')
    console.log('\nRun eval:  npx tsx scripts/eval-output.ts', petId)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
