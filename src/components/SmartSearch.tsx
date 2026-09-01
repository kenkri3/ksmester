import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Command, Brain, Building2, AlertTriangle, FileText, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { generateAiContent } from '../services/aiClient';
import { db, collection, getDocs, query, limit } from '../services/firebase';
import { cn } from '@/src/lib/utils';
import { useTranslation } from 'react-i18next';

interface SmartSearchResult {
  type: 'project' | 'deviation' | 'action' | 'info';
  title: string;
  description: string;
  id?: string;
  action?: () => void;
  metadata?: any;
}

export default function SmartSearch({ isOpen, onClose, onNavigate }: { isOpen: boolean; onClose: () => void; onNavigate: (type: string, id?: string) => void }) {
  const { t } = useTranslation();
  const [queryText, setQueryText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQueryText = useDebounce(queryText, 500);

  useEffect(() => {
    if (isOpen) {
      setQueryText('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const doSearch = async (val: string) => {
    if (val.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Fetch some context to help the AI
      const projectsSnap = await getDocs(query(collection(db, 'projects'), limit(20)));
      const projects = projectsSnap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          name: data.name, 
          location: data.location,
          gnr: data.gnr,
          bnr: data.bnr
        };
      });
      
      const prompt = `
        Du er en smart assistent for et fagsystem for håndverkere. 
        Brukeren søker etter: "${val}"
        
        Tilgjengelige prosjekter (inkludert GNR/BNR): ${JSON.stringify(projects)}
        
        Basert på søket, foreslå:
        1. Navigasjon til spesifikke prosjekter (søk på navn, adresse, eller GNR/BNR).
        2. Smarte handlinger (f.eks. "Opprett nytt avvik", "Start sjekkliste").
        3. Informasjon eller svar på spørsmål om systemet.
        
        Viktig: Hvis brukeren taster inn noe som ligner på GNR/BNR (f.eks. "123/45"), se om det matcher noen av prosjektene.
        {
          "results": [
            {
              "type": "project" | "deviation" | "action" | "info",
              "title": "Kort tittel",
              "description": "Kort beskrivelse",
              "id": "prosjekt_id_hvis_relevant",
              "actionType": "nav_project" | "create_deviation" | "start_checklist" | "none"
            }
          ]
        }
      `;

      const response = await generateAiContent({
        prompt: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            results: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  type: { type: "STRING", enum: ["project", "deviation", "action", "info"] },
                  title: { type: "STRING" },
                  description: { type: "STRING" },
                  id: { type: "STRING" },
                  actionType: { type: "STRING", enum: ["nav_project", "create_deviation", "start_checklist", "none"] }
                },
                required: ["type", "title", "description", "actionType"]
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{"results":[]}');
      setResults(data.results.map((r: any) => ({
        ...r,
        action: () => {
          if (r.actionType === 'nav_project') onNavigate('project', r.id);
          else if (r.actionType === 'create_deviation') onNavigate('create_deviation', r.id);
          else if (r.actionType === 'start_checklist') onNavigate('start_checklist', r.id);
          onClose();
        }
      })));
    } catch (error) {
      console.error('Smart search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Only trigger search when the debounced value changes.
    // We do not want to trigger it if queryText changes until debounce settles.
    doSearch(debouncedQueryText);
  }, [debouncedQueryText]);

  const handleSearch = (val: string) => {
    setQueryText(val);
  };

  // This is a direct handler for the quick suggestions, bypassing debounce
  const handleQuickSearch = (val: string) => {
    setQueryText(val);
    // Setting queryText will trigger debouncedQueryText after 500ms which triggers doSearch.
    // If we want immediate feedback, we can call it here, but it would run twice.
    // Given the debounce is short, we rely on the debounce effect.
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] sm:pt-[15vh] px-2 sm:px-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-neutral-900 w-full max-w-2xl rounded-2xl sm:rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
          >
            <div className="p-4 sm:p-6 border-b border-white/5 flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-emerald-900/20 to-blue-900/20 shrink-0">
              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                <Brain size={16} className="sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-neutral-500 sm:w-5 sm:h-5" size={16} />
                <input
                  ref={inputRef}
                  type="text"
                  value={queryText}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Søk i systemet..."
                  className="w-full bg-transparent border-none text-white placeholder-neutral-500 pl-6 sm:pl-8 focus:ring-0 text-sm sm:text-lg outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                  <Command size={10} /> K
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400">
                  <X size={16} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
              {isSearching ? (
                <div className="py-8 sm:py-12 flex flex-col items-center justify-center gap-3 sm:gap-4">
                  <Loader2 className="animate-spin text-emerald-500 sm:w-8 sm:h-8" size={24} />
                  <p className="text-[10px] sm:text-sm text-neutral-400 font-bold tracking-widest uppercase animate-pulse">Tenker...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {results.map((result, i) => (
                    <button
                      key={i}
                      onClick={result.action}
                      className="w-full flex items-center gap-3 sm:gap-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/10"
                    >
                      <div className={cn(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0",
                        result.type === 'project' ? "bg-blue-500/10 text-blue-400" :
                        result.type === 'deviation' ? "bg-orange-500/10 text-orange-400" :
                        result.type === 'action' ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-purple-500/10 text-purple-400"
                      )}>
                        {result.type === 'project' ? <Building2 size={16} className="sm:w-5 sm:h-5" /> :
                         result.type === 'deviation' ? <AlertTriangle size={16} className="sm:w-5 sm:h-5" /> :
                         result.type === 'action' ? <Sparkles size={16} className="sm:w-5 sm:h-5" /> :
                         <FileText size={16} className="sm:w-5 sm:h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold truncate text-xs sm:text-base">{result.title}</h4>
                        <p className="text-[10px] sm:text-sm text-neutral-400 truncate">{result.description}</p>
                      </div>
                      <ArrowRight size={14} className="text-neutral-600 group-hover:text-emerald-500 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              ) : queryText.length > 1 ? (
                <div className="py-8 sm:py-12 text-center">
                  <p className="text-[10px] sm:text-sm text-neutral-500">Ingen resultater for "{queryText}"</p>
                </div>
              ) : (
                <div className="py-4 sm:py-8 px-2 sm:px-4">
                  <h4 className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 sm:mb-4">Forslag</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Vis alle prosjekter",
                      "Opprett nytt avvik",
                      "Sjekkliste for tømrer",
                      "Hva er status på Bjørklund?"
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickSearch(suggestion)}
                        className="p-2.5 sm:p-3 text-left text-[10px] sm:text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg sm:rounded-xl transition-all border border-white/5"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-white/5 bg-black/20 flex items-center justify-between text-[7px] sm:text-[10px] text-neutral-500 font-bold uppercase tracking-widest shrink-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="flex items-center gap-1"><ArrowRight size={8} className="sm:w-2.5 sm:h-2.5" /> Velg</span>
                <span className="hidden sm:flex items-center gap-1"><Command size={10} /> K Søk</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain size={10} className="text-emerald-500 sm:w-3 sm:h-3" />
                Powered by MesterAI
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
