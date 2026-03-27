CREATE TABLE public.manager_contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  country text,
  estimated_artists text NOT NULL,
  estimated_works text,
  needs_distribution boolean DEFAULT true,
  needs_ai_studio boolean DEFAULT false,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit manager contact request"
ON public.manager_contact_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read manager contact requests"
ON public.manager_contact_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));