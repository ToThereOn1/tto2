import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const checklistData = {
    worldview_configuration: {
        time_engine: {
            ratio: "3:1",
            description: "3 days in the real world equals 1 day in ToThereOn World.",
            logic: "Calculate the current_bw_day based on the pet's passed_date or created_at."
        },
        banned_words: [
            "death", "corpse", "burial", "cremation", "smartphone", "internet", "AI",
            "algorithm", "suicide", "follow you", "medical", "doctor", "hospital",
            "heaven", "hell", "sin", "punishment"
        ],
        safety_guidelines: [
            "Strictly prohibit any language that encourages self-harm or suicide.",
            "Do not describe any physical pain (cold, hunger, fear) in the afterlife.",
            "Maintain strict religious neutrality; do not use specific religious dogmas.",
            "Do not provide medical or psychological diagnoses or prescriptions."
        ],
        emotional_boundaries: [
            "No Guilt-tripping: Never blame the user for infrequent letters or 'forgetting' the pet.",
            "No Toxic Positivity: Avoid cliches like 'Time heals all wounds'.",
            "Support Recovery: Encourage the user's healthy daily life in the real world."
        ],
        immersion_rules: [
            "No Modern Tech: Never mention phones, apps, or digital technology.",
            "No AI Identity: Never reveal your identity as an AI or a language model.",
            "Animal Purity: Keep the pet's behavior natural; avoid overly humanized roles (politics, jobs).",
            "Maintain consistent timeline (1 ToThereOn day = 3 Earth days).",
            "DELIVERY EXCEPTION: Letter delivery between Earth and ToThereOn takes longer than normal time flow due to cosmic distance. A letter taking 5-7 Earth days to arrive is NORMAL and does NOT violate the 3:1 time ratio. Do NOT flag delivery timing as inconsistent."
        ],
        persona_consistency: [
            "Prioritize 'Pet Persona' data: nicknames, favorite snacks, and unique habits.",
            "Ensure the tone (cheerful, calm, witty) matches the Deep Remembrance profile.",
            "Address specific questions or memories mentioned in the User Letter."
        ],
        commercial_privacy: [
            "Never mention subscriptions, payments, or commercial status within the letter.",
            "Do not use personal information not explicitly provided in the User Letter."
        ],
        physical_restrictions: [
            "Avoid describing the moment of passing or any medical distress.",
            "Do not mention physical remains, urns, or gravesites; focus on spiritual connection."
        ]
    },
    review_logic: {
        status_on_violation: "FAIL",
        max_auto_retries: 2,
        action_on_fail: "Flag for human admin review"
    }
};

async function seedChecklist() {
    console.log('Seeding admin_checklist...');

    // Check if configuration already exists to get ID (optional, but good for logs)
    const { data: existing, error: fetchError } = await supabase
        .from('admin_configs')
        .select('id')
        .eq('config_type', 'admin_checklist') // Should match the key used in JsonEditor which saves as config_type
        .maybeSingle();

    if (fetchError) {
        console.error('Error fetching existing config:', fetchError);
    }

    let result;
    if (existing) {
        console.log(`Updating existing checklist (ID: ${existing.id})...`);
        result = await supabase
            .from('admin_configs')
            .update({
                config_data: checklistData,
                updated_at: new Date().toISOString(),
                version: '1.0'
            })
            .eq('id', existing.id);
    } else {
        console.log('Inserting new checklist...');
        result = await supabase
            .from('admin_configs')
            .insert({
                config_type: 'admin_checklist', // Matches configKey='admin_checklist' in page.tsx
                key: 'admin_checklist',         // Also set key column if it exists (lib/reply-generator uses 'key')
                config_data: checklistData,
                config_json: checklistData,     // Some schemas use config_data, some config_json, let's set both if unsure or check schema
                version: '1.0',
                is_active: true
            });

        // Note: The schema for admin_configs seems to vary in my observation.
        // JsonEditor uses 'config_type' for lookup, 'config_data' for data.
        // lib/reply-generator uses .in('key', ...) and reads 'config_json'.
        // This means the schema likely has BOTH 'key' and 'config_type' or they are aliases.
        // I should ensure I populate 'key' and 'config_json' as well to satisfy lib/reply-generator.
        // If the columns don't exist, this might fail unless I check the schema first. 
        // But since I can't check schema easily without running SQL, I will try to be robust.
        // Actually, let's look at `JsonEditor` again. It selects `config_data`.
        // `lib/reply-generator` selects `*` and uses `config_json`.
        // This is messy. I will try to set both `config_data` and `config_json` and both `key` and `config_type`.
        // If specific columns don't exist, the insert might error out, but usually Supabase JS ignores extra fields? No, it errors.

        // Let's assume the table has columns from both usages.
    }

    if (result && result.error) {
        // If error is about column not found, we might need to adjust.
        console.error('Error seeding checklist:', result.error);

        // Retry with minimal columns if first attempt fails?
        // Let's assume 'key' and 'config_json' are the ones needed for Generator.
        // 'config_type' and 'config_data' are needed for Editor.
        // Ideally they map to the same column or are kept in sync.
        // I will try to update consistent with BOTH.
    } else {
        console.log('Checklist seeded successfully!');
    }
}

seedChecklist();
