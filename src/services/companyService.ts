export interface CompanyInfo {
  name: string;
  orgnr: string;
  orgType: string;
  orgTypeCode: string;
  address: string;
  postcode: string;
  city: string;
  municipality: string;
  industryCode?: string;
  industry?: string;
  employeeCount?: number;
  isBankrupt: boolean;
  isUnderLiquidation: boolean;
  isMvaRegistered: boolean;
}

export const companyService = {
  /**
   * Searches Brønnøysundregistrene Enhetsregisteret via /api/company/search
   * Supports both company name and 9-digit orgnr
   */
  async searchCompany(query: string): Promise<CompanyInfo[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const res = await fetch(`/api/company/search?q=${encodeURIComponent(query.trim())}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Company search error:', e);
    }
    return [];
  }
};
