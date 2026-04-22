import { useDashboardTheme } from '@/hooks/useDashboardTheme';
import { DashboardThemeToggle } from '@/components/dashboard/DashboardThemeToggle';

interface AIStudioThemeBarProps {
  /** Optional extra classes for the wrapper. */
  className?: string;
}

/**
 * Mounts the internal dark/light theme on AI Studio pages and renders
 * a floating toggle in the top-right corner. The Navbar is hidden on
 * /ai-studio routes, so this gives the user a way to switch themes.
 */
export function AIStudioThemeBar({ className = '' }: AIStudioThemeBarProps) {
  const { theme, toggleTheme } = useDashboardTheme();

  return (
    <div
      className={`fixed top-4 right-4 z-50 rounded-full border border-border/40 bg-background/80 backdrop-blur-md shadow-sm ${className}`}
    >
      <DashboardThemeToggle theme={theme} onToggle={toggleTheme} />
    </div>
  );
}
