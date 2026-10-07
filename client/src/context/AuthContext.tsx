import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { UserProfile, UserRole } from '../../../shared/schemas';

const DEMO_USERS: Record<UserRole, UserProfile> = {
  EMPLOYEE: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alex.employee@company.com',
    full_name: 'Alex Rivera',
    role: 'EMPLOYEE',
    department: 'Software Engineering',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  APPROVER: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'sarah.manager@company.com',
    full_name: 'Sarah Chen',
    role: 'APPROVER',
    department: 'Engineering & Operations',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  ADMIN: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'marcus.admin@company.com',
    full_name: 'Marcus Vance',
    role: 'ADMIN',
    department: 'IT & Workplace Operations',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  switchRole: (role: UserRole) => void;
  token: string | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('smartflow_role') as UserRole) || 'EMPLOYEE';
  });
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('smartflow_role') as UserRole;
    return DEMO_USERS[saved || 'EMPLOYEE'];
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('smartflow_token') || 'demo-employee';
  });

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    setUser(DEMO_USERS[newRole]);
    const demoToken = `demo-${newRole.toLowerCase()}`;
    setToken(demoToken);
    localStorage.setItem('smartflow_role', newRole);
    localStorage.setItem('smartflow_token', demoToken);
  };

  const login = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        // If error, check if it's one of the demo users
        const matchedDemo = Object.values(DEMO_USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
        if (matchedDemo) {
          switchRole(matchedDemo.role);
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      if (data.session) {
        setToken(data.session.access_token);
        localStorage.setItem('smartflow_token', data.session.access_token);
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          role: (data.user.user_metadata?.role as UserRole) || 'EMPLOYEE',
          department: data.user.user_metadata?.department || 'General',
          created_at: data.user.created_at,
          updated_at: new Date().toISOString()
        };
        setUser(profile);
        setRole(profile.role);
        localStorage.setItem('smartflow_role', profile.role);
        return { success: true };
      }
      return { success: false, error: 'No session returned' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      switchRole('EMPLOYEE');
    }
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'x-user-role': role,
      'x-user-id': user?.id || '',
      ...(options.headers as Record<string, string> || {})
    };

    return fetch(url, {
      ...options,
      headers
    });
  };

  return (
    <AuthContext.Provider value={{ user, role, switchRole, token, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
