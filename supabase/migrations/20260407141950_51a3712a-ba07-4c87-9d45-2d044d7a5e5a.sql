-- Harden contact_submissions INSERT policy
DROP POLICY IF EXISTS "Anyone can submit a contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit a contact form" ON public.contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(name)) > 0 AND
    length(trim(email)) > 0 AND
    length(trim(subject)) > 0 AND
    length(trim(message)) > 0 AND
    length(message) <= 5000
  );

-- Harden manager_contact_requests INSERT policy
DROP POLICY IF EXISTS "Anyone can submit manager contact request" ON public.manager_contact_requests;
CREATE POLICY "Anyone can submit manager contact request" ON public.manager_contact_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) > 0 AND
    length(trim(email)) > 0 AND
    length(trim(estimated_artists)) > 0
  )