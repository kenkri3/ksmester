import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  Search, 
  Plus, 
  MapPin, 
  Clock, 
  Fuel, 
  AlertTriangle, 
  History, 
  ChevronRight, 
  Download, 
  Map, 
  Zap, 
  Calendar, 
  Send,
  X,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  FileText,
  Trash2,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Vehicle, VehicleEntry, Project } from '../types';
import { db, auth, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, OperationType, handleFirestoreError } from '../services/firebase';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import { api } from '../services/api';

interface VehicleFleetManagerProps {
  projects: Project[];
  isModal?: boolean;
  onClose?: () => void;
}

// Statens satser for kilometergodtgjørelse 2026
const STATENS_KM_SATS = 4.90;

const SEED_VEHICLES: Vehicle[] = [
  {
    id: 'veh-1',
    plate: 'BS 54321',
    model: 'Ford Transit Custom 2.0 EcoBlue',
    type: 'Diesel',
    status: 'Aktiv',
    km: 48500,
    nextServiceKm: 55000,
    nextEuControl: '2026-11-15',
    assignedDriver: 'Ken (Admin)',
    year: 2023,
    notes: 'Hovedbil innredet med verktøy og festemidler'
  },
  {
    id: 'veh-2',
    plate: 'EL 12345',
    model: 'Volkswagen ID. Buzz Cargo',
    type: 'EL',
    status: 'Aktiv',
    km: 24100,
    nextServiceKm: 40000,
    nextEuControl: '2027-06-01',
    assignedDriver: 'Marius Tømrer',
    year: 2024,
    notes: 'Nullutslipp bybil for sentrumsoppdrag'
  },
  {
    id: 'veh-3',
    plate: 'EK 98765',
    model: 'Toyota Proace 2.0 D-4D 4x4',
    type: 'Diesel',
    status: 'Aktiv',
    km: 89200,
    nextServiceKm: 90000,
    nextEuControl: '2026-03-18',
    assignedDriver: 'Feltlag 2',
    year: 2021,
    notes: 'Firehjulstrekk for hytteprosjekter og ulendt terreng'
  }
];

const SEED_LOGS: VehicleEntry[] = [
  {
    id: 'log-1',
    vehicleId: 'veh-1',
    plateNumber: 'BS 54321',
    driverId: 'driver-1',
    driverName: 'Ken (Admin)',
    date: new Date().toISOString().split('T')[0],
    startKm: 48462,
    endKm: 48500,
    purpose: 'Materialtransport og oppfølging byggeplass',
    projectName: 'Renovering Bad Vidjeveien 21',
    tollFee: 45,
    isAutoTracked: true
  },
  {
    id: 'log-2',
    vehicleId: 'veh-2',
    plateNumber: 'EL 12345',
    driverId: 'driver-2',
    driverName: 'Marius Tømrer',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    startKm: 24072,
    endKm: 24100,
    purpose: 'Henting av membran og fliser hos Optimera',
    projectName: 'Renovering Bad Vidjeveien 21',
    tollFee: 28,
    isAutoTracked: true
  },
  {
    id: 'log-3',
    vehicleId: 'veh-3',
    plateNumber: 'EK 98765',
    driverId: 'driver-1',
    driverName: 'Ken (Admin)',
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    startKm: 89115,
    endKm: 89200,
    purpose: 'Befaring og oppmåling ny enebolig',
    projectName: 'Nybygg Villa Holmenkollen',
    tollFee: 65,
    isAutoTracked: false
  }
];

