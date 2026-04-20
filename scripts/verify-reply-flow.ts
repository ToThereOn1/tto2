import { createClient } from '@supabase/supabase-js'
// import { generateLetterReply } from '../lib/reply-generator'
import * as dotenv from 'dotenv'

// Load env vars
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
    console.log('🧪 Starting RAG Reply System Verification...')

    // 1. Find a valid pet (one with a persona record)
    const { data: pets, error: petError } = await supabase
        .from('pets')
        .select('id, name, user_id')
        .eq('name', '슬이') // Use a known valid pet
        .limit(1)


    if (petError || !pets || pets.length === 0) {
        console.error('❌ No valid pets found with generated persona. Please generate a persona first.')
        return
    }

    const pet = pets[0]
    console.log(`✅ Found test pet: ${pet.name} (${pet.id})`)

    // 2. Insert a 'sent' letter from the user
    const { data: letter, error: letterError } = await supabase
        .from('letters')
        .insert({
            pet_id: pet.id,
            user_id: pet.user_id,
            sender_type: 'user',
            content: "잘 지내니? 네가 떠난 자리엔 아직 네 냄새가 남아있어. 꿈에라도 한번 나와주면 좋겠어. 사랑해.",
            status: 'sent',
            created_at: new Date().toISOString()
        })
        .select()
        .single()

    if (letterError) {
        console.error('❌ Failed to insert test letter:', letterError)
        return
    }

    console.log(`✅ Inserted test letter: ${letter.id}`)
    console.log(`📝 Content: "${letter.content}"`)

    // 3. Simulate Cron Job: Trigger Reply Generation
    console.log('🔄 Triggering reply generation...')
    try {
        const { generateLetterReply } = await import('../lib/reply-generator')
        const result = await generateLetterReply(letter.id)

        if (result.success) {
            console.log('✅ Reply generated successfully!')
            console.log(`🆔 Reply Letter ID: ${result.reply_letter_id}`)
            console.log(`⏱ Generation Time: ${result.generation_ms}ms`)

            // 4. Fetch the generated reply to show content
            const { data: reply } = await supabase
                .from('letters')
                .select('content, status')
                .eq('id', result.reply_letter_id)
                .single()

            if (reply) {
                console.log('\n💌 Generated Reply Preview:')
                console.log('---------------------------------------------------')
                console.log(reply.content)
                console.log('---------------------------------------------------')
                console.log(`Status: ${reply.status}`)
            }

            // 5. Verify status update of original letter
            const { data: updatedLetter } = await supabase
                .from('letters')
                .select('status')
                .eq('id', letter.id)
                .single()

            // Note: generateLetterReply does NOT update the original letter status (the Cron job does that).
            // So we skip this check or we manually update it to clean up.

            // Clean up: Mark original as read manually to finish simulation
            await supabase.from('letters').update({ status: 'read' }).eq('id', letter.id)
            console.log('✅ Original letter status marked as read (Cleanup)')

        } else {
            console.error('❌ Reply generation returned failure.')
        }

    } catch (error) {
        console.error('❌ Error during reply generation:', error)
    }
}

main()
