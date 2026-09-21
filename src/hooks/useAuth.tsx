'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { setCurrentAuthUser } from '../services/dbAdapter';
import { chatSessionService } from '../services/chatSessionService';

import { isModuleAllowedForPlan, PlanId } from '../config/plans';

export const SUPERADMIN_EMAILS = [
  'kenkri3@gmail.com',
  'aichatnorge@gmail.com',
  'kenneth@aichatnorge.no',
  'admin@vikingmester.no',
  'post@vikingent.no',
  'fredrik.r.ellingsen@gmail.com',
  'fredrik@aichatnorge.no'
];

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
  isPlatformOwner: boolean; // 👑 Urokkelig systemeier-status for Kenneth (mister ALDRI tilgang)
  simulatedPlan: string | null;
  setSimulatedPlan: (plan: string | null) => void;
  hasModuleAccess: (moduleId: string) => boolean;
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
  const [simulatedPlan, setSimulatedPlanState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setImpersonatedCompanyId(localStorage.getItem('impersonatedCompanyId'));
        setImpersonatedRole(localStorage.getItem('impersonatedRole'));
        setSimulatedPlanState(localStorage.getItem('mester_simulated_plan'));
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
          const SUPERADMIN_EMAILS = [
            'kenkri3@gmail.com',
            'aichatnorge@gmail.com',
            'kenneth@aichatnorge.no',
            'admin@vikingmester.no',
            'post@vikingent.no',
            'fredrik.r.ellingsen@gmail.com',
            'fredrik@aichatnorge.no'
          ];
          const isSuper = u.role === 'superadmin' || SUPERADMIN_EMAILS.includes((u.email || '').toLowerCase());
          const computedRole = isSuper ? 'superadmin' : (u.role || 'leader');

          const userObj: User = {
            uid: u.id || u.uid,
            id: u.id || u.uid,
            email: u.email,
            displayName: u.displayName || u.email.split('@')[0],
            role: computedRole,
            trade: u.trade || 'Byggmester',
            company: u.company || (isSuper ? 'AIChat Norge AS / Vikingnet' : 'Min Bedrift'),
            companyId: u.companyId || (isSuper ? 'comp-001' : `comp-${u.id || 'user'}`),
            subscriptionStatus: u.subscriptionStatus || 'active'
          };
          setUser(userObj);
          setCurrentAuthUser(userObj);
          setRole(computedRole);
          setTrade(u.trade || 'Byggmester');
          setCompany(userObj.company || 'Min Bedrift');
          setSubscriptionStatus(u.subscriptionStatus || 'active');
          setTrialDaysLeft(typeof u.trialDaysLeft === 'number' ? u.trialDaysLeft : null);
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
      setTrialDaysLeft(14);
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

  // 👑 Urokkelig systemeier-status for Kenneth (Plattformeier mister ALDRI tilgang)
  const isPlatformOwner = Boolean(
    (user?.email && SUPERADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    user?.role === 'superadmin' ||
    role === 'superadmin'
  );

  // Standard UI SuperAdmin-visning (Krone/knapper i dashboard):
  // Skjult når man forhåndsviser en pakke eller impersonerer en kunde,
  // slik at opplevelsen er 100% autentisk. MEN Kenneth har alltid Master-baren øverst!
  const isSuperAdminUI = Boolean(isPlatformOwner && !impersonatedCompanyId && !simulatedPlan);

  const setSimulatedPlan = (plan: string | null) => {
    if (!isPlatformOwner && plan !== null) return;
    if (plan) {
      try { localStorage.setItem('mester_simulated_plan', plan); } catch {}
    } else {
      try { localStorage.removeItem('mester_simulated_plan'); } catch {}
    }
    setSimulatedPlanState(plan);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mester_simulated_plan_changed', { detail: { plan } }));
    }
  };

  const hasModuleAccess = (moduleId: string): boolean => {
    if (isSuperAdminUI) return true;
    const effectivePlan = simulatedPlan || (impersonatedCompanyId ? 'solo' : (user?.subscriptionStatus || 'solo'));
    return isModuleAllowedForPlan(moduleId, effectivePlan, companyModules);
  };

  const startImpersonation = (companyId: string, role: string) => {
    if (!isPlatformOwner) return;
    try {
      localStorage.setItem('impersonatedCompanyId', companyId);
      localStorage.setItem('impersonatedRole', role);
    } catch {}
    setImpersonatedCompanyId(companyId);
    setImpersonatedRole(role);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mester_impersonation_changed', { detail: { companyId, role } }));
    }
    chatSessionService.notify();
  };

  const stopImpersonation = () => {
    try {
      localStorage.removeItem('impersonatedCompanyId');
      localStorage.removeItem('impersonatedRole');
      localStorage.removeItem('mester_simulated_plan');
    } catch {}
    setImpersonatedCompanyId(null);
    setImpersonatedRole(null);
    setSimulatedPlanState(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mester_impersonation_changed', { detail: { companyId: null, role: null } }));
    }
    chatSessionService.notify();
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
      isSuperAdmin: isSuperAdminUI,
      isPlatformOwner,
      simulatedPlan,
      setSimulatedPlan,
      hasModuleAccess,
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
