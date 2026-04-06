-- Enterprise RAG Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- WORKSPACES table
-- Fields: id (UUID), name (TEXT), description (TEXT), tenant_id (UUID), created_at (TIMESTAMP)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOCUMENTS table
-- Fields: id, filename, file_size, content_type, workspace_id, tenant_id, user_id, storage_path, status, chunk_count, uploaded_at, updated_at
-- Status values: uploading, processing, ready, failed
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    content_type TEXT,
    workspace_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID,
    storage_path TEXT,
    status TEXT DEFAULT 'uploading',
    chunk_count INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT SESSIONS table
-- Fields: id, tenant_id, workspace_id, user_id, created_at, updated_at
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT MESSAGES table
-- Fields: id, session_id, role, content, citations (JSONB), created_at
-- Role values: user, assistant
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    citations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant ON workspaces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant ON chat_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Note: Backend uses SERVICE_ROLE_KEY which bypasses RLS
-- These policies are for frontend/API access using user's JWT
CREATE POLICY "workspaces_tenant_access" ON workspaces FOR ALL USING (true);
CREATE POLICY "documents_tenant_access" ON documents FOR ALL USING (true);
CREATE POLICY "chat_sessions_tenant_access" ON chat_sessions FOR ALL USING (true);
CREATE POLICY "chat_messages_tenant_access" ON chat_messages FOR ALL USING (true);

-- ============================================================
-- MANUAL SETUP REQUIRED:
-- ============================================================

-- STORAGE BUCKET:
-- Go to: Supabase Dashboard → Storage → New Bucket
-- Name: documents
-- Public bucket: OFF (keep private)
-- File size limit: 50MB (optional)

-- AUTHENTICATION:
-- Configure Supabase Auth providers as needed (email/password is enabled by default)
-- Optionally enable: GitHub, Google, etc.

-- ENVIRONMENT VARIABLES (already in .env):
-- NEXT_PUBLIC_SUPABASE_URL=https://vnalagmbvxblmqqnxoqi.supabase.co
-- NEXT_PUBLIC_SUPABASE_ANON_KEY=...
-- SUPABASE_SERVICE_ROLE_KEY=...

-- ============================================================
-- TENANTS TABLE (auto-created for new users)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_access" ON tenants FOR ALL USING (true);

-- Additional columns for documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS external_ragflow_doc_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_external_ragflow 
    ON documents(external_ragflow_doc_id) WHERE external_ragflow_doc_id IS NOT NULL;
