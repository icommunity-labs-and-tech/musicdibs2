import { supabase } from '@/integrations/supabase/client';

async function adminAction(action: string, payload: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('admin-action', {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || 'Admin action failed');
  if (data?.error) throw new Error(data.error);
  return data;
}

export const adminApi = {
  getUsers: (offset = 0, search = '') => adminAction('get_users', { offset, search }),
  adjustCredits: (user_id: string, amount: number, reason: string) => adminAction('adjust_credits', { user_id, amount, reason }),
  setKyc: (user_id: string, status: string) => adminAction('set_kyc', { user_id, status }),
  toggleBlock: (user_id: string, blocked: boolean) => adminAction('toggle_block', { user_id, blocked }),
  setAdminRole: (user_id: string, is_admin: boolean) => adminAction('set_admin_role', { user_id, is_admin }),
  setManagerRole: (user_id: string, is_manager: boolean) => adminAction('set_manager_role', { user_id, is_manager }),
  getAllWorks: (offset = 0, status_filter = '', search = '') => adminAction('get_all_works', { offset, status_filter, search }),
  getMetrics: () => adminAction('get_metrics'),
  getSaasMetrics: (filters?: { periodType?: string; weekStart?: string; month?: string; year?: string }) => adminAction('get_saas_metrics', filters || {}),
  getAllTransactions: (offset = 0, type_filter = '', date_from = '', date_to = '') => adminAction('get_all_transactions', { offset, type_filter, date_from, date_to }),
  searchUserByEmail: (email: string) => adminAction('search_user_by_email', { email }),
  exportCsv: (dataset: string) => adminAction('export_csv', { dataset }),
  getAdmins: () => adminAction('get_admins'),
  getAuditLog: (offset = 0, action_filter = '') => adminAction('get_audit_log', { offset, action_filter }),
  callAction: (action: string, payload: Record<string, any> = {}) => adminAction(action, payload),
  getPremiumPromos: (offset = 0, status_filter = '') => adminAction('get_premium_promos', { offset, status_filter }),
  updatePremiumPromoStatus: (promo_id: string, new_status: string, rejection_reason?: string, ig_url?: string, tiktok_url?: string) => adminAction('update_premium_promo_status', { promo_id, new_status, ...(rejection_reason ? { rejection_reason } : {}), ...(ig_url ? { ig_url } : {}), ...(tiktok_url ? { tiktok_url } : {}) }),
  deleteWork: (work_id: string) => adminAction('delete_work', { work_id }),
  getCampaignsCatalog: () => adminAction('get_campaigns_catalog'),
  saveCampaign: (campaign: Record<string, any>) => adminAction('save_campaign', campaign),
  getCampaignMetrics: (filters: { periodType?: string; weekStart?: string; month?: string; year?: string }) => adminAction('get_campaign_metrics', filters),
  getCampaignDetail: (campaign_name: string) => adminAction('get_campaign_detail', { campaign_name }),
  backfillOrdersFromStripe: (dry_run = false, limit?: number) => adminAction('backfill_orders_from_stripe', { dry_run, limit }),
  getUserPurchases: (user_id: string) => adminAction('get_user_purchases', { user_id }),
  getLibraryStatus: (user_id: string) => adminAction('get_library_status', { user_id }),
  getConsistencyReport: (limit = 50) => adminAction('get_consistency_report', { limit }),
  exportOrdersCsv: () => adminAction('export_csv', { dataset: 'orders' }),
};
