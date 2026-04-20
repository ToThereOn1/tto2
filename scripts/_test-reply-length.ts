/**
 * 답장 분량 테스트 스크립트
 * - 테스트 페르소나 + 편지 삽입 → 답장 생성 → 분량 측정 → 정리
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PET_ID = 'e806ae97-dc21-4ee2-910a-e54a42b4e84a'; // 골댕이

// 테스트용 편지 3종 (짧음 / 중간 / 길음)
const TEST_LETTERS = [
    {
        label: '짧은 편지',
        content: '잘 지내니? 보고 싶어.',
    },
    {
        label: '중간 편지',
        content: '오늘 산책하다가 네가 좋아하던 공원 지나쳤어. 벤치에 앉아서 한참 있었는데 너 생각이 너무 나더라. 꿈에라도 나와줘. 사랑해.',
    },
    {
        label: '긴 편지',
        content: '오늘은 유독 네 생각이 많이 났어. 아침에 일어나서 밥 먹을 때도, 회사 가는 버스 안에서도, 퇴근하고 돌아올 때도. 네가 항상 현관에서 기다려 주던 게 생각나서 문 앞에 서서 한참 있었어. 이제 아무도 반겨주는 게 없으니까 집에 들어가기가 무서워. 그래도 네가 거기 어딘가에 잘 있다는 거 알아. 보고싶다 골댕이. 많이많이.',
    },
];

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. 테스트 페르소나 삽입
    console.log('📝 테스트 페르소나 삽입 중...');
    const { data: persona, error: personaErr } = await supabase
        .from('pet_personas')
        .insert({
            pet_id: PET_ID,
            persona_profile: {
                personality_summary: '활발하고 애교 많은 강아지. 주인을 보면 온몸으로 반가움을 표현함.',
                core_traits: ['애교쟁이', '호기심 많음', '충성스러움'],
                communication_style: {
                    letter_voice_tone: '따뜻하고 장난기 있게',
                    sentence_structure: '짧고 솔직한 문장',
                    vocabulary_preference: '구어체, 친근한 표현',
                    emotional_range: '기쁨과 그리움을 솔직하게 표현함'
                },
                memory_anchors: [
                    { category: '산책', details: '매일 저녁 공원에서 함께 뛰어놀던 기억' },
                    { category: '밥', details: '밥 먹을 때 옆에 앉아서 쳐다보던 습관' },
                ]
            },
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (personaErr) {
        console.error('❌ 페르소나 삽입 실패:', personaErr.message);
        return;
    }
    console.log('✅ 페르소나 삽입 완료');

    // 2. 각 편지로 테스트
    const { generateLetterReply } = await import('../lib/reply-generator');
    const insertedLetterIds: string[] = [];

    for (const test of TEST_LETTERS) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📨 [${test.label}] 테스트`);
        console.log(`   유저 편지 (${test.content.length}자): "${test.content}"`);

        // 편지 삽입
        const { data: letter, error: letterErr } = await supabase
            .from('letters')
            .insert({
                pet_id: PET_ID,
                user_id: (await supabase.from('pets').select('user_id').eq('id', PET_ID).single()).data?.user_id,
                sender_type: 'user',
                content: test.content,
                status: 'sent',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (letterErr || !letter) {
            console.error('❌ 편지 삽입 실패:', letterErr?.message);
            continue;
        }
        insertedLetterIds.push(letter.id);

        try {
            const result = await generateLetterReply(letter.id);

            if (!result.success) {
                console.error('❌ 답장 생성 실패');
                continue;
            }

            // 생성된 답장 조회
            const { data: reply } = await supabase
                .from('letters')
                .select('content')
                .eq('id', result.reply_letter_id)
                .single();

            if (!reply?.content) continue;

            const userLen = test.content.length;
            const replyLen = reply.content.length;
            const ratio = ((replyLen / userLen) * 100).toFixed(0);
            const target = Math.round(userLen * 1.4);

            console.log(`\n💌 답장 내용:`);
            console.log(`---`);
            console.log(reply.content);
            console.log(`---`);
            console.log(`📊 분량 결과:`);
            console.log(`   유저 편지: ${userLen}자`);
            console.log(`   목표 분량: ${target}자 (140%)`);
            console.log(`   실제 답장: ${replyLen}자 (${ratio}%)`);
            console.log(`   판정: ${replyLen >= target * 0.85 ? '✅ 적정' : '⚠️  부족'}`);

            insertedLetterIds.push(result.reply_letter_id);

        } catch (e: any) {
            console.error('❌ 에러:', e.message);
        }
    }

    // 3. 정리 (삽입한 데이터 삭제)
    console.log('\n🧹 테스트 데이터 정리 중...');
    if (insertedLetterIds.length > 0) {
        await supabase.from('letters').delete().in('id', insertedLetterIds);
    }
    await supabase.from('pet_personas').delete().eq('id', persona.id);
    console.log('✅ 정리 완료');
}

main().catch(console.error);
