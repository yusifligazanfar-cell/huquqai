import { NextResponse } from 'next/server'
import { Client } from 'pg'

const MIGRATION_SQL = `
-- Add reputation score to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score integer DEFAULT 0;

-- Create community_posts table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'Ümumi',
  views_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public posts are viewable by everyone." ON public.community_posts;
CREATE POLICY "Public posts are viewable by everyone." ON public.community_posts FOR SELECT USING ( true );
DROP POLICY IF EXISTS "Users can insert their own posts." ON public.community_posts;
CREATE POLICY "Users can insert their own posts." ON public.community_posts FOR INSERT WITH CHECK ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can delete their own posts." ON public.community_posts;
CREATE POLICY "Users can delete their own posts." ON public.community_posts FOR DELETE USING ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can update their own posts." ON public.community_posts;
CREATE POLICY "Users can update their own posts." ON public.community_posts FOR UPDATE USING ( auth.uid() = user_id );

-- Ensure reviews delete policy is correct
DROP POLICY IF EXISTS "Clients can delete their own reviews." ON public.reviews;
CREATE POLICY "Clients can delete their own reviews." ON public.reviews FOR DELETE USING ( auth.uid() = client_id );

-- Create community_comments table
CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_lawyer_reply boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public comments are viewable by everyone." ON public.community_comments;
CREATE POLICY "Public comments are viewable by everyone." ON public.community_comments FOR SELECT USING ( true );
DROP POLICY IF EXISTS "Users can insert their own comments." ON public.community_comments;
CREATE POLICY "Users can insert their own comments." ON public.community_comments FOR INSERT WITH CHECK ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can delete their own comments." ON public.community_comments;
CREATE POLICY "Users can delete their own comments." ON public.community_comments FOR DELETE USING ( auth.uid() = user_id );
DROP POLICY IF EXISTS "Users can update their own comments." ON public.community_comments;
CREATE POLICY "Users can update their own comments." ON public.community_comments FOR UPDATE USING ( auth.uid() = user_id );

-- Setup a trigger to increase reputation_score of a user if they post a comment and are a lawyer
CREATE OR REPLACE FUNCTION public.handle_community_reputation()
RETURNS trigger AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = NEW.user_id;

    IF user_role = 'lawyer' THEN
        NEW.is_lawyer_reply := true;
        UPDATE public.profiles SET reputation_score = COALESCE(reputation_score, 0) + 5 WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_community_comment_insert ON public.community_comments;

CREATE TRIGGER on_community_comment_insert
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_community_reputation();

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text,
  email text,
  category text NOT NULL DEFAULT 'general',
  rating integer DEFAULT 5,
  sentiment text DEFAULT 'excellent',
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new',
  is_anonymous boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view feedbacks" ON public.feedbacks;
CREATE POLICY "Public can view feedbacks" ON public.feedbacks FOR SELECT USING ( true );
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON public.feedbacks;
CREATE POLICY "Anyone can insert feedbacks" ON public.feedbacks FOR INSERT WITH CHECK ( true );
`;

export async function GET() {
  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    return NextResponse.json({ error: 'DATABASE_URL is missing' }, { status: 500 })
  }

  const client = new Client({ connectionString })

  try {
    await client.connect()
    await client.query(MIGRATION_SQL)
    return NextResponse.json({ success: true, message: 'Migration successful!' })
  } catch (error: any) {
    console.error("Migration error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await client.end()
  }
}
