import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calculator, Sparkles, Send, FileText, CheckCircle2, Languages } from 'lucide-react';
import { Offer, OfferItem } from '../types';
import { GoogleGenAI } from "@google/genai";
import { offerAiService } from '../services/offerAiService';
import { masterAiService } from '../services/masterAiService';
import AiTextAssistant from './AiTextAssistant';
import { db, auth, handleFirestoreError, OperationType, collection, addDoc, serverTimestamp } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    projectId?: string;
    projectCode?: string;
    title?: string;
    description?: string;
    clientName?: string;
    clientEmail?: string;
  };
}

const OfferModal: React.FC<OfferModalProps> = ({ isOpen, onClose, initialData }) => {
  const { user, trade } = useAuth();
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<OfferItem[]>([
    { description: '', quantity: 1, unit: 'timer', pricePerUnit: 0, total: 0 }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setClientName(initialData.clientName || '');
      setClientEmail(initialData.clientEmail || '');
      setProjectCode(initialData.projectCode || '');
      setProjectId(initialData.projectId || '');
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      
      // If we have a description but no items yet, we could trigger auto-generation
      // but maybe better to let user click the button.
    }
  }, [isOpen, initialData]);

  const handleTranslateOffer = async (lang: string) => {
    setIsTranslating(true);
    try {
      const offerData = { title, description, items };
      const translated = await masterAiService.translateDocument(offerData, lang);
      setTitle(translated.title);
      setDescription(translated.description);
      setItems(translated.items);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'timer', pricePerUnit: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OfferItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'pricePerUnit') {
      item.total = item.quantity * item.pricePerUnit;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  const generateOfferItems = async () => {
    if (!description) return;
    
    if (items.length > 0 && items[0].description !== '') {
      if (!window.confirm('Dette vil erstatte dine nåværende tilbudsposter. Vil du fortsette?')) {
        return;
      }
    }
    
    setIsGenerating(true);
    try {
      const generatedItems = await offerAiService.generateOfferItems(description, title, trade || undefined);
      
      if (Array.isArray(generatedItems)) {
        const formattedItems = generatedItems.map(item => ({
          ...item,
          total: item.quantity * item.pricePerUnit
        }));
        setItems(formattedItems);
      }
    } catch (error) {
      console.error('AI Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    if (!auth.currentUser) return;
    
    setIsSaving(true);
    try {
      const userCompany = (user as any)?.company || '';
      const offerData = {
        clientName,
        clientEmail,
        projectCode,
        projectId: projectId || null,
        title,
        description,
        items,
        totalAmount,
        status,
        createdBy: auth.currentUser.uid,
        company: userCompany,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'offers'), offerData);
      
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setStep(1);
        // Reset form
        setClientName('');
        setClientEmail('');
        setProjectCode('');
        setProjectId('');
        setTitle('');
        setDescription('');
        setItems([{ description: '', quantity: 1, unit: 'timer', pricePerUnit: 0, total: 0 }]);
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'offers');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-neutral-50 w-full max-w-4xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
      >
        {/* Header */}
        <div className="p-4 sm:p-8 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Calculator size={18} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-2xl font-bold tracking-tight truncate">Opprett Nytt Tilbud</h2>
              <p className="text-neutral-500 text-[7px] sm:text-sm font-medium truncate">Generer profesjonelle tilbud med AI-støtte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X size={18} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8 sm:py-12 text-center"
              >
                <div className="w-12 h-12 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <CheckCircle2 size={24} className="sm:w-12 sm:h-12" />
                </div>
                <h3 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Tilbud Opprettet!</h3>
                <p className="text-[10px] sm:text-sm text-neutral-500">Tilbudet er lagret og klart til å sendes til kunden.</p>
              </motion.div>
            ) : step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[7px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Kundenavn</label>
                    <input 
                      type="text" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="F.eks. Ola Nordmann"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[7px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">E-post (Valgfritt)</label>
                    <input 
                      type="email" 
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="ola@eksempel.no"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base"
                    />
                  </div>
                </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[7px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Prosjektkode (Valgfritt)</label>
                    <input 
                      type="text" 
                      value={projectCode}
                      onChange={(e) => setProjectCode(e.target.value)}
                      placeholder="f.eks. P2024-001"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[7px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Tittel på tilbud</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="F.eks. Renovering av bad"
                      className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xs sm:text-base"
                    />
                  </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <label className="text-[7px] sm:text-xs font-black uppercase tracking-widest text-neutral-400 ml-1">Prosjektbeskrivelse (for AI-kalkulering)</label>
                    <div className="flex items-center gap-2">
                      <AiTextAssistant 
                        currentText={description} 
                        onApply={(text) => setDescription(text)}
                        placeholder="Hva skal gjøres? AI kan utfylle detaljer..."
                      />
                      <button 
                        onClick={generateOfferItems}
                        disabled={!description || isGenerating}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-emerald-50 text-emerald-700 rounded-lg sm:rounded-xl text-[8px] sm:text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
                      >
                        {isGenerating ? <Sparkles className="animate-spin sm:w-3.5 sm:h-3.5" size={10} /> : <Sparkles size={10} className="sm:w-3.5 sm:h-3.5" />}
                        {isGenerating ? 'Genererer...' : 'Generer poster med AI'}
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Beskriv hva som skal gjøres så detaljert som mulig..."
                    rows={3}
                    className="w-full p-2.5 sm:p-4 bg-white border border-neutral-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold resize-none text-xs sm:text-base"
                  />
                </div>

                <div className="flex justify-end sticky bottom-0 bg-neutral-50 pt-2 pb-2 sm:pb-0">
                  <button 
                    onClick={() => setStep(2)}
                    disabled={!clientName || !title}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 text-xs sm:text-base"
                  >
                    Neste: Spesifiser Poster
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    <h3 className="text-[8px] sm:text-sm font-black uppercase tracking-widest text-neutral-400">Tilbudsposter</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-indigo-50 p-1 rounded-lg sm:rounded-xl">
                        <span className="text-[7px] sm:text-[10px] font-bold text-indigo-600 px-1 sm:px-2">Oversett:</span>
                        {['Engelsk', 'Polsk', 'Litauisk'].map(lang => (
                          <button 
                            key={lang}
                            onClick={() => handleTranslateOffer(lang)}
                            disabled={isTranslating}
                            className="px-1 sm:px-2 py-0.5 sm:py-1 bg-white text-[7px] sm:text-[10px] font-bold text-indigo-600 rounded-md sm:rounded-lg hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={addItem}
                        className="flex items-center gap-1 sm:gap-2 text-[8px] sm:text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all"
                      >
                        <Plus size={10} className="sm:w-3.5 sm:h-3.5" />
                        Legg til post
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 sm:gap-3 items-end bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-neutral-200">
                        <div className="col-span-12 md:col-span-5 space-y-1">
                          <label className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Beskrivelse</label>
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full p-1.5 sm:p-2 bg-neutral-50 border border-neutral-100 rounded-lg outline-none text-[10px] sm:text-sm font-bold"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Antall</label>
                          <input 
                            type="number" 
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full p-1.5 sm:p-2 bg-neutral-50 border border-neutral-100 rounded-lg outline-none text-[10px] sm:text-sm font-bold"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Enhet</label>
                          <input 
                            type="text" 
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full p-1.5 sm:p-2 bg-neutral-50 border border-neutral-100 rounded-lg outline-none text-[10px] sm:text-sm font-bold"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2 space-y-1">
                          <label className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Pris/Enh</label>
                          <input 
                            type="number" 
                            value={item.pricePerUnit}
                            onChange={(e) => updateItem(index, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                            className="w-full p-1.5 sm:p-2 bg-neutral-50 border border-neutral-100 rounded-lg outline-none text-[10px] sm:text-sm font-bold"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-1 flex justify-end pb-1 sm:pb-2">
                          <button 
                            onClick={() => removeItem(index)}
                            className="p-1.5 sm:p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} className="sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-900 rounded-xl sm:rounded-3xl p-4 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 shadow-xl shadow-emerald-100 mt-2 sm:mt-4 sticky bottom-0">
                  <div className="text-center md:text-left">
                    <div className="text-emerald-400 text-[7px] sm:text-xs font-black uppercase tracking-widest mb-0.5 sm:mb-1">Total eks. mva</div>
                    <div className="text-lg sm:text-4xl font-black">{totalAmount.toLocaleString()} kr</div>
                  </div>
                  <div className="flex flex-wrap md:flex-nowrap gap-2 sm:gap-4 w-full md:w-auto">
                    <button 
                      onClick={() => setStep(1)}
                      className="flex-1 md:flex-none px-3 sm:px-6 py-2 sm:py-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-2xl font-bold transition-all text-[9px] sm:text-sm"
                    >
                      Tilbake
                    </button>
                    <button 
                      onClick={() => handleSave('draft')}
                      disabled={isSaving}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-4 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-2xl font-bold transition-all disabled:opacity-50 text-[9px] sm:text-sm"
                    >
                      {isSaving ? (
                        <div className="w-3 h-3 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FileText size={12} className="sm:w-[18px] sm:h-[18px]" />
                      )}
                      {isSaving ? 'Lagrer...' : 'Lagre Utkast'}
                    </button>
                    <button 
                      onClick={() => handleSave('sent')}
                      disabled={isSaving}
                      className="w-full md:w-auto flex items-center justify-center gap-1 sm:gap-2 px-5 sm:px-8 py-2.5 sm:py-4 bg-emerald-500 hover:bg-emerald-400 rounded-lg sm:rounded-2xl font-bold transition-all shadow-lg shadow-black/20 disabled:opacity-50 text-[9px] sm:text-sm"
                    >
                      {isSaving ? (
                        <div className="w-3 h-3 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={12} className="sm:w-[18px] sm:h-[18px]" />
                      )}
                      {isSaving ? 'Sender...' : 'Send til Kunde'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default OfferModal;
