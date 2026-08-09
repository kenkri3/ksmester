import { ProjectMaterial } from "../types";

/**
 * Service for interacting with the NOBB (Norsk Byggevarebase) API.
 * This service handles fetching product information and FDV documentation.
 */

const NOBB_API_BASE_URL = 'https://export.byggtjeneste.no/api/v1';
const NOBB_API_KEY = process.env.NOBB_API_KEY || '';

export interface NobbProduct {
  nobbNumber: string;
  name: string;
  description: string;
  gtin?: string;
  supplier: string;
  category: string;
  fdvUrl?: string;
  safetySheetUrl?: string;
  imageUrl?: string;
}

export const nobbService = {
  /**
   * Fetches detailed product information from NOBB by NOBB number via local proxy.
   */
  async getProductInfo(nobbNumber: string): Promise<NobbProduct | null> {
    try {
      const response = await fetch(`/api/nobb/item/${nobbNumber}`);

      if (!response.ok) {
        if (response.status === 403) {
          console.warn('NOBB API key not configured on server. Using fallback.');
          return this.getFallbackProduct(nobbNumber);
        }
        throw new Error(`NOBB API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        nobbNumber: data.nobbNumber || nobbNumber,
        name: data.name || data.itemName,
        description: data.description || data.itemDescription,
        gtin: data.gtin,
        supplier: data.supplierName || data.supplier?.name,
        category: data.categoryName || data.mainGroup?.name,
        fdvUrl: data.media?.find((m: any) => m.type === 'FDV' || m.category === 'FDV')?.url,
        safetySheetUrl: data.media?.find((m: any) => m.type === 'HMS' || m.category === 'HMS')?.url,
        imageUrl: data.media?.find((m: any) => m.type === 'Bilde')?.url
      };
    } catch (error) {
      console.error('Error fetching NOBB product info:', error);
      return this.getFallbackProduct(nobbNumber);
    }
  },

  /**
   * Searches for products in NOBB via local proxy.
   */
  async searchProducts(query: string): Promise<NobbProduct[]> {
    try {
      const response = await fetch(`/api/nobb/search?q=${encodeURIComponent(query)}`);

      if (!response.ok) return [];

      const data = await response.json();
      const items = data.items || data;
      
      return items.map((item: any) => ({
        nobbNumber: item.nobbNumber,
        name: item.name || item.itemName,
        description: item.description || item.itemDescription,
        supplier: item.supplierName || item.supplier?.name,
        category: item.categoryName || item.mainGroup?.name,
        fdvUrl: item.media?.find((m: any) => m.type === 'FDV')?.url
      }));
    } catch (error) {
      console.error('Error searching NOBB products:', error);
      return [];
    }
  },

  /**
   * Generates a structured FDV package for a list of project materials.
   */
  async generateFdvPackage(materials: ProjectMaterial[]): Promise<{ title: string; url: string; date: string }[]> {
    // In a real implementation, this would trigger a server-side process to 
    // bundle all FDV documents into a single ZIP or PDF.
    // For now, we return the individual document links.
    
    return materials
      .filter(m => m.fdvUrl)
      .map(m => ({
        title: `FDV: ${m.name}`,
        url: m.fdvUrl!,
        date: new Date().toLocaleDateString()
      }));
  },

  /**
   * Fallback data for demonstration when API key is missing.
   */
  getFallbackProduct(nobbNumber: string): NobbProduct | null {
    const fallbacks: Record<string, NobbProduct> = {
      '12345678': {
        nobbNumber: '12345678',
        name: 'Gipsplate Standard 12,5mm',
        description: 'Standard gipsplate for innvendig kledning av vegger og tak.',
        supplier: 'Norgips Norge AS',
        category: 'Gipsplater',
        fdvUrl: 'https://www.norgips.no/fdv/standard-gips.pdf'
      },
      '87654321': {
        nobbNumber: '87654321',
        name: 'Glava Extrem 32 100mm',
        description: 'Isolasjon med ekstremt god isolasjonsevne.',
        supplier: 'Glava AS',
        category: 'Isolasjon',
        fdvUrl: 'https://www.glava.no/fdv/extrem-32.pdf'
      }
    };

    return fallbacks[nobbNumber] || null;
  }
};
