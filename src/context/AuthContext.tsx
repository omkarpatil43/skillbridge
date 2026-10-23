import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, StudentLevel } from '../types';
import { api } from '../services/api';

export interface SignupAnalysis {
  batchYears: string | null;
  batchStartYear: number | null;
  batchEndYear: number | null;
  rollNumber: string | null;
  studentName: string | null;
  confidence: 'high' | 'medium' | 'low';
  yearOfStudy: number;
  studentLevel: StudentLevel;
  displayLabel: string;
}

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authToken: string | null;
  login: (email: string, rollNo: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (formData: FormData) => Promise<{ success: boolean; analysis: SignupAnalysis; error?: string }>;
  confirmSignup: (confirmed: boolean, requestedLevel?: string, note?: string) => Promise<{ success: boolean; error?: string }>;
  clubAdminSignup: (data: { email: string; name: string; password: string; clubName: string; phone?: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'skillbridge_current_user_v2';
const AUTH_TOKEN_STORAGE_KEY = 'skillbridge_auth_token_v2';
const DEMO_USER_EMAILS = new Set(['student@pict.edu', 'senior@pict.edu', 'clublead@pict.edu']);
const USERS_STORAGE_KEY = 'skillbridge_users_v2';

const isDemoUser = (user: User) => DEMO_USER_EMAILS.has(user.email.trim().toLowerCase());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved) as User;
        if (!isDemoUser(user)) return user;
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  const [authToken, setAuthToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    localStorage.removeItem(USERS_STORAGE_KEY);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }, []);

  // Verify session on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (authToken) {
        try {
          const res = await api.getCurrentUser(authToken);
          if (res && res.user) {
            setCurrentUser(res.user);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.user));
          } else {
            // Token expired or invalid
            logout();
          }
        } catch {
          // If offline or server error, retain cached user if available
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [authToken, logout]);

  // Persist current user
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  const refreshUser = async () => {
    if (!authToken) return;
    try {
      const res = await api.getCurrentUser(authToken);
      if (res?.user) {
        setCurrentUser(res.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  /**
   * Students use email + roll number + password; admins use email + password.
   */
  const login = async (email: string, rollNo: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanRoll = rollNo.trim().toUpperCase();

      const result = await api.login(cleanEmail, cleanRoll, password);
      if (result && result.user && result.token) {
        setCurrentUser(result.user);
        setAuthToken(result.token);
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);

        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  /**
   * Signup with ID card photo and OCR extraction
   */
  const signup = async (formData: FormData) => {
    try {
      const result = await api.signup(formData);
      if (result && result.user && result.token) {
        setCurrentUser(result.user);
        setAuthToken(result.token);
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.token);

        return {
          success: true,
          analysis: result.analysis,
        };
      }
      return { success: false, analysis: null as any, error: 'Signup failed' };
    } catch (error: any) {
      return { success: false, analysis: null as any, error: error.message || 'Signup failed' };
    }
  };

  /**
   * Student confirms or flags OCR academic classification
   */
  const confirmSignup = async (confirmed: boolean, requestedLevel?: string, note?: string) => {
    if (!authToken) {
      return { success: false, error: 'No active session found' };
    }
    try {
      const result = await api.confirmSignup(authToken, confirmed, requestedLevel, note);
      if (result && result.user) {
        setCurrentUser(result.user);
        return { success: true };
      }
      return { success: false, error: 'Failed to confirm status' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Confirmation failed' };
    }
  };

  const clubAdminSignup = async (data: { email: string; name: string; password: string; clubName: string; phone?: string }) => {
    try {
      const res = await api.clubAdminSignup(data);
      return { success: true, message: res.message };
    } catch (error: any) {
      return { success: false, error: error.message || 'Club admin registration failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        authToken,
        login,
        signup,
        confirmSignup,
        clubAdminSignup,
        logout,
        refreshUser,
      }}
    >
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
