import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  registrationId?: string;
}

interface NotificationsContextType {
  notifications: DashboardNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  useEffect(() => {
    // Subscribe to realtime changes on works table
    const channel = supabase
      .channel('works-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'works' },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          // Only notify on actual status changes (not distribution clicks etc.)
          if (!oldRow.status || oldRow.status === newRow.status) return;
          if (oldRow.status === 'registered' || oldRow.status === 'failed') return;

          let notif: DashboardNotification | null = null;

          if (newRow.status === 'registered') {
            notif = {
              id: `notif_${Date.now()}`,
              type: 'success',
              title: 'Registro completado',
              message: `"${newRow.title}" se ha registrado correctamente.`,
              timestamp: new Date().toISOString(),
              read: false,
              registrationId: newRow.id,
            };
          } else if (newRow.status === 'failed') {
            notif = {
              id: `notif_${Date.now()}`,
              type: 'error',
              title: 'Registro fallido',
              message: `"${newRow.title}" no se pudo registrar. Inténtalo de nuevo.`,
              timestamp: new Date().toISOString(),
              read: false,
              registrationId: newRow.id,
            };
          }

          if (notif) {
            setNotifications(prev => [notif!, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
