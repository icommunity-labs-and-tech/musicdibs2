import { useEffect, useRef } from 'react';
import { useNotifications, type DashboardNotification } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function NotificationToaster() {
  const { notifications } = useNotifications();
  const shownRef = useRef(new Set<string>());

  useEffect(() => {
    for (const n of notifications) {
      if (shownRef.current.has(n.id)) continue;
      shownRef.current.add(n.id);

      const Icon = iconMap[n.type];
      toast(n.title, {
        description: n.message,
        icon: <Icon className={`h-4 w-4 ${n.type === 'success' ? 'text-emerald-500' : n.type === 'error' ? 'text-destructive' : 'text-primary'}`} />,
        duration: 5000,
      });
    }
  }, [notifications]);

  return null;
}
