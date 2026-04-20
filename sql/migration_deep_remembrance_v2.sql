-- ============================================================
-- Deep Remembrance v2.2 Migration
-- Run this in Supabase SQL Editor
-- Date: 2026-03-01
-- ============================================================

-- ─── 1. Extend survey_questions table ───────────────────────
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS phase TEXT;
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS phase_intro_text TEXT;
ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN DEFAULT FALSE;

-- ─── 1.1 Fix type CHECK constraint to allow new types ──────
-- The existing CHECK only allows ('text','choice','scale','yesno').
-- We need 'multiple_choice' and 'long_text' for v2.2.
ALTER TABLE survey_questions DROP CONSTRAINT IF EXISTS survey_questions_type_check;
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_type_check
  CHECK (type IN ('text', 'choice', 'scale', 'yesno', 'multiple_choice', 'long_text'));

-- ─── 1.2 Fix question_text_kr NOT NULL constraint ──────────
-- v2.2 is English-only, so question_text_kr should be nullable.
ALTER TABLE survey_questions ALTER COLUMN question_text_kr DROP NOT NULL;

-- ─── 1.3 Drop question_key UNIQUE constraint temporarily ───
-- v2.2 uses Q01-Q21 which overlap with v1 keys.
-- We need to either rename v1 keys or drop the constraint.
-- Strategy: Prefix v1 keys with 'v1_' then insert v2 keys.
ALTER TABLE survey_questions DROP CONSTRAINT IF EXISTS survey_questions_key_unique;

UPDATE survey_questions
SET question_key = 'v1_' || question_key
WHERE version = 1 AND question_key NOT LIKE 'v1_%';

-- Re-add unique constraint
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_key_unique UNIQUE (question_key);

-- ─── 2. Deactivate all v1 questions ────────────────────────
UPDATE survey_questions SET is_active = false WHERE version = 1;

-- ─── 3. Insert v2.2 questions (21 questions, English-only) ──
-- Columns: question_key, question_text_en, question_text_kr, type, options,
--          category, order_index, is_active, allow_multiple, version, phase, phase_intro_text
--          (12 columns total)

-- Phase 1: THE DOOR (Q01-Q03)
INSERT INTO survey_questions (question_key, question_text_en, question_text_kr, type, options, category, order_index, is_active, allow_multiple, version, phase, phase_intro_text)
VALUES
('Q01', 'Do you remember the day you first met [Name]? How did you two find each other?', '', 'choice',
 '[{"label":"My family brought them home (breeder or adoption)","value":"family_brought","score":null,"dimension":"origin_story"},{"label":"I found them on the street (rescue)","value":"rescue","score":null,"dimension":"origin_story"},{"label":"They were a gift from someone","value":"gift","score":null,"dimension":"origin_story"},{"label":"I got them from a pet store","value":"pet_store","score":null,"dimension":"origin_story"},{"label":"They were born into our family","value":"born_family","score":null,"dimension":"origin_story"},{"label":"I don''t quite remember","value":"dont_remember","score":null,"dimension":"origin_story"}]'::jsonb,
 'general', 1, true, false, 2, 'P1',
 'Let''s take a moment to remember [Name]. There are no right or wrong answers — just share what comes to mind. This will take about 8 minutes.'),

('Q02', 'When you came home and opened the door, what did [Name] usually do?', '', 'choice',
 '[{"label":"Ran to me like crazy, full-body wiggle and all","value":"ran_crazy","score":95,"dimension":"social_energy"},{"label":"Came over with a wagging tail, happy but not over the top","value":"wagging_tail","score":80,"dimension":"social_energy"},{"label":"Got up slowly and strolled over to greet me","value":"strolled","score":60,"dimension":"social_energy"},{"label":"Lifted their head and looked at me from their spot","value":"lifted_head","score":45,"dimension":"social_energy"},{"label":"Acted like they didn''t care... then quietly came closer","value":"pretend_no_care","score":55,"dimension":"social_energy"},{"label":"Pretended not to notice, but their tail gave them away","value":"tail_giveaway","score":50,"dimension":"social_energy"},{"label":"It depended on the day","value":"depended","score":60,"dimension":"social_energy"}]'::jsonb,
 'personality', 2, true, false, 2, 'P1', NULL),

