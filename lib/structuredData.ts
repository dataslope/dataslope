/**
 * schema.org JSON-LD builders.
 *
 * Rendered via the <JsonLd> component (app/_components/JsonLd.tsx) into
 * `<script type="application/ld+json">` tags. Unlike the Metadata API,
 * JSON-LD has no `metadataBase` resolution — every `url`/`@id` here must be
 * absolute, so we build them against `SITE_URL`.
 *
 * Coverage:
 *  - Organization + WebSite on the home page (brand entity / knowledge panel).
 *  - BreadcrumbList on every /learn page (breadcrumb rich result in SERPs).
 *  - Course on course landing pages (Course rich-result eligibility), marked
 *    free to match the site's "everything is free" positioning.
 */
import { SITE_URL } from "@/lib/site";

const ORG_NAME = "DataSlope";
const SITE_DESCRIPTION =
  "Free, interactive, no sign-up. Browser-based playgrounds and courses for Python, SQL, C++, and more — all running on WebAssembly.";

/** Resolves a site-relative path to an absolute URL for JSON-LD. */
export function absUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/** The publisher/provider entity, referenced by Course.provider too. */
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: ORG_NAME,
    url: SITE_URL,
    logo: absUrl("/dataslope-logo-blue.svg"),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: ORG_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface CourseLdInput {
  name: string;
  description?: string;
  url: string;
}

export function courseLd({ name, description, url }: CourseLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url,
    provider: {
      "@type": "Organization",
      name: ORG_NAME,
      url: SITE_URL,
    },
    // The site's defining promise: all course content is free.
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      category: "Free",
      price: 0,
      priceCurrency: "USD",
    },
  };
}
