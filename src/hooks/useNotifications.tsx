import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

// Simulated real-time events — replace with Supabase Realtime channel
const MOCK_EVENTS: Omit<DashboardNotification, 'id' | 'timestamp' | 'read'>[] = [
  { type: 'success', title: 'Registro completado', message: '"Demo track master" se ha registrado correctamente en blockchain.', registrationId: 'reg_005' },
  { type: 'error', title: 'Registro fallido', message: '"Videoclip oficial v2" no se pudo registrar. Inténtalo de nuevo.', registrationId: 'reg_006' },
  { type: 'info', title: 'Créditos añadidos', message: 'Se han añadido 50 créditos a tu cuenta.' },
  { type: 'success', title: 'Verificación completada', message: 'Tu identidad ha sido verificada correctamente.' },
];

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);

  // Simulate incoming notifications at intervals
  useEffect(() => {
    let idx = 0;
    // First notification after 3s, then every 15s
    const addNotification = () => {
      if (idx >= MOCK_EVENTS.length) return;
      const evt = MOCK_EVENTS[idx];
      const notif: DashboardNotification = {
        ...evt,
        id: `notif_${Date.now()}_${idx}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications(prev => [notif, ...prev]);
      idx++;
    };

    const firstTimer = setTimeout(addNotification, 3000);
    const interval = setInterval(addNotification, 15000);

    return () => { clearTimeout(firstTimer); clearInterval(interval); };
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
