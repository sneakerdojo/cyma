import { Helmet } from 'react-helmet-async';

/**
 * Per-route SEO + structured-data wrapper.
 *
 * Drop into any page to set its title, meta description, canonical URL,
 * Open Graph + Twitter cards, and (optionally) inline JSON-LD structured
 * data for rich snippets.
 *
 * Reads from a small config of sensible Octio defaults so callers only
 * need to pass what's specific to that page.
 */

const SITE_NAME = 'Octio';
const SITE_URL = 'https://octio.co.za';
const DEFAULT_OG_IMAGE = `${SITE_URL}/octio-logo-full.png`;
const DEFAULT_DESCRIPTION =
  'Octio is a pure-play AI company. We build, deploy, and train autonomous AI agents that run your marketing, manage your leads, automate your back-office, and develop custom software at unprecedented speeds.';

interface SEOProps {
  /** Page-specific title. Combined with site name as "Title — Octio". */
  title: string;
  /** 1-2 sentences for SERP and social card. ~155 char sweet spot. */
  description?: string;
  /** Path under SITE_URL for canonical + og:url. e.g. "/products/lead-generation" */
  path: string;
  /** Override the default Octio social card image. */
  ogImage?: string;
  /** "website" | "article" — defaults to "website". */
  ogType?: string;
  /** Inline JSON-LD payload for rich snippets (Organization, Product, etc.). */
  jsonLd?: object | object[];
  /** If true, page is excluded from search indexing (dev-only / private routes). */
  noindex?: boolean;
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  jsonLd,
  noindex = false,
}: SEOProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
  const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_ZA" />

      {/* Twitter card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured data */}
      {jsonLdArray.map((entry, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(entry)}
        </script>
      ))}
    </Helmet>
  );
}

// ---------------------------------------------------------------------------
// JSON-LD builders — keep callers concise and consistent
// ---------------------------------------------------------------------------

/** Octio's company-level structured data. Use on the homepage. */
export const OCTIO_ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/octio-logo-full.png`,
  description: DEFAULT_DESCRIPTION,
  founder: {
    '@type': 'Person',
    name: 'Simekani Nimabambe',
  },
  foundingDate: '2023',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Pretoria',
    addressCountry: 'ZA',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    email: 'hello@octio.co.za',
    areaServed: ['ZA', 'Worldwide'],
    availableLanguage: ['en'],
  },
  sameAs: [
    // Add LinkedIn, X, etc. when set up
  ],
};

interface ProductJsonLdInput {
  name: string;
  description: string;
  slug: string;
  category: 'product' | 'service';
  priceFromZAR: string;
}

/**
 * Builds Product or Service structured data for a detail page.
 * Schema.org/Product covers both software products and services.
 */
export function buildOfferingJsonLd(input: ProductJsonLdInput): object {
  const url = `${SITE_URL}/${input.category === 'product' ? 'products' : 'services'}/${input.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': input.category === 'product' ? 'Product' : 'Service',
    name: input.name,
    description: input.description,
    url,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ZAR',
      price: input.priceFromZAR,
      availability: 'https://schema.org/InStock',
      url,
    },
  };
}

/** WebSite schema for the homepage — enables sitelinks search box in Google. */
export const OCTIO_WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
};
