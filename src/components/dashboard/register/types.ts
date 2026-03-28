export interface Creator {
  id: string;
  name: string;
  email: string;
  roles: string[];
  percentage: number | null;
}

export interface WizardData {
  // Entry
  flow: 'new' | 'version' | null;

  // Flow B — parent work
  parentWorkId: string | null;
  parentWorkTitle: string | null;

  // Step: File
  file: File | null;
  files: File[];
  aiAudioUrl: string | null;

  // Step: Title / Version
  title: string;
  workType: string;
  description: string;

  // Flow B specific
  versionType: string;
  versionTitle: string;

  // Creators
  creators: Creator[];

  // Signature
  signatureId: string;
}

export const CREATOR_ROLES = [
  { value: 'autor', label: 'Autor' },
  { value: 'compositor', label: 'Compositor' },
  { value: 'cantante', label: 'Cantante' },
  { value: 'productor', label: 'Productor' },
  { value: 'arreglista', label: 'Arreglista' },
  { value: 'adaptador', label: 'Adaptador' },
] as const;

export const WORK_TYPES = [
  { value: 'audio', label: 'Canción' },
  { value: 'instrumental', label: 'Instrumental' },
  { value: 'document', label: 'Letra' },
  { value: 'demo', label: 'Demo' },
  { value: 'videoclip', label: 'Videoclip' },
  { value: 'cover_art', label: 'Portada de disco' },
  { value: 'other', label: 'Otro' },
] as const;

export const VERSION_TYPES = [
  { value: 'demo', label: 'Demo' },
  { value: 'master', label: 'Master final' },
  { value: 'remix', label: 'Remix' },
  { value: 'instrumental', label: 'Instrumental' },
  { value: 'live', label: 'Live' },
  { value: 'radio_edit', label: 'Radio edit' },
  { value: 'acoustic', label: 'Acústica' },
  { value: 'other', label: 'Otro' },
] as const;

export const initialWizardData: WizardData = {
  flow: null,
  parentWorkId: null,
  parentWorkTitle: null,
  file: null,
  files: [],
  aiAudioUrl: null,
  title: '',
  workType: '',
  description: '',
  versionType: '',
  versionTitle: '',
  creators: [{ id: crypto.randomUUID(), name: '', email: '', roles: [], percentage: null }],
  signatureId: '',
};
