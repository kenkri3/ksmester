import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, Search, Plus, Filter, AlertTriangle, FileText, Wrench, ShieldAlert, ChevronRight, Download, History, User, Send, Sparkles, RefreshCw, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import { InventoryItem } from '../types';
import { db, auth, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, OperationType, handleFirestoreError } from '../services/firebase';
import { inventoryAiService, InventoryInsight } from '../services/inventoryAiService';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'materials' | 'tools' | 'chemicals' | 'maintenance'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [aiInsights, setAiInsights] = useState<InventoryInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'material' as 'material' | 'tool' | 'chemical',
    quantity: 0,
    unit: 'stk',
    location: '',
    minQuantity: 0
  });

  useEffect(() => {
    if (!isOpen) return;

    const unsub = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          lastChecked: data.lastChecked?.toDate?.()?.toLocaleDateString() || String(data.lastChecked || '')
        } as InventoryItem;
      });
      setInventory(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });

    return () => unsub();
  }, [isOpen]);

  const analyzeInventory = async () => {
    if (inventory.length === 0) return;
    setIsAnalyzing(true);
    try {
      const insights = await inventoryAiService.analyzeInventory(inventory);
      setAiInsights(insights);
    } catch (error) {
      console.error("Error analyzing inventory:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (inventory.length > 0 && aiInsights.length === 0) {
      analyzeInventory();
    }
  }, [inventory.length]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        timestamp: serverTimestamp()
      });
      setIsNewItemOpen(false);
      setNewItem({
        name: '',
        category: 'material',
        quantity: 0,
        unit: 'stk',
        location: '',
        minQuantity: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  // ⚡ Bolt: Memoize filteredInventory to prevent expensive O(N) recalculations on every render
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === 'maintenance') {
        return matchesSearch && item.category === 'tool' && (item.needsMaintenance || (item.quantity < 1));
      }
      const matchesTab = activeTab === 'all' || item.category === activeTab.slice(0, -1);
      return matchesSearch && matchesTab;
    });
  }, [inventory, searchQuery, activeTab]);

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
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Lager & Verktøy</h2>
              <p className="text-neutral-500 text-sm font-medium">Oversikt over materialer, verktøy og kjemikalier</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="p-6 bg-white border-b border-neutral-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-neutral-100 p-1 rounded-2xl w-full md:w-auto">
            {[
              { id: 'all', label: 'Alle' },
              { id: 'materials', label: 'Materialer' },
              { id: 'tools', label: 'Verktøy' },
              { id: 'chemicals', label: 'Kjemikalier' },
              { id: 'maintenance', label: 'Vedlikehold' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input 
                type="text" 
                placeholder="Søk i lager..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button 
              onClick={() => setIsNewItemOpen(true)}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-100"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-neutral-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main List */}
              <div className="lg:col-span-2 space-y-4">
                {filteredInventory.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-200">
                    <Package size={48} className="mx-auto mb-4 text-neutral-200" />
                    <p className="text-neutral-400 font-medium">Ingen treff i lageret</p>
                  </div>
                ) : (
                  filteredInventory.map((item) => (
                    <div key={item.id} className="bg-white p-6 rounded-3xl border border-neutral-200 hover:border-blue-200 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            item.category === 'material' ? 'bg-blue-50 text-blue-600' : 
                            item.category === 'tool' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {item.category === 'material' ? <Package size={24} /> : 
                             item.category === 'tool' ? <Wrench size={24} /> : <ShieldAlert size={24} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-neutral-900">{item.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                              <span className="flex items-center gap-1 font-medium">{item.location}</span>
                              {item.category === 'tool' && item.lastChecked && <span className="flex items-center gap-1"><History size={12} /> Sist sett: {item.lastChecked}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-neutral-900">{item.quantity} <span className="text-xs font-bold text-neutral-400">{item.unit}</span></div>
                          {item.minQuantity && item.quantity < item.minQuantity && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">
                              <AlertTriangle size={10} /> Lav beholdning
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                        <div className="flex gap-2">
                          {item.category === 'chemical' && (
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">
                              <FileText size={12} /> Sikkerhetsblad
                            </button>
                          )}
                          {item.category === 'tool' && (
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">
                              <User size={12} /> Lån ut
                            </button>
                          )}
                        </div>
                        <button className="p-2 text-neutral-300 hover:text-blue-600 transition-colors">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sidebar: Alerts & Stats */}
              <div className="space-y-6">
                {/* Critical Alerts */}
                <div className="bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                      <AlertTriangle size={20} />
                    </div>
                    <h3 className="font-bold text-rose-900">Varsler</h3>
                  </div>
                  <div className="space-y-4">
                    {inventory.filter(item => item.minQuantity && item.quantity < item.minQuantity).length === 0 ? (
                      <p className="text-xs text-neutral-400 font-medium text-center py-4">Ingen kritiske varsler</p>
                    ) : (
                      inventory.filter(item => item.minQuantity && item.quantity < item.minQuantity).map(item => (
                        <div key={item.id} className="p-4 bg-white rounded-2xl border border-rose-100 shadow-sm">
                          <div className="text-xs font-bold text-rose-600 mb-1">Lav beholdning</div>
                          <div className="text-sm font-bold">{item.name}</div>
                          <p className="text-[10px] text-neutral-400 mt-1">Beholdning: {item.quantity} {item.unit} (Min: {item.minQuantity})</p>
                          <button className="w-full mt-3 py-2 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all">
                            Bestill nå
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-200 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6">Hurtigvalg</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all group">
                      <div className="flex items-center gap-3">
                        <Download size={18} className="text-neutral-400 group-hover:text-blue-600" />
                        <span className="text-xs font-bold">Eksporter lagerliste</span>
                      </div>
                      <ChevronRight size={14} className="text-neutral-300" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all group">
                      <div className="flex items-center gap-3">
                        <ShieldAlert size={18} className="text-neutral-400 group-hover:text-blue-600" />
                        <span className="text-xs font-bold">Kjemikalie-rapport</span>
                      </div>
                      <ChevronRight size={14} className="text-neutral-300" />
                    </button>
                  </div>
                </div>

                {/* AI Insight */}
                <div className="bg-blue-900 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={80} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center shadow-lg shadow-blue-500/20">
                          <Brain size={20} className="text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">AI Lager-innsikt</h3>
                          <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest">Drevet av MesterAI</p>
                        </div>
                      </div>
                      <button 
                        onClick={analyzeInventory}
                        disabled={isAnalyzing}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                      >
                        <RefreshCw size={18} className={isAnalyzing ? "animate-spin" : ""} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {isAnalyzing ? (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-4 w-full bg-white/10 rounded" />
                          <div className="h-4 w-3/4 bg-white/10 rounded" />
                        </div>
                      ) : aiInsights.length > 0 ? (
                        aiInsights.map((insight, i) => (
                          <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-blue-300">{insight.title}</span>
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                insight.severity === 'high' ? "bg-rose-500/20 text-rose-300" :
                                insight.severity === 'medium' ? "bg-amber-500/20 text-amber-300" :
                                "bg-emerald-500/20 text-emerald-300"
                              )}>
                                {insight.severity}
                              </span>
                            </div>
                            <p className="text-xs text-blue-100/80 leading-relaxed">{insight.description}</p>
                            {insight.action && (
                              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                                <Plus size={12} />
                                {insight.action}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-blue-100/60 italic">Ingen spesielle innsikter akkurat nå.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* New Item Modal */}
        <AnimatePresence>
          {isNewItemOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Legg til i lager</h3>
                  <button onClick={() => setIsNewItemOpen(false)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddItem} className="p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Navn</label>
                    <input
                      type="text"
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Kategori</label>
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="material">Materiale</option>
                        <option value="tool">Verktøy</option>
                        <option value="chemical">Kjemikalie</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Enhet</label>
                      <input
                        type="text"
                        required
                        placeholder="stk, L, pk..."
                        value={newItem.unit}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Antall</label>
                      <input
                        type="number"
                        required
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Min. Antall</label>
                      <input
                        type="number"
                        value={newItem.minQuantity}
                        onChange={(e) => setNewItem({ ...newItem, minQuantity: parseInt(e.target.value) })}
                        className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Lokasjon</label>
                    <input
                      type="text"
                      required
                      placeholder="Lager A, Bil 1..."
                      value={newItem.location}
                      onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                      className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-100 mt-4"
                  >
                    <Send size={18} /> Legg til
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

// Helper for Tool icon (not in lucide-react by default or renamed)
const Tool = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m21 8-2 2-1.5-1.5 2-2a2.828 2.828 0 1 0-4-4l-2 2 1.5 1.5-2 2M7 17l-3 3M17 7l-3 3M11 13l-4 4M14 10l-4 4M5 21l-2-2 4-4 2 2-4 4Z"/>
  </svg>
);

export default InventoryModal;
