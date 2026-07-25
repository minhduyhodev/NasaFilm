import { useEffect, useRef, useState } from 'react';

/**
 * Mounts children when the section enters (or nears) the viewport.
 * Reduces initial JS execution and network work on long pages.
 */
const LazySection = ({
  children,
  fallback = null,
  rootMargin = '240px 0px',
  minHeight,
  className = '',
  as: Tag = 'div',
  ...rest
}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <Tag ref={ref} className={className} style={minHeight ? { minHeight } : undefined} {...rest}>
      {visible ? children : fallback}
    </Tag>
  );
};

export default LazySection;
