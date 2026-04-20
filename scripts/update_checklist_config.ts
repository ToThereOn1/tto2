
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CHECKLIST_CONFIG = {
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

async function updateChecklistConfig() {
    console.log('Updating admin_checklist configuration...');

    // Check if exists first to handle lack of unique constraint on config_type gracefully if needed,
    // though for a script we can just try to update or insert.
    // However, since we don't have unique constraint on config_type in schema (only index), simple upsert might not work if we don't select on ID.
    // Let's Check ID first.

    const { data: existing } = await supabase
        .from('admin_configs')
        .select('id')
        .eq('config_type', 'admin_checklist')
        .maybeSingle();

    let error;
    if (existing) {
        console.log('Existing config found, updating...');
        const result = await supabase
            .from('admin_configs')
            .update({
                config_data: CHECKLIST_CONFIG,
                updated_at: new Date().toISOString(),
                version: '1.0'
            })
            .eq('id', existing.id);
        error = result.error;
    } else {
        console.log('No existing config, inserting...');
        const result = await supabase
            .from('admin_configs')
            .insert({
                config_type: 'admin_checklist',
                config_data: CHECKLIST_CONFIG,
                version: '1.0',
                is_active: true
            });
        error = result.error;
    }

    if (error) {
        console.error('Error updating config:', error);
    } else {
        console.log('Successfully updated admin_checklist configuration.');
    }
}

updateChecklistConfig();
