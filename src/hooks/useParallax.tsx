import { useEffect, useState, useRef, useCallback } from 'react';

interface UseParallaxOptions {
  speed?: number; // 0 = no movement, 1 = full scroll speed
  clamp?: boolean;
}

export const useParallax = ({ speed = 0.3, clamp = true }: UseParallaxOptions = {}) => {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLElement | null>(null);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const element = ref.current;

      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + scrollY;
        const viewportHeight = window.innerHeight;

        // Only apply parallax when element is in or near viewport
        if (scrollY + viewportHeight > elementTop && scrollY < elementTop + rect.height) {
          const relativeScroll = scrollY - elementTop;
          setOffset(relativeScroll * speed);
        }
      } else {
        // Fallback: just use raw scroll position
        setOffset(scrollY * speed);
      }

      ticking.current = false;
    });
  }, [speed]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { offset, ref };
};
