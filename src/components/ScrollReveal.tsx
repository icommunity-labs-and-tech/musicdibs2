import { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

export const ScrollReveal = ({ 
  children, 
  delay = 0, 
  duration = 600, 
  distance = 30,
  className 
}: ScrollRevealProps) => {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out",
        isInView 
          ? "opacity-100 translate-y-0" 
          : "opacity-0",
        className
      )}
      style={{
        transform: isInView ? 'translateY(0)' : `translateY(${distance}px)`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};