import { useState, useEffect, useMemo } from 'react';
import { db, collection, query, orderBy, onSnapshot, where, OperationType, handleFirestoreError } from '../services/firebase';
import { Project, Deviation } from '../types';
import { useAuth } from './useAuth';

export function useDashboardData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role, company } = useAuth();

  useEffect(() => {
    if (!user) return;

    const projectsPath = 'projects';
    const deviationsPath = 'deviations';

    let projectsQuery = query(collection(db, projectsPath), orderBy('lastUpdate', 'desc'));
    
    // Filter by company if present
    if (company) {
      if (role === 'client') {
        projectsQuery = query(collection(db, projectsPath), where('clientId', '==', user.uid), where('company', '==', company), orderBy('lastUpdate', 'desc'));
      } else {
        projectsQuery = query(collection(db, projectsPath), where('company', '==', company), orderBy('lastUpdate', 'desc'));
      }
    } else if (role !== 'admin') {
      setLoading(false);
      return;
    }

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastUpdate: data.lastUpdate?.toDate?.()?.toLocaleString() || String(data.lastUpdate || 'Nylig')
        };
      }) as Project[];
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, projectsPath);
    });

    let deviationsQuery = query(collection(db, deviationsPath), orderBy('timestamp', 'desc'));
    
    // Filter by company if present
    if (company) {
      deviationsQuery = query(collection(db, deviationsPath), where('company', '==', company), orderBy('timestamp', 'desc'));
    } else if (role !== 'admin') {
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
      setDeviations(deviationsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, deviationsPath);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeDeviations();
    };
  }, [user, role, company]);

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
    loading 
  };
}
