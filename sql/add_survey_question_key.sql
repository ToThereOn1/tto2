
-- Add question_key to survey_questions
-- This allows mapping DB questions to specific logic (e.g. Q05 = Nickname)

ALTER TABLE survey_questions ADD COLUMN IF NOT EXISTS question_key TEXT;

-- Update existing questions based on order_index
-- 10 -> Q01, 20 -> Q02, ... 90 -> Q09, 100 -> Q10

DO $$
DECLARE
    r RECORD;
    new_key TEXT;
    idx INTEGER;
BEGIN
    FOR r IN SELECT id, order_index FROM survey_questions LOOP
        idx := r.order_index / 10;
        IF idx < 10 THEN
            new_key := 'Q0' || idx::text;
        ELSE
            new_key := 'Q' || idx::text;
        END IF;
        
        UPDATE survey_questions
        SET question_key = new_key
        WHERE id = r.id;
    END LOOP;
END $$;

-- Make it unique and not null after population
ALTER TABLE survey_questions ALTER COLUMN question_key SET NOT NULL;
ALTER TABLE survey_questions ADD CONSTRAINT survey_questions_key_unique UNIQUE (question_key);
