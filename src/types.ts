export type Trade = 'carpenter' | 'plumber' | 'electrician' | 'mason' | 'painter' | 'general';
export type SubscriptionPlan = 'solo' | 'team' | 'entreprenor' | 'partner';

export interface Company {
  id: string;
  name: string;
  industry?: Trade | 'multi' | string;
  modules: string[]; // e.g., ['hms', 'ks', 'inventory', 'apprentice']
  logoUrl?: string;
  plan?: SubscriptionPlan;
  subscriptionStatus?: 'trial' | 'active' | 'cancelled' | 'expired';
  userCount?: number;
  isPartner?: boolean;
  isInternal?: boolean;
  monthlyPrice?: number;
  orgNumber?: string;
  orgnr?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  createdAt?: any;
  updatedAt?: any;
  trialStartDate?: string;
  trialDaysLeft?: number | null;
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

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'worker' | 'external_worker' | 'external_manager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trade?: Trade;
  companyId: string;
  companyName: string;
  phone?: string;
  imageUrl?: string;
  accessibleProjects?: string[]; // For external workers
  modules?: string[]; // e.g., ['hms', 'ks', 'inventory', 'apprentice']
  industry?: string;
  plan?: SubscriptionPlan;
  notifications?: {
    deviations: boolean;
    sja: boolean;
    reports: boolean;
    hmsCardExpiry: boolean;
  };
  createdAt?: any;
  updatedAt?: any;
}

export type View = 'landing' | 'dashboard' | 'mobile' | 'spec' | 'settings' | 'customer-portal' | 'pricing' | 'about' | 'contact' | 'privacy' | 'terms' | 'super-admin' | 'offer' | 'invite' | 'login' | 'public-offer' | 'public-change-order' | 'partner';


export interface Project {
  id: string;
  projectCode?: string;
  code?: string;
  name: string;
  description?: string;
  location: string;
  address?: string;
  progress: number;
  status: 'active' | 'completed' | 'delayed';
  stage: 'offer' | 'contract' | 'active' | 'completion' | 'archived' | string;
  documentationLevel?: number;
  lastUpdate?: string;
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
  portalToken?: string;
  createdAt?: any;
  updatedAt?: any;
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
  clientPhone?: string;
  clientType?: 'private' | 'company';
  orgNumber?: string;
  contactPerson?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  municipality?: string;
  gnr?: string;
  bnr?: string;
  fnr?: string;
  snr?: string;
  contractStandard?: 'haandverker' | 'NS8406' | 'NS8405' | 'bustadoppforing' | string;
  title: string;
  description: string;
  items: OfferItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  createdAt: string;
  validUntil: string;
  authorId: string;
  authorName: string;
  company?: string;
  companyName?: string;
  companyOrgNumber?: string;
  terms?: string;
  token?: string;
  shareUrl?: string;
  acceptedAt?: string;
  contractId?: string;
}

