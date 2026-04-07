/**
 * Attribution helper — captures UTM params, coupon, ref from URL on first visit.
 * Persists in localStorage with a 30-day TTL.
 * Used at registration and checkout to attribute users/orders to campaigns.
 */

const STORAGE_KEY = 'md_attribution';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  coupon?: string;
  ref?: string;
  referrer?: string;
  landing_path?: string;
  captured_at: number;
}

/** Read current attribution from localStorage (returns null if expired or missing) */
export function getAttribution(): AttributionData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: AttributionData = JSON.parse(raw);
    if (Date.now() - data.captured_at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Capture UTMs from current URL. Only writes if no existing attribution (first-touch). */
export function captureAttribution(): void {
  // Don't overwrite existing first-touch data
  if (getAttribution()) return;

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get('utm_source') || undefined;
  const utm_medium = params.get('utm_medium') || undefined;
  const utm_campaign = params.get('utm_campaign') || undefined;
  const utm_content = params.get('utm_content') || undefined;
  const utm_term = params.get('utm_term') || undefined;
  const coupon = params.get('coupon') || params.get('promo') || undefined;
  const ref = params.get('ref') || undefined;

  // Only store if there's at least one trackable param or external referrer
  const hasParams = utm_source || utm_medium || utm_campaign || coupon || ref;
  const referrer = document.referrer && !document.referrer.includes(window.location.hostname)
    ? document.referrer
    : undefined;

  if (!hasParams && !referrer) return;

  const data: AttributionData = {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    coupon,
    ref,
    referrer,
    landing_path: window.location.pathname,
    captured_at: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or blocked — fail silently
  }
}

/** Clear stored attribution (e.g. after successful registration + save) */
export function clearAttribution(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Build metadata object for Stripe checkout from attribution */
export function getAttributionForCheckout(): Record<string, string> {
  const attr = getAttribution();
  if (!attr) return {};
  const result: Record<string, string> = {};
  if (attr.utm_source) result.utm_source = attr.utm_source;
  if (attr.utm_medium) result.utm_medium = attr.utm_medium;
  if (attr.utm_campaign) result.utm_campaign = attr.utm_campaign;
  if (attr.utm_content) result.utm_content = attr.utm_content;
  if (attr.utm_term) result.utm_term = attr.utm_term;
  if (attr.coupon) result.coupon_code = attr.coupon;
  if (attr.ref) result.referrer_code = attr.ref;
  if (attr.referrer) result.referrer = attr.referrer;
  if (attr.landing_path) result.landing_path = attr.landing_path;
  if (attr.utm_campaign) result.attributed_campaign_name = attr.utm_campaign;
  return result;
}
