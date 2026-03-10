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
  ownershipDeclaration: boolean;
  simulateIbs?: 'success' | 'failure';
}

export interface VerificationResult {
  found: boolean;
  registrationId?: string;
  title?: string;
  registeredAt?: string;
  certificateUrl?: string;
}

export interface RecentRegistration {
  id: string;
  title: string;
  status: 'processing' | 'registered' | 'failed';
  date: string;
  type: string;
  certificateUrl?: string;
}
