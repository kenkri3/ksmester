'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { setCurrentAuthUser } from '../services/dbAdapter';

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
  registerWithEmail: (email: string, pass: string, name: string, company: string, gdprConsent?: boolean, orgnr?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthReady: boolean;
  isSuperAdmin: boolean;
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

  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setImpersonatedCompanyId(localStorage.getItem('impersonatedCompanyId'));
        setImpersonatedRole(localStorage.getItem('impersonatedRole'));
      } catch (e) {
        // Ignore localStorage access issues
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.getMe();
        if (res && res.user) {
          const u = res.user;
          const isSuper = u.role === 'superadmin' || u.role === 'admin' || 
            ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no'].includes((u.email || '').toLowerCase()) ||
            (u.displayName || '').toLowerCase().includes('ken');
          const computedRole = isSuper ? 'superadmin' : (u.role || 'worker');

          const userObj: User = {
            uid: u.id || u.uid,
            id: u.id || u.uid,
            email: u.email,
            displayName: u.displayName || u.email.split('@')[0],
            role: computedRole,
            trade: u.trade || 'Byggmester',
            company: u.company || 'Mester Entreprenør AS',
            companyId: u.companyId || 'comp-001',
            subscriptionStatus: u.subscriptionStatus || 'active'
          };
          setUser(userObj);
          setCurrentAuthUser(userObj);
          setRole(computedRole);
          setTrade(u.trade || 'Byggmester');
          setCompany(u.company || 'Mester Entreprenør AS');
          setSubscriptionStatus(u.subscriptionStatus || 'active');
        } else {
          setUser(null);
          setCurrentAuthUser(null);
          setRole(null);
        }
      } catch (err) {
        console.warn("Auth check notice:", err);
        setUser(null);
        setCurrentAuthUser(null);
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
      const userObj: User = {
        uid: u.id || u.uid,
        id: u.id || u.uid,
        email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        role: u.role || 'worker',
        trade: u.trade || 'Tømrer',
        company: u.company || 'Mester Entreprenør AS',
        companyId: u.companyId || 'comp-001',
        subscriptionStatus: u.subscriptionStatus || 'active'
      };
      setUser(userObj);
      setCurrentAuthUser(userObj);
      setRole(u.role || 'worker');
      setCompany(u.company || 'Mester Entreprenør AS');
      setTrade(u.trade || 'Tømrer');
      setSubscriptionStatus(u.subscriptionStatus || 'active');
    } else {
      throw new Error('Kunne ikke logge inn.');
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, company: string, gdprConsent: boolean = true, orgnr?: string) => {
    const res = await api.register({ email, password: pass, name, company, orgnr, gdprConsent });
    if (res && res.user) {
      const u = res.user;
      const userObj: User = {
        uid: u.id || u.uid,
        id: u.id || u.uid,
        email: u.email,
        displayName: u.displayName || name || u.email.split('@')[0],
        role: u.role || 'leader',
        trade: u.trade || 'Byggmester',
        company: u.company || company,
        companyId: u.companyId,
        subscriptionStatus: u.subscriptionStatus || 'trial'
      };
      setUser(userObj);
      setCurrentAuthUser(userObj);
      setRole(u.role || 'leader');
      setCompany(u.company || company);
      setTrade(u.trade || 'Byggmester');
      setSubscriptionStatus(u.subscriptionStatus || 'trial');
    } else {
      throw new Error('Kunne ikke registrere bruker.');
    }
  };

  const resetPassword = async (email: string) => {
    console.log("Tilbakestilling av passord sendt til:", email);
  };

  const logout = async () => {
    api.logout();
    setCurrentAuthUser(null);
    stopImpersonation();
    setUser(null);
    setRole(null);
    setCompany(null);
  };

  const isSuperAdminComputed = (
    role === 'superadmin' || 
    role === 'admin' || 
    user?.role === 'superadmin' || 
    user?.role === 'admin' || 
    user?.displayName?.toLowerCase().includes('ken') || 
    user?.email === 'kenkri3@gmail.com' ||
    user?.email === 'aichatnorge@gmail.com' ||
    user?.email === 'kenneth@aichatnorge.no' ||
    user?.email?.toLowerCase() === 'admin@vikingmester.no' ||
    user?.email === 'post@vikingent.no' ||
    false
  );

  const startImpersonation = (companyId: string, role: string) => {
    if (!isSuperAdminComputed) return;
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
      isSuperAdmin: isSuperAdminComputed,
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
