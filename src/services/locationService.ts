export interface AddressInfo {
  address: string;
  postcode: string;
  city: string;
  gnr?: string;
  bnr?: string;
  municipality?: string;
  municipalityNumber?: string;
  fullAddress: string;
}

export const locationService = {
  /**
   * Searches for addresses in Norway using Geonorge API.
   * Includes GNR and BNR where available.
   */
  async searchAddress(query: string): Promise<AddressInfo[]> {
    if (!query || query.length < 2) return [];

    try {
      // Check if query looks like GNR/BNR (e.g., "123/45" or "gnr 123 bnr 45")
      const gnrBnrMatch = query.match(/(?:gnr\s*)?(\d+)\s*[\/\s]\s*(?:bnr\s*)?(\d+)/i);
      let url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}&fuzzy=true&treffPerSide=10`;
      
      if (gnrBnrMatch) {
        const gnr = gnrBnrMatch[1];
        const bnr = gnrBnrMatch[2];
        // If it looks like GNR/BNR, we can try to search specifically for that
        // However, the 'sok' parameter often handles this well. 
        // We'll stick to 'sok' but maybe add some logic if results are empty.
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Geonorge API error');
      }

      const data = await response.json();
      
      if (!data.adresser || data.adresser.length === 0) {
        // Try searching by GNR/BNR if the first search failed and it looks like GNR/BNR
        if (gnrBnrMatch) {
          const gnr = gnrBnrMatch[1];
          const bnr = gnrBnrMatch[2];
          const altResponse = await fetch(`https://ws.geonorge.no/adresser/v1/sok?gaardsnummer=${gnr}&bruksnummer=${bnr}&treffPerSide=10`);
          if (altResponse.ok) {
            const altData = await altResponse.ok ? await altResponse.json() : { adresser: [] };
            if (altData.adresser) return this.mapAdresser(altData.adresser);
          }
        }
        return [];
      }

      return this.mapAdresser(data.adresser);
    } catch (error) {
      console.error('Error searching address:', error);
      return [];
    }
  },

  /**
   * Helper to map Geonorge address objects to AddressInfo
   */
  mapAdresser(adresser: any[]): AddressInfo[] {
    return adresser.map((addr: any) => {
      const matrikkel = addr.matrikkelenhet || {};
      return {
        address: addr.adressetekst || '',
        postcode: addr.postnummer || '',
        city: addr.poststed || '',
        gnr: matrikkel.gaardsnummer ? String(matrikkel.gaardsnummer) : undefined,
        bnr: matrikkel.bruksnummer ? String(matrikkel.bruksnummer) : undefined,
        municipality: addr.kommunenavn || '',
        municipalityNumber: matrikkel.kommunenummer || '',
        fullAddress: `${addr.adressetekst}, ${addr.postnummer} ${addr.poststed}`
      };
    });
  },

  /**
   * Searches specifically for property by GNR/BNR
   */
  async searchByGnrBnr(gnr: string, bnr: string, knr?: string): Promise<AddressInfo[]> {
    try {
      let url = `https://ws.geonorge.no/adresser/v1/sok?gaardsnummer=${gnr}&bruksnummer=${bnr}&treffPerSide=10`;
      if (knr) url += `&kommunenummer=${knr}`;
      
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.adresser ? this.mapAdresser(data.adresser) : [];
    } catch (error) {
      console.error('Error searching by GNR/BNR:', error);
      return [];
    }
  },

  /**
   * Gets address info from coordinates (Reverse Geocoding)
   */
  async getAddressFromCoords(lat: number, lon: number): Promise<AddressInfo | null> {
    try {
      const response = await fetch(`https://ws.geonorge.no/adresser/v1/punktsok?lon=${lon}&lat=${lat}&radius=50&treffPerSide=1`);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data.adresser || data.adresser.length === 0) return null;

      const results = this.mapAdresser(data.adresser);
      return results[0] || null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }
};
