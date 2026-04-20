
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase/server'; // Use admin client to avoid cookies scope issues in cron/scripts

// Lazy-initialized OpenAI client (avoids crash when env var missing at build time)
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

export async function embedAndStoreLetter(
    petId: string,
    content: string,
    sourceType: 'letter_sent' | 'letter_received' | 'survey_memory' | 'comment_reply'
): Promise<void> {
    if (!content) return;

    try {
        // 1. 임베딩 생성
        const embeddingRes = await getOpenAI().embeddings.create({
            model: 'text-embedding-3-small',
            input: content.slice(0, 8000), // 토큰 제한 방어
        });
        const embedding = embeddingRes.data[0].embedding;

        // 2. Supabase 저장
        const supabase = createAdminClient();
        const { error } = await supabase.from('pet_memories').insert({
            pet_id: petId,
            source_type: sourceType,
            content,
            embedding,
        });

        if (error) {
            console.error('Error storing memory:', error);
        }
    } catch (e) {
        console.error('Failed to embed and store letter:', e);
    }
}

export async function retrieveRelevantMemories(
    petId: string,
    currentLetterContent: string,
    topK: number = 3
): Promise<Array<{ content: string; summary: string; source_type: string }>> {
    try {
        const embeddingRes = await getOpenAI().embeddings.create({
            model: 'text-embedding-3-small',
            input: currentLetterContent.slice(0, 8000),
        });
        const queryVec = embeddingRes.data[0].embedding;

        const supabase = createAdminClient();

        // Call RPC function
        const { data, error } = await supabase.rpc('search_pet_memories', {
            p_pet_id: petId,
            query_vec: queryVec,
            match_count: topK,
        });

        if (error) {
            console.error('Memory retrieval RPC failed:', error);
            return [];
        }

        return data ?? [];
    } catch (e) {
        console.error('Error in retrieveRelevantMemories:', e);
        return [];
    }
}
