REVOKE ALL ON FUNCTION public.get_admin_ai_generation_logs(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_ai_generation_logs(text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_generation_logs(text, text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_ai_generation_log_payloads(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_ai_generation_log_payloads(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_generation_log_payloads(uuid) TO authenticated;