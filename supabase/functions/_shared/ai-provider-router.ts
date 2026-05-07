// Shared router to resolve which provider/model is active for a given AI feature.
// Reads the `ai_provider_settings` table managed from /dashboard/admin/ai-models.
//
// Usage:
//   const setting = await resolveProvider(supabaseAdmin, 'music_generation_vocal');
//   if (setting.provider === 'kie_suno') { ... }
//
// If no active row exists, returns null (callers should keep their current default
// to preserve backwards compatibility).

import type { SupabaseClient } from "./supabase-client.ts";

export interface ProviderSetting {
  id: string;
  feature_key: string;
  provider: string;
  model: string;
  is_active: boolean;
  is_enabled: boolean;
  config_json: Record<string, unknown>;
  cost_usd_estimate: number | null;
  user_credits_cost: number | null;
  fallback_provider: string | null;
  fallback_model: string | null;
}

export async function resolveProvider(
  supabase: SupabaseClient,
  featureKey: string,
): Promise<ProviderSetting | null> {
  const { data, error } = await supabase
    .from("ai_provider_settings")
    .select(
      "id, feature_key, provider, model, is_active, is_enabled, config_json, cost_usd_estimate, user_credits_cost, fallback_provider, fallback_model",
    )
    .eq("feature_key", featureKey)
    .eq("is_active", true)
    .eq("is_enabled", true)
    .maybeSingle();

  if (error) {
    console.warn(`[ai-provider-router] error resolving ${featureKey}:`, error.message);
    return null;
  }
  return data as ProviderSetting | null;
}

export async function logGeneration(
  supabase: SupabaseClient,
  payload: {
    user_id: string | null;
    feature_key: string;
    provider: string;
    model: string;
    provider_task_id?: string | null;
    status: string;
    request_payload?: Record<string, unknown>;
    response_payload?: Record<string, unknown>;
    output_url?: string | null;
    estimated_cost_usd?: number | null;
    user_credits_charged?: number | null;
    used_fallback?: boolean;
    primary_provider_attempted?: string | null;
    error_message?: string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_generation_logs")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.warn("[ai-provider-router] log insert failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function updateGenerationLog(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("ai_generation_logs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn("[ai-provider-router] log update failed:", error.message);
}
