import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

/**
 * WebsiteSEO — injects page-level meta tags via DOM manipulation.
 * Used on all public marketing pages. Cleans up on unmount.
 */
export function WebsiteSEO({ title, description, canonical, ogImage }: SEOProps) {
  useEffect(() => {
    const fullTitle = `${title} | DevaSeva`;
    document.title = fullTitle;

    function setMeta(name: string, content: string, useProperty = false) {
      const attr = useProperty ? 'property' : 'name';
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    }

    function setLink(rel: string, href: string) {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    }

    setMeta('description', description);
    setMeta('og:type', 'website', true);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', fullTitle);
    setMeta('twitter:description', description);

    if (ogImage) setMeta('og:image', ogImage, true);
    if (canonical) setLink('canonical', canonical);
    if (canonical) setMeta('og:url', canonical, true);
  }, [title, description, canonical, ogImage]);

  return null;
}