('Q03', 'When someone new came to your home, how did [Name] usually react?', '', 'choice',
 '[{"label":"Went right up to say hello — loved meeting new people","value":"say_hello","score":90,"dimension":"social_energy"},{"label":"Stayed cautious at first, but warmed up after a while","value":"cautious_warmup","score":65,"dimension":"social_energy"},{"label":"Hid behind me or kept their distance","value":"hid","score":30,"dimension":"social_energy"},{"label":"Barked or growled to let them know","value":"barked","score":25,"dimension":"social_energy"},{"label":"Completely ignored them — had better things to do","value":"ignored","score":50,"dimension":"social_energy"},{"label":"It really depended on the person","value":"depended","score":55,"dimension":"social_energy"}]'::jsonb,
 'personality', 3, true, false, 2, 'P1', NULL),

-- Phase 2: THE LIVING ROOM (Q04-Q10)
('Q04', 'When you left the house and [Name] was home alone, what usually happened?', '', 'multiple_choice',
 '[{"label":"Followed me around, trying to stop me from leaving","value":"followed","score":null,"dimension":"separation_anxiety"},{"label":"Waited by the door until I came back","value":"waited_door","score":null,"dimension":"separation_anxiety"},{"label":"Chewed things up or made a mess","value":"chewed","score":null,"dimension":"coping_style"},{"label":"Barked, whined, or cried","value":"barked_cried","score":null,"dimension":"coping_style"},{"label":"Slept quietly in their favorite spot","value":"slept_quietly","score":null,"dimension":"independence"},{"label":"Played on their own just fine","value":"played_alone","score":null,"dimension":"independence"},{"label":"Stopped eating until I got back","value":"stopped_eating","score":null,"dimension":"separation_anxiety"},{"label":"Honestly, I''m not sure — no camera at home","value":"not_sure","score":null,"dimension":"neutral"}]'::jsonb,
 'personality', 4, true, true, 2, 'P2',
 'Now let''s step into everyday life with [Name]. The little things matter most.'),

('Q05', 'When you gave [Name] a new toy or they saw something unfamiliar, how did they react?', '', 'choice',
 '[{"label":"Ran straight to it — endlessly curious","value":"ran_straight","score":90,"dimension":"curiosity_drive"},{"label":"Sniffed it cautiously and approached slowly","value":"sniffed_cautious","score":70,"dimension":"curiosity_drive"},{"label":"Watched it for a long time before showing interest","value":"watched_long","score":50,"dimension":"curiosity_drive"},{"label":"Didn''t care much — stuck to what they already loved","value":"didnt_care","score":35,"dimension":"curiosity_drive"},{"label":"Got scared and backed away","value":"scared","score":20,"dimension":"curiosity_drive"},{"label":"Ignored the thing but went nuts for the packaging","value":"packaging","score":85,"dimension":"curiosity_drive"}]'::jsonb,
 'personality', 5, true, false, 2, 'P2', NULL),

('Q06', 'What kind of play made [Name] the happiest?', '', 'multiple_choice',
 '[{"label":"Fetching a ball or toy","value":"fetching","score":null,"dimension":"active_play"},{"label":"Chasing a string or wand toy","value":"chasing","score":null,"dimension":"chase_play"},{"label":"Hide-and-seek or chase games with people","value":"hide_seek","score":null,"dimension":"social_play"},{"label":"Shaking, chewing, or ''destroying'' a toy on their own","value":"destroying","score":null,"dimension":"solo_play"},{"label":"Wrestling or rolling around together","value":"wrestling","score":null,"dimension":"contact_play"},{"label":"Exploring and discovering new things on their own","value":"exploring","score":null,"dimension":"explorer_play"},{"label":"Honestly, they just liked being next to me more than playing","value":"next_to_me","score":null,"dimension":"low_play"}]'::jsonb,
 'personality', 6, true, true, 2, 'P2', NULL),

('Q07', 'When it came to treats or food, what was [Name] like?', '', 'choice',
 '[{"label":"Would do absolutely anything for food — total foodie","value":"total_foodie","score":95,"dimension":"food_motivation"},{"label":"Loved their favorites, but ate in moderation","value":"moderation","score":65,"dimension":"food_motivation"},{"label":"Super picky — only ate what they liked","value":"picky","score":50,"dimension":"food_motivation"},{"label":"Not really into food all that much","value":"not_into_food","score":20,"dimension":"food_motivation"},{"label":"Treats could get them to do anything — ultimate motivator","value":"treat_motivator","score":85,"dimension":"food_motivation"},{"label":"Would eat anything I gave them (even people food...)","value":"eat_anything","score":80,"dimension":"food_motivation"}]'::jsonb,
 'personality', 7, true, false, 2, 'P2', NULL),

('Q08', 'What was [Name]''s absolute favorite thing in the world?', '', 'text',
 NULL,
 'memory', 8, true, false, 2, 'P2', NULL),

