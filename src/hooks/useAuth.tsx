import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

export interface User {
  uid: string;
  id: string;
  email: string;
  displayName: string;
  role: string;
  trade?: string;
  company?: string;
  companyId?: string;
  subscriptionStatus?: string;
  photoURL?: string | null;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, company: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthReady: boolean;
  role: string | null;
  trade: string | null;
  company: string | null;
  companyModules: string[] | null;
  subscriptionStatus: string | null;
  trialDaysLeft: number | null;
  impersonatedCompanyId: string | null;
  impersonatedRole: string | null;
  startImpersonation: (companyId: string, role: string) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [trade, setTrade] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [companyModules, setCompanyModules] = useState<string[] | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>('active');
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(localStorage.getItem('impersonatedCompanyId'));
  const [impersonatedRole, setImpersonatedRole] = useState<string | null>(localStorage.getItem('impersonatedRole'));

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.getMe();
        if (res && res.user) {
          const u = res.user;
          setUser({
            uid: u.id || u.uid,
            id: u.id || u.uid,
            email: u.email,
            displayName: u.displayName || u.email.split('@')[0],
            role: u.role || 'worker',
            trade: u.trade || 'Tømrer',
            company: u.company || 'Mester Entreprenør AS',
            companyId: u.companyId || 'comp-001',
            subscriptionStatus: u.subscriptionStatus || 'active'
          });
          setRole(u.role || 'worker');
          setTrade(u.trade || 'Tømrer');
          setCompany(u.company || 'Mester Entreprenør AS');
          setSubscriptionStatus(u.subscriptionStatus || 'active');
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        console.warn("Auth check notice:", err);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, []);

  const login = async () => {
    throw new Error('Vennligst oppgi e-postadresse og passord for å logge inn.');
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (res && res.user) {
      const u = res.user;
      setUser({
        uid: u.id || u.uid,
        id: u.id || u.uid,
        email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        role: u.role || 'worker',
        trade: u.trade || 'Tømrer',
        company: u.company || 'Mester Entreprenør AS',
        companyId: u.companyId || 'comp-001',
        subscriptionStatus: u.subscriptionStatus || 'active'
      });
      setRole(u.role || 'worker');
      setCompany(u.company || 'Mester Entreprenør AS');
      setTrade(u.trade || 'Tømrer');
      setSubscriptionStatus(u.subscriptionStatus || 'active');
    } else {
      throw new Error('Kunne ikke logge inn.');
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, company: string) => {
    const res = await api.register({ email, password: pass, name, company });
    if (res && res.user) {
      const u = res.user;
      setUser({
        uid: u.id || u.uid,
        id: u.id || u.uid,
        email: u.email,
        displayName: u.displayName || name || u.email.split('@')[0],
        role: u.role || 'worker',
        trade: u.trade || 'Tømrer',
        company: u.company || company,
        companyId: u.companyId || 'comp-001',
        subscriptionStatus: u.subscriptionStatus || 'active'
      });
      setRole(u.role || 'worker');
      setCompany(u.company || company);
      setTrade(u.trade || 'Tømrer');
      setSubscriptionStatus(u.subscriptionStatus || 'active');
    } else {
      throw new Error('Kunne ikke registrere bruker.');
    }
  };

  const resetPassword = async (email: string) => {
    // Simulated success notice
    console.log("Tilbakestilling av passord sendt til:", email);
  };

  const logout = async () => {
    api.logout();
    stopImpersonation();
    setUser(null);
    setRole(null);
    setCompany(null);
  };

  const startImpersonation = (companyId: string, role: string) => {
    if (user?.email !== 'kenkri3@gmail.com') return;
    localStorage.setItem('impersonatedCompanyId', companyId);
    localStorage.setItem('impersonatedRole', role);
    setImpersonatedCompanyId(companyId);
    setImpersonatedRole(role);
  };

  const stopImpersonation = () => {
    localStorage.removeItem('impersonatedCompanyId');
    localStorage.removeItem('impersonatedRole');
    setImpersonatedCompanyId(null);
    setImpersonatedRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithEmail,
      registerWithEmail,
      resetPassword,
      logout,
      isAuthReady,
      role: impersonatedRole || role,
      trade,
      company: impersonatedCompanyId || company,
      companyModules,
      subscriptionStatus: impersonatedCompanyId ? 'active' : subscriptionStatus,
      trialDaysLeft: impersonatedCompanyId ? null : trialDaysLeft,
      impersonatedCompanyId,
      impersonatedRole,
      startImpersonation,
      stopImpersonation
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
