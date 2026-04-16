CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    onboarding_skipped BOOLEAN NOT NULL DEFAULT false,
    theme TEXT NOT NULL DEFAULT 'system',
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    render_complete_notifications BOOLEAN NOT NULL DEFAULT true,
    default_export_quality TEXT NOT NULL DEFAULT 'high',
    default_export_format TEXT NOT NULL DEFAULT 'mp4',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON user_settings;
CREATE POLICY "Allow all operations" ON user_settings FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS user_social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    provider_user_id TEXT,
    provider_username TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_social_user_provider ON user_social_connections(user_id, provider);

ALTER TABLE user_social_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON user_social_connections;
CREATE POLICY "Allow all operations" ON user_social_connections FOR ALL USING (true);
