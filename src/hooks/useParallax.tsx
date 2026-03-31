import { useEffect, useState, useRef, useCallback } from 'react';

interface UseParallaxOptions {
  speed?: number;
  clamp?: boolean;
}

export const useParallax = ({ speed = 0.3 }: UseParallaxOptions = {}) => {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLElement | null>(null);
  const ticking = useRef(false);
  // Cache element dimensions to avoid forced reflow on every scroll
  const cachedTop = useRef<number | null>(null);
  const cachedHeight = useRef<number>(0);

  const cachePosition = useCallback(() => {
    const element = ref.current;
    if (element) {
      const rect = element.getBoundingClientRect();
      cachedTop.current = rect.top + window.scrollY;
      cachedHeight.current = rect.height;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;

    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;

      if (cachedTop.current !== null) {
        const elementTop = cachedTop.current;
        if (scrollY + viewportHeight > elementTop && scrollY < elementTop + cachedHeight.current) {
          const relativeScroll = scrollY - elementTop;
          setOffset(relativeScroll * speed);
        }
      } else {
        setOffset(scrollY * speed);
      }

      ticking.current = false;
    });
  }, [speed]);

  useEffect(() => {
    // Cache position once on mount and on resize
    cachePosition();
    window.addEventListener('resize', cachePosition, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', cachePosition);
    };
  }, [handleScroll, cachePosition]);

  return { offset, ref };
};
