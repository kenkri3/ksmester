import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, OperationType, handleFirestoreError } from '../services/firebase';
import { Project, Deviation } from '../types';
import { useAuth } from './useAuth';
import { api } from '../services/api';

export function useDashboardData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  // FIX (11.09.2026): Skiller "ingen firmatilknytning funnet" fra "0 prosjekter" slik at
  // UI kan vise en tydelig melding i stedet for et stille tomt rutenett (så det ikke ser
  // ut som en ødelagt knapp for brukeren).
  const [dataUnavailable, setDataUnavailable] = useState(false);
  // SIKKERHETSFIKS (W-03): egen feilmeldingstilstand sa UI-et kan si fra i stedet
  // for a vise en tom liste eller bli staende i lastetilstand.
  const [loadError, setLoadError] = useState<string | null>(null);
  const { user, role, company, impersonatedCompanyId } = useAuth();

  useEffect(() => {
    if (!user) return;

    const projectsPath = 'projects';
    const deviationsPath = 'deviations';

    let projectsQuery = query(collection(db, projectsPath), orderBy('lastUpdate', 'desc'));
    
    // Admin / Superadmin har global oversikt og ser alle prosjekter med mindre en bedrift eksplisitt impersoneres
    const isGlobalAdmin = role === 'admin' || role === 'superadmin' || 
      ['kenkri3@gmail.com', 'aichatnorge@gmail.com', 'kenneth@aichatnorge.no', 'fredrik.r.ellingsen@gmail.com', 'fredrik@aichatnorge.no'].includes((user?.email || '').toLowerCase());

    const effectiveCompany = impersonatedCompanyId || (isGlobalAdmin ? null : company);

    // Reset projects and deviations state immediately upon tenant switch to prevent stale flash
    setProjects([]);
    setDeviations([]);
    setLoading(true);

    // Filter by company if present for non-admins (or when admin impersonates)
    if (effectiveCompany) {
      if (role === 'client') {
        projectsQuery = query(collection(db, projectsPath), where('clientId', '==', user.uid), where('company', '==', effectiveCompany), orderBy('lastUpdate', 'desc'));
      } else {
        projectsQuery = query(collection(db, projectsPath), where('company', '==', effectiveCompany), orderBy('lastUpdate', 'desc'));
      }
    } else if (!isGlobalAdmin) {
      console.warn('[useDashboardData] Mangler firmatilknytning (company) for innlogget bruker – kan ikke hente prosjekter/avvik.');
      setLoading(false);
      setDataUnavailable(true);
      return;
    }
    setDataUnavailable(false);

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        // SIKKERHETSFIKS (W-04): her ble manglende felt fylt med oppdiktede verdier -
        // projectCode 'P-2026', clientName 'Privatkunde', progress 15 og
        // lastUpdate 'Nylig'. Brukeren sa 15 % fremdrift som om det var malt, og
        // «Privatkunde» som om det var registrert. Na vises det som mangler som
        // null, og UI-et ma vise «ikke registrert» i stedet for en oppdiktet verdi.
        return {
          id: doc.id,
          projectCode: data.projectCode || null,
          clientName: data.clientName || null,
          location: data.location || null,
          progress: typeof data.progress === 'number' ? data.progress : null,
          stage: data.stage || 'active',
          status: data.status || 'active',
          ...data,
          name: data.name || (data.location ? `Prosjekt ${data.location}` : `Prosjekt ${doc.id}`),
          lastUpdate: data.lastUpdate?.toDate?.()?.toLocaleString() || String(data.lastUpdate || '')
        };
      }) as Project[];
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      // SIKKERHETSFIKS (W-03): her ble loading aldri satt til false ved lytterfeil,
      // sa dashboardet ble staende i lastetilstand for alltid. Na avsluttes den,
      // og feilen sies apent fra om i stedet for a se ut som tomme data.
      console.error('[useDashboardData] Kunne ikke hente prosjekter:', error);
      setLoading(false);
      setLoadError('Kunne ikke hente prosjekter. Sjekk nettverket og prov igjen.');
      handleFirestoreError(error, OperationType.LIST, projectsPath);
    });

    let deviationsQuery = query(collection(db, deviationsPath));
    
    // Filter by company if present for non-admins (or when admin impersonates)
    if (effectiveCompany) {
      deviationsQuery = query(collection(db, deviationsPath), where('company', '==', effectiveCompany));
    } else if (!isGlobalAdmin) {
      setLoading(false);
      return;
    }
    const unsubscribeDeviations = onSnapshot(deviationsQuery, (snapshot) => {
      const deviationsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toLocaleString() || String(data.timestamp || 'Nylig')
        };
      }) as Deviation[];
      // Sorter kronologisk nyeste først uten krav til sammensatt Firestore-indeks
      deviationsData.sort((a, b) => {
        const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
        const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
        return tB - tA;
      });
      setDeviations(deviationsData);
    }, (error) => {
      // SIKKERHETSFIKS (W-03): ogsa her ble loading staende. Avslutt den, si fra,
      // og fall tilbake til server-API-et som for.
      console.error('[useDashboardData] Kunne ikke hente avvik:', error);
      setLoading(false);
      setLoadError('Kunne ikke hente avvik. Viser data fra serveren i stedet.');
      handleFirestoreError(error, OperationType.LIST, deviationsPath);
      // Fallback til API hvis Firestore nekter eller mangler indeks
      api.getCollection('deviations').then((serverDevs: any[]) => {
        if (Array.isArray(serverDevs) && serverDevs.length > 0) {
          setDeviations(serverDevs);
        }
      }).catch(() => {});
    });

    // Sikre at eventuelle avvik lagret i database-lageret også fanges opp
    api.getCollection('deviations').then((serverDevs: any[]) => {
      if (Array.isArray(serverDevs) && serverDevs.length > 0) {
        setDeviations(prev => {
          if (prev.length === 0) return serverDevs;
          const map = new Map<string, Deviation>();
          prev.forEach(d => map.set(d.id, d));
          serverDevs.forEach(d => {
            if (!map.has(d.id)) map.set(d.id, d);
          });
          return Array.from(map.values()).sort((a, b) => {
            const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
            const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
            return tB - tA;
          });
        });
      }
    }).catch(() => {});

    return () => {
      unsubscribeProjects();
      unsubscribeDeviations();
    };
  }, [user, role, company, impersonatedCompanyId]);

  // Memoize stats calculation to avoid repeated O(N) filtering and reducing
  // on every render of components utilizing this hook. Also ensures a stable object reference.
  const stats = useMemo(() => ({
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.stage === 'active').length,
    openDeviations: deviations.filter(d => d.status === 'open').length,
    criticalDeviations: deviations.filter(d => d.severity === 'high' && d.status === 'open').length,
    avgCompliance: projects.length > 0 
      ? Math.round(projects.reduce((acc, p) => acc + (p.documentationLevel || 0), 0) / projects.length)
      : 0
  }), [projects, deviations]);

  // Memoize recentDeviations array to provide a stable reference
  // preventing unnecessary downstream re-renders.
  const recentDeviations = useMemo(() => deviations.slice(0, 5), [deviations]);

  return { 
    projects, 
    deviations, 
    stats,
    recentDeviations,
    loading,
    dataUnavailable,
    loadError
  };
}
