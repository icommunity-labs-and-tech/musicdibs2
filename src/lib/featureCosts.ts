/**
 * Client-side mirror of the server cost configuration.
 * Used ONLY for UI validation (disabling buttons, showing costs).
 * The actual deduction is enforced server-side in spend-credits.
 */
export const FEATURE_COSTS = {
  register_work: 1,
  promote_work: 25,
  generate_audio: 2,
  generate_audio_song: 3,
  edit_audio: 2,
  enhance_audio: 1,
  generate_cover: 2,
  inspiration: 0,
  generate_video: 6,
} as const;

export type FeatureKey = keyof typeof FEATURE_COSTS;