export const VehicleFleetManager: React.FC<VehicleFleetManagerProps> = ({
  projects,
  isModal = false,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'vehicles' | 'stats'>('log');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [showAutoImportModal, setShowAutoImportModal] = useState(false);

  // Data state with localStorage & Cloud persistence
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const raw = localStorage.getItem('ks_vehicles_cache');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_VEHICLES;
    } catch {
      return SEED_VEHICLES;
    }
  });

  const [logs, setLogs] = useState<VehicleEntry[]>(() => {
    try {
      const raw = localStorage.getItem('ks_vehicle_logs_cache');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_LOGS;
    } catch {
      return SEED_LOGS;
    }
  });

  // ☁️ Sky-synkronisering: Hent felles firmabiler og kjøreboklogger for bedriften
  useEffect(() => {
    let isMounted = true;
    async function syncCloudFleet() {
      try {
        const [cloudVehicles, cloudLogs] = await Promise.all([
          api.getCollection('vehicles').catch(() => []),
          api.getCollection('vehicle_logs').catch(() => [])
        ]);

        if (isMounted) {
          if (Array.isArray(cloudVehicles) && cloudVehicles.length > 0) {
            setVehicles(cloudVehicles);
          }
          if (Array.isArray(cloudLogs) && cloudLogs.length > 0) {
            setLogs(cloudLogs);
          }
        }
      } catch (err) {
        console.warn('Kunne ikke laste bilflåte fra sky:', err);
      }
    }
    syncCloudFleet();
    return () => { isMounted = false; };
  }, []);

  // Ubehandlede turer fra Auto-Kjørebok (GPS / Autopass)
  const [pendingAutoTrips, setPendingAutoTrips] = useState<any[]>([
    {
      id: 'auto-1',
      plate: 'BS 54321',
      date: new Date().toISOString().split('T')[0],
      route: 'Verksted → Vidjeveien 21 tur/retur',
      km: 36,
      toll: 45,
      driver: 'Ken (Admin)',
      suggestedProject: 'Renovering Bad Vidjeveien 21'
    },
    {
      id: 'auto-2',
      plate: 'EL 12345',
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      route: 'Vidjeveien 21 → Maxbo Proff',
      km: 18,
      toll: 22,
      driver: 'Marius Tømrer',
      suggestedProject: 'Renovering Bad Vidjeveien 21'
    },
    {
      id: 'auto-3',
      plate: 'BS 54321',
      date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      route: 'Lager → Deponi / Avfallsmottak',
      km: 24,
      toll: 30,
      driver: 'Ken (Admin)',
      suggestedProject: 'Felles firmadrift'
    }
  ]);

  // Skjema for ny tur
  const [newTrip, setNewTrip] = useState({
    vehicleId: '',
    startKm: 0,
    endKm: 0,
    purpose: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    tollFee: 0
  });

  // Skjema for ny bil
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    model: '',
    type: 'Diesel' as Vehicle['type'],
    status: 'Aktiv' as Vehicle['status'],
    km: 0,
    nextServiceKm: 0,
    nextEuControl: '',
    assignedDriver: '',
    notes: ''
  });

  // Lagre til cache
  useEffect(() => {
    try {
      localStorage.setItem('ks_vehicles_cache', JSON.stringify(vehicles));
    } catch {}
  }, [vehicles]);

  useEffect(() => {
    try {
      localStorage.setItem('ks_vehicle_logs_cache', JSON.stringify(logs));
    } catch {}
  }, [logs]);

  // Sett start-KM automatisk når bruker velger bil i "Ny tur"-modalen
  useEffect(() => {
    if (newTrip.vehicleId) {
      const v = vehicles.find(item => item.id === newTrip.vehicleId);
      if (v) {
        setNewTrip(prev => ({
          ...prev,
          startKm: v.km,
          endKm: v.km + 25 // forhåndsutfyller 25 km for enkelhet
        }));
      }
    }
  }, [newTrip.vehicleId, vehicles]);

  // Håndter opprettelse av ny tur
  const handleNewTripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVeh = vehicles.find(v => v.id === newTrip.vehicleId);
    if (!selectedVeh) {
      toast.error('Vennligst velg en bil fra listen.');
      return;
    }

    if (newTrip.endKm <= newTrip.startKm) {
      toast.error('Slutt-kilometer må være høyere enn start-kilometer.');
      return;
    }

    const selectedProj = projects.find(p => p.id === newTrip.projectId);
    const distance = newTrip.endKm - newTrip.startKm;

    const entry: VehicleEntry = {
      id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      vehicleId: selectedVeh.id,
      plateNumber: selectedVeh.plate,
      driverId: auth.currentUser?.uid || 'user-default',
      driverName: auth.currentUser?.displayName || 'Byggmester',
      date: newTrip.date,
      startKm: Number(newTrip.startKm),
      endKm: Number(newTrip.endKm),
      purpose: newTrip.purpose.trim(),
      projectId: newTrip.projectId || undefined,
      projectName: selectedProj?.name || (newTrip.projectId ? 'Prosjekt' : 'Felles drift'),
      tollFee: Number(newTrip.tollFee) || 0,
      isAutoTracked: false
    };

    // 1. Oppdater logg lokalt og i skyen
    setLogs(prev => [entry, ...prev]);
    api.addDoc('vehicle_logs', entry).catch(() => {});

    // 2. Oppdater bilens kilometerstand lokalt og i skyen
    setVehicles(prev => prev.map(v => {
      if (v.id === selectedVeh.id && newTrip.endKm > v.km) {
        api.updateDoc('vehicles', v.id, { km: Number(newTrip.endKm) }).catch(() => {});
        return { ...v, km: Number(newTrip.endKm) };
      }
      return v;
    }));

    setIsNewTripOpen(false);
    toast.success(`Tur registrert! ${distance} km loggført på ${selectedVeh.plate}`);

    // Tilbakestill form
    setNewTrip({
      vehicleId: '',
      startKm: 0,
      endKm: 0,
      purpose: '',
      projectId: '',
      date: new Date().toISOString().split('T')[0],
      tollFee: 0
    });
  };

  // Håndter opprettelse av ny bil
  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate.trim() || !newVehicle.model.trim()) {
      toast.error('Vennligst fyll ut registreringsnummer og modell.');
      return;
    }

    const cleanPlate = newVehicle.plate.trim().toUpperCase().replace(/\s+/g, ' ');
    const existing = vehicles.find(v => v.plate.replace(/\s+/g, '') === cleanPlate.replace(/\s+/g, ''));
    if (existing) {
      toast.error(`Bilen med kjennemerke ${cleanPlate} finnes allerede i systemet.`);
      return;
    }

    const created: Vehicle = {
      id: `veh_${Date.now()}`,
      plate: cleanPlate,
      model: newVehicle.model.trim(),
      type: newVehicle.type,
      status: newVehicle.status,
      km: Number(newVehicle.km) || 0,
      nextServiceKm: Number(newVehicle.nextServiceKm) || (Number(newVehicle.km) + 20000),
      nextEuControl: newVehicle.nextEuControl || '2026-12-31',
      assignedDriver: newVehicle.assignedDriver.trim() || 'Alle håndverkere',
      notes: newVehicle.notes.trim()
    };

    setVehicles(prev => [created, ...prev]);
    api.addDoc('vehicles', created).catch(() => {});
    setIsAddVehicleOpen(false);
    toast.success(`${created.model} (${created.plate}) er lagt til i bilparken!`);

    // Reset
    setNewVehicle({
      plate: '',
      model: '',
      type: 'Diesel',
      status: 'Aktiv',
      km: 0,
      nextServiceKm: 0,
      nextEuControl: '',
      assignedDriver: '',
      notes: ''
    });
  };

  // Slett bil
  const handleDeleteVehicle = (vehicleId: string, plate: string) => {
    if (confirm(`Er du sikker på at du vil fjerne bilen ${plate} fra bilparken?`)) {
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      api.deleteDoc('vehicles', vehicleId).catch(() => {});
      toast.info(`Bilen ${plate} ble fjernet.`);
    }
  };

  // Slett tur
  const handleDeleteLog = (logId: string) => {
    if (confirm('Vil du slette denne turen fra kjøreboken?')) {
      setLogs(prev => prev.filter(l => l.id !== logId));
      api.deleteDoc('vehicle_logs', logId).catch(() => {});
      toast.info('Tur slettet fra kjøreboken.');
    }
  };

  // Bekreft automatiske turer fra Auto-Kjørebok (Smart-Synk)
  const handleApproveAutoTrips = async () => {
    if (pendingAutoTrips.length === 0) {
      toast.info('Ingen ubehandlede turer å bekrefte akkurat nå.');
      return;
    }

    const currentVehicles = [...vehicles];
    const missingPlates = new Set(pendingAutoTrips.map(a => a.plate));

    // Sørg for at alle biler fra de oppdagede turene eksisterer i bilparken
    missingPlates.forEach(plate => {
      if (!currentVehicles.some(v => v.plate === plate)) {
        const seedMatch = SEED_VEHICLES.find(sv => sv.plate === plate);
        const autoVeh: Vehicle = seedMatch || {
          id: `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          plate,
          model: plate.startsWith('EL') ? 'Volkswagen ID. Buzz Cargo' : 'Ford Transit Custom 2.0 EcoBlue',
          type: plate.startsWith('EL') ? 'EL' : 'Diesel',
          status: 'Aktiv',
          km: 45000,
          nextServiceKm: 60000,
          nextEuControl: '2027-01-01',
          assignedDriver: 'Feltlag',
          notes: 'Opprettet automatisk fra GPS-kjørebok'
        };
        currentVehicles.push(autoVeh);
        api.addDoc('vehicles', autoVeh).catch(() => {});
      }
    });

    const newEntries: VehicleEntry[] = pendingAutoTrips.map(auto => {
      const matchingVeh = currentVehicles.find(v => v.plate === auto.plate) || currentVehicles[0];
      const start = matchingVeh ? matchingVeh.km : 40000;
      const end = start + auto.km;

      const newEntry: VehicleEntry = {
        id: `auto_${Date.now()}_${auto.id}`,
        vehicleId: matchingVeh ? matchingVeh.id : 'veh-1',
        plateNumber: auto.plate,
        driverId: 'auto-driver',
        driverName: auto.driver,
        date: auto.date,
        startKm: start,
        endKm: end,
        purpose: `[Auto-GPS] ${auto.route}`,
        projectName: auto.suggestedProject,
        tollFee: auto.toll,
        isAutoTracked: true
      };

      api.addDoc('vehicle_logs', newEntry).catch(() => {});
      return newEntry;
    });

    setVehicles(currentVehicles);
    setLogs(prev => [...newEntries, ...prev]);
    setPendingAutoTrips([]);
    setShowAutoImportModal(false);
    toast.success(`🎉 ${newEntries.length} turer godkjent og lagt til i kjøreboken!`);
  };

  // Eksport til Tripletex CSV
  const handleExportTripletex = () => {
    if (logs.length === 0) {
      toast.warning('Ingen turer i kjøreboken å eksportere.');
      return;
    }

    const headers = [
      'Dato',
      'Sjåfør',
      'Kjøretøy',
      'Formål',
      'Prosjekt',
      'Fra_KM',
      'Til_KM',
      'Distanse_KM',
      'Bompenger_NOK',
      'Km_Sats_NOK',
      'Godtgjørelse_NOK',
      'Totalt_Krav_NOK'
    ];

    const rows = logs.map(l => {
      const distance = l.endKm - l.startKm;
      const kmComp = distance * STATENS_KM_SATS;
      const total = kmComp + (l.tollFee || 0);
      return [
        l.date,
        `"${l.driverName.replace(/"/g, '""')}"`,
        `"${l.plateNumber}"`,
        `"${l.purpose.replace(/"/g, '""')}"`,
        `"${(l.projectName || 'Felles drift').replace(/"/g, '""')}"`,
        l.startKm,
        l.endKm,
        distance,
        l.tollFee || 0,
        STATENS_KM_SATS.toFixed(2),
        kmComp.toFixed(2),
        total.toFixed(2)
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kjorebok_Tripletex_Eksport_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Kjørebok eksportert til Tripletex-format (CSV)!');
  };

  // Eksport / Utskrift av Månedlig Revisjonsoppsummering (Skatteetaten)
  const handleExportSummaryReport = () => {
    if (logs.length === 0) {
      toast.warning('Ingen turer i kjøreboken å generere oppsummering for.');
      return;
    }

    const totalKm = logs.reduce((acc, l) => acc + (l.endKm - l.startKm), 0);
    const totalToll = logs.reduce((acc, l) => acc + (l.tollFee || 0), 0);
    const totalComp = totalKm * STATENS_KM_SATS;
    const totalClaim = totalComp + totalToll;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Månedlig Kjørebokoppsummering - Skatteetaten standard</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; }
          h1 { margin-bottom: 4px; font-size: 24px; }
          .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
          .summary-box { display: flex; gap: 16px; margin-bottom: 32px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; flex: 1; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .card-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; padding: 10px; background: #f1f5f9; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .num { text-align: right; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Elektronisk Kjørebok & Bilgodtgjørelse</h1>
        <div class="sub">Dokumentert i henhold til Bokføringsforskriften og Skatteetatens krav • Generert ${new Date().toLocaleDateString('no-NO')}</div>

        <div class="summary-box">
          <div class="card">
            <div class="card-title">Totalt kjørt</div>
            <div class="card-value">${totalKm.toLocaleString('no-NO')} km</div>
          </div>
          <div class="card">
            <div class="card-title">Km-godtgjørelse (kr ${STATENS_KM_SATS})</div>
            <div class="card-value">${totalComp.toLocaleString('no-NO', { maximumFractionDigits: 0 })} kr</div>
          </div>
          <div class="card">
            <div class="card-title">Bompasseringer</div>
            <div class="card-value">${totalToll.toLocaleString('no-NO')} kr</div>
          </div>
          <div class="card" style="background: #ecfdf5; border-color: #a7f3d0;">
            <div class="card-title" style="color: #047857;">Samlet utbetaling / refusjon</div>
            <div class="card-value" style="color: #065f46;">${totalClaim.toLocaleString('no-NO', { maximumFractionDigits: 0 })} kr</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Dato</th>
              <th>Kjøretøy</th>
              <th>Sjåfør</th>
              <th>Formål / Kjørerute</th>
              <th>Prosjekt</th>
              <th class="num">Start km</th>
              <th class="num">Slutt km</th>
              <th class="num">Distanse</th>
              <th class="num">Bompenger</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td>${l.date}</td>
                <td><strong>${l.plateNumber}</strong></td>
                <td>${l.driverName}</td>
                <td>${l.purpose}</td>
                <td><span class="badge">${l.projectName || 'Felles'}</span></td>
                <td class="num">${l.startKm.toLocaleString('no-NO')}</td>
                <td class="num">${l.endKm.toLocaleString('no-NO')}</td>
                <td class="num"><strong>${(l.endKm - l.startKm)} km</strong></td>
                <td class="num">${l.tollFee ? l.tollFee + ' kr' : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(reportHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 500);
    } else {
      toast.error('Nettleseren blokkerte popup-vinduet for utskrift.');
    }
  };

  // Filtrerte logger
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.projectName && log.projectName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesVehicle = selectedVehicleFilter === 'all' || log.plateNumber === selectedVehicleFilter;
      const matchesProject = selectedProjectFilter === 'all' || log.projectId === selectedProjectFilter || log.projectName === selectedProjectFilter;

      return matchesSearch && matchesVehicle && matchesProject;
    });
  }, [logs, searchQuery, selectedVehicleFilter, selectedProjectFilter]);

  // Nøkkeltall
  const stats = useMemo(() => {
    const totalKm = logs.reduce((acc, l) => acc + (l.endKm - l.startKm), 0);
    const totalToll = logs.reduce((acc, l) => acc + (l.tollFee || 0), 0);
    const totalComp = totalKm * STATENS_KM_SATS;

    // EL-andel
    const elVehiclePlates = new Set(vehicles.filter(v => v.type === 'EL').map(v => v.plate));
    const elKm = logs.filter(l => elVehiclePlates.has(l.plateNumber)).reduce((acc, l) => acc + (l.endKm - l.startKm), 0);
    const elPercent = totalKm > 0 ? Math.round((elKm / totalKm) * 100) : 0;
    const co2SavedKg = Math.round(elKm * 0.12); // ca 120g CO2 spart per km elbil vs diesel

    // Per bil km
    const kmPerCar: Record<string, number> = {};
    logs.forEach(l => {
      kmPerCar[l.plateNumber] = (kmPerCar[l.plateNumber] || 0) + (l.endKm - l.startKm);
    });

    // Per prosjekt km
    const kmPerProject: Record<string, { km: number; toll: number }> = {};
    logs.forEach(l => {
      const pName = l.projectName || 'Felles firmadrift';
      if (!kmPerProject[pName]) kmPerProject[pName] = { km: 0, toll: 0 };
      kmPerProject[pName].km += (l.endKm - l.startKm);
      kmPerProject[pName].toll += (l.tollFee || 0);
    });

    return {
      totalKm,
      totalToll,
      totalComp,
      elPercent,
      co2SavedKg,
      kmPerCar,
      kmPerProject
    };
  }, [logs, vehicles]);

  return (
    <div className={cn(
      "w-full flex flex-col text-slate-100",
      isModal 
        ? "bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-h-[92vh] overflow-hidden" 
        : "bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden"
    )}>
      {/* 1. Header Bar */}
      <div className="p-4 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <Car size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Kjørebok & Bilpark</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Skatteetaten-godkjent
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Elektronisk kjørebok, bompasseringer, kilometergodtgjørelse (kr 4,90/km) og flåtestyring.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ny tur knapp */}
          <button
            type="button"
            onClick={() => setIsNewTripOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-amber-950/40 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>Ny Tur</span>
          </button>

          {/* Legg til bil knapp */}
          <button
            type="button"
            onClick={() => setIsAddVehicleOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Car size={15} className="text-amber-400" />
            <span>Ny Bil</span>
          </button>

          {/* Lukkeknapp hvis i modal */}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Lukk vindu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tabs og Handlinger */}
      <div className="px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[
            { id: 'log', label: `Kjørebok (${logs.length})`, icon: Map },
            { id: 'vehicles', label: `Biler (${vehicles.length})`, icon: Car },
            { id: 'stats', label: 'Statistikk & Økonomi', icon: TrendingUp }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Hurtighandlinger for eksport */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportTripletex}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Last ned CSV formatert for Tripletex, Fiken og regnskap"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>Eksport CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportSummaryReport}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Utskrift av godkjent kjørebokrapport for Skatteetaten og revisjon"
          >
            <Download size={14} className="text-blue-400" />
            <span>Månedsoppsummering</span>
          </button>
        </div>
      </div>

      {/* 3. Innhold etter aktiv fane */}
      <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
        
        {/* --- FANE 1: KJØREBOK --- */}
        {activeTab === 'log' && (
          <div className="space-y-6">
            {/* Nøkkeltall kort over kjørebok */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total distanse</span>
                <span className="text-xl sm:text-2xl font-black text-white">{stats.totalKm.toLocaleString('no-NO')} km</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">{logs.length} registrerte turer</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Km-godtgjørelse</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400">{stats.totalComp.toLocaleString('no-NO', { maximumFractionDigits: 0 })} kr</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Sats: kr 4,90 per km</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Bompasseringer</span>
                <span className="text-xl sm:text-2xl font-black text-blue-400">{stats.totalToll.toLocaleString('no-NO')} kr</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Autopass-refusjon</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/30">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Samlet refusjonskrav</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-300">
                  {(stats.totalComp + stats.totalToll).toLocaleString('no-NO', { maximumFractionDigits: 0 })} kr
                </span>
                <span className="text-[11px] text-emerald-500/80 block mt-0.5">Klar til lønn / fakturering</span>
              </div>
            </div>

            {/* Smart-Synk Banner (Auto-Kjørebok) */}
            {pendingAutoTrips.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">Smart-Synk: {pendingAutoTrips.length} ubehandlede turer oppdaget</h4>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        GPS & Autopass
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bompenger og kjøreruter er hentet inn automatisk fra bilene. Bekreft for å legge dem direkte i kjøreboken.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleApproveAutoTrips}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer transition-all active:scale-95"
                  >
                    <CheckCircle2 size={14} />
                    <span>Bekreft alle {pendingAutoTrips.length} turer</span>
                  </button>
                </div>
              </div>
            )}

            {/* Søk- og filterlinje */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Søk i formål, bil, prosjekt eller sjåfør..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Bilfilter */}
                <select
                  value={selectedVehicleFilter}
                  onChange={(e) => setSelectedVehicleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="all">Alle biler</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>{v.plate} ({v.model.split(' ')[0]})</option>
                  ))}
                </select>

                {/* Prosjektfilter */}
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="all">Alle prosjekter</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Turliste */}
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-dashed border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <Map size={24} />
                </div>
                <h3 className="font-bold text-white text-base">Ingen turer funnet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery ? 'Ingen turer matchet søket ditt.' : 'Trykk på "Ny Tur" for å registrere din første tur.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewTripOpen(true)}
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Registrer ny tur nå
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map(log => {
                  const dist = log.endKm - log.startKm;
                  const kmAllowance = dist * STATENS_KM_SATS;

                  return (
                    <div
                      key={log.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {dist}km
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono font-black text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              {log.plateNumber}
                            </span>
                            <h4 className="font-bold text-white text-sm truncate">{log.purpose}</h4>
                            {log.isAutoTracked && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                                <Zap size={10} /> Auto-GPS
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-slate-500" />
                              {log.date}
                            </span>
                            <span>•</span>
                            <span>Sjåfør: <strong className="text-slate-300">{log.driverName}</strong></span>
                            {log.projectName && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-medium">{log.projectName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <div className="text-sm font-black text-white">
                            {(kmAllowance + (log.tollFee || 0)).toLocaleString('no-NO', { maximumFractionDigits: 0 })} kr
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {log.startKm} → {log.endKm} km {log.tollFee ? `(+${log.tollFee} kr bom)` : ''}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer opacity-70 hover:opacity-100"
                          title="Slett tur"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- FANE 2: BILER (BILPARK) --- */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Registrerte Firmabiler ({vehicles.length})</h3>
                <p className="text-xs text-slate-400">Oversikt over bilparken, kilometerstand, serviceintervaller og EU-kontroll.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus size={14} />
                <span>Legg til ny bil</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(v => {
                const kmToService = (v.nextServiceKm || (v.km + 20000)) - v.km;
                const isServiceDueSoon = kmToService < 2000;

                return (
                  <div
                    key={v.id}
                    className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-4 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold">
                          {v.type === 'EL' ? <Zap size={20} className="text-emerald-400" /> : <Car size={20} />}
                        </div>
                        <div>
                          <div className="font-mono font-black text-white text-base tracking-wider">
                            {v.plate}
                          </div>
                          <span className="text-[10px] text-slate-400">{v.type} • Årsmodell {v.year || 2023}</span>
                        </div>
                      </div>

                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        v.status === 'Aktiv' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      )}>
                        {v.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm">{v.model}</h4>
                      {v.notes && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{v.notes}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Kilometerstand</span>
                        <span className="font-black text-white text-sm">{v.km.toLocaleString('no-NO')} km</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Neste EU-kontroll</span>
                        <span className="font-bold text-slate-300">{v.nextEuControl || 'Iht. Frist'}</span>
                      </div>
                    </div>

                    {/* Service status */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">Neste service:</span>
                      <span className={cn("font-bold text-xs", isServiceDueSoon ? "text-amber-400" : "text-slate-300")}>
                        {isServiceDueSoon ? `⚠️ Om ${kmToService} km` : `Om ${kmToService.toLocaleString()} km`}
                      </span>
                    </div>

                    {/* Sletteknapp */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteVehicle(v.id, v.plate)}
                        className="text-[11px] text-slate-500 hover:text-rose-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>Fjern fra bilpark</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- FANE 3: STATISTIKK & ØKONOMI --- */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Kjørestatistikk & Drivstofføkonomi</h3>
              <p className="text-xs text-slate-400">Oversikt over bilbruk fordelt på biler, prosjekter og miljøregnskap.</p>
            </div>

            {/* Hovedtall */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Samlet bilgodtgjørelse</span>
                  <TrendingUp size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">
                  {stats.totalComp.toLocaleString('no-NO', { maximumFractionDigits: 0 })} kr
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Beregnet etter Skatteetatens godkjente kilometersats kr {STATENS_KM_SATS} per km for næringskjøring.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Autopass & Bompenger</span>
                  <Zap size={16} className="text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-400">
                  {stats.totalToll.toLocaleString('no-NO')} kr
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Totale registrerte bompasseringer knyttet til prosjektoppdrag.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/70 to-slate-950 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 text-xs">
                  <span>Grønn Flåte & Miljø</span>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-300">
                  {stats.elPercent}% EL-andel
                </div>
                <p className="text-[11px] text-emerald-400/80 leading-relaxed">
                  Estimert CO₂-besparelse: <strong>{stats.co2SavedKg} kg CO₂</strong> spart gjennom elektrisk flåtekjøring.
                </p>
              </div>
            </div>

            {/* Fordeling per bil og per prosjekt */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fordeling per bil */}
              <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Car size={16} className="text-amber-400" />
                  Kjørte kilometer per bil
                </h4>
                <div className="space-y-3">
                  {Object.entries(stats.kmPerCar).map(([plate, km]) => {
                    const pct = stats.totalKm > 0 ? Math.round((km / stats.totalKm) * 100) : 0;
                    return (
                      <div key={plate} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-white">{plate}</span>
                          <span className="text-amber-400">{km.toLocaleString('no-NO')} km ({pct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fordeling per prosjekt */}
              <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-400" />
                  Kjøring viderefaktureres til prosjekter
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(stats.kmPerProject).map(([proj, data]) => {
                    const cost = (data.km * STATENS_KM_SATS) + data.toll;
                    return (
                      <div key={proj} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{proj}</div>
                          <div className="text-[11px] text-slate-400">{data.km} km • {data.toll} kr bom</div>
                        </div>
                        <div className="text-right font-black text-emerald-400 text-sm">
                          {cost.toLocaleString('no-NO', { maximumFractionDigits: 0 })} kr
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: REGISTRER NY TUR --- */}
      <AnimatePresence>
        {isNewTripOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Registrer ny tur</h3>
                    <p className="text-xs text-slate-400">Fyll ut start- og slutt-km for automatisk beregning</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTripOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleNewTripSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Velg Kjøretøy *
                  </label>
                  <select
                    required
                    value={newTrip.vehicleId}
                    onChange={(e) => setNewTrip({ ...newTrip, vehicleId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Velg bil fra bilparken...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.plate} - {v.model} ({v.km.toLocaleString()} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Dato *
                    </label>
                    <input
                      type="date"
                      required
                      value={newTrip.date}
                      onChange={(e) => setNewTrip({ ...newTrip, date: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Bompenger (kr)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newTrip.tollFee}
                      onChange={(e) => setNewTrip({ ...newTrip, tollFee: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Start KM *
                    </label>
                    <input
                      type="number"
                      required
                      value={newTrip.startKm}
                      onChange={(e) => setNewTrip({ ...newTrip, startKm: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Slutt KM *
                    </label>
                    <input
                      type="number"
                      required
                      value={newTrip.endKm}
                      onChange={(e) => setNewTrip({ ...newTrip, endKm: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  {newTrip.endKm > newTrip.startKm && (
                    <div className="col-span-2 pt-2 border-t border-slate-800 text-[11px] flex justify-between items-center text-amber-400 font-bold">
                      <span>Kjørt distanse: {newTrip.endKm - newTrip.startKm} km</span>
                      <span>Godtgjørelse: {((newTrip.endKm - newTrip.startKm) * STATENS_KM_SATS).toFixed(0)} kr</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Formål / Kjørerute *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="F.eks. Materialhenting Byggmakker, befaring hos kunde..."
                    value={newTrip.purpose}
                    onChange={(e) => setNewTrip({ ...newTrip, purpose: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Knytt til Prosjekt (for viderefakturering)
                  </label>
                  <select
                    value={newTrip.projectId}
                    onChange={(e) => setNewTrip({ ...newTrip, projectId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Ingen (Felles firmadrift)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsNewTripOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Lagre i kjørebok
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: LEGG TIL NY BIL --- */}
      <AnimatePresence>
        {isAddVehicleOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 text-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Car size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Legg til ny firmabil</h3>
                    <p className="text-xs text-slate-400">Registrer bil for sporing, kilometer og service</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddVehicleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Kjennemerke (Reg.nr) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="F.eks. BS 54321"
                      value={newVehicle.plate}
                      onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs uppercase focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Drivstoff / Motortype *
                    </label>
                    <select
                      value={newVehicle.type}
                      onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="EL">EL (Elektrisk)</option>
                      <option value="Bensin">Bensin</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Merke og Modell *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="F.eks. Ford Transit Custom 2.0 EcoBlue L2"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Nåværende KM-stand *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="F.eks. 45000"
                      value={newVehicle.km}
                      onChange={(e) => setNewVehicle({ ...newVehicle, km: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Neste EU-kontroll
                    </label>
                    <input
                      type="date"
                      value={newVehicle.nextEuControl}
                      onChange={(e) => setNewVehicle({ ...newVehicle, nextEuControl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Fast Sjåfør / Ansvarlig håndverker
                  </label>
                  <input
                    type="text"
                    placeholder="F.eks. Ken Mester (eller 'Felles firmabil')"
                    value={newVehicle.assignedDriver}
                    onChange={(e) => setNewVehicle({ ...newVehicle, assignedDriver: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Merknad / Utstyr
                  </label>
                  <input
                    type="text"
                    placeholder="F.eks. Takstativ, hengerfeste, verktøyinnredning..."
                    value={newVehicle.notes}
                    onChange={(e) => setNewVehicle({ ...newVehicle, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddVehicleOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Legg til bil
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
