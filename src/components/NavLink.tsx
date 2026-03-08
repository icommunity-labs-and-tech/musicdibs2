import { Link, useLocation, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps extends LinkProps {
  activeClassName?: string;
  end?: boolean;
}

export function NavLink({ to, className, activeClassName, end, children, ...props }: NavLinkProps) {
  const location = useLocation();
  const toStr = typeof to === 'string' ? to : '';
  const isActive = end
    ? location.pathname === toStr
    : location.pathname.startsWith(toStr);

  return (
    <Link
      to={to}
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
}
