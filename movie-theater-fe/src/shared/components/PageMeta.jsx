import { useEffect } from 'react';

const upsertMeta = (attr, key, content) => {
  if (!content || typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const PageMeta = ({
  title,
  description,
  image,
  url,
}) => {
  useEffect(() => {
    if (title) {
      document.title = title.includes('NASAFILM') ? title : `${title} | NASAFILM`;
    }
    if (description) {
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:description', description);
      upsertMeta('name', 'twitter:description', description);
    }
    if (title) {
      upsertMeta('property', 'og:title', document.title);
      upsertMeta('name', 'twitter:title', document.title);
    }
    const pageUrl = url || window.location.href;
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    if (image) {
      upsertMeta('property', 'og:image', image);
      upsertMeta('name', 'twitter:image', image);
    }
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'NASAFILM');
  }, [title, description, image, url]);

  return null;
};

export default PageMeta;
