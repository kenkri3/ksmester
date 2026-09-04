import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Languages, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { translationService, TranslationResult } from '../services/translationService';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, addDoc, handleFirestoreError, OperationType, collection, query, orderBy, limit, onSnapshot, serverTimestamp, where } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';

export default function UniversalTranslator({ className, projectId }: { className?: string, projectId?: string }) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<(TranslationResult & { original: string, id?: string })[]>([]);

  const { user } = useAuth();

  const renderContent = (content: any) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'number') return String(content);
    if (content?.toDate) return content.toDate().toLocaleString();
    if (content?.seconds) return new Date(content.seconds * 1000).toLocaleString();
    return JSON.stringify(content);
  };

  // Fetch history from Firestore
  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'translations'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    if (projectId) {
      q = query(
        collection(db, 'translations'),
        where('userId', '==', user.uid),
        where('projectId', '==', projectId),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setHistory(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'translations');
    });

    return () => unsubscribe();
  }, [user, projectId]);

  const handleSend = async () => {
    if (!input.trim() || !auth.currentUser) return;
    
    setIsTranslating(true);
    try {
      const result = await translationService.translateAndNormalize(input, i18n.language);
      
      // Save to Firestore
      await addDoc(collection(db, 'translations'), {
        original: input,
        translatedText: result.translatedText,
        norwegianVersion: result.norwegianVersion,
        detectedLanguage: result.detectedLanguage,
        userId: auth.currentUser.uid,
        projectId: projectId || null,
        timestamp: serverTimestamp(),
      });

      setInput('');
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={cn("bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <Languages size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">{t('realtime_translation')}</h3>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-black">Powered by DeepSeek-V3</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">
          <FileText size={12} />
          {t('norwegian_finalizer')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence initial={false}>
          {history.map((item, i) => (
            <motion.div 
              key={item.id || i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-3"
            >
              {/* Original & Translated (User View) */}
              <div className="flex flex-col gap-2 max-w-[80%]">
                <div className="p-4 bg-neutral-100 rounded-2xl rounded-tl-none text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-black text-neutral-400 uppercase">{renderContent(item.detectedLanguage)}</p>
                    <p className="text-[8px] text-neutral-400">{renderContent((item as any).timestamp)}</p>
                  </div>
                  {renderContent(item.original)}
                </div>
                {i18n.language !== 'no' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl rounded-tl-none text-sm text-emerald-900">
                    <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">{t('translate_to')} {i18n.language.toUpperCase()}</p>
                    {renderContent(item.translatedText)}
                  </div>
                )}
              </div>

              {/* Official Norwegian Version (System/Documentation View) */}
              <div className="flex justify-end">
                <div className="max-w-[80%] p-4 bg-blue-600 text-white rounded-2xl rounded-tr-none shadow-lg shadow-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={12} className="text-blue-200" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">{t('final_report_no')}</p>
                  </div>
                  <p className="text-sm italic leading-relaxed">"{renderContent(item.norwegianVersion)}"</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-6 border-t border-neutral-100 bg-neutral-50/50">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('input_placeholder')}
            className="w-full pl-6 pr-16 py-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={isTranslating || !input.trim()}
            aria-label="Oversett"
            title="Oversett"
            className="absolute right-2 top-2 bottom-2 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            {isTranslating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
