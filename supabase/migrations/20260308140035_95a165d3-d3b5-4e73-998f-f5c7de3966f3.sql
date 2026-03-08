
-- Drop the old public read policy
DROP POLICY IF EXISTS "Anyone can read published posts" ON public.blog_posts;

-- Create new policy that also checks published_at <= now()
CREATE POLICY "Anyone can read published posts"
ON public.blog_posts
FOR SELECT
USING (published = true AND (published_at IS NULL OR published_at <= now()));
