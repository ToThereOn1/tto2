
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase Env Vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkLetters() {
    console.log('Checking recent letters...')

    const { data: letters, error } = await supabase
        .from('letters')
        .select(`
            id,
            content,
            created_at,
            status,
            font_style,
            pets (name),
            users (email)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching letters:', error)
        return
    }

    if (!letters || letters.length === 0) {
        console.log('No letters found.')
        return
    }

    console.log(`Found ${letters.length} recent letters:`)
    letters.forEach((letter, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const petName = (letter.pets as any)?.name || (Array.isArray(letter.pets) ? (letter.pets[0] as any)?.name : 'Unknown Pet')
        console.log(`\n[${i + 1}] ID: ${letter.id}`)
        console.log(`    To: ${petName}`)
        console.log(`    Time: ${new Date(letter.created_at).toLocaleString()}`)
        console.log(`    Status: ${letter.status}`)
        console.log(`    Content: "${letter.content.substring(0, 50)}${letter.content.length > 50 ? '...' : ''}"`)
    })
}

checkLetters()