('Q09', 'On days when you were feeling down or sad, what did [Name] do?', '', 'choice',
 '[{"label":"Noticed right away and came running to be close","value":"noticed_running","score":90,"dimension":"empathy_sensitivity"},{"label":"Quietly sat beside me without a sound","value":"sat_quietly","score":80,"dimension":"empathy_sensitivity"},{"label":"Licked my face or nuzzled me more than usual","value":"licked_nuzzled","score":85,"dimension":"empathy_sensitivity"},{"label":"Seemed to sense it but didn''t know what to do","value":"sensed_unsure","score":55,"dimension":"empathy_sensitivity"},{"label":"Honestly, I don''t think they noticed","value":"didnt_notice","score":30,"dimension":"empathy_sensitivity"},{"label":"Did something silly to make me laugh","value":"silly_laugh","score":70,"dimension":"empathy_sensitivity"}]'::jsonb,
 'personality', 9, true, false, 2, 'P2', NULL),

('Q10', 'How was [Name] around other animals?', '', 'choice',
 '[{"label":"Social butterfly — loved making friends","value":"social_butterfly","score":90,"dimension":"social_preference"},{"label":"Got along well, but did things at their own pace","value":"own_pace","score":70,"dimension":"social_preference"},{"label":"Wary at first, but slowly warmed up","value":"wary_warmup","score":55,"dimension":"social_preference"},{"label":"Didn''t care much for other animals — preferred people","value":"preferred_people","score":40,"dimension":"social_preference"},{"label":"Got nervous or tried to avoid them","value":"nervous_avoid","score":25,"dimension":"social_preference"},{"label":"Could be aggressive toward other animals","value":"aggressive","score":20,"dimension":"social_preference"},{"label":"Rarely ever met other animals","value":"rarely_met","score":null,"dimension":"social_preference"}]'::jsonb,
 'personality', 10, true, false, 2, 'P2', NULL),

-- Phase 3: THE QUIET ROOM (Q11-Q14)
('Q11', 'Where did [Name] usually sleep?', '', 'choice',
 '[{"label":"Always on my bed, right next to me","value":"my_bed","score":95,"dimension":"affection_style"},{"label":"In the same room, but in their own bed","value":"same_room","score":70,"dimension":"affection_style"},{"label":"Sometimes with me, sometimes in their own spot","value":"sometimes","score":65,"dimension":"affection_style"},{"label":"Always in their own space — a different room or favorite corner","value":"own_space","score":35,"dimension":"affection_style"},{"label":"Never had a set spot — slept somewhere different every night","value":"no_set_spot","score":50,"dimension":"affection_style"},{"label":"Had to burrow under the blankets no matter what","value":"burrow_blankets","score":90,"dimension":"affection_style"}]'::jsonb,
 'personality', 11, true, false, 2, 'P3',
 'Let''s go a little deeper now. This part is about you and [Name] — your story together.'),

('Q12', 'How did you know [Name] loved you? What was their way of showing it?', '', 'multiple_choice',
 '[{"label":"Licked my face or hands","value":"licked","score":null,"dimension":"physical"},{"label":"Climbed onto my lap or into my arms","value":"climbed_lap","score":null,"dimension":"proximity"},{"label":"Wagged their tail (or purred)","value":"wagged_purred","score":null,"dimension":"vocal_body"},{"label":"Held eye contact and just... looked at me","value":"eye_contact","score":null,"dimension":"gaze"},{"label":"Followed me everywhere I went","value":"followed","score":null,"dimension":"following"},{"label":"Showed me their belly","value":"belly","score":null,"dimension":"trust"},{"label":"Brought me toys or little ''gifts''","value":"gifts","score":null,"dimension":"gift"},{"label":"Didn''t show it much, but I could always tell","value":"reserved","score":null,"dimension":"reserved"}]'::jsonb,
 'personality', 12, true, true, 2, 'P3', NULL),

('Q13', 'When [Name] was scared or anxious — like during a thunderstorm, vet visit, or loud noise — how did they show it?', '', 'multiple_choice',
 '[{"label":"Came to me to hide or be held","value":"came_to_hide","score":null,"dimension":"dependent"},{"label":"Found a corner or small space to hide in","value":"found_corner","score":null,"dimension":"internalizer"},{"label":"Trembled or panted","value":"trembled","score":null,"dimension":"physiological"},{"label":"Barked, whined, or cried","value":"barked_cried","score":null,"dimension":"externalizer"},{"label":"Chewed or destroyed things","value":"chewed","score":null,"dimension":"externalizer"},{"label":"Stopped eating or acted out of character","value":"stopped_eating","score":null,"dimension":"internalizer"},{"label":"Slept a lot more than usual","value":"slept_more","score":null,"dimension":"internalizer"},{"label":"Surprisingly calm — didn''t seem fazed","value":"calm","score":null,"dimension":"resilient"}]'::jsonb,
 'personality', 13, true, true, 2, 'P3', NULL),

