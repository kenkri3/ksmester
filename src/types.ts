export type Trade = 'carpenter' | 'plumber' | 'electrician' | 'mason' | 'painter' | 'general';

export interface Company {
  id: string;
  name: string;
  industry: Trade | 'multi';
  modules: string[]; // e.g., ['hms', 'ks', 'inventory', 'apprentice']
  logoUrl?: string;
}

export interface Invitation {
  id: string;
  projectId?: string; // Optional for company-level invites
  projectName?: string;
  companyId: string;
  companyName: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  role: 'admin' | 'manager' | 'worker' | 'external_worker' | 'external_manager';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
  token: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'worker' | 'external_worker' | 'external_manager';
  trade?: Trade;
  companyId: string;
  companyName: string;
  phone?: string;
  imageUrl?: string;
  accessibleProjects?: string[]; // For external workers
  modules?: string[]; // e.g., ['hms', 'ks', 'inventory', 'apprentice']
  industry?: string;
  notifications?: {
    deviations: boolean;
    sja: boolean;
    reports: boolean;
    hmsCardExpiry: boolean;
  };
  createdAt?: any;
  updatedAt?: any;
}

export type View = 'landing' | 'dashboard' | 'mobile' | 'spec' | 'settings' | 'customer-portal' | 'pricing' | 'about' | 'contact' | 'privacy' | 'terms' | 'super-admin' | 'offer' | 'invite';

export interface Project {
  id: string;
  projectCode?: string;
  name: string;
  description?: string;
  location: string;
  progress: number;
  status: 'active' | 'completed' | 'delayed';
  stage: 'offer' | 'contract' | 'active' | 'completion' | 'archived';
  documentationLevel: number;
  lastUpdate: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  clientEmail?: string;
  companyId?: string;
  companyName?: string;
  projectManager?: string;
  teamMembers?: string[];
  tags?: string[];
  imageUrl?: string;
  budget?: number;
  spent?: number;
  gnr?: string;
  bnr?: string;
  createdAt?: any;
}

export interface SJAReport {
  id: string;
  projectId: string;
  title: string;
  task: string;
  risikoer: { aktivitet: string; risiko: string; tiltak: string }[];
  utstyr: string[];
  tek17Reference: string;
  date: string;
  authorId: string;
  authorName: string;
  status: 'draft' | 'approved' | 'archived';
  timestamp: string;
  createdAt: string;
  createdBy: string;
}

export interface Deviation {
  id: string;
  title: string;
  projectId: string;
  project?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'closed' | 'in-progress';
  timestamp: string;
  location?: string;
  gnr?: string;
  bnr?: string;
  reportedBy?: string;
  action?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ImageAnalysisResult {
  elements: string[];
  status: 'approved' | 'deviation';
  description: string;
  confidence: number;
  recommendation?: string;
}

export interface OfferItem {
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  total: number;
}

export interface Offer {
  id: string;
  projectCode?: string;
  projectId?: string;
  clientName: string;
  clientEmail?: string;
  title: string;
  description: string;
  items: OfferItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  createdAt: string;
  validUntil: string;
  authorId: string;
  authorName: string;
}

export interface Contract {
  id: string;
  projectCode?: string;
  projectId?: string;
  offerId?: string;
  clientName: string;
  clientEmail?: string;
  title: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'expired';
  createdAt: string;
  signedAt?: string;
  documentUrl?: string;
  authorId: string;
  company?: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  title: string;
  type: 'contract' | 'fdv' | 'drawing' | 'photo' | 'other';
  url: string;
  createdAt: string;
  source: 'manual' | 'nobb' | 'system';
  category?: string;
}

export interface ProjectMaterial {
  id: string;
  projectId: string;
  nobbNumber: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  supplier?: string;
  fdvUrl?: string;
  gtin?: string;
  category?: string;
  imageUrl?: string;
  status: 'pending' | 'fetched' | 'missing';
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  date: string;
  hours: number;
  description: string;
  category: 'arbeid' | 'reise' | 'overtid' | 'annet';
}

export interface BuildingApplication {
  id: string;
  projectId: string;
  type: 'ett-trinns' | 'ramme' | 'igangsetting' | 'ferdigattest';
  status: 'draft' | 'submitted' | 'processing' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  referenceNumber?: string;
}

export interface Handover {
  id: string;
  projectId: string;
  inspectionDate: string;
  customerName: string;
  status: 'pending' | 'completed';
  defects: string[];
  fdvPackageUrl?: string;
  completedAt?: string;
}

export interface ApprenticeGoal {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  evidenceUrl?: string;
}

export interface ApprenticeProfile {
  id: string;
  name: string;
  mentorId: string;
  mentorName: string;
  startDate: string;
  goals: ApprenticeGoal[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'material' | 'tool' | 'chemical';
  quantity: number;
  unit: string;
  location: string;
  minQuantity?: number;
  safetySheetUrl?: string; // For chemicals
  lastChecked?: string;
  needsMaintenance?: boolean;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: 'EL' | 'Diesel' | 'Bensin' | 'Hybrid';
  status: 'Aktiv' | 'Lager' | 'Service';
  km: number;
}

export interface VehicleEntry {
  id: string;
  vehicleId: string;
  plateNumber: string;
  driverId: string;
  driverName: string;
  date: string;
  startKm: number;
  endKm: number;
  purpose: string;
  projectId?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  hmsCardNumber: string;
  hmsCardExpiry: string;
  employer: string;
  status: 'on_site' | 'off_site';
}

export interface SafetyInspection {
  id: string;
  projectId: string;
  date: string;
  participants: string[];
  findings: { description: string; severity: 'low' | 'medium' | 'high'; action: string; status: 'open' | 'closed' }[];
  status: 'draft' | 'completed';
}

export interface HMSDocument {
  id: string;
  title: string;
  category: 'general' | 'safety' | 'first_aid' | 'fire' | 'equipment' | 'other';
  content: string;
  url?: string;
  version: string;
  updatedAt: string;
  companyId: string;
}

export interface HMSSignature {
  id: string;
  documentId: string;
  documentTitle: string;
  userId: string;
  userName: string;
  signedAt: string;
  companyId: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'hms' | 'project' | 'deviation' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}
