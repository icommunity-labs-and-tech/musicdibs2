import { createClient as _createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
export const createClient = (...args: Parameters<typeof _createClient>): any => {
  return _createClient(...args) as any;
};
export type SupabaseClient = any;
