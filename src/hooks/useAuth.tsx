'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { setCurrentAuthUser } from '../services/dbAdapter';
import { chatSessionService } from '../services/chatSessionService';

import { isModuleAllowedForPlan, PlanId } from '../config/plans';
import { db, doc, onSnapshot } from '../services/firebase';

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
  plan?: string;
  modules?: string[];
  isBetaTester?: boolean;
  totalTrialDays?: number | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, company: string, gdprConsent?: boolean, orgnr?: string, companyId?: string, role?: string) => Promise<void>;
  applyAuthSession: (token: string, user: any) => void;
  refreshAuth: () => Promise<void>;
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
  totalTrialDays?: number | null;
  isBetaTester?: boolean;
  impersonatedCompanyId: string | null;
  impersonatedRole: string | null;
  impersonatedCompanyPlan?: string | null;
  startImpersonation: (companyId: string, role: string, plan?: string, modules?: string[]) => void;
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
  const [totalTrialDays, setTotalTrialDays] = useState<number | null>(null);
  const [isBetaTester, setIsBetaTester] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(null);
  const [impersonatedRole, setImpersonatedRole] = useState<string | null>(null);
  const [impersonatedCompanyPlan, setImpersonatedCompanyPlan] = useState<string | null>(null);
  const [impersonatedCompanyModules, setImpersonatedCompanyModules] = useState<string[] | null>(null);
  const [simulatedPlan, setSimulatedPlanState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedCompId = localStorage.getItem('impersonatedCompanyId');
        setImpersonatedCompanyId(storedCompId);
        setImpersonatedRole(localStorage.getItem('impersonatedRole'));
        setSimulatedPlanState(localStorage.getItem('mester_simulated_plan'));
        let storedPlan = localStorage.getItem('impersonatedCompanyPlan');
        if (!storedPlan && storedCompId?.toLowerCase().includes('demo')) {
          storedPlan = 'enterprise';
        }
        setImpersonatedCompanyPlan(storedPlan);
        const storedModules = localStorage.getItem('impersonatedCompanyModules');
        if (storedModules) {
          try { setImpersonatedCompanyModules(JSON.parse(storedModules)); } catch {}
        } else if (storedCompId?.toLowerCase().includes('demo')) {
          setImpersonatedCompanyModules(['all_modules']);
        }
      } catch (e) {
        // Ignore localStorage access issues
      }
    }
  }, []);

  const initAuth = useCallback(async () => {
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
          subscriptionStatus: u.subscriptionStatus || 'active',
          plan: u.plan,
          modules: u.modules
        };
        setUser(userObj);
        setCurrentAuthUser(userObj);
        setRole(computedRole);
        setTrade(u.trade || 'Byggmester');
        setCompany(userObj.company || 'Min Bedrift');
        if (Array.isArray(u.modules)) {
          setCompanyModules(u.modules);
        }
        setSubscriptionStatus(u.subscriptionStatus || 'active');
        setTrialDaysLeft(typeof u.trialDaysLeft === 'number' ? u.trialDaysLeft : null);
        setTotalTrialDays(typeof u.totalTrialDays === 'number' ? u.totalTrialDays : null);
        setIsBetaTester(Boolean(u.isBetaTester));
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
  }, []);

  useEffect(() => {
    initAuth();

    const handleAuthEvent = (e: any) => {
      if (e?.detail?.token && e?.detail?.user) {
        applyAuthSession(e.detail.token, e.detail.user);
      } else {
        initAuth();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('auth_session_created', handleAuthEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth_session_created', handleAuthEvent);
      }
    };
  }, [initAuth]);

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
        subscriptionStatus: u.subscriptionStatus || 'active',
        plan: u.plan,
        modules: u.modules
      };
      setUser(userObj);
      setCurrentAuthUser(userObj);
      setRole(u.role || 'worker');
      setCompany(u.company || 'Mester Entreprenør AS');
      setTrade(u.trade || 'Tømrer');
      if (Array.isArray(u.modules)) {
        setCompanyModules(u.modules);
      }
      setSubscriptionStatus(u.subscriptionStatus || 'active');
    } else {
      throw new Error('Kunne ikke logge inn.');
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    company: string,
    gdprConsent: boolean = true,
    orgnr?: string,
    companyId?: string,
    role?: string
  ) => {
    const res = await api.register({ email, password: pass, name, company, orgnr, gdprConsent, companyId, role });
    if (res && res.user) {
      const u = res.user;
      const userObj: User = {
        uid: u.id || u.uid,
        id: u.id || u.uid,
        email: u.email,
        displayName: u.displayName || name || u.email.split('@')[0],
        role: u.role || role || 'leader',
        trade: u.trade || 'Byggmester',
        company: u.company || company,
        companyId: u.companyId || companyId,
        subscriptionStatus: u.subscriptionStatus || 'trial',
        plan: u.plan,
        modules: u.modules
      };
      setUser(userObj);
      setCurrentAuthUser(userObj);
      setRole(u.role || role || 'leader');
      setCompany(u.company || company);
      setTrade(u.trade || 'Byggmester');
      setSubscriptionStatus(u.subscriptionStatus || 'trial');
      setTrialDaysLeft(u.totalTrialDays || 14);
      if (u.modules && Array.isArray(u.modules)) {
        setCompanyModules(u.modules);
      }
    } else {
      throw new Error('Kunne ikke registrere bruker.');
    }
  };

  const applyAuthSession = (token: string, u: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    const emailLower = (u.email || '').toLowerCase().trim();
    const isSuper = u.role === 'superadmin' || SUPERADMIN_EMAILS.includes(emailLower);
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
      subscriptionStatus: u.subscriptionStatus || 'trial',
      plan: u.plan,
      modules: u.modules
    };
    setUser(userObj);
    setCurrentAuthUser(userObj);
    setRole(computedRole);
    setCompany(userObj.company || 'Min Bedrift');
    setTrade(userObj.trade || 'Byggmester');
    if (Array.isArray(u.modules)) {
      setCompanyModules(u.modules);
    }
    setSubscriptionStatus(userObj.subscriptionStatus || 'trial');
    setTrialDaysLeft(typeof u.trialDaysLeft === 'number' ? u.trialDaysLeft : 14);
    setTotalTrialDays(typeof u.totalTrialDays === 'number' ? u.totalTrialDays : 14);
  };

  const resetPassword = async (email: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Kunne ikke sende tilbakestillingslenke.');
    }
    return data;
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

  const activeCompanyId = impersonatedCompanyId || user?.companyId;

  // 🔄 Sanntidssynkronisering av bedriftens moduler og plan direkte fra Firestore
  useEffect(() => {
    if (!activeCompanyId) return;
    try {
      const unsub = onSnapshot(doc(db, 'companies', activeCompanyId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data) {
            if (Array.isArray(data.modules)) {
              setCompanyModules(data.modules);
              if (impersonatedCompanyId) {
                setImpersonatedCompanyModules(data.modules);
                try { localStorage.setItem('impersonatedCompanyModules', JSON.stringify(data.modules)); } catch {}
              }
            }
            if (data.plan) {
              if (impersonatedCompanyId) {
                setImpersonatedCompanyPlan(data.plan);
                try { localStorage.setItem('impersonatedCompanyPlan', data.plan); } catch {}
              }
            }
          }
        }
      }, (err) => {
        console.warn('Realtime company modules subscription warning:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Could not establish company modules snapshot:', e);
    }
  }, [activeCompanyId, impersonatedCompanyId]);

  useEffect(() => {
    const handlePlanUpdated = (e: any) => {
      const { companyId, plan, modules } = e.detail || {};
      if (companyId && (companyId === impersonatedCompanyId || companyId === user?.companyId)) {
        if (plan) {
          setImpersonatedCompanyPlan(plan);
          try { localStorage.setItem('impersonatedCompanyPlan', plan); } catch {}
        }
        if (modules) {
          setCompanyModules(modules);
          setImpersonatedCompanyModules(modules);
          try { localStorage.setItem('impersonatedCompanyModules', JSON.stringify(modules)); } catch {}
        }
      }
    };
    window.addEventListener('mester_company_plan_updated', handlePlanUpdated);
    return () => window.removeEventListener('mester_company_plan_updated', handlePlanUpdated);
  }, [impersonatedCompanyId, user?.companyId]);

  const hasModuleAccess = (moduleId: string): boolean => {
    if (isSuperAdminUI) return true;

    const effectivePlan = (simulatedPlan || impersonatedCompanyPlan || user?.plan || user?.subscriptionStatus || 'solo') as string;
    const effectiveModules = impersonatedCompanyModules || companyModules || user?.modules || null;

    // Hvis kunden IKKE har en skreddersydd modulliste, tillat standard åpne planer
    if (!effectiveModules || effectiveModules.length === 0) {
      if (
        impersonatedCompanyId?.toLowerCase().includes('demo') ||
        effectivePlan === 'demo' ||
        effectivePlan === 'enterprise' ||
        effectivePlan === 'internal'
      ) {
        return true;
      }
    }

    return isModuleAllowedForPlan(moduleId, effectivePlan as PlanId, effectiveModules);
  };

  const startImpersonation = (companyId: string, role: string, plan?: string, modules?: string[]) => {
    if (!isPlatformOwner) return;
    try {
      localStorage.setItem('impersonatedCompanyId', companyId);
      localStorage.setItem('impersonatedRole', role);
      if (plan) localStorage.setItem('impersonatedCompanyPlan', plan);
      else localStorage.removeItem('impersonatedCompanyPlan');
      if (modules) localStorage.setItem('impersonatedCompanyModules', JSON.stringify(modules));
      else localStorage.removeItem('impersonatedCompanyModules');
    } catch {}
    setImpersonatedCompanyId(companyId);
    setImpersonatedRole(role);
    setImpersonatedCompanyPlan(plan || null);
    setImpersonatedCompanyModules(modules || null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mester_impersonation_changed', { detail: { companyId, role, plan, modules } }));
    }
    chatSessionService.notify();
  };

  const stopImpersonation = () => {
    try {
      localStorage.removeItem('impersonatedCompanyId');
      localStorage.removeItem('impersonatedRole');
      localStorage.removeItem('mester_simulated_plan');
      localStorage.removeItem('impersonatedCompanyPlan');
      localStorage.removeItem('impersonatedCompanyModules');
    } catch {}
    setImpersonatedCompanyId(null);
    setImpersonatedRole(null);
    setSimulatedPlanState(null);
    setImpersonatedCompanyPlan(null);
    setImpersonatedCompanyModules(null);
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
      applyAuthSession,
      refreshAuth: initAuth,
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
      totalTrialDays: impersonatedCompanyId ? null : totalTrialDays,
      isBetaTester: impersonatedCompanyId ? false : isBetaTester,
      impersonatedCompanyId,
      impersonatedRole,
      impersonatedCompanyPlan,
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