export interface Contract {
  id: string;
  projectCode?: string;
  projectId?: string;
  offerId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  title: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'expired';
  createdAt: string;
  signedAt?: string;
  documentUrl?: string;
  authorId: string;
  company?: string;
  companyName?: string;
  companyOrgNumber?: string;
  totalAmount?: number;
  paymentTerms?: string;
  startDate?: string;
  completionDate?: string;
  terms?: string;
  signatureData?: string; // Data URL for canvas signature or signature hash
  signerName?: string;
  signerIp?: string;
  token?: string;
  shareUrl?: string;
  contractStandard?: 'NS8406' | 'NS8405' | 'haandverker';
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  type: 'contract' | 'fdv' | 'drawing' | 'photo' | 'report' | 'pdf' | 'other';
  url: string;
  createdAt: string | any;
  source: 'manual' | 'nobb' | 'system' | 'ai_engine' | 'sintef';
  category?: string;
  nobbNumber?: string;
  supplier?: string;
  sintefApproval?: string;
  tek17Clause?: string;
  maintenanceInterval?: string;
  description?: string;
  fileData?: string;
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

export interface ProjectTask {
  id: string;
  projectId?: string;
  projectName?: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  deadline?: string;
  createdAt: string;
  createdBy?: string;
  voiceNote?: string;
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
  projectId?: string;
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

// --- Dynamic & Editable Checklist System ---
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  status?: 'passed' | 'failed' | 'na' | 'pending';
  notes?: string;
  photoUrl?: string;
  aiVerified?: boolean;
  aiComment?: string;
  required?: boolean;
  category?: string;
  order?: number;
}

export interface ProjectChecklist {
  id: string;
  projectId: string;
  title: string;
  trade: Trade | string;
  phase: 'hms_rigg' | 'fagkontroll' | 'mottak' | 'sluttkontroll' | 'custom';
  phaseTitle: string;
  items: ChecklistItem[];
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// --- Norwegian Legal Compliance Package ---
export interface NorwegianComplianceStatus {
  samsvarserklaeringReady: boolean;
  sluttkontrollReady: boolean;
  ferdigattestReady: boolean;
  avfallsplanReady: boolean;
  avfallSorteringsgrad: number; // e.g. 68% (TEK17 requirement is >= 60%)
  overtakelsesprotokollReady: boolean;
  fdvReady: boolean;
  boligmappaReady: boolean;
  hmsLogReady: boolean;
  totalComplianceScore: number; // 0-100%
  hiddenInstallationsPhotoCount: number;
}

export interface WasteRecord {
  id: string;
  projectId: string;
  wasteType: 'trevirke' | 'betong_tegl' | 'gips' | 'metall' | 'plast' | 'farlig_avfall' | 'restavfall';
  wasteName: string;
  weightKg: number;
  deliveryDate: string;
  recyclingFacility: string;
  receiptUrl?: string;
}

// --- Digital Endringsmelding / Tilleggsarbeid (NS 8406 / Håndverkertjenesteloven § 9) ---
export interface ChangeOrder {
  id: string;
  projectId: string;
  projectCode?: string;
  changeNumber: number; // e.g. 1, 2, 3
  title: string;
  description: string;
  cause: 'kundetillegg' | 'uforutsett_forhold' | 'prosjektering' | 'myndighetskrav' | 'annet';
  amountExVat: number;
  vatAmount: number;
  totalAmount: number;
  impactDays: number; // Forventet konsekvens for ferdigstillelse i dager (+X dager)
  status: 'draft' | 'pending_customer' | 'approved' | 'rejected';
  token?: string;
  shareUrl?: string;
  clientName?: string;
  clientEmail?: string;
  signedByClientAt?: string;
  clientSignatureUrl?: string;
  clientIp?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

// --- Automatisk Byggedagbok (Byggherreforskriften § 15 & NS 8405/8406) ---
export interface DailyLog {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  temperatureMin?: number;
  temperatureMax?: number;
  windSpeedMax?: number;
  precipitationMm?: number;
  weatherDescription?: string;
  weatherCondition?: string;
  workAdvice?: string;
  crewCount: number;
  crewMembers: string[]; // Liste over navn/arbeidere på plassen
  totalHoursWorked: number;
  completedTasks: string[];
  checklistsCompleted: string[];
  deviationsRegistered: string[];
  deliveryNotes?: string;
  generalNotes?: string;
  inspectedBy?: string;
  signedAt?: string;
  autoGenerated: boolean;
  createdAt: string;
}

// --- Automatisk Kjemisk Stoffkartotek (Kjemikalieforskriften & Arbeidstilsynet) ---
export interface SafetyDataSheet {
  id: string;
  projectId: string;
  productName: string;
  manufacturer: string;
  nobbNumber?: string;
  usageArea: string; // f.eks. "Membran / Våtrom", "Fugemasse", "Innvendig maling"
  dangerSymbols: string[]; // f.eks. ['Etsende', 'Miljøskadelig', 'Helsefare', 'Brannfarlig']
  hazardStatements: string[]; // H-setninger
  ppe: string[]; // Verneutstyr: ['Hansker', 'Vernebriller', 'Åndedrettsvern', 'Vernetøy']
  firstAid: {
    inhalation?: string;
    skin?: string;
    eyes?: string;
    ingestion?: string;
  };
  fireHazards?: string;
  storageInstructions?: string;
  sdsPdfUrl?: string;
  autoDetected: boolean;
  createdAt: string;
}

// --- Automatisk Sluttoppgjør & Avregning (NS 8406 pkt. 26) ---
export interface FinalSettlement {
  id: string;
  projectId: string;
  originalContractAmount: number;
  approvedChangeOrdersAmount: number;
  totalOrderAmount: number;
  invoicedAmount: number;
  remainingToInvoice: number;
  retentionGuaranteeAmount?: number; // Innestående beløp (f.eks. 5%)
  netSettlementExVat: number;
  vatAmount: number;
  totalSettlementIncVat: number;
  invoiceDueDate: string;
  objectionDeadline: string; // 2 måneder fra mottak iht. NS 8406 pkt. 26
  status: 'draft' | 'sent' | 'approved';
  sentAt?: string;
  createdAt: string;
}

// --- Automatisk 1-års Garanti-inspeksjon (Bustadoppføringslova § 16 / NS 8406) ---
export interface WarrantyInspection {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  clientEmail?: string;
  projectCompletedDate: string;
  scheduledInspectionDate: string; // 11 mnd etter fullført
  status: 'scheduled' | 'invitation_sent' | 'completed' | 'cancelled';
  invitationSentAt?: string;
  inspectionConductedAt?: string;
  findings?: string[];
  protocolDocumentUrl?: string;
  createdAt: string;
}

// --- Krav om Fristforlengelse (NS 8406 pkt. 19.3) ---
export interface ExtensionOfTimeClaim {
  id: string;
  projectId: string;
  claimNumber: number;
  cause: 'byggherreforhold' | 'force_majeure_vaer' | 'uforutsett_grunnforhold' | 'offentlig_paalegg';
  description: string;
  daysClaimed: number;
  costImpactClaimed?: number;
  status: 'submitted' | 'accepted' | 'partially_accepted' | 'rejected';
  submittedDate: string;
  createdAt: string;
}

