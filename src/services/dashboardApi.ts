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

  // Spend credits via secure edge function BEFORE processing
  const { data: spendResult, error: spendError } = await supabase.functions.invoke('spend-credits', {
    body: { feature: 'promote_work', description: `Promoción: ${data.workTitle}` },
  });
  if (spendError) throw new Error(spendError.message || 'Error al descontar créditos');
  if (spendResult?.error) throw new Error(spendResult.error);

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

  // Send email notification
  await supabase.functions.invoke('send-promotion-email', {
    body: {
      artistName: data.artistName,
      mainLink: data.mainLink,
      workTitle: data.workTitle,
      description: data.description,
      promotionGoal: data.promotionGoal,
      socialNetworks: data.socialNetworks,
    },
  });

  return { success: true };
}

// ── Register Work ──────────────────────────────────────────

export async function registerWork(data: WorkRegistration): Promise<{
  registrationId: string;
  status: string;
  certificateUrl?: string;
  blockchainHash?: string;
  ibsError?: string;
  evidenceId?: string;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Spend credits via secure edge function BEFORE uploading
  const { data: spendResult, error: spendError } = await supabase.functions.invoke('spend-credits', {
    body: { feature: 'register_work', description: `Registro: ${data.title}` },
  });
  if (spendError) throw new Error(spendError.message || 'Error al descontar créditos');
  if (spendResult?.error) throw new Error(spendResult.error);

  // Gather all files (primary + additional)
  const allFiles = data.files && data.files.length > 0 ? data.files : [data.file];

  // Compute SHA-256 hash of the primary file before upload
  const fileBuffer = await allFiles[0].arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const fileHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  console.log('[registerWork] Pre-upload file hash:', fileHash);

  // Upload all files to storage
  const filePaths: string[] = [];
  for (const f of allFiles) {
    const filePath = `${user.id}/${Date.now()}_${f.name}`;
    const { error: uploadError } = await supabase.storage
      .from('works-files')
      .upload(filePath, f);
    if (uploadError) throw new Error(`Error subiendo archivo: ${uploadError.message}`);
    filePaths.push(filePath);
  }

  // Insert work record with pre-computed hash (primary file path)
  const { data: work, error } = await supabase.from('works').insert({
    user_id: user.id,
    title: data.title,
    type: data.type,
    author: data.author,
    description: data.description,
    file_path: filePaths[0],
    file_hash: fileHash,
    status: 'processing',
  }).select().single();

  if (error) throw error;

  // Call real iBS registration
  const { data: ibsResult, error: ibsError } = await supabase.functions.invoke('register-work-ibs', {
    body: { workId: work.id, signatureId: data.signatureId, additionalFilePaths: filePaths.slice(1) },
  });

  if (ibsError) {
    console.error('[registerWork] IBS call error:', ibsError);
    return { registrationId: work.id, status: 'processing', ibsError: ibsError.message };
  }

  return {
    registrationId: work.id,
    status: ibsResult?.status || 'processing',
    certificateUrl: ibsResult?.certificateUrl,
    blockchainHash: ibsResult?.blockchainHash,
    ibsError: ibsResult?.success === false ? ibsResult.error : undefined,
    evidenceId: ibsResult?.evidenceId,
  };
}

// ── iBS Signatures ─────────────────────────────────────────

export async function createIbsSignature(signatureName: string): Promise<{ signatureId: string; kycUrl?: string }> {
  const { data, error } = await supabase.functions.invoke('ibs-signatures', {
    body: { action: 'create', signatureName },
  });
  if (error) throw new Error(error.message || 'Error creating signature');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listIbsSignatures(): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('ibs-signatures', {
    body: { action: 'list' },
  });
  if (error) throw new Error(error.message || 'Error listing signatures');
  return data?.signatures || [];
}

export async function syncIbsSignatures(): Promise<void> {
  await supabase.functions.invoke('ibs-signatures', {
    body: { action: 'sync' },
  });
}

export async function pollEvidenceStatus(evidenceId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ibs-signatures', {
    body: { action: 'poll_evidence', evidenceId },
  });
  if (error) throw new Error(error.message || 'Error polling evidence');
  return data;
}

// ── Verify File ────────────────────────────────────────────

export async function verifyFile(file: File): Promise<VerificationResult> {
  const buffer = await file.arrayBuffer();

  const sha256Buffer = await crypto.subtle.digest('SHA-256', buffer);
  const fileHash = Array.from(new Uint8Array(sha256Buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const bytesToBase64 = (bytes: Uint8Array) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const sha512Buffer = await crypto.subtle.digest('SHA-512', buffer);
  const fileHashSha512Base64 = bytesToBase64(new Uint8Array(sha512Buffer));

  console.log('[verifyFile] Computed hashes:', { fileHash, fileHashSha512Base64 });

  const { data, error } = await supabase.functions.invoke('verify-file', {
    body: { fileHash, fileHashSha512Base64 },
  });

  if (error) {
    console.error('[verifyFile] Edge function error:', error);
    return { found: false };
  }

  return data as VerificationResult;
}

// ── Recent Registrations ───────────────────────────────────

export async function fetchRecentRegistrations(limit = 10): Promise<RecentRegistration[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('works')
    .select('id, title, status, created_at, type, certificate_url, distributed_at, distribution_clicks, blockchain_hash, blockchain_network, checker_url, ibs_evidence_id, certified_at')
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
    distributedAt: (w as any).distributed_at || null,
    distributionClicks: (w as any).distribution_clicks || 0,
    blockchain_hash: w.blockchain_hash,
    blockchain_network: w.blockchain_network,
    checker_url: w.checker_url,
    ibs_evidence_id: w.ibs_evidence_id,
    certified_at: w.certified_at,
  }));
}
