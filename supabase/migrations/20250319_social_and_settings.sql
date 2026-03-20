-- =============================================
-- Social Sharing & User Settings Migration
-- Run this after the main schema.sql
-- =============================================

-- =============================================
-- USER_SETTINGS TABLE
-- =============================================
-- Stores user preferences, onboarding status, and app settings

CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Onboarding
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    onboarding_skipped BOOLEAN NOT NULL DEFAULT false,
    
    -- App preferences
    theme TEXT NOT NULL DEFAULT 'system',  -- 'light' | 'dark' | 'system'
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    render_complete_notifications BOOLEAN NOT NULL DEFAULT true,
    
    -- Default export settings
    default_export_quality TEXT NOT NULL DEFAULT 'high',  -- 'low' | 'medium' | 'high'
    default_export_format TEXT NOT NULL DEFAULT 'mp4',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON user_settings;
CREATE POLICY "Allow all operations" ON user_settings FOR ALL USING (true);

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- USER_SOCIAL_CONNECTIONS TABLE
-- =============================================
-- OAuth tokens for YouTube, Instagram, TikTok
-- Tokens should be encrypted at rest (consider pgcrypto for production)

CREATE TABLE IF NOT EXISTS user_social_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Platform: 'youtube' | 'instagram' | 'tiktok'
    provider TEXT NOT NULL,
    
    -- OAuth tokens (store encrypted in production)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Platform-specific: channel/account id, username for display
    provider_user_id TEXT,
    provider_username TEXT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_social_user_provider ON user_social_connections(user_id, provider);

ALTER TABLE user_social_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON user_social_connections;
CREATE POLICY "Allow all operations" ON user_social_connections FOR ALL USING (true);

DROP TRIGGER IF EXISTS update_social_connections_updated_at ON user_social_connections;
CREATE TRIGGER update_social_connections_updated_at
    BEFORE UPDATE ON user_social_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
