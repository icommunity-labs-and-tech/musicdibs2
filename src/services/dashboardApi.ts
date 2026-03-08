import type {
  DashboardSummary,
  PromotionRequest,
  BillingPlan,
  WorkRegistration,
  VerificationResult,
  RecentRegistration,
} from '@/types/dashboard';

// Base URL for API — replace with real backend when ready
const API_BASE = '/api';

// Simulate network delay
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Mock data ──────────────────────────────────────────────

const mockSummary: DashboardSummary = {
  registeredWorks: 18,
  pendingRegistrations: 0,
  availableCredits: 187,
  kycStatus: 'verified',
  subscriptionPlan: 'Plus',
  canRegisterWorks: true,
};

const mockPlans: BillingPlan[] = [
  { id: 'basic', name: 'Básico', credits: 10, price: 9.99, currency: 'EUR' },
  { id: 'plus', name: 'Plus', credits: 50, price: 29.99, currency: 'EUR', popular: true },
  { id: 'pro', name: 'Pro', credits: 200, price: 79.99, currency: 'EUR' },
];

const mockRecentRegistrations: RecentRegistration[] = [
  { id: 'reg_001', title: 'Documento de prueba', status: 'registered', date: '2023-01-10T10:00:00Z', type: 'document', certificateUrl: '/api/certificates/reg_001/pdf' },
  { id: 'reg_002', title: 'Prueba certificación con SHA-512', status: 'registered', date: '2022-12-12T10:00:00Z', type: 'document', certificateUrl: '/api/certificates/reg_002/pdf' },
  { id: 'reg_003', title: 'Registro público (factura regalo)', status: 'registered', date: '2022-11-26T10:00:00Z', type: 'document', certificateUrl: '/api/certificates/reg_003/pdf' },
  { id: 'reg_004', title: 'Bexiqo promo', status: 'registered', date: '2022-11-26T09:00:00Z', type: 'audio', certificateUrl: '/api/certificates/reg_004/pdf' },
  { id: 'reg_005', title: 'Demo track master', status: 'processing', date: '2026-03-08T08:00:00Z', type: 'audio' },
  { id: 'reg_006', title: 'Videoclip oficial v2', status: 'failed', date: '2026-03-07T15:00:00Z', type: 'video' },
];

// ── API functions (mock, swap for real fetch calls) ─────────

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  await delay(800);
  return mockSummary;
}

export async function submitPromotionRequest(data: PromotionRequest): Promise<{ success: boolean }> {
  await delay(1200);
  console.log('[API] POST /api/promotions/request', data);
  return { success: true };
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  await delay(600);
  return mockPlans;
}

export async function createCheckoutSession(planId: string): Promise<{ url: string }> {
  await delay(800);
  console.log('[API] POST /api/billing/create-checkout-session', { planId });
  return { url: '/pricing' };
}

export async function registerWork(data: WorkRegistration): Promise<{ registrationId: string; status: string }> {
  await delay(1500);
  console.log('[API] POST /api/works/register', data.title, data.type);
  return { registrationId: `reg_${Date.now()}`, status: 'processing' };
}

export async function verifyFile(file: File): Promise<VerificationResult> {
  await delay(1200);
  console.log('[API] POST /api/verify/file', file.name);
  // Mock: 50% chance found
  if (file.name.toLowerCase().includes('prueba') || Math.random() > 0.5) {
    return {
      found: true,
      registrationId: 'reg_12345',
      title: file.name.replace(/\.[^.]+$/, ''),
      registeredAt: '2026-03-08T10:00:00Z',
      certificateUrl: '/api/certificates/reg_12345/pdf',
    };
  }
  return { found: false };
}

export async function fetchRecentRegistrations(limit = 10): Promise<RecentRegistration[]> {
  await delay(700);
  return mockRecentRegistrations.slice(0, limit);
}
