/**
 * Client-side feature costs.
 *
 * The source of truth is the `feature_costs` table in the database.
 * These values are used as defaults / fallback for UI validation
 * (disabling buttons, showing costs) before the DB response arrives.
 *
 * The actual deduction is enforced server-side in each Edge Function.
 */

// ── Static defaults (kept in sync with DB seed) ────────────
const DEFAULT_COSTS: Record<string, number> = {
  register_work: 1,
  promote_work: 30,
  promote_premium: 30,
  generate_audio: 2,
  generate_audio_song: 2,
  edit_audio: 2,
  enhance_audio: 2,
  generate_cover: 1,
  inspiration: 2,
  generate_video: 3,
  voice_translation_per_min: 2,
  instagram_creative: 1,
  youtube_thumbnail: 1,
  event_poster: 1,
  social_poster: 1,
  social_video: 3,
};

// ── Runtime cache ──────────────────────────────────────────
let cachedCosts: Record<string, number> | null = null;
let fetchPromise: Promise<void> | null = null;

async function loadCosts(): Promise<void> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/feature_costs?select=feature_key,credit_cost`,
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load feature costs: ${response.status}`);
    }

    const data = await response.json();

    const map: Record<string, number> = { ...DEFAULT_COSTS };
    for (const row of data || []) {
      map[row.feature_key] = row.credit_cost;
    }
    cachedCosts = map;
  } catch {
    console.warn('[featureCosts] Network error, using defaults');
    cachedCosts = { ...DEFAULT_COSTS };
  }
}

/** Initialise cache once (call early, e.g. in App mount). */
export function preloadFeatureCosts(): void {
  if (!fetchPromise) {
    fetchPromise = loadCosts().finally(() => {
      fetchPromise = null;
    });
  }
}

/** Get cost for a feature. Returns default immediately if cache not ready. */
export function getFeatureCost(key: string): number {
  if (cachedCosts) return cachedCosts[key] ?? 0;
  return DEFAULT_COSTS[key] ?? 0;
}

// ── Legacy export (backwards-compatible) ───────────────────
export const FEATURE_COSTS = DEFAULT_COSTS;

export type FeatureKey = keyof typeof DEFAULT_COSTS;
