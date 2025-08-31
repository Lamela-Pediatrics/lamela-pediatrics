import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/database';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<{ error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted.current) {
        setSession(session);
      }
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        if (mounted.current) {
          setLoading(false);
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted.current) {
          setSession(session);
        }
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          if (mounted.current) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (mounted.current) {
        setUser(data);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            phone: userData.phone,
            role: userData.role || 'parent',
          },
        },
      });

      if (error) return { error: error.message };

      // Profile will be created automatically by database trigger
      // Wait a moment for the trigger to complete
      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://localhost:8081/(auth)/reset-password',
      });
      
      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      signIn,
      signUp,
      resetPasswordForEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};