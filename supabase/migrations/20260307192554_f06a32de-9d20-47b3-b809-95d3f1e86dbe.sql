-- Add language column to blog_posts with default 'es'
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'es';

-- Update existing articles to 'en' since they're currently in English
UPDATE public.blog_posts SET language = 'en';

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_language ON public.blog_posts(language);

-- Drop and recreate the public read policy to include language awareness
DROP POLICY IF EXISTS "Anyone can read published posts" ON public.blog_posts;
CREATE POLICY "Anyone can read published posts" ON public.blog_posts
  FOR SELECT USING (published = true);