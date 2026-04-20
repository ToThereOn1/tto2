-- Migration: user_consents table
-- Purpose: Record when users agreed to Terms of Service (GDPR/CCPA compliance)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_consents (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_version   TEXT        NOT NULL,
    consented_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_items   JSONB       NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_terms_version ON user_consents(terms_version);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can read their own consent records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_consents' AND policyname = 'Users can read own consents'
    ) THEN
        CREATE POLICY "Users can read own consents" ON user_consents
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Users can insert their own consent records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_consents' AND policyname = 'Users can insert own consents'
    ) THEN
        CREATE POLICY "Users can insert own consents" ON user_consents
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Service role can read all (for admin/audit)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_consents' AND policyname = 'Service role full access'
    ) THEN
        CREATE POLICY "Service role full access" ON user_consents
            USING (auth.role() = 'service_role');
    END IF;
END $$;
