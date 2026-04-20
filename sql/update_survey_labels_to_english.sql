-- ============================================================
-- Update survey_questions options labels from Korean → English
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Q02: How long ago did your pet pass
UPDATE survey_questions SET options = '[
    {"label": "Less than 6 months", "value": "Less than 6 months"},
    {"label": "6 months - 1 year",  "value": "6 months - 1 year"},
    {"label": "1 year - 3 years",   "value": "1 year - 3 years"},
    {"label": "Over 3 years",        "value": "Over 3 years"}
]'::jsonb
WHERE question_key = 'Q02'
   OR (question_key IS NULL AND order_index = 20);

-- Q03: Reaction to strangers
UPDATE survey_questions SET options = '[
    {"label": "Greeted them happily",       "value": "Greeted them happily",       "score": 90, "dimension": "social_energy"},
    {"label": "Approached cautiously",      "value": "Approached cautiously",      "score": 60, "dimension": "social_energy"},
    {"label": "Hid behind me or barked",    "value": "Hid behind me or barked",    "score": 30, "dimension": "social_energy"},
    {"label": "Ignored them completely",    "value": "Ignored them completely",    "score": 50, "dimension": "social_energy"}
]'::jsonb
WHERE question_key = 'Q03'
   OR (question_key IS NULL AND order_index = 30);

-- Q04: Reaction to loud noises
UPDATE survey_questions SET options = '[
    {"label": "Very peaceful",          "value": "Very peaceful",          "score": 100, "dimension": "emotional_resilience"},
    {"label": "Looked around calmly",   "value": "Looked around calmly",   "score": 80,  "dimension": "emotional_resilience"},
    {"label": "Got slightly startled",  "value": "Got slightly startled",  "score": 50,  "dimension": "emotional_resilience"},
    {"label": "Panicked and hid",       "value": "Panicked and hid",       "score": 20,  "dimension": "emotional_resilience"}
]'::jsonb
WHERE question_key = 'Q04'
   OR (question_key IS NULL AND order_index = 40);

-- Q06: Curiosity with new things
UPDATE survey_questions SET options = '[
    {"label": "Extremely curious and excited", "value": "Extremely curious and excited", "score": 95, "dimension": "curiosity_drive"},
    {"label": "Investigated carefully",        "value": "Investigated carefully",        "score": 75, "dimension": "curiosity_drive"},
    {"label": "Needed time to adjust",         "value": "Needed time to adjust",         "score": 45, "dimension": "curiosity_drive"},
    {"label": "Preferred familiar things",     "value": "Preferred familiar things",     "score": 20, "dimension": "curiosity_drive"}
]'::jsonb
WHERE question_key = 'Q06'
   OR (question_key IS NULL AND order_index = 60);

-- Q07: Affection / velcro pet
UPDATE survey_questions SET options = '[
    {"label": "Always wanted to be touched",   "value": "Always wanted to be touched",   "score": 100, "dimension": "affection_style"},
    {"label": "Liked it when they wanted it",  "value": "Liked it when they wanted it",  "score": 70,  "dimension": "affection_style"},
    {"label": "Okay, but not for too long",    "value": "Okay, but not for too long",    "score": 45,  "dimension": "affection_style"},
    {"label": "Preferred personal space",      "value": "Preferred personal space",      "score": 20,  "dimension": "affection_style"}
]'::jsonb
WHERE question_key = 'Q07'
   OR (question_key IS NULL AND order_index = 70);

-- Q08: Food motivation
UPDATE survey_questions SET options = '[
    {"label": "Highly food-motivated (Everything is yummy)", "value": "Highly food-motivated (Everything is yummy)", "score": 100, "dimension": "food_motivation"},
    {"label": "Picky eater (Only liked specific things)",    "value": "Picky eater (Only liked specific things)",    "score": 60,  "dimension": "food_motivation"},
    {"label": "Average interest in food",                    "value": "Average interest",                            "score": 50,  "dimension": "food_motivation"},
    {"label": "Ate very little",                             "value": "Ate very little",                             "score": 25,  "dimension": "food_motivation"}
]'::jsonb
WHERE question_key = 'Q08'
   OR (question_key IS NULL AND order_index = 80);

-- Q10: Homecoming greeting
UPDATE survey_questions SET options = '[
    {"label": "Jumped and barked excitedly",       "value": "Jumped and barked excitedly",   "score": 95, "dimension": "social_energy"},
    {"label": "Brought a toy to me",               "value": "Brought a toy to me",           "score": 85, "dimension": "social_energy"},
    {"label": "Rubbed against my legs",            "value": "Rubbed against my legs",        "score": 75, "dimension": "social_energy"},
    {"label": "Just looked up and wagged their tail", "value": "Just looked up and wagged tail", "score": 40, "dimension": "social_energy"}
]'::jsonb
WHERE question_key = 'Q10'
   OR (question_key IS NULL AND order_index = 100);

-- Q12: Overall vibe in one word
UPDATE survey_questions SET options = '[
    {"label": "The Brave Protector",     "value": "The Brave Protector"},
    {"label": "The Innocent Baby",       "value": "The Innocent Baby"},
    {"label": "The Wise Soulmate",       "value": "The Wise Soulmate"},
    {"label": "The Playful Troublemaker","value": "The Playful Troublemaker"}
]'::jsonb
WHERE question_key = 'Q12'
   OR (question_key IS NULL AND order_index = 120);

