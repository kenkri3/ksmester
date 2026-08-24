import React, { useState } from 'react';
import { Sparkles, Languages, Wand2, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { masterAiService } from '../services/masterAiService';
import { cn } from '../lib/utils';

interface AiTextAssistantProps {
  onApply: (text: string) => void;
  currentText: string;
  placeholder?: string;
  className?: string;
}

const AiTextAssistant: React.FC<AiTextAssistantProps> = ({ 
  onApply, 
  currentText, 
  placeholder = "Hva vil du at AI skal gjøre med teksten?",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('norsk');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleProcess = async (type: 'improve' | 'translate' | 'generate') => {
    setIsProcessing(true);
    try {
      let finalInstruction = instruction;
      if (type === 'improve') finalInstruction = "Forbedre og profesjonaliser denne teksten for byggebransjen.";
      if (type === 'translate') finalInstruction = `Oversett denne teksten til ${targetLanguage}.`;
      if (type === 'generate') finalInstruction = instruction || "Generer en profesjonell tekst basert på stikkordene.";

      const response = await masterAiService.processText(currentText, finalInstruction, targetLanguage);
      setResult(response.text);
    } catch (error) {
      console.error("AI Assistant error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const languages = [
    { code: 'norsk', name: 'Norsk' },
    { code: 'engelsk', name: 'Engelsk' },
    { code: 'polsk', name: 'Polsk' },
    { code: 'litauisk', name: 'Litauisk' },
    { code: 'tysk', name: 'Tysk' },
    { code: 'spansk', name: 'Spansk' }
  ];

  return (
    <div className={cn("relative", className)}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100"
      >
        <Sparkles size={14} />
        AI Assistent
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 z-[100]"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                AI Mesterhjerne
              </h4>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-neutral-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            {!result ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Instruksjon (Valgfritt)</label>
                  <textarea 
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleProcess('improve')}
                    disabled={isProcessing || !currentText}
                    className="flex items-center justify-center gap-2 p-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <Wand2 size={12} />
                    Profesjonaliser
                  </button>
                  <button 
                    onClick={() => handleProcess('generate')}
                    disabled={isProcessing || !instruction}
                    className="flex items-center justify-center gap-2 p-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    Generer
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Oversett til</label>
                    <Languages size={12} className="text-neutral-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {languages.map(lang => (
                      <button 
                        key={lang.code}
                        onClick={() => {
                          setTargetLanguage(lang.code);
                          handleProcess('translate');
                        }}
                        disabled={isProcessing || !currentText}
                        className={cn(
                          "p-1.5 rounded-lg text-[10px] font-bold transition-all",
                          targetLanguage === lang.code 
                            ? "bg-indigo-600 text-white" 
                            : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                        )}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-900 leading-relaxed italic">
                    "{result}"
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      onApply(result);
                      setResult(null);
                      setIsOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 p-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500"
                  >
                    <Check size={14} />
                    Bruk tekst
                  </button>
                  <button 
                    onClick={() => setResult(null)}
                    className="p-2 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10">
                <Loader2 className="animate-spin text-indigo-600 mb-2" size={24} />
                <p className="text-[10px] font-bold text-neutral-500">MesterAI tenker...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiTextAssistant;
