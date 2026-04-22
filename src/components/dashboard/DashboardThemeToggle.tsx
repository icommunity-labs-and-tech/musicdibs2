import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface DashboardThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function DashboardThemeToggle({ theme, onToggle }: DashboardThemeToggleProps) {
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const label = isDark
    ? t('dashboard.theme.switchToLight', { defaultValue: 'Cambiar a modo claro' })
    : t('dashboard.theme.switchToDark', { defaultValue: 'Cambiar a modo oscuro' });

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
