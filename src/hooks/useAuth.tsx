import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

type Player = Database['public']['Tables']['players']['Row'];

interface Team extends Omit<Database['public']['Tables']['teams']['Row'], 'password_hash'> {
  players: Player[];
}

interface AuthContextType {
  session: Session | null;
  team: Team | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithTeam: (teamName: string, password: string) => Promise<{ error?: string }>;
  signUpTeam: (teamName: string, password: string) => Promise<{ data?: { id: string }; error?: string; }>;
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
    // Check for a saved session in localStorage on initial load
    const savedSessionData = localStorage.getItem('dungeon-delight-team-session');
    if (savedSessionData) {
      const { team: savedTeam, session: savedSession, isAdmin: savedIsAdmin } = JSON.parse(savedSessionData);
      if (savedIsAdmin) {
        setIsAdmin(true);
        setSession(savedSession);
      } else if (savedTeam) {
        setTeam(savedTeam);
        setSession(savedSession);
      }
    }
    setLoading(false);

    // We keep this listener for any Supabase-based auth events if they are added back later,
    // but our primary session logic for team/admin is now manual.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // If a Supabase session appears (e.g. from a previous admin login before the code change),
      // and we don't have a manual session, we can handle it.
      // Otherwise, our manual session takes precedence.
      const manualSessionExists = !!localStorage.getItem('dungeon-delight-team-session');
      if (!manualSessionExists && session) {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithTeam = async (teamName: string, password: string) => {
    try {
      // Find team by name
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*, players(*)')
        .eq('team_name', teamName)
        .single();

      if (teamError || !teamData) {
        return { error: 'Team not found' };
      }

      // Simple password check. In a real app, you'd compare hashes.
      if (teamData.password_hash !== password) {
        return { error: 'Invalid password' };
      }

      // Manually set the team state since we are not using Supabase Auth for teams.
      // We also need to simulate a "session" for the app to know a user is logged in.
      // A simple approach is to store the team info in localStorage.
      const fakeSession = { user: { id: teamData.id, app_metadata: { team_id: teamData.id } } } as any;
      setSession(fakeSession);
      const fullTeamData = { ...teamData, players: teamData.players || [] };
      setTeam(fullTeamData);
      localStorage.setItem('dungeon-delight-team-session', JSON.stringify({ team: fullTeamData, session: fakeSession, isAdmin: false }));

      return {};
    } catch (error) {
      return { error: 'Sign in failed' };
    }
  };

  const signUpTeam = async (teamName: string, password: string) => {
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
          password_hash: password, // Storing password directly. WARNING: Not secure for production.
        })
        .select()
        .single();

      if (teamError || !teamData) {
        return { error: teamError?.message || 'Failed to create team' };
      }

      return { data: { id: teamData.id } };
    } catch (error) {
      return { error: 'Registration failed' };
    }
  };

  const signInAsAdmin = async (username: string, password: string) => {
    if (username !== 'admin' || password !== 'toc2070') {
      return { error: 'Invalid admin credentials' };
    }

    // Manually set admin state and a fake session
    const fakeAdminSession = { user: { id: 'admin-user', email: 'admin@dungeon-delight.app' } } as any;
    setIsAdmin(true);
    setSession(fakeAdminSession);
    setTeam(null);
    localStorage.setItem('dungeon-delight-team-session', JSON.stringify({ session: fakeAdminSession, isAdmin: true }));

    return {};
  };

  const signOut = async () => {
    // It's good practice to still call this in case there's a lingering Supabase session
    // from before the logic change. It won't cause an error if there's no session.
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out from Supabase:', error.message);

    // Manually clear our custom team session
    setTeam(null);
    setSession(null);
    localStorage.removeItem('dungeon-delight-team-session');
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