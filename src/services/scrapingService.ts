import { NobbProduct } from "./nobbService";

export const scrapingService = {
  /**
   * Scrapes a product page via local proxy.
   */
  async scrapeProduct(url: string): Promise<NobbProduct | null> {
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Scraping error: ${response.statusText}`);
      }

      const product = await response.json();
      
      return {
        nobbNumber: product.nobbNumber || '',
        name: product.name,
        description: product.description || '',
        gtin: product.gtin,
        supplier: product.supplier,
        category: product.category || 'Byggevare',
        fdvUrl: product.fdvUrl,
        imageUrl: product.imageUrl
      };
    } catch (error) {
      console.error('Scraping error:', error);
      return null;
    }
  }
};
