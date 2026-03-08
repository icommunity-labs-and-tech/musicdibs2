import { useMemo } from 'react';

export interface ABVariant {
  text: string;
  variant?: string; // button variant
  className?: string; // extra classes
}

export interface ABTest {
  id: string;
  variants: ABVariant[];
}

/**
 * Returns a consistent variant per session for the given test ID.
 * Sends a GA4 event when the variant is first assigned.
 */
export const useABTest = (test: ABTest): ABVariant & { variantIndex: number } => {
  const { id, variants } = test;

  const variantIndex = useMemo(() => {
    const storageKey = `ab_${id}`;
    const stored = sessionStorage.getItem(storageKey);
    if (stored !== null) {
      const idx = parseInt(stored, 10);
      if (idx >= 0 && idx < variants.length) return idx;
    }
    const idx = Math.floor(Math.random() * variants.length);
    sessionStorage.setItem(storageKey, String(idx));

    // Send GA4 experiment event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'ab_test_impression', {
        test_id: id,
        variant_index: idx,
        variant_text: variants[idx].text,
      });
    }
    return idx;
  }, [id, variants.length]);

  return { ...variants[variantIndex], variantIndex };
};

/**
 * Track a CTA click with the A/B variant info
 */
export const trackABClick = (testId: string, variantIndex: number, label: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'ab_test_click', {
      test_id: testId,
      variant_index: variantIndex,
      variant_text: label,
    });
  }
};
