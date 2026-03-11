import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const initializeUser = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setSession(currentSession);
    setUser(currentSession.user);

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentSession.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(roleData?.role === 'admin');
    setLoading(false);
  }, []);

  useEffect(() => {
    // IMPORTANT: Set up listener BEFORE getting session (per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Use setTimeout to avoid async work directly in callback
      setTimeout(() => initializeUser(newSession), 0);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      initializeUser(currentSession);
    });

    return () => subscription.unsubscribe();
  }, [initializeUser]);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase returns "User is banned" for banned users
      if (error.message?.includes('banned')) {
        return { error: { message: 'Tu cuenta ha sido bloqueada. Contacta con soporte.' } };
      }
      return { error };
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
