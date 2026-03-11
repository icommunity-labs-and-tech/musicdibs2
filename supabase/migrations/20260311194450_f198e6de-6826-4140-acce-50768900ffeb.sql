
-- Drop the restrictive admin policy that blocks normal users from reading their own role
DROP POLICY IF EXISTS "Admins can read roles" ON public.user_roles;

-- Drop the policy we just created (may also be affected)
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;

-- Create two PERMISSIVE policies (OR logic: either condition grants access)
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
