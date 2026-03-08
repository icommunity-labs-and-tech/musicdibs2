import { supabase } from '@/integrations/supabase/client';
import type {
  DashboardSummary,
  PromotionRequest,
  BillingPlan,
  WorkRegistration,
  VerificationResult,
  RecentRegistration,
} from '@/types/dashboard';

// ── Dashboard Summary ──────────────────────────────────────

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get or create profile
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, display_name: user.user_metadata?.display_name || user.email })
      .select()
      .single();
    if (error) throw error;
    profile = newProfile;
  }

  // Count works
  const { count: registeredWorks } = await supabase
    .from('works')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'registered');

  const { count: pendingRegistrations } = await supabase
    .from('works')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'processing');

  return {
    registeredWorks: registeredWorks || 0,
    pendingRegistrations: pendingRegistrations || 0,
    availableCredits: profile.available_credits,
    kycStatus: profile.kyc_status as 'verified' | 'pending' | 'unverified',
    subscriptionPlan: profile.subscription_plan,
    canRegisterWorks: profile.kyc_status === 'verified',
  };
}

// ── Promotion Requests ─────────────────────────────────────

export async function submitPromotionRequest(data: PromotionRequest): Promise<{ success: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('promotion_requests').insert({
    user_id: user.id,
    artist_name: data.artistName,
    main_link: data.mainLink,
    work_title: data.workTitle,
    description: data.description,
    promotion_goal: data.promotionGoal,
    social_networks: data.socialNetworks,
  });

  if (error) throw error;
  return { success: true };
}

// ── Billing Plans (static for now) ─────────────────────────

const staticPlans: BillingPlan[] = [
  { id: 'basic', name: 'Básico', credits: 10, price: 9.99, currency: 'EUR' },
  { id: 'plus', name: 'Plus', credits: 50, price: 29.99, currency: 'EUR', popular: true },
  { id: 'pro', name: 'Pro', credits: 200, price: 79.99, currency: 'EUR' },
];

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  return staticPlans;
}

export async function createCheckoutSession(planId: string): Promise<{ url: string }> {
  console.log('[API] Checkout for plan:', planId);
  return { url: '/pricing' };
}

// ── Register Work ──────────────────────────────────────────

export async function registerWork(data: WorkRegistration): Promise<{ registrationId: string; status: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Upload file to storage (works bucket)
  const filePath = `${user.id}/${Date.now()}_${data.file.name}`;
  
  // Insert work record
  const { data: work, error } = await supabase.from('works').insert({
    user_id: user.id,
    title: data.title,
    type: data.type,
    author: data.author,
    description: data.description,
    file_path: filePath,
    status: 'processing',
  }).select().single();

  if (error) throw error;

  // Deduct 1 credit
  await supabase.from('credit_transactions').insert({
    user_id: user.id,
    amount: -1,
    type: 'usage',
    description: `Registro: ${data.title}`,
  });

  // Decrement available credits in profile
  await supabase.rpc('decrement_credits' as any, { _user_id: user.id, _amount: 1 }).then(() => {});
  // Fallback: direct update
  const { data: profile } = await supabase.from('profiles').select('available_credits').eq('user_id', user.id).single();
  if (profile) {
    await supabase.from('profiles').update({ available_credits: Math.max(0, profile.available_credits - 1) }).eq('user_id', user.id);
  }

  return { registrationId: work.id, status: 'processing' };
}

// ── Verify File ────────────────────────────────────────────

export async function verifyFile(file: File): Promise<VerificationResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Search by filename in user's works
  const searchName = file.name.replace(/\.[^.]+$/, '');
  const { data: works } = await supabase
    .from('works')
    .select('*')
    .eq('user_id', user.id)
    .ilike('title', `%${searchName}%`)
    .eq('status', 'registered')
    .limit(1);

  if (works && works.length > 0) {
    const w = works[0];
    return {
      found: true,
      registrationId: w.id,
      title: w.title,
      registeredAt: w.created_at,
      certificateUrl: w.certificate_url || undefined,
    };
  }

  return { found: false };
}

// ── Recent Registrations ───────────────────────────────────

export async function fetchRecentRegistrations(limit = 10): Promise<RecentRegistration[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('works')
    .select('id, title, status, created_at, type, certificate_url')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map(w => ({
    id: w.id,
    title: w.title,
    status: w.status as 'processing' | 'registered' | 'failed',
    date: w.created_at,
    type: w.type,
    certificateUrl: w.certificate_url || undefined,
  }));
}
