-- Migration: Feed Comments + Comment Replies
-- Pet Feed Comment System Phase 1
-- Guardian comments on feed events + pet reply tracking

-- ─── Feed Comments (guardian → pet) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feed_comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id    UUID NOT NULL REFERENCES pet_status_events(id) ON DELETE CASCADE,
    content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    language    TEXT DEFAULT 'en',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_comments_event ON feed_comments(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_comments_pet ON feed_comments(pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_comments_user ON feed_comments(user_id);

ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

-- Users can only see comments on their own pets
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_comments_select_own_pet') THEN
    CREATE POLICY feed_comments_select_own_pet ON feed_comments
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM pets
                WHERE pets.id = feed_comments.pet_id
                AND pets.user_id = auth.uid()
            )
        );
END IF;
END $$;

-- Users can insert comments on their own pets
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_comments_insert_own_pet') THEN
    CREATE POLICY feed_comments_insert_own_pet ON feed_comments
        FOR INSERT WITH CHECK (
            auth.uid() = user_id
            AND EXISTS (
                SELECT 1 FROM pets
                WHERE pets.id = feed_comments.pet_id
                AND pets.user_id = auth.uid()
            )
        );
END IF;
END $$;

-- Users can delete their own comments
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feed_comments_delete_own') THEN
    CREATE POLICY feed_comments_delete_own ON feed_comments
        FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;

-- ─── Comment Replies (pet → guardian) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS comment_replies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id      UUID NOT NULL REFERENCES feed_comments(id) ON DELETE CASCADE,
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    content         TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'generating', 'delivered', 'failed', 'flagged')),
    quality_score   INTEGER,
    review_notes    JSONB DEFAULT '{}',
    model_used      TEXT,
    tokens_used     INTEGER,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    delivered_at    TIMESTAMPTZ,
    rag_stored      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_replies_comment ON comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_pet ON comment_replies(pet_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_pending ON comment_replies(status, scheduled_at)
    WHERE status = 'pending';

ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

-- Users can see replies for their own pets
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comment_replies_select_own_pet') THEN
    CREATE POLICY comment_replies_select_own_pet ON comment_replies
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM pets
                WHERE pets.id = comment_replies.pet_id
                AND pets.user_id = auth.uid()
            )
        );
END IF;
END $$;

-- Admin-only insert/update (service role via createAdminClient)
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comment_replies_admin_all') THEN
    CREATE POLICY comment_replies_admin_all ON comment_replies
        FOR ALL USING (true) WITH CHECK (true);
END IF;
END $$;
