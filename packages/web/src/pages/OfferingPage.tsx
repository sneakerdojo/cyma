import { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProductDetailPage from '../components/ProductDetailPage';
import SEO, { buildOfferingJsonLd } from '../components/SEO';
import {
  getOfferingBySlug,
  SHOW_PUBLIC_PRICING,
  type Category,
} from '../data/products';

interface Props {
  /**
   * Restricts the route to a single category. `/products/:slug` only resolves
   * for products; `/services/:slug` only resolves for services. Mismatch
   * redirects to home.
   */
  expectCategory: Category;
}

/**
 * Route handler for `/products/:slug` and `/services/:slug`.
 *
 * Looks the slug up in the offering catalogue, ensures it matches the
 * expected category, and renders the shared `ProductDetailPage` template.
 * Unknown slugs redirect to the home page.
 */
export default function OfferingPage({ expectCategory }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const offering = slug ? getOfferingBySlug(slug) : undefined;

  // Update the document title so search + tab UI reflect the offering.
  useEffect(() => {
    if (offering) {
      const previous = document.title;
      document.title = `${offering.name} — Octio`;
      return () => {
        document.title = previous;
      };
    }
  }, [offering]);

  if (!offering) {
    return <Navigate to="/" replace />;
  }

  if (offering.category !== expectCategory) {
    // Slug exists but is in the wrong category bucket. Send them to the
    // correct URL rather than a 404 — internal links may have drifted.
    const correctPath =
      offering.category === 'product'
        ? `/products/${offering.slug}`
        : `/services/${offering.slug}`;
    return <Navigate to={correctPath} replace />;
  }

  // Build the canonical path that matches the route — products vs services
  const path = `/${offering.category === 'product' ? 'products' : 'services'}/${offering.slug}`;

  // Use the first pricing tier as the "from" price for structured data —
  // omitted from JSON-LD when public pricing is hidden so we don't surface
  // a price in search results that doesn't match the page.
  const firstTierPrice = SHOW_PUBLIC_PRICING
    ? offering.pricing[0]?.priceFrom?.replace(/[^\d]/g, '') || '0'
    : '0';

  return (
    <>
      <SEO
        title={offering.name}
        description={offering.tagline + ' ' + offering.botSummary}
        path={path}
        jsonLd={buildOfferingJsonLd({
          name: offering.name,
          description: offering.tagline,
          slug: offering.slug,
          category: offering.category,
          priceFromZAR: firstTierPrice,
        })}
      />
      <Navbar />
      <ProductDetailPage product={offering} />
      <Footer />
      {/* Skip-link for keyboard nav back to top */}
      <Link
        to="#"
        className="sr-only focus:not-sr-only fixed bottom-6 right-6 z-50 px-4 py-2 rounded-full bg-orange text-bg font-semibold"
      >
        Back to top
      </Link>
    </>
  );
}
