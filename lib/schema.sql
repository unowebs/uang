-- ==========================================================================
-- FinTrack ID - Reset & Recreate All Supabase Tables
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wpxlgjeqoashomtucibg/sql/new
-- ==========================================================================

-- 1. Drop existing tables if any
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
P
-- 2. Profiles Table
CREATE TABLE public.profiles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT,
  password   TEXT,
  pin        TEXT DEFAULT '123456',
  avatar     TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Categories Table
CREATE TABLE public.categories (
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

-- 4. Rooms Table (Collaboration)
CREATE TABLE public.rooms (
  code       TEXT PRIMARY KEY,
  host_email TEXT,
  name       TEXT NOT NULL,
  members    TEXT DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Room Members Table
CREATE TABLE public.room_members (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code       TEXT REFERENCES public.rooms(code) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT CHECK (role IN ('host', 'member', 'editor', 'viewer')) DEFAULT 'member',
  is_active       BOOLEAN DEFAULT false,
  last_seen       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  role_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  joined_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_code, email)
);

-- 6. Transactions Table
CREATE TABLE public.transactions (
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

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 8. Allow Public Access Policies
CREATE POLICY "Allow All Access" ON public.profiles     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.categories   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.rooms        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.room_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Access" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
