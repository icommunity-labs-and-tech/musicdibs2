REVOKE EXECUTE ON FUNCTION public.get_admin_ai_generation_logs(text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_ai_generation_log_payloads(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_generation_logs(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_generation_log_payloads(uuid) TO authenticated;