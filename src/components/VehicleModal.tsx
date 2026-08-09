import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Car, Search, Plus, MapPin, Clock, Fuel, AlertTriangle, History, ChevronRight, Download, Map, Zap, Calendar, Send } from 'lucide-react';
import { Vehicle, VehicleEntry, Project } from '../types';
import { db, auth, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, OperationType, handleFirestoreError } from '../services/firebase';
import { cn } from '@/src/lib/utils';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

const VehicleModal: React.FC<VehicleModalProps> = ({ isOpen, onClose, projects }) => {
  const [activeTab, setActiveTab] = useState<'log' | 'vehicles' | 'stats'>('log');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<VehicleEntry[]>([]);
  const [newTrip, setNewTrip] = useState({
    vehicleId: '',
    startKm: 0,
    endKm: 0,
    purpose: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!isOpen) return;

    const vehiclesUnsub = onSnapshot(collection(db, 'vehicles'), (snapshot) => {
      const vehicleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vehicleData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vehicles');
    });

    const logsUnsub = onSnapshot(
      query(collection(db, 'vehicle_logs'), orderBy('date', 'desc')), 
      (snapshot) => {
        const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleEntry));
        setLogs(logData);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'vehicle_logs');
      }
    );

    return () => {
      vehiclesUnsub();
      logsUnsub();
    };
  }, [isOpen]);

  const handleNewTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const selectedVehicle = vehicles.find(v => v.id === newTrip.vehicleId);
      if (!selectedVehicle) return;

      await addDoc(collection(db, 'vehicle_logs'), {
        ...newTrip,
        plateNumber: selectedVehicle.plate,
        driverId: auth.currentUser.uid,
        driverName: auth.currentUser.displayName || 'Ukjent fører',
        timestamp: serverTimestamp()
      });

      setIsNewTripOpen(false);
      setNewTrip({
        vehicleId: '',
        startKm: 0,
        endKm: 0,
        purpose: '',
        projectId: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vehicle_logs');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-lg shadow-neutral-100">
              <Car size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Kjørebok & Bilpark</h2>
              <p className="text-neutral-500 text-sm font-medium">Administrer biler, turer og bompenger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-6 bg-white border-b border-neutral-100 flex items-center justify-between">
          <div className="flex bg-neutral-100 p-1 rounded-2xl">
            {[
              { id: 'log', label: 'Kjørebok' },
              { id: 'vehicles', label: 'Biler' },
              { id: 'stats', label: 'Statistikk' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsNewTripOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-100"
          >
            <Plus size={16} /> Ny Tur
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {activeTab === 'log' && (
                  <div className="space-y-4">
                    {logs.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-neutral-200">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-300 mx-auto mb-4">
                          <History size={24} />
                        </div>
                        <h3 className="font-bold text-neutral-900">Ingen turer registrert</h3>
                        <p className="text-neutral-500 text-xs mt-1">Start din første tur ved å trykke på "Ny Tur"</p>
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-neutral-300 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                <Map size={20} />
                              </div>
                              <div>
                                <h3 className="font-bold text-neutral-900">{log.purpose}</h3>
                                <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                                  <span className="flex items-center gap-1 font-medium">{log.plateNumber}</span>
                                  <span className="flex items-center gap-1"><Calendar size={12} /> {log.date}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-black text-neutral-900">{log.endKm - log.startKm} <span className="text-xs font-bold text-neutral-400">km</span></div>
                              <div className="text-[10px] text-neutral-400 font-bold">{log.startKm} → {log.endKm}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                            <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                              <Zap size={12} className="text-emerald-500" /> Bompenger: 45,- (Auto-synk)
                            </div>
                            <button className="p-2 text-neutral-300 hover:text-neutral-900 transition-colors">
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'vehicles' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicles.length === 0 ? (
                      <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-neutral-200">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-300 mx-auto mb-4">
                          <Car size={24} />
                        </div>
                        <h3 className="font-bold text-neutral-900">Ingen biler registrert</h3>
                        <p className="text-neutral-500 text-xs mt-1">Kontakt administrator for å legge til biler</p>
                      </div>
                    ) : (
                      vehicles.map((v) => (
                        <div key={v.id} className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-neutral-300 transition-all">
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center">
                              <Car size={24} />
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              v.status === 'Aktiv' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-400'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold mb-1">{v.model}</h3>
                          <div className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">{v.plate}</div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-50">
                            <div>
                              <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Kilometer</div>
                              <div className="text-sm font-bold">{v.km.toLocaleString()} km</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Drivstoff</div>
                              <div className="text-sm font-bold">{v.type}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Auto-Tracking Alert */}
                <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center">
                        <Zap size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Smart-Synk</span>
                    </div>
                    <h3 className="font-bold mb-2">Auto-Kjørebok Aktiv</h3>
                    <p className="text-xs text-emerald-100 leading-relaxed mb-6">
                      Vi henter automatisk bompasseringer og GPS-data fra bilene dine. Du trenger bare å bekrefte formålet.
                    </p>
                    <button className="w-full bg-white text-emerald-900 py-3 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors">
                      Bekreft 3 turer
                    </button>
                  </div>
                </div>

                {/* Maintenance Alerts */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <AlertTriangle size={20} />
                    </div>
                    <h3 className="font-bold">Vedlikehold</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <div className="text-xs font-bold text-amber-700 mb-1">Service påkrevd</div>
                      <div className="text-sm font-bold">Ford Transit (BS 54321)</div>
                      <p className="text-[10px] text-amber-600 mt-1">Neste service om 1 200 km eller 14 dager.</p>
                    </div>
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="text-xs font-bold text-neutral-400 mb-1">EU-Kontroll</div>
                      <div className="text-sm font-bold">VW ID. Buzz (EL 12345)</div>
                      <p className="text-[10px] text-neutral-400 mt-1">Godkjent til 15.06.2025.</p>
                    </div>
                  </div>
                </div>

                {/* Quick Exports */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-200 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">Rapporter</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-all group">
                      <div className="flex items-center gap-3">
                        <Download size={18} className="text-neutral-400 group-hover:text-neutral-900" />
                        <span className="text-xs font-bold">Eksport til Tripletex</span>
                      </div>
                      <ChevronRight size={14} className="text-neutral-300" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-all group">
                      <div className="flex items-center gap-3">
                        <History size={18} className="text-neutral-400 group-hover:text-neutral-900" />
                        <span className="text-xs font-bold">Månedlig oppsummering</span>
                      </div>
                      <ChevronRight size={14} className="text-neutral-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Trip Modal */}
        <AnimatePresence>
          {isNewTripOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Registrer ny tur</h3>
                  <button onClick={() => setIsNewTripOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleNewTrip} className="p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Velg Bil</label>
                    <select
                      required
                      value={newTrip.vehicleId}
                      onChange={(e) => setNewTrip({ ...newTrip, vehicleId: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-neutral-900 transition-all"
                    >
                      <option value="">Velg en bil...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Start KM</label>
                      <input
                        type="number"
                        required
                        value={newTrip.startKm}
                        onChange={(e) => setNewTrip({ ...newTrip, startKm: parseInt(e.target.value) })}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-neutral-900 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Slutt KM</label>
                      <input
                        type="number"
                        required
                        value={newTrip.endKm}
                        onChange={(e) => setNewTrip({ ...newTrip, endKm: parseInt(e.target.value) })}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-neutral-900 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Formål</label>
                    <input
                      type="text"
                      required
                      placeholder="F.eks. Befaring, Materialhenting..."
                      value={newTrip.purpose}
                      onChange={(e) => setNewTrip({ ...newTrip, purpose: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-neutral-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Prosjekt (Valgfritt)</label>
                    <select
                      value={newTrip.projectId}
                      onChange={(e) => setNewTrip({ ...newTrip, projectId: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-neutral-900 transition-all"
                    >
                      <option value="">Ingen prosjekt</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-100 mt-4"
                  >
                    <Send size={18} /> Lagre tur
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default VehicleModal;