-- Q13: Voice of the letter
UPDATE survey_questions SET options = '[
    {"label": "Cheerful and energetic", "value": "Cheerful and energetic"},
    {"label": "Warm and comforting",    "value": "Warm and comforting"},
    {"label": "Funny and witty",        "value": "Funny and witty"},
    {"label": "Calm and poetic",        "value": "Calm and poetic"}
]'::jsonb
WHERE question_key = 'Q13'
   OR (question_key IS NULL AND order_index = 130);

-- Q14: Afterlife landscape
UPDATE survey_questions SET options = '[
    {"label": "A sunny, green meadow",       "value": "A sunny, green meadow"},
    {"label": "A cozy, warm cloud kingdom",  "value": "A cozy, warm cloud kingdom"},
    {"label": "A peaceful, starlit night sky","value": "A peaceful, starlit night sky"},
    {"label": "A quiet, magical forest",     "value": "A quiet, magical forest"}
]'::jsonb
WHERE question_key = 'Q14'
   OR (question_key IS NULL AND order_index = 140);

-- Q16: Sleeping spot
UPDATE survey_questions SET options = '[
    {"label": "Right next to me in bed",      "value": "Right next to me in bed",      "score": 100, "dimension": "affection_style"},
    {"label": "Near me but in their own bed", "value": "Near me but in their own bed", "score": 75,  "dimension": "affection_style"},
    {"label": "In a quiet corner alone",      "value": "In a quiet corner alone",      "score": 30,  "dimension": "affection_style"},
    {"label": "Changed spots every night",    "value": "Changed spots every night",    "score": 50,  "dimension": "affection_style"}
]'::jsonb
WHERE question_key = 'Q16'
   OR (question_key IS NULL AND order_index = 160);

-- Q17: Daily routine
UPDATE survey_questions SET options = '[
    {"label": "Morning walk time", "value": "Morning walk time", "score": 60, "dimension": "curiosity_drive"},
    {"label": "Mealtime ritual",   "value": "Mealtime ritual",   "score": 40, "dimension": "curiosity_drive"},
    {"label": "Evening playtime",  "value": "Evening playtime",  "score": 70, "dimension": "curiosity_drive"},
    {"label": "Bedtime snuggle",   "value": "Bedtime snuggle",   "score": 50, "dimension": "curiosity_drive"}
]'::jsonb
WHERE question_key = 'Q17'
   OR (question_key IS NULL AND order_index = 170);

-- Q18: Response when you were sad
UPDATE survey_questions SET options = '[
    {"label": "Came immediately to comfort me",    "value": "Came immediately to comfort me",    "score": 100, "dimension": "empathy_sensitivity"},
    {"label": "Stayed close and watched quietly",  "value": "Stayed close and watched quietly",  "score": 80,  "dimension": "empathy_sensitivity"},
    {"label": "Seemed confused but stayed near",   "value": "Seemed confused but stayed near",   "score": 50,  "dimension": "empathy_sensitivity"},
    {"label": "Didn''t seem to notice much",       "value": "Didn''t seem to notice much",       "score": 20,  "dimension": "empathy_sensitivity"}
]'::jsonb
WHERE question_key = 'Q18'
   OR (question_key IS NULL AND order_index = 180);

-- Q19: Getting along with other animals
UPDATE survey_questions SET options = '[
    {"label": "Loved playing with everyone", "value": "Loved playing with everyone", "score": 100, "dimension": "social_preference"},
    {"label": "Chose a few close friends",   "value": "Chose a few close friends",   "score": 70,  "dimension": "social_preference"},
    {"label": "Cautious but curious",        "value": "Cautious but curious",        "score": 50,  "dimension": "social_preference"},
    {"label": "Preferred to be alone",       "value": "Preferred to be alone",       "score": 20,  "dimension": "social_preference"}
]'::jsonb
WHERE question_key = 'Q19'
   OR (question_key IS NULL AND order_index = 190);

-- Q20: Play style
UPDATE survey_questions SET options = '[
    {"label": "Explosive energy and excitement", "value": "Explosive energy and excitement", "score": 100, "dimension": "playfulness_intensity"},
    {"label": "Active and playful",              "value": "Active and playful",              "score": 75,  "dimension": "playfulness_intensity"},
    {"label": "Calm and gentle",                 "value": "Calm and gentle",                 "score": 40,  "dimension": "playfulness_intensity"},
    {"label": "Preferred quiet observation",     "value": "Preferred quiet observation",     "score": 20,  "dimension": "playfulness_intensity"}
]'::jsonb
WHERE question_key = 'Q20'
   OR (question_key IS NULL AND order_index = 200);

-- Q25: Readiness to receive a reply
UPDATE survey_questions SET options = '[
    {"label": "Yes, I really need it.", "value": "Yes, I really need it."},
    {"label": "I''m curious.",          "value": "I''m curious."},
    {"label": "Maybe later.",           "value": "Maybe later."}
]'::jsonb
WHERE question_key = 'Q25'
   OR (question_key IS NULL AND order_index = 250);

-- Verify results
SELECT question_key, order_index, options FROM survey_questions ORDER BY order_index;
