import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OnboardingState {
  welcomed: boolean;
  steps: {
    registerWork: boolean;
    getCertificate: boolean;
    verifyRegistration: boolean;
    distributeMusic: boolean;
    exploreAiStudio: boolean;
  };
  tourActive: boolean;
  tourStep: number;
  dismissed: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  welcomed: false,
  steps: {
    registerWork: false,
    getCertificate: false,
    verifyRegistration: false,
    distributeMusic: false,
    exploreAiStudio: false,
  },
  tourActive: false,
  tourStep: 0,
  dismissed: false,
};

const STORAGE_KEY = 'musicdibs_onboarding';

function getStorageKey(userId: string) {
  return `${STORAGE_KEY}_${userId}`;
}

function loadState(userId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_STATE };
}

function saveState(userId: string, state: OnboardingState) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
}

interface OnboardingContextValue {
  state: OnboardingState;
  showWelcome: boolean;
  completedCount: number;
  totalSteps: number;
  allComplete: boolean;
  markWelcomed: () => void;
  completeStep: (step: keyof OnboardingState['steps']) => void;
  startTour: () => void;
  nextTourStep: () => void;
  endTour: () => void;
  dismiss: () => void;
  reset: () => void;
  checkStepsFromDb: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      setState(loadState(user.id));
      setLoaded(true);
    }
  }, [user]);

  // Listen for reset event from sidebar
  useEffect(() => {
    const handleReset = () => reset();
    const handleWorkRegistered = () => {
      completeStep('registerWork');
      completeStep('getCertificate');
    };
    window.addEventListener('musicdibs:reset-onboarding', handleReset);
    window.addEventListener('musicdibs:work-registered', handleWorkRegistered);
    return () => {
      window.removeEventListener('musicdibs:reset-onboarding', handleReset);
      window.removeEventListener('musicdibs:work-registered', handleWorkRegistered);
    };
  }, []);

  useEffect(() => {
    if (user && loaded) saveState(user.id, state);
  }, [state, user, loaded]);

  const showWelcome = loaded && !state.welcomed;

  const completedCount = Object.values(state.steps).filter(Boolean).length;
  const totalSteps = 5;
  const allComplete = completedCount === totalSteps;

  const markWelcomed = useCallback(() => {
    setState(s => ({ ...s, welcomed: true }));
  }, []);

  const completeStep = useCallback((step: keyof OnboardingState['steps']) => {
    setState(s => ({ ...s, steps: { ...s.steps, [step]: true } }));
  }, []);

  const startTour = useCallback(() => {
    setState(s => ({ ...s, tourActive: true, tourStep: 0 }));
  }, []);

  const nextTourStep = useCallback(() => {
    setState(s => {
      if (s.tourStep >= 2) return { ...s, tourActive: false, tourStep: 0 };
      return { ...s, tourStep: s.tourStep + 1 };
    });
  }, []);

  const endTour = useCallback(() => {
    setState(s => ({ ...s, tourActive: false, tourStep: 0 }));
  }, []);

  const dismiss = useCallback(() => {
    setState(s => ({ ...s, dismissed: true }));
  }, []);

  const reset = useCallback(() => {
    setState({ ...DEFAULT_STATE });
  }, []);

  const checkStepsFromDb = useCallback(async () => {
    if (!user) return;
    try {
      const { data: works } = await supabase
        .from('works')
        .select('status, certificate_url')
        .eq('user_id', user.id)
        .limit(10);

      if (works && works.length > 0) {
        setState(s => {
          const newSteps = { ...s.steps, registerWork: true };
          const hasCert = works.some(w => w.certificate_url || w.status === 'registered');
          if (hasCert) newSteps.getCertificate = true;
          return { ...s, steps: newSteps };
        });
      }
    } catch {}
  }, [user]);

  return (
    <OnboardingContext.Provider value={{
      state, showWelcome, completedCount, totalSteps, allComplete,
      markWelcomed, completeStep, startTour, nextTourStep, endTour, dismiss, reset, checkStepsFromDb,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
