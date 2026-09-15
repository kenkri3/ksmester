export interface AddressInfo {
  address: string;
  postcode: string;
  city: string;
  gnr?: string;
  bnr?: string;
  fnr?: string;
  municipality?: string;
  municipalityNumber?: string;
  fullAddress: string;
  lat?: number;
  lon?: number;
}

export const locationService = {
  /**
   * Searches for addresses in Norway using server API (/api/address)
   * with direct Geonorge API fallback.
   * Accurately extracts and auto-fills GNR and BNR.
   */
  async searchAddress(query: string): Promise<AddressInfo[]> {
    if (!query || query.trim().length < 2) return [];

    // 1. Try local server-side proxy route (bypasses CSP & adds server caching)
    try {
      const res = await fetch(`/api/address?q=${encodeURIComponent(query.trim())}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (apiErr) {
      console.warn('Address proxy route error, falling back to direct Geonorge:', apiErr);
    }

    // 2. Direct fallback to Geonorge API
    try {
      const gnrBnrMatch = query.match(/(?:gnr\s*)?(\d+)\s*[\/\s]\s*(?:bnr\s*)?(\d+)/i);
      let url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}&fuzzy=true&treffPerSide=15`;
      
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        if (data.adresser && data.adresser.length > 0) {
          return this.mapAdresser(data.adresser);
        }
      }

      if (gnrBnrMatch) {
        const gnr = gnrBnrMatch[1];
        const bnr = gnrBnrMatch[2];
        const altResponse = await fetch(`https://ws.geonorge.no/adresser/v1/sok?gaardsnummer=${gnr}&bruksnummer=${bnr}&treffPerSide=10`);
        if (altResponse.ok) {
          const altData = await altResponse.json();
          if (altData.adresser) return this.mapAdresser(altData.adresser);
        }
      }
      return [];
    } catch (error) {
      console.error('Error searching address directly:', error);
      return [];
    }
  },

  /**
   * Helper to map Geonorge address objects to AddressInfo.
   * FIX: Correctly reads top-level gardsnummer / gaardsnummer and bruksnummer.
   */
  mapAdresser(adresser: any[]): AddressInfo[] {
    return adresser.map((addr: any) => {
      const matrikkel = addr.matrikkelenhet || {};
      const gnrRaw = addr.gardsnummer ?? addr.gaardsnummer ?? matrikkel.gaardsnummer;
      const bnrRaw = addr.bruksnummer ?? matrikkel.bruksnummer;
      const fnrRaw = addr.festenummer ?? matrikkel.festenummer;
      const knrRaw = addr.kommunenummer ?? matrikkel.kommunenummer;

      const gnr = gnrRaw !== undefined && gnrRaw !== null ? String(gnrRaw) : undefined;
      const bnr = bnrRaw !== undefined && bnrRaw !== null ? String(bnrRaw) : undefined;
      const fnr = fnrRaw !== undefined && fnrRaw !== null && Number(fnrRaw) > 0 ? String(fnrRaw) : undefined;

      const address = addr.adressetekst || '';
      const postcode = addr.postnummer || '';
      const city = addr.poststed || '';
      const municipality = addr.kommunenavn || '';
      const municipalityNumber = knrRaw ? String(knrRaw) : undefined;

      return {
        address,
        postcode,
        city,
        gnr,
        bnr,
        fnr,
        municipality,
        municipalityNumber,
        fullAddress: `${address}${postcode ? `, ${postcode}` : ''}${city ? ` ${city}` : ''}`.trim(),
        lat: addr.representasjonspunkt?.lat,
        lon: addr.representasjonspunkt?.lon
      };
    });
  },

  /**
   * Searches specifically for property by GNR/BNR
   */
  async searchByGnrBnr(gnr: string, bnr: string, knr?: string): Promise<AddressInfo[]> {
    try {
      const res = await fetch(`/api/address?gnr=${encodeURIComponent(gnr)}&bnr=${encodeURIComponent(bnr)}${knr ? `&knr=${encodeURIComponent(knr)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {}

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
      const res = await fetch(`/api/address?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) return list[0];
      }
    } catch (e) {}

    try {
      const response = await fetch(`https://ws.geonorge.no/adresser/v1/punktsok?lon=${lon}&lat=${lat}&radius=150&treffPerSide=1`);
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