('Q14', 'Did [Name] have any funny or unique little habits?', '', 'long_text',
 NULL,
 'memory', 14, true, false, 2, 'P3', NULL),

-- Phase 4: THE LETTER (Q15-Q19)
('Q15', 'Is there a moment with [Name] that still feels vivid — like it just happened?', '', 'long_text',
 NULL,
 'memory', 15, true, false, 2, 'P4',
 'Take your time from here. Just let your heart lead the way.'),

('Q16', 'If [Name] had a secret superpower, what would it be?', '', 'text',
 NULL,
 'memory', 16, true, false, 2, 'P4', NULL),

('Q17', 'If [Name] could talk, what would you want to hear them say?', '', 'long_text',
 NULL,
 'memory', 17, true, false, 2, 'P4', NULL),

('Q18', 'If you could say one thing to [Name] right now, what would it be?', '', 'long_text',
 NULL,
 'memory', 18, true, false, 2, 'P4', NULL),

('Q19', 'If [Name] could write you a letter, what do you think their style would be?', '', 'choice',
 '[{"label":"Excited and all over the place — \"And then! Oh, also! Guess what!\"","value":"expressive_energetic","score":null,"dimension":"letter_voice"},{"label":"Quiet but warm — \"Had a good day today. How are things over there?\"","value":"moderate_warm","score":null,"dimension":"letter_voice"},{"label":"Short and a little sassy — \"You eating okay? Hmph.\"","value":"reserved_tsundere","score":null,"dimension":"letter_voice"},{"label":"Awkward but heartfelt — \"I''m not good at this but... I miss you.\"","value":"reserved_earnest","score":null,"dimension":"letter_voice"},{"label":"Playful and full of personality — \"I''m basically famous here lol, be jealous\"","value":"expressive_playful","score":null,"dimension":"letter_voice"},{"label":"Gentle and wise — \"Don''t worry about me. I''m doing just fine here.\"","value":"moderate_mature","score":null,"dimension":"letter_voice"}]'::jsonb,
 'personality', 19, true, false, 2, 'P4', NULL),

-- Phase 5: THE LIGHT (Q20-Q21)
('Q20', 'What was a typical day like for [Name]?', '', 'choice',
 '[{"label":"Full of energy from morning to night — never stopped","value":"full_energy","score":90,"dimension":"energy_level"},{"label":"Balanced — played some, rested some, a nice rhythm","value":"balanced","score":65,"dimension":"energy_level"},{"label":"Mostly napped, but came alive at certain times","value":"mostly_napped","score":45,"dimension":"energy_level"},{"label":"Spent most of the day quietly, very chill","value":"quiet_chill","score":25,"dimension":"energy_level"},{"label":"A totally different animal during walks or outings","value":"different_walks","score":55,"dimension":"energy_level"},{"label":"Only really lit up around mealtime","value":"mealtime","score":40,"dimension":"energy_level"}]'::jsonb,
 'personality', 20, true, false, 2, 'P5',
 'Almost there. Just one or two more things.'),

('Q21', 'Are you ready to receive [Name]''s first letter from ToThereOn?', '', 'choice',
 '[{"label":"Yes — I''ve been waiting for this","value":"yes_waiting","score":100,"dimension":"readiness_level"},{"label":"A little nervous, but I''d like to try","value":"nervous_try","score":75,"dimension":"readiness_level"},{"label":"I''m not sure yet... but I''ll give it a go","value":"not_sure","score":50,"dimension":"readiness_level"},{"label":"Honestly, it scares me a little — but that''s okay","value":"scared_okay","score":30,"dimension":"readiness_level"}]'::jsonb,
 'general', 21, true, false, 2, 'P5', NULL);

-- ─── 4. Extend deep_remembrance_responses ───────────────────
ALTER TABLE deep_remembrance_responses ADD COLUMN IF NOT EXISTS survey_version INTEGER DEFAULT 1;

-- ─── 5. Extend pet_personas for healing_mission ─────────────
ALTER TABLE pet_personas ADD COLUMN IF NOT EXISTS healing_mission JSONB;

-- ─── 6. Verify ─────────────────────────────────────────────
SELECT version, is_active, COUNT(*) as cnt
FROM survey_questions
GROUP BY version, is_active
ORDER BY version, is_active;
