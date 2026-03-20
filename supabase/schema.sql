-- =============================================
-- Video Editor Database Schema (Firebase Auth Compatible)
-- =============================================
-- This schema is designed to work with Firebase Authentication
-- RLS is DISABLED since we're using Firebase Auth instead of Supabase Auth
-- Security is handled at the application level through Firebase tokens
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
-- Stores user profiles synced from Firebase Auth
-- Primary key matches Firebase UID

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,  -- Firebase UID
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NO RLS - Security handled by Firebase Auth
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Allow all authenticated operations (checked by Firebase on app level)
CREATE POLICY "Allow all operations" ON users FOR ALL USING (true);

-- =============================================
-- PROJECTS TABLE
-- =============================================
-- Stores video editing projects

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    
    -- Video settings
    resolution_width INTEGER NOT NULL DEFAULT 1920,
    resolution_height INTEGER NOT NULL DEFAULT 1080,
    frame_rate INTEGER NOT NULL DEFAULT 30,
    duration INTEGER DEFAULT 0,  -- in milliseconds
    
    -- Editor state (stored as JSONB)
    editor_state JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- NO RLS - Security handled by Firebase Auth
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Allow all operations (Firebase handles auth)
CREATE POLICY "Allow all operations" ON projects FOR ALL USING (true);

-- =============================================
-- ASSETS TABLE
-- =============================================
-- Stores uploaded media files (videos, images, audio)

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- File info
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,  -- 'video', 'image', 'audio'
    file_size BIGINT NOT NULL,  -- in bytes
    content_type TEXT NOT NULL,  -- MIME type
    file_url TEXT NOT NULL,     -- Public URL (R2 or CDN)
    storage_key TEXT NOT NULL,  -- R2 key/path
    
    -- Optional media metadata
    width INTEGER,
    height INTEGER,
    duration_seconds NUMERIC,
    
    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type);
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_at ON assets(uploaded_at DESC);

-- Migration: add missing columns if upgrading from old schema
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='project_id') THEN
        ALTER TABLE assets ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='file_url') THEN
        ALTER TABLE assets ADD COLUMN file_url TEXT;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='storage_url') THEN
            UPDATE assets SET file_url = storage_url WHERE storage_url IS NOT NULL;
        END IF;
        UPDATE assets SET file_url = '' WHERE file_url IS NULL;
        ALTER TABLE assets ALTER COLUMN file_url SET NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='content_type') THEN
        ALTER TABLE assets ADD COLUMN content_type TEXT DEFAULT 'application/octet-stream';
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='mime_type') THEN
            UPDATE assets SET content_type = mime_type WHERE mime_type IS NOT NULL;
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='width') THEN
        ALTER TABLE assets ADD COLUMN width INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='height') THEN
        ALTER TABLE assets ADD COLUMN height INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='duration_seconds') THEN
        ALTER TABLE assets ADD COLUMN duration_seconds NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='created_at') THEN
        ALTER TABLE assets ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- NO RLS - Security handled by Firebase Auth
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own assets" ON assets;
DROP POLICY IF EXISTS "Users can upload their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;

-- Allow all operations
CREATE POLICY "Allow all operations" ON assets FOR ALL USING (true);

-- =============================================
-- RENDERS TABLE
-- =============================================
-- Stores render job history and status

CREATE TABLE IF NOT EXISTS renders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Render settings
    output_format TEXT NOT NULL DEFAULT 'mp4',
    quality TEXT NOT NULL DEFAULT 'high',

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0,              -- 0-100
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Output info
    output_url TEXT,
    output_size BIGINT,   -- in bytes
    storage_key TEXT,     -- R2 key/path

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Alter existing tables to add missing columns if upgrading from old schema
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='started_at') THEN
        ALTER TABLE renders ADD COLUMN started_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='completed_at') THEN
        ALTER TABLE renders ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='output_url') THEN
        ALTER TABLE renders ADD COLUMN output_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='output_size') THEN
        ALTER TABLE renders ADD COLUMN output_size BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='storage_key') THEN
        ALTER TABLE renders ADD COLUMN storage_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='error_message') THEN
        ALTER TABLE renders ADD COLUMN error_message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='error_stack') THEN
        ALTER TABLE renders ADD COLUMN error_stack TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='renders' AND column_name='retry_count') THEN
        ALTER TABLE renders ADD COLUMN retry_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_renders_project_id ON renders(project_id);
CREATE INDEX IF NOT EXISTS idx_renders_user_id ON renders(user_id);
CREATE INDEX IF NOT EXISTS idx_renders_status ON renders(status);
CREATE INDEX IF NOT EXISTS idx_renders_created_at ON renders(created_at DESC);

-- NO RLS - Security handled by Firebase Auth
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own renders" ON renders;
DROP POLICY IF EXISTS "Users can create their own renders" ON renders;
DROP POLICY IF EXISTS "Users can update their own renders" ON renders;
DROP POLICY IF EXISTS "Users can delete their own renders" ON renders;

-- Allow all operations
CREATE POLICY "Allow all operations" ON renders FOR ALL USING (true);

-- =============================================
-- ANALYSIS_HISTORY TABLE
-- =============================================
-- Stores smart editing analysis results (scene detection, silence detection, highlights)
-- Linked to projects for persistence across sessions

CREATE TABLE IF NOT EXISTS analysis_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Analysis metadata
    analysis_type TEXT NOT NULL,  -- 'scenes' | 'silences' | 'highlights'
    video_url TEXT NOT NULL,
    video_name TEXT,              -- Optional display name for the source video

    -- Results (JSONB: array of { start, end, label?, confidence? })
    segments JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analysis_history_project_id ON analysis_history(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON analysis_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_type ON analysis_history(analysis_type);

-- NO RLS - Security handled by Firebase Auth
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON analysis_history;
CREATE POLICY "Allow all operations" ON analysis_history FOR ALL USING (true);

-- =============================================
-- TRIGGERS
-- =============================================
-- Auto-update updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- USER_SETTINGS TABLE
-- =============================================
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
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- USER_SOCIAL_CONNECTIONS TABLE
-- =============================================
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
DROP TRIGGER IF EXISTS update_social_connections_updated_at ON user_social_connections;
CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON user_social_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SETUP COMPLETE
-- =============================================
-- Tables created with Firebase Auth compatibility
-- Run this entire file in Supabase SQL Editor
