export type LangCode = 'es' | 'en' | 'pt-BR';

const normalizeLang = (lang?: string): LangCode => {
  if (!lang) return 'es';
  if (lang.toLowerCase().startsWith('pt')) return 'pt-BR';
  const supported: LangCode[] = ['es', 'en', 'pt-BR'];
  return (supported.includes(lang as LangCode) ? (lang as LangCode) : 'en');
};

export const getNavLinks = (lang?: string) => {
  const l = normalizeLang(lang);
  const en = {
    faq: 'https://musicdibs.com/en/faq/',
    support: 'https://musicdibs.com/en/contact/',
    news: 'https://musicdibs.com/en/news/',
    dibs: 'https://musicdibs.com/dibs/en/',
    market: 'https://market.musicdibs.com/',
    verifier: 'https://musicdibs.com/en/verify-certification/',
    login: 'https://musicdibs.com/en/inicio-sesion/',
    distribution: {
      access: 'https://dist.musicdibs.com/',
      info: 'https://musicdibs.com/en/distribution/',
    },
  } as const;

  const es = {
    faq: 'https://musicdibs.com/faq',
    support: 'https://musicdibs.com/contacto/',
    news: 'https://musicdibs.com/noticias/',
    dibs: 'https://musicdibs.com/dibs/',
    market: 'https://market.musicdibs.com/',
    verifier: 'https://musicdibs.com/verificar/',
    login: 'https://musicdibs.com/inicio-sesion/',
    distribution: {
      access: 'https://dist.musicdibs.com/',
      info: 'https://musicdibs.com/distribucion/',
    },
  } as const;

  const pt = {
    faq: 'https://musicdibs.com/pt-br/faq',
    support: 'https://musicdibs.com/pt-br/contato/',
    news: 'https://musicdibs.com/en/news/', // fallback
    dibs: 'https://musicdibs.com/dibs/en/',
    market: 'https://market.musicdibs.com/',
    verifier: 'https://musicdibs.com/pt-br/verificar-documento/',
    login: 'https://musicdibs.com/pt-br/login/',
    distribution: {
      access: 'https://dist.musicdibs.com/',
      info: 'https://musicdibs.com/pt-br/distribucion/',
    },
  } as const;

  const mapping: Record<LangCode, typeof en | typeof es | typeof pt> = {
    en,
    es,
    'pt-BR': pt,
  };

  return mapping[l];
};

export const getFooterLinks = (lang?: string) => {
  const l = normalizeLang(lang);
  const en = {
    left: {
      verify: 'https://musicdibs.com/en/verify-certification/',
      legal: 'https://musicdibs.com/en/legal-and-technical-solidity/',
      support: 'https://musicdibs.com/en/contact/',
      partners: 'https://musicdibs.com/en/partners/',
      mediaKit: 'https://musicdibs.com/wp-content/uploads/2024/05/Media-Kit-Musicdibs.zip',
    },
    corporate: {
      contact: 'https://musicdibs.com/en/contact/',
      dibs: 'https://musicdibs.com/dibs/en',
      sla: 'https://musicdibs.com/en/service-level-agreement/',
      privacy: 'https://musicdibs.com/en/politica-de-privacidad/',
      terms: 'https://musicdibs.com/en/purchase-terms-and-condition/',
      cookies: 'https://musicdibs.com/en/cookie-policy/',
    },
  } as const;

  const es = {
    left: {
      verify: 'https://musicdibs.com/verificar/',
      legal: 'https://musicdibs.com/solidez-legal-y-tecnica/',
      support: 'https://musicdibs.com/contacto/',
      partners: 'https://musicdibs.com/partners/',
      mediaKit: 'https://musicdibs.com/wp-content/uploads/2024/05/Media-Kit-Musicdibs.zip',
    },
    corporate: {
      contact: 'https://musicdibs.com/contacto/',
      dibs: 'https://musicdibs.com/dibs/',
      sla: 'https://musicdibs.com/acuerdo-de-nivel-de-servicios/',
      privacy: 'https://musicdibs.com/politica-privacidad/',
      terms: 'https://musicdibs.com/compra-y-reembolso/',
      cookies: 'https://musicdibs.com/politica-de-cookies/',
    },
  } as const;

  const pt = {
    left: {
      verify: 'https://musicdibs.com/pt-br/verificar-documento/',
      legal: 'https://musicdibs.com/pt-br/solidez-juridica-e-tecnica/',
      support: 'https://musicdibs.com/pt-br/contato/',
      partners: 'https://musicdibs.com/pt-br/parceiros/',
      mediaKit: 'https://musicdibs.com/wp-content/uploads/2024/05/Media-Kit-Musicdibs.zip',
    },
    corporate: {
      contact: 'https://musicdibs.com/pt-br/contato/',
      dibs: 'https://musicdibs.com/dibs/en', // not provided, use EN
      sla: 'https://musicdibs.com/pt-br/acordo-de-nivel-de-servico/',
      privacy: 'https://musicdibs.com/pt-br/politica-de-privacidade-e-protecao-de-dados/',
      terms: 'https://musicdibs.com/pt-br/termos-e-condicoes/',
      cookies: 'https://musicdibs.com/pt-br/politica-de-cookies/',
    },
  } as const;

  const mapping: Record<LangCode, typeof en | typeof es | typeof pt> = {
    en,
    es,
    'pt-BR': pt,
  };

  return mapping[l];
};
