
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { generatePersona, calculateDimensionalScores, extractNarrativeData } from '../lib/llm-client';
import { SURVEY_QUESTIONS } from '../lib/survey-questions';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("🚀 Starting Force Persona Generation for '슬이'...");

    // 1. Find Pet '슬이'
    const { data: pets, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('name', '슬이');

    if (petError || !pets || pets.length === 0) {
        console.error('❌ Pet not found:', petError);
        return;
    }

    const pet = pets[0];
    console.log(`✅ Found pet: ${pet.name} (${pet.id})`);

    // 2. Create Dummy Survey Response
    const dummyResponses = {
        Q01: pet.name,
        Q02: "1년 - 3년",
        Q03: "반갑게 인사함",
        Q04: "아주 평온함",
        Q05: "공주님",
        Q06: "눈이 반짝이며 흥분",
        Q07: "언제나 안기고 싶어 함",
        Q08: "식탐 대마왕 (다 맛있어)",
        Q09: "고구마 말랭이",
        Q10: "기쁨의 점프와 함성",
        Q11: "잘 때 꼭 내 배 위 올라와서 잤음",
        Q12: "천진난만한 아기",
        Q13: "에너지 넘치는 말투",
        Q14: "햇살 비치는 초원",
        Q15: "너무 보고싶어 사랑해",
        Q16: "침대에서 바로 옆에",
        Q17: "저녁 놀이 시간",
        Q18: "바로 달려와 위로해줌",
        Q19: "모두와 잘 어울림",
        Q20: "폭발적인 에너지와 흥분",
        Q21: "같이 바다 갔을 때",
        Q22: "나를 웃게 하는 능력",
        Q23: "서로를 믿는 마음",
        Q24: "영원히 사랑해",
        Q25: "네, 정말 필요해요."
    };

    // Insert Response
    console.log("📝 Creating dummy survey response...");
    let response;
    const { data: newResponse, error: resError } = await supabase
        .from('deep_remembrance_responses')
        .insert({
            pet_id: pet.id,
            user_id: pet.user_id,
            responses: dummyResponses,
            current_question_index: 25,
            completion_percentage: 100,
            total_questions: 25,
            completed_at: new Date().toISOString()
        })
        .select()
        .single();

    if (resError) {
        if (resError.code === '23505') {
            console.log('ℹ️ Response already exists, fetching it...');
            const { data: existingResponse } = await supabase
                .from('deep_remembrance_responses')
                .select('*')
                .eq('pet_id', pet.id)
                .single();
            response = existingResponse;
        } else {
            console.error('❌ Failed to insert response:', resError);
            return;
        }
    } else {
        response = newResponse;
    }

    if (!response) {
        console.error('❌ No response found or created.');
        return;
    }
    console.log(`✅ Response ready: ${response.id}`);

    // 3. Generate Persona
    console.log("🧠 Generating Persona with LLM (Claude)...");

    // Prepare Data for LLM
    const scores = calculateDimensionalScores(dummyResponses, SURVEY_QUESTIONS);
    const narrative = extractNarrativeData(dummyResponses, { relationship: pet.relationship || 'companion' });

    const petData = {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        gender: pet.gender,
        relationship: pet.relationship || 'companion'
    };

    try {
        const personaProfile = await generatePersona(petData, scores, narrative);
        console.log("✨ Persona Generated!");

        // 4. Save Persona
        const { data: savedPersona, error: saveError } = await supabase
            .from('pet_personas')
            .insert({
                pet_id: pet.id,
                // response_id: response.id, // Skipped due to schema mismatch (add column later)
                dimensional_scores: scores,
                narrative_data: narrative,
                persona_profile: personaProfile,
                quality_score: personaProfile.persona_quality_score.overall_score,
                detail_richness: personaProfile.persona_quality_score.detail_richness,
                emotional_authenticity: personaProfile.persona_quality_score.emotional_authenticity,
                behavioral_consistency: personaProfile.persona_quality_score.behavioral_consistency,
                narrative_depth: personaProfile.persona_quality_score.narrative_depth,
                generation_model: 'claude-3-5-opus-force-script',
            })
            .select()
            .single();

        if (saveError) {
            console.error('❌ Failed to save persona:', saveError);
        } else {
            console.log(`✅ Persona saved successfully! ID: ${savedPersona.id}`);

            // 5. Update Pet Status
            await supabase
                .from('pets')
                .update({ persona_generated: true })
                .eq('id', pet.id);

            console.log("🎉 All done! '슬이' is ready for testing.");
        }

    } catch (err: any) {
        console.error('❌ LLM Generation Error:', err.message);
        console.error(err.response?.data || err);
    }
}

main();
