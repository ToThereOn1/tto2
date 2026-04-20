
-- Fix Survey Questions Schema
-- Drop and recreate ensuring correct columns

DROP TABLE IF EXISTS survey_questions;

CREATE TABLE survey_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text_kr TEXT NOT NULL,
  question_text_en TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('text', 'choice', 'scale', 'yesno')),
  options          JSONB DEFAULT '[]'::jsonb,
  category         TEXT DEFAULT 'general',
  order_index      INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active questions" ON survey_questions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins full access survey_questions" ON survey_questions
  FOR ALL TO authenticated
  USING (is_admin());

-- Seed Data (Copied from previous attempt)
INSERT INTO survey_questions (
    question_text_kr, 
    question_text_en, 
    type, 
    category, 
    order_index, 
    options, 
    is_active
) VALUES 
-- Q01
(
    '그곳에서도 아이가 가장 듣고 싶어 할 이름, 당신이 가장 사랑을 담아 불렀던 그 이름을 이곳에 예쁘게 적어주세요. 아이의 이름을 알려주세요.',
    'Please write the name that your pet would most want to hear even there, the name you called with the most love. What is your pet''s name?',
    'text',
    'general',
    10,
    '[]'::jsonb,
    true
),
-- Q02
(
    '무지개 다리 너머, 아이가 그곳의 시간으로 여행을 떠난 지는 얼마나 되었을까요?',
    'How long has it been since your pet started their journey to the time over the rainbow bridge?',
    'choice',
    'general',
    20,
    '[
        {"label": "6개월 미만", "value": "Less than 6 months"},
        {"label": "6개월 - 1년", "value": "6 months - 1 year"},
        {"label": "1년 - 3년", "value": "1 year - 3 years"},
        {"label": "3년 이상", "value": "Over 3 years"}
    ]'::jsonb,
    true
),
-- Q03
(
    '아이는 낯선 사람을 만났을 때 어떤 표정이었나요?',
    'What was your pet''s expression when meeting a stranger?',
    'choice',
    'personality',
    30,
    '[
        {"label": "반갑게 인사함", "value": "Greeted them happily", "score": 90, "dimension": "social_energy"},
        {"label": "조심스럽게 탐색", "value": "Approached cautiously", "score": 60, "dimension": "social_energy"},
        {"label": "당신 뒤로 숨음", "value": "Hid behind me or barked", "score": 30, "dimension": "social_energy"},
        {"label": "무심하게 지나침", "value": "Ignored them completely", "score": 50, "dimension": "social_energy"}
    ]'::jsonb,
    true
),
-- Q04
(
    '가끔 큰 소리가 들릴 때, 아이는 당신의 품을 찾았나요?',
    'When a loud noise was heard, did your pet seek your arms?',
    'choice',
    'personality',
    40,
    '[
        {"label": "아주 평온함", "value": "Very peaceful", "score": 100, "dimension": "emotional_resilience"},
        {"label": "차분히 살핌", "value": "Looked around calmly", "score": 80, "dimension": "emotional_resilience"},
        {"label": "움찔함", "value": "Got slightly startled", "score": 50, "dimension": "emotional_resilience"},
        {"label": "겁먹고 숨음", "value": "Panicked and hid", "score": 20, "dimension": "emotional_resilience"}
    ]'::jsonb,
    true
),
-- Q05
(
    '이름 말고도 당신과 아이만이 알던 비밀스러운 별명이 있었나요?',
    'Was there a secret nickname that only you and your pet knew besides their name?',
    'text',
    'memory',
    50,
    '[]'::jsonb,
    true
),
-- Q06
(
    '새로운 장난감을 선물받거나 낯선 산책길을 갈 때, 아이의 눈은 호기심으로 반짝였나요?',
    'When receiving a new toy or going on an unfamiliar walk, did your pet''s eyes sparkle with curiosity?',
    'choice',
    'personality',
    60,
    '[
        {"label": "눈이 반짝이며 흥분", "value": "Extremely curious and excited", "score": 95, "dimension": "curiosity_drive"},
        {"label": "신중하게 냄새 맡음", "value": "Investigated carefully", "score": 75, "dimension": "curiosity_drive"},
        {"label": "적응 시간이 필요", "value": "Needed time to adjust", "score": 45, "dimension": "curiosity_drive"},
        {"label": "익숙한 곳을 최고로 여김", "value": "Preferred familiar things", "score": 20, "dimension": "curiosity_drive"}
    ]'::jsonb,
    true
),
-- Q07
(
    '아이는 당신의 품에 쏙 안겨 체온을 나누는 것을 좋아하던 ''껌딱지''였나요?',
    'Was your pet a ''velcro pet'' who loved to snuggle in your arms and share warmth?',
    'choice',
    'personality',
    70,
    '[
        {"label": "언제나 안기고 싶어 함", "value": "Always wanted to be touched", "score": 100, "dimension": "affection_style"},
        {"label": "원할 때만 다가옴", "value": "Liked it when they wanted it", "score": 70, "dimension": "affection_style"},
        {"label": "적당한 거리를 즐김", "value": "Okay, but not for too long", "score": 45, "dimension": "affection_style"},
        {"label": "혼자만의 공간을 사랑함", "value": "Preferred personal space", "score": 20, "dimension": "affection_style"}
    ]'::jsonb,
    true
),
-- Q08
(
    '아이의 코 끝을 찡긋하게 만들었던 ''마법의 간식''은 무엇이었나요?',
    'What was the ''magic snack'' that made your pet''s nose twitch?',
    'choice',
    'personality',
    80,
    '[
        {"label": "식탐 대마왕 (다 맛있어)", "value": "Highly food-motivated (Everything is yummy)", "score": 100, "dimension": "food_motivation"},
        {"label": "미식가 (호불호 확실)", "value": "Picky eater (Only liked specific things)", "score": 60, "dimension": "food_motivation"},
        {"label": "평범했다", "value": "Average interest", "score": 50, "dimension": "food_motivation"},
        {"label": "입이 짧았다", "value": "Ate very little", "score": 25, "dimension": "food_motivation"}
    ]'::jsonb,
    true
),
-- Q09
(
    '아이가 눈이 뒤집힐 정도로 좋아했던 ''최애 간식'' 하나는?',
    'What was the ONE snack or food they went absolutely crazy for?',
    'text',
    'memory',
    90,
    '[]'::jsonb,
    true
),
-- Q10
(
    '당신이 현관문을 열고 들어설 때, 아이는 당신을 어떻게 맞이해 주었나요?',
    'When you opened the front door and walked in, how did your pet welcome you?',
    'choice',
    'personality',
    100,
    '[
        {"label": "기쁨의 점프와 함성", "value": "Jumped and barked excitedly", "score": 95, "dimension": "social_energy"},
        {"label": "장난감을 물고 달려옴", "value": "Brought a toy to me", "score": 85, "dimension": "social_energy"},
        {"label": "다리에 몸을 비빔", "value": "Rubbed against my legs", "score": 75, "dimension": "social_energy"},
        {"label": "조용히 꼬리치며 미소 지음", "value": "Just looked up and wagged tail", "score": 40, "dimension": "social_energy"}
    ]'::jsonb,
    true
),
-- Q11
(
    '남들은 모르고 당신만 아는, 아이의 가장 우습거나 사랑스러웠던 ''비밀 습관'' 하나만 들려주실래요?',
    'Would you like to tell us about your pet''s funniest or loveliest ''secret habit'' that only you knew?',
    'text',
    'memory',
    110,
    '[]'::jsonb,
    true
),
-- Q12
(
    '아이의 전체적인 느낌을 하나의 단어로 정의한다면 무엇일까요?',
    'If you were to define your pet''s overall vibe in one word, what would it be?',
    'choice',
    'personality',
    120,
    '[
        {"label": "든든한 수호자", "value": "The Brave Protector"},
        {"label": "천진난만한 아기", "value": "The Innocent Baby"},
        {"label": "지혜로운 단짝", "value": "The Wise Soulmate"},
        {"label": "장난기 가득한 사고뭉치", "value": "The Playful Troublemaker"}
    ]'::jsonb,
    true
),
-- Q13
(
    '만약 지금 아이가 사후세계에서 당신에게 편지를 쓴다면, 어떤 목소리가 들릴까요?',
    'If your pet were writing a letter to you from there right now, what voice would be heard?',
    'choice',
    'personality',
    130,
    '[
        {"label": "에너지 넘치는 말투", "value": "Cheerful and energetic"},
        {"label": "포근한 위로의 말투", "value": "Warm and comforting"},
        {"label": "재치 있는 장난꾸러기 말투", "value": "Funny and witty"},
        {"label": "차분하고 깊은 울림의 말투", "value": "Calm and poetic"}
    ]'::jsonb,
    true
),
-- Q14
(
    '지금 그곳에서 아이는 어떤 풍경 속에 머물고 있을까요?',
    'In what landscape is your pet staying right now?',
    'choice',
    'preference',
    140,
    '[
        {"label": "햇살 비치는 초원", "value": "A sunny, green meadow"},
        {"label": "솜사탕 같은 구름 왕국", "value": "A cozy, warm cloud kingdom"},
        {"label": "별이 흐르는 밤하늘", "value": "A peaceful, starlit night sky"},
        {"label": "신비로운 숲", "value": "A quiet, magical forest"}
    ]'::jsonb,
    true
),
-- Q15
(
    '아이에게 꼭 전하고 싶었지만 미처 전하지 못한 말이 있나요?',
    'Is there anything you wanted to say to your pet but couldn''t?',
    'text',
    'memory',
    150,
    '[]'::jsonb,
    true
),
-- Q16
(
    '밤이 되면 아이는 주로 어디서 잠들었나요?',
    'Where did your pet usually sleep at night?',
    'choice',
    'personality',
    160,
    '[
        {"label": "침대에서 바로 옆에", "value": "Right next to me in bed", "score": 100, "dimension": "affection_style"},
        {"label": "가까이 있지만 자기 잠자리에서", "value": "Near me but in their own bed", "score": 75, "dimension": "affection_style"},
        {"label": "혼자 조용한 구석에서", "value": "In a quiet corner alone", "score": 30, "dimension": "affection_style"},
        {"label": "매일 밤 자리를 바꾸며", "value": "Changed spots every night", "score": 50, "dimension": "affection_style"}
    ]'::jsonb,
    true
),
-- Q17
(
    '아이의 하루 일과 중 가장 규칙적이었던 부분은 무엇이었나요?',
    'What was the most predictable part of your pet''s daily routine?',
    'choice',
    'personality',
    170,
    '[
        {"label": "아침 산책 시간", "value": "Morning walk time", "score": 60, "dimension": "curiosity_drive"},
        {"label": "밥 먹는 시간", "value": "Mealtime ritual", "score": 40, "dimension": "curiosity_drive"},
        {"label": "저녁 놀이 시간", "value": "Evening playtime", "score": 70, "dimension": "curiosity_drive"},
        {"label": "잠자리 스킨십", "value": "Bedtime snuggle", "score": 50, "dimension": "curiosity_drive"}
    ]'::jsonb,
    true
),
-- Q18
(
    '당신이 기분이 안 좋을 때, 아이는 어떻게 반응했나요?',
    'When you were feeling down, how did your pet respond?',
    'choice',
    'personality',
    180,
    '[
        {"label": "바로 달려와 위로해줌", "value": "Came immediately to comfort me", "score": 100, "dimension": "empathy_sensitivity"},
        {"label": "가까이서 조용히 지켜봄", "value": "Stayed close and watched quietly", "score": 80, "dimension": "empathy_sensitivity"},
        {"label": "어리둥절하지만 곁에 있음", "value": "Seemed confused but stayed near", "score": 50, "dimension": "empathy_sensitivity"},
        {"label": "잘 모르는 것 같았음", "value": "Didn''t seem to notice much", "score": 20, "dimension": "empathy_sensitivity"}
    ]'::jsonb,
    true
),
-- Q19
(
    '아이는 다른 동물 친구들과 어떻게 지냈나요?',
    'How did your pet get along with other animals?',
    'choice',
    'personality',
    190,
    '[
        {"label": "모두와 잘 어울림", "value": "Loved playing with everyone", "score": 100, "dimension": "social_preference"},
        {"label": "몇몇 친한 친구만", "value": "Chose a few close friends", "score": 70, "dimension": "social_preference"},
        {"label": "조심스럽지만 호기심 있음", "value": "Cautious but curious", "score": 50, "dimension": "social_preference"},
        {"label": "혼자가 좋음", "value": "Preferred to be alone", "score": 20, "dimension": "social_preference"}
    ]'::jsonb,
    true
),
-- Q20
(
    '아이의 놀이 스타일은 어땠나요?',
    'How would you describe your pet''s play style?',
    'choice',
    'personality',
    200,
    '[
        {"label": "폭발적인 에너지와 흥분", "value": "Explosive energy and excitement", "score": 100, "dimension": "playfulness_intensity"},
        {"label": "활발하고 장난스러움", "value": "Active and playful", "score": 75, "dimension": "playfulness_intensity"},
        {"label": "차분하고 부드러움", "value": "Calm and gentle", "score": 40, "dimension": "playfulness_intensity"},
        {"label": "조용한 관찰을 선호", "value": "Preferred quiet observation", "score": 20, "dimension": "playfulness_intensity"}
    ]'::jsonb,
    true
),
-- Q21
(
    '함께한 시간 중 가장 잊을 수 없는 순간은 무엇이었나요?',
    'What was the most unforgettable moment you shared together?',
    'text',
    'memory',
    210,
    '[]'::jsonb,
    true
),
-- Q22
(
    '아이에게 특별한 재능이나 초능력이 있었다면 무엇이었을까요?',
    'If your pet had a special talent or superpower, what would it be?',
    'text',
    'memory',
    220,
    '[]'::jsonb,
    true
),
-- Q23
(
    '함께 나눈 유대 중에서 가장 소중하게 여기는 것은 무엇인가요?',
    'What is the one thing you treasure most about the bond you shared?',
    'text',
    'memory',
    230,
    '[]'::jsonb,
    true
),
-- Q24
(
    '아이에게 꼭 전하고 싶었지만 미처 전하지 못한 말이 있나요?',
    'Is there anything you wanted to say to your pet but couldn''t?',
    'text',
    'memory',
    240,
    '[]'::jsonb,
    true
),
-- Q25
(
    '수고하셨습니다. 이제 아이가 당신의 마음을 읽고 답장을 준비하려 합니다. 준비가 되셨나요?',
    'You have worked hard. Are you ready to receive a reply from your pet?',
    'choice',
    'general',
    250,
    '[
        {"label": "네, 정말 필요해요.", "value": "Yes, I really need it."},
        {"label": "궁금해요.", "value": "I''m curious."},
        {"label": "나중에요.", "value": "Maybe later."}
    ]'::jsonb,
    true
);
