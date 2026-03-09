export interface GenerationParams {
  prompt: string;
  duration: number;
  genre?: string;
  mood?: string;
  cfgScale?: number; // creativity (1-10, lower = more creative)
}

export interface GenerationResult {
  id: string;
  audioUrl: string;
  prompt: string;
  duration: number;
  genre?: string;
  mood?: string;
  createdAt: Date;
  isFavorite?: boolean;
}

export const GENRES = [
  'Electronic', 'Hip Hop', 'Pop', 'Rock', 'Jazz', 
  'Classical', 'Ambient', 'R&B', 'Latin', 'Folk',
  'Cinematic', 'Lo-Fi', 'Trap', 'House', 'Techno'
] as const;

export const MOODS = [
  'Energetic', 'Calm', 'Happy', 'Sad', 'Epic',
  'Mysterious', 'Romantic', 'Dark', 'Uplifting', 'Chill',
  'Aggressive', 'Dreamy', 'Nostalgic', 'Motivational', 'Peaceful'
] as const;

export const WORK_TYPES = [
  'Instrumental', 'Beat', 'Loop', 'Full Track', 'Jingle',
  'Soundtrack', 'Remix Base', 'Sound Effect'
] as const;

export type Genre = typeof GENRES[number];
export type Mood = typeof MOODS[number];
export type WorkType = typeof WORK_TYPES[number];
