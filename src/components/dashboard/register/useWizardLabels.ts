import { useTranslation } from 'react-i18next';
import { CREATOR_ROLES, WORK_TYPES, VERSION_TYPES } from './types';

const ROLE_KEY_MAP: Record<string, string> = {
  autor: 'wizard.types.roleAutor',
  compositor: 'wizard.types.roleCompositor',
  cantante: 'wizard.types.roleCantante',
  productor: 'wizard.types.roleProductor',
  arreglista: 'wizard.types.roleArreglista',
  adaptador: 'wizard.types.roleAdaptador',
};

const WORK_KEY_MAP: Record<string, string> = {
  audio: 'wizard.types.workAudio',
  instrumental: 'wizard.types.workInstrumental',
  document: 'wizard.types.workDocument',
  demo: 'wizard.types.workDemo',
  videoclip: 'wizard.types.workVideoclip',
  cover_art: 'wizard.types.workCoverArt',
  other: 'wizard.types.workOther',
};

const VER_KEY_MAP: Record<string, string> = {
  demo: 'wizard.types.verDemo',
  master: 'wizard.types.verMaster',
  remix: 'wizard.types.verRemix',
  instrumental: 'wizard.types.verInstrumental',
  live: 'wizard.types.verLive',
  radio_edit: 'wizard.types.verRadioEdit',
  acoustic: 'wizard.types.verAcoustic',
  other: 'wizard.types.verOther',
};

export function useCreatorRoleLabels(): Record<string, string> {
  const { t } = useTranslation();
  const map: Record<string, string> = {};
  CREATOR_ROLES.forEach((r) => {
    map[r.value] = ROLE_KEY_MAP[r.value] ? t(ROLE_KEY_MAP[r.value]) : r.label;
  });
  return map;
}

export function useWorkTypeLabels(): Record<string, string> {
  const { t } = useTranslation();
  const map: Record<string, string> = {};
  WORK_TYPES.forEach((w) => {
    map[w.value] = WORK_KEY_MAP[w.value] ? t(WORK_KEY_MAP[w.value]) : w.label;
  });
  return map;
}

export function useVersionTypeLabels(): Record<string, string> {
  const { t } = useTranslation();
  const map: Record<string, string> = {};
  VERSION_TYPES.forEach((v) => {
    map[v.value] = VER_KEY_MAP[v.value] ? t(VER_KEY_MAP[v.value]) : v.label;
  });
  return map;
}
