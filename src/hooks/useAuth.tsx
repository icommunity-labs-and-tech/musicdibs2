import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const resetAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsManager(false);
    setLoading(false);
  }, []);

  const recoverFromAuthError = useCallback(async (error: unknown) => {
    console.error('[auth] Failed to initialize session', error);

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.warn('[auth] Failed to clear local session', signOutError);
    }

    resetAuthState();
  }, [resetAuthState]);

  const initializeUser = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      resetAuthState();
      return;
    }

    setSession(currentSession);
    setUser(currentSession.user);

    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentSession.user.id);

      if (error) throw error;

      const roleSet = new Set((roles || []).map((r: { role: string }) => r.role));
      setIsAdmin(roleSet.has('admin'));
      setIsManager(roleSet.has('manager'));
    } catch (error) {
      console.error('[auth] Failed to load roles', error);
      setIsAdmin(false);
      setIsManager(false);
    } finally {
      setLoading(false);
    }
  }, [resetAuthState]);

  useEffect(() => {
    // IMPORTANT: Set up listener BEFORE getting session (per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Use setTimeout to avoid async work directly in callback
      setTimeout(() => {
        void initializeUser(newSession).catch(recoverFromAuthError);
      }, 0);
    });

    void supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => initializeUser(currentSession))
      .catch(recoverFromAuthError);

    return () => subscription.unsubscribe();
  }, [initializeUser, recoverFromAuthError]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.includes('banned')) {
          return { error: { message: 'Tu cuenta ha sido bloqueada. Contacta con soporte.' } };
        }
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('[auth] Sign in failed', error);
      return { error: { message: 'No se pudo conectar con el servicio de autenticación. Inténtalo de nuevo.' } };
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(metadata ? { data: metadata } : {}),
          emailRedirectTo: window.location.origin,
        },
      });

      return { error };
    } catch (error) {
      console.error('[auth] Sign up failed', error);
      return { error: { message: 'No se pudo completar el registro. Inténtalo de nuevo.' } };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      resetAuthState();
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isManager, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
