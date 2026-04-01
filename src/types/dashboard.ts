export interface DashboardSummary {
  registeredWorks: number;
  pendingRegistrations: number;
  availableCredits: number;
  kycStatus: 'verified' | 'pending' | 'unverified';
  subscriptionPlan: string;
  canRegisterWorks: boolean;
}

export interface PromotionRequest {
  artistName: string;
  mainLink: string;
  workTitle: string;
  description: string;
  promotionGoal: string;
  socialNetworks: string;
  consent: boolean;
}

export interface BillingPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  popular?: boolean;
}

export interface WorkRegistration {
  title: string;
  type: 'audio' | 'video' | 'image' | 'document' | 'other';
  author: string;
  description: string;
  file: File;
  files?: File[];
  ownershipDeclaration: boolean;
  signatureId: string;
  creators?: import('@/components/dashboard/register/types').Creator[];
}

export interface IbsSignature {
  id: string;
  user_id: string;
  ibs_signature_id: string;
  signature_name: string;
  status: string;
  kyc_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationResult {
  found: boolean;
  registrationId?: string;
  title?: string;
  registeredAt?: string;
  certificateUrl?: string;
  blockchainHash?: string;
  blockchainNetwork?: string;
  ibsEvidenceId?: string;
  description?: string;
  workType?: string;
  author?: string;
}

export interface RecentRegistration {
  id: string;
  title: string;
  status: 'processing' | 'registered' | 'failed';
  date: string;
  type: string;
  certificateUrl?: string;
  distributedAt?: string | null;
  distributionClicks?: number;
  blockchain_hash?: string | null;
  blockchain_network?: string | null;
  checker_url?: string | null;
  ibs_evidence_id?: string | null;
  certified_at?: string | null;
}
