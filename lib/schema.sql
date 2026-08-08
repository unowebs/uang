-- ==========================================================================
-- FinTrack ID - Supabase Database Schema (Free PostgreSQL Tier)
-- Run this script in your Supabase SQL Editor (https://app.supabase.com)
-- ==========================================================================

-- 1. Profiles Table (with password, pin, avatar for cross-browser auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT,
  password   TEXT,
  pin        TEXT DEFAULT '123456',
  avatar     TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id         TEXT PRIMARY KEY,
  user_id    UUID,
  user_email TEXT,
  name       TEXT NOT NULL,
  type       TEXT CHECK (type IN ('income', 'expense')) DEFAULT 'expense',
  icon       TEXT DEFAULT 'tag',
  color      TEXT DEFAULT '#6366f1',
  budget     NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Rooms Table (Collaboration)
CREATE TABLE IF NOT EXISTS public.rooms (
  code       TEXT PRIMARY KEY,
  host_email TEXT,
  name       TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Room Members Table
CREATE TABLE IF NOT EXISTS public.room_members (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT REFERENCES public.rooms(code) ON DELETE CASCADE,
  email     TEXT NOT NULL,
  role      TEXT CHECK (role IN ('owner', 'viewer')) DEFAULT 'viewer',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_code, email)
);

-- 5. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id          TEXT PRIMARY KEY,
  user_email  TEXT,
  title       TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  currency    TEXT DEFAULT 'IDR',
  type        TEXT CHECK (type IN ('income', 'expense')) DEFAULT 'expense',
  category_id TEXT,
  datetime    TIMESTAMP WITH TIME ZONE NOT NULL,
  note        TEXT,
  room_code   TEXT REFERENCES public.rooms(code) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Enable
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow Public Access Policies (simple open access for localStorage-backed sync)
DROP POLICY IF EXISTS "Allow All Access" ON public.profiles;
DROP POLICY IF EXISTS "Allow All Access" ON public.categories;
DROP POLICY IF EXISTS "Allow All Access" ON public.rooms;
DROP POLICY IF EXISTS "Allow All Access" ON public.room_members;
DROP POLICY IF EXISTS "Allow All Access" ON public.transactions;

CREATE POLICY "Allow All Access" ON public.profiles      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.categories    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.rooms         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.room_members  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.transactions  FOR ALL USING (true) WITH CHECK (true);
