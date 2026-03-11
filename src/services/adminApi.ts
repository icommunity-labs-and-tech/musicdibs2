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
  getAllWorks: (offset = 0, status_filter = '', search = '') => adminAction('get_all_works', { offset, status_filter, search }),
  getMetrics: () => adminAction('get_metrics'),
  getAllTransactions: (offset = 0, type_filter = '', date_from = '', date_to = '') => adminAction('get_all_transactions', { offset, type_filter, date_from, date_to }),
  searchUserByEmail: (email: string) => adminAction('search_user_by_email', { email }),
  exportCsv: (dataset: string) => adminAction('export_csv', { dataset }),
  getAdmins: () => adminAction('get_admins'),
  getAuditLog: (offset = 0, action_filter = '') => adminAction('get_audit_log', { offset, action_filter }),
};
