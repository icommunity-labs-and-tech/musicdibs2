import { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: boolean;
}

export const ScrollReveal = ({ 
  children, 
  delay = 0, 
  duration = 700, 
  distance = 40,
  className,
  direction = 'up',
  scale = false,
}: ScrollRevealProps) => {
  const { ref, isInView } = useInView();

  const getTransform = () => {
    if (isInView) return 'translate3d(0,0,0) scale(1)';
    const scaleVal = scale ? 'scale(0.95)' : 'scale(1)';
    switch (direction) {
      case 'down': return `translate3d(0,${-distance}px,0) ${scaleVal}`;
      case 'left': return `translate3d(${distance}px,0,0) ${scaleVal}`;
      case 'right': return `translate3d(${-distance}px,0,0) ${scaleVal}`;
      default: return `translate3d(0,${distance}px,0) ${scaleVal}`;
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "will-change-transform",
        isInView ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        transform: getTransform(),
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// Wrapper for staggered grid animations
interface StaggerGridProps {
  children: ReactNode[];
  baseDelay?: number;
  staggerDelay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  direction?: 'up' | 'left' | 'right';
  scale?: boolean;
}

export const StaggerGrid = ({
  children,
  baseDelay = 100,
  staggerDelay = 120,
  duration = 700,
  distance = 40,
  className,
  direction = 'up',
  scale = true,
}: StaggerGridProps) => {
  return (
    <>
      {children.map((child, index) => (
        <ScrollReveal
          key={index}
          delay={baseDelay + index * staggerDelay}
          duration={duration}
          distance={distance}
          className={className}
          direction={direction}
          scale={scale}
        >
          {child}
        </ScrollReveal>
      ))}
    </>
  );
};
