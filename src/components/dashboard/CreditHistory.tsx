import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
};

export function CreditHistory() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const TYPE_CONFIG: Record<string, { label: string; icon: typeof ArrowUpCircle; color: string }> = {
    purchase: { label: t('dashboard.creditHistory.purchase'), icon: ArrowUpCircle, color: 'text-emerald-500' },
    renewal: { label: t('dashboard.creditHistory.renewal'), icon: RefreshCw, color: 'text-blue-500' },
    consumption: { label: t('dashboard.creditHistory.consumption'), icon: ArrowDownCircle, color: 'text-orange-500' },
  };

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setTransactions(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">{t('dashboard.creditHistory.loading')}</CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> {t('dashboard.creditHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {t('dashboard.creditHistory.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> {t('dashboard.creditHistory.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
          {transactions.map((tx) => {
            const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.purchase;
            const Icon = config.icon;
            const isPositive = tx.amount > 0 && tx.type !== 'consumption';
            return (
              <div key={tx.id} className="flex items-center gap-3 px-6 py-3">
                <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{tx.description || config.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString(lang, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Badge variant={isPositive ? 'default' : 'secondary'} className="shrink-0 tabular-nums">
                  {isPositive ? '+' : ''}{tx.amount}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
