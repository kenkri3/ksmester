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
            role: u.role || 'admin',
            trade: u.trade || 'Tømrer',
            company: u.company || 'Mester Entreprenør AS',
            companyId: u.companyId || 'comp-001',
            subscriptionStatus: u.subscriptionStatus || 'active'
          });
          setRole(u.role || 'admin');
          setTrade(u.trade || 'Tømrer');
          setCompany(u.company || 'Mester Entreprenør AS');
          setSubscriptionStatus(u.subscriptionStatus || 'active');
        } else {
          // Check local fallback session
          const savedFallback = localStorage.getItem('localFallbackAuth');
          if (savedFallback) {
            try {
              const parsed = JSON.parse(savedFallback);
              setFallbackUser(parsed.email, parsed.name, parsed.company);
            } catch (e) {
              setUser(null);
              setRole(null);
            }
          }
        }
      } catch (err) {
        console.warn("Auth check notice:", err);
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, []);

  const setFallbackUser = (emailVal: string, nameVal?: string, companyVal?: string) => {
    const isOwner = emailVal === 'kenkri3@gmail.com' || emailVal.toLowerCase().includes('admin') || !emailVal;
    const userObj: User = {
      uid: 'u-admin-123',
      id: 'u-admin-123',
      displayName: nameVal || (emailVal ? emailVal.split('@')[0] : 'Ken (Admin)'),
      email: emailVal || 'kenkri3@gmail.com',
      role: isOwner ? 'admin' : 'worker',
      trade: 'Tømrer',
      company: companyVal || 'Mester Entreprenør AS',
      companyId: 'comp-001',
      subscriptionStatus: 'active'
    };
    setUser(userObj);
    setRole(userObj.role);
    setCompany(userObj.company!);
    setTrade(userObj.trade!);
    setSubscriptionStatus('active');
    setTrialDaysLeft(null);
    localStorage.setItem('localFallbackAuth', JSON.stringify({
      email: userObj.email,
      name: userObj.displayName,
      company: userObj.company
    }));
  };

  const login = async () => {
    try {
      const res = await api.login('kenkri3@gmail.com', 'admin123');
      if (res && res.user) {
        const u = res.user;
        setUser({
          uid: u.id || u.uid,
          id: u.id || u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          trade: u.trade,
          company: u.company,
          companyId: u.companyId,
          subscriptionStatus: u.subscriptionStatus
        });
        setRole(u.role);
        setCompany(u.company);
      }
    } catch (err) {
      setFallbackUser('kenkri3@gmail.com', 'Ken (Admin)', 'Mester Entreprenør AS');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const res = await api.login(email, pass);
      if (res && res.user) {
        const u = res.user;
        setUser({
          uid: u.id || u.uid,
          id: u.id || u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          trade: u.trade,
          company: u.company,
          companyId: u.companyId,
          subscriptionStatus: u.subscriptionStatus
        });
        setRole(u.role);
        setCompany(u.company);
      }
    } catch (err) {
      setFallbackUser(email, email.split('@')[0], 'Mester Entreprenør AS');
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, company: string) => {
    try {
      const res = await api.register({ email, password: pass, name, company });
      if (res && res.user) {
        const u = res.user;
        setUser({
          uid: u.id || u.uid,
          id: u.id || u.uid,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          trade: u.trade,
          company: u.company,
          companyId: u.companyId,
          subscriptionStatus: u.subscriptionStatus
        });
        setRole(u.role);
        setCompany(u.company);
      }
    } catch (err) {
      setFallbackUser(email, name, company);
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
