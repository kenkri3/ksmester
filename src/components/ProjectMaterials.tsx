import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Globe,
  Link,
  Archive
} from 'lucide-react';
import { Project, ProjectMaterial } from '../types';
import { nobbService, NobbProduct } from '../services/nobbService';
import { scrapingService } from '../services/scrapingService';
import { db, collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from '../services/firebase';
import { cn } from '../lib/utils';

interface ProjectMaterialsProps {
  project: Project;
}

export default function ProjectMaterials({ project }: ProjectMaterialsProps) {
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NobbProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingFdv, setIsGeneratingFdv] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('url'); // Default to URL if NOBB might be missing
  const [configStatus, setConfigStatus] = useState({ nobb: false, firecrawl: false });

  useEffect(() => {
    // Check which services are configured on the server
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setConfigStatus({ nobb: data.nobbConfigured, firecrawl: data.firecrawlConfigured });
        if (!data.nobbConfigured && data.firecrawlConfigured) {
          setActiveTab('url');
        } else if (data.nobbConfigured) {
          setActiveTab('search');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'project_materials'),
      where('projectId', '==', project.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const materialsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectMaterial[];
      setMaterials(materialsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [project.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await nobbService.searchProducts(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addMaterial = async (product: NobbProduct) => {
    try {
      await addDoc(collection(db, 'project_materials'), {
        projectId: project.id,
        nobbNumber: product.nobbNumber,
        name: product.name,
        description: product.description,
        quantity: 1,
        unit: 'stk',
        supplier: product.supplier,
        fdvUrl: product.fdvUrl || null,
        imageUrl: product.imageUrl || null,
        status: product.fdvUrl ? 'fetched' : 'pending',
        createdAt: new Date().toISOString()
      });
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding material:', error);
    }
  };

  const removeMaterial = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'project_materials', id));
    } catch (error) {
      console.error('Error removing material:', error);
    }
  };

  const handleAddToInventory = async (material: ProjectMaterial) => {
    try {
      await addDoc(collection(db, 'inventory'), {
        name: material.name,
        category: 'material',
        quantity: material.quantity || 1,
        unit: material.unit || 'stk',
        location: 'Prosjektlager',
        minQuantity: 0,
        timestamp: serverTimestamp(),
        sourceMaterialId: material.id
      });
      alert(`${material.name} er lagt til i lageret.`);
    } catch (error) {
      console.error('Error adding to inventory:', error);
      alert('Kunne ikke legge til i lageret.');
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeUrl.trim()) return;

    setIsScraping(true);
    try {
      const product = await scrapingService.scrapeProduct(scrapeUrl);
      if (product) {
        await addMaterial(product);
        setScrapeUrl('');
        alert(`Lagt til: ${product.name}`);
      } else {
        alert('Kunne ikke hente produktinformasjon fra denne URL-en. Kontroller nettadressen eller legg inn produktet manuelt.');
      }
    } catch (error) {
      console.error('Scraping error:', error);
      alert('En feil oppstod under skraping.');
    } finally {
      setIsScraping(false);
    }
  };

  const generateFdvPackage = async () => {
    setIsGeneratingFdv(true);
    try {
      const docs = await nobbService.generateFdvPackage(materials);
      
      // Save these as project documents
      for (const docInfo of docs) {
        await addDoc(collection(db, 'projects', project.id, 'documents'), {
          title: docInfo.title,
          url: docInfo.url,
          type: 'fdv',
          source: 'nobb',
          createdAt: new Date().toISOString()
        });
      }

      alert('FDV-pakke er generert og lagret i prosjektdokumenter.');
    } catch (error) {
      console.error('Error generating FDV package:', error);
    } finally {
      setIsGeneratingFdv(false);
    }
  };

  return (
    <div className="space-y-6 text-neutral-900">
      {/* Search Section */}
      <div className="bg-white text-neutral-900 rounded-[2.5rem] border border-neutral-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 text-neutral-900">
            <Package size={24} className="text-emerald-600" />
            Prosjektmateriell
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-neutral-100 p-1 rounded-xl mr-2">
              <button
                onClick={() => setActiveTab('search')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'search' ? "bg-white text-emerald-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900 font-bold"
                )}
              >
                Byggevare Søk
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'url' ? "bg-white text-blue-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900 font-bold"
                )}
              >
                Hent fra URL
              </button>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold",
              configStatus.firecrawl ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            )}>
              <ShieldCheck size={16} /> 
              {configStatus.firecrawl || true ? 'Smart Skraper Aktiv' : 'Skraper'}
            </div>
            {configStatus.nobb && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold">
                <ShieldCheck size={16} /> NOBB Aktiv
              </div>
            )}
          </div>
        </div>

        {activeTab === 'search' ? (
          <form onSubmit={handleSearch} className="relative mb-6">
            <input
              type="text"
              placeholder="Søk etter byggevarer eller FDV (navn eller varenummer)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-neutral-900 placeholder:text-neutral-500 font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" size={16} /> : 'Søk'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleScrape} className="relative mb-6">
            <input
              type="url"
              placeholder="Lim inn URL til produkt (f.eks. fra leverandør eller nettbutikk)..."
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-blue-50/30 border border-blue-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-neutral-900 placeholder:text-neutral-500 font-medium"
            />
            <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
            <button
              type="submit"
              disabled={isScraping}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isScraping ? <Loader2 className="animate-spin" size={16} /> : <Globe size={16} />}
              {isScraping ? 'Henter...' : 'Hent Info'}
            </button>
          </form>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto p-2">
            {searchResults.map((product) => (
              <div key={product.nobbNumber} className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl hover:border-emerald-300 transition-all shadow-sm text-neutral-900">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500">
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-neutral-900">{product.name}</div>
                    <div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                      NOBB: {product.nobbNumber} • {product.supplier}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => addMaterial(product)}
                  className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Materials List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-700">Lagt til i prosjektet</h4>
            <button
              onClick={generateFdvPackage}
              disabled={isGeneratingFdv || materials.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {isGeneratingFdv ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              Generer FDV-pakke
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : materials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((material) => (
                <div key={material.id} className="p-5 bg-neutral-50 border border-neutral-200 rounded-3xl space-y-4 group hover:border-emerald-300 transition-all text-neutral-900">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-emerald-600 shadow-xs">
                        <Package size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-neutral-900">{material.name}</div>
                        <div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">NOBB: {material.nobbNumber}</div>
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddToInventory(material)}
                          className="p-2 text-neutral-400 hover:text-blue-600 transition-colors"
                          title="Legg til i lager"
                        >
                          <Archive size={16} />
                        </button>
                        <button
                          onClick={() => removeMaterial(material.id)}
                          className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/80">
                    <div className="flex items-center gap-2">
                      {material.fdvUrl ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                          <CheckCircle2 size={12} /> FDV Klar
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                          <AlertTriangle size={12} /> Mangler FDV
                        </div>
                      )}
                    </div>
                    {material.fdvUrl && (
                      <a
                        href={material.fdvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline"
                      >
                        <FileText size={12} /> Se dokument <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-50 rounded-3xl border border-dashed border-neutral-300">
              <Package className="mx-auto text-neutral-400 mb-3" size={48} />
              <p className="text-sm font-semibold text-neutral-700">Ingen materiell er lagt til ennå.</p>
              <p className="text-xs font-medium text-neutral-500 mt-1">Søk etter byggevarer eller lim inn produkt-URL over for å hente FDV automatisk.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
