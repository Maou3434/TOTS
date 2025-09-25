import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface Team {
  id: string;
  team_name: string;
  character_class: string;
  level: number;
  experience: number;
  health: number;
  mana: number;
  attack: number;
  defense: number;
  speed: number;
}

interface AuthContextType {
  session: Session | null;
  team: Team | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithTeam: (teamName: string, password: string) => Promise<{ error?: string }>;
  signUpTeam: (teamName: string, password: string, characterClass: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInAsAdmin: (username: string, password: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Check if admin
          if (session.user.email === 'admin@dungeoncrawler.com') {
            setIsAdmin(true);
            setTeam(null);
          } else {
            setIsAdmin(false);
            // Fetch team data
            const { data: teamData } = await supabase
              .from('teams')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (teamData) {
              setTeam(teamData);
            }
          }
        } else {
          setIsAdmin(false);
          setTeam(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithTeam = async (teamName: string, password: string) => {
    try {
      // Find team by name
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, password_hash')
        .eq('team_name', teamName)
        .single();

      if (teamError || !teamData) {
        return { error: 'Team not found' };
      }

      // Simple password check (in production, use proper hashing)
      if (teamData.password_hash !== password) {
        return { error: 'Invalid password' };
      }

      // Create a fake email for Supabase auth
      const email = `${teamName.toLowerCase().replace(/\s+/g, '')}@team.local`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: teamData.id
      });

      if (error) {
        // If user doesn't exist in auth, create them
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: teamData.id,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        
        if (signUpError) {
          return { error: signUpError.message };
        }
      }

      return {};
    } catch (error) {
      return { error: 'Sign in failed' };
    }
  };

  const signUpTeam = async (teamName: string, password: string, characterClass: string) => {
    try {
      // Check if team name already exists
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('team_name')
        .eq('team_name', teamName)
        .single();

      if (existingTeam) {
        return { error: 'Team name already exists' };
      }

      // Create team record first
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          team_name: teamName,
          password_hash: password, // In production, hash this
          character_class: characterClass as any
        })
        .select()
        .single();

      if (teamError || !teamData) {
        return { error: 'Failed to create team' };
      }

      // Create auth user
      const email = `${teamName.toLowerCase().replace(/\s+/g, '')}@team.local`;
      const { error: authError } = await supabase.auth.signUp({
        email,
        password: teamData.id,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) {
        // Clean up team record if auth creation failed
        await supabase.from('teams').delete().eq('id', teamData.id);
        return { error: authError.message };
      }

      return {};
    } catch (error) {
      return { error: 'Registration failed' };
    }
  };

  const signInAsAdmin = async (username: string, password: string) => {
    if (username !== 'admin' || password !== 'toc2070') {
      return { error: 'Invalid admin credentials' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@dungeoncrawler.com',
      password: 'admin123'
    });

    if (error) {
      // Create admin user if doesn't exist
      const { error: signUpError } = await supabase.auth.signUp({
        email: 'admin@dungeoncrawler.com',
        password: 'admin123',
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (signUpError) {
        return { error: 'Admin setup failed' };
      }
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    team,
    isAdmin,
    loading,
    signInWithTeam,
    signUpTeam,
    signOut,
    signInAsAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}