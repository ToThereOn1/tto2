const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMailbox() {
    console.log('--- Checking Mailbox Data ---');

    // 1. Find the user/pet (Assuming '슬이' from screenshot)
    const { data: pets, error: petError } = await supabase
        .from('pets')
        .select('id, name, user_id, time_offset_hours')
        .ilike('name', '%슬이%'); // Searching by name

    if (petError || !pets || pets.length === 0) {
        console.error('Pet not found:', petError);
        return;
    }

    const pet = pets[0];
    console.log(`Found Pet: ${pet.name} (ID: ${pet.id})`);
    console.log(`Time Offset: ${pet.time_offset_hours} hours`);

    // 2. Fetch Letters
    const { data: letters, error: letterError } = await supabase
        .from('letters')
        .select('*')
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false });

    if (letterError) {
        console.error('Error fetching letters:', letterError);
        return;
    }

    console.log(`\nFound ${letters.length} letters:`);
    letters.forEach(l => {
        console.log(`- [${l.sender_type.toUpperCase()}] Status: ${l.status}, Created: ${l.created_at}, Content: "${l.content.substring(0, 20)}..."`);
    });

    // 3. Simulate Timeline API filtering
    console.log('\n--- Simulation of API Filtering ---');
    const visibleEvents = letters
        .filter(l => l.status !== 'pending_review')
        .map(l => ({
            id: l.id,
            subtype: l.sender_type === 'pet' ? 'received' : 'sent',
            status: l.status
        }));

    const inbox = visibleEvents.filter(e => e.subtype === 'received');
    const sent = visibleEvents.filter(e => e.subtype === 'sent');

    console.log(`Inbox Count: ${inbox.length}`);
    console.log(`Sent Count: ${sent.length}`);

    if (inbox.length === 0) {
        console.log('\n❌ ERROR: Inbox is hidden! Why?');
        // Check if there are any pet letters that were filtered out
        const petLetters = letters.filter(l => l.sender_type === 'pet');
        console.log(`Total Pet Letters (Raw): ${petLetters.length}`);
        petLetters.forEach(l => {
            if (l.status === 'pending_review') {
                console.log(`  -> Hidden because status is 'pending_review' (ID: ${l.id})`);
            } else {
                console.log(`  -> Should be visible! Status: ${l.status} (ID: ${l.id})`);
            }
        });
    } else {
        console.log('\n✅ Inbox should be visible.');
    }
}

checkMailbox();
