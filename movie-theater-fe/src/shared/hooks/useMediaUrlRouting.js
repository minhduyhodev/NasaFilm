import { useEffect, useState } from 'react';
import { initMediaUrlRouting } from '../utils/mediaUrlUtils';

export const useMediaUrlRouting = () => {
  const [routingVersion, setRoutingVersion] = useState(0);

  useEffect(() => {
    const bump = () => setRoutingVersion((value) => value + 1);

    window.addEventListener('media-routing-ready', bump);
    initMediaUrlRouting().finally(bump);

    return () => window.removeEventListener('media-routing-ready', bump);
  }, []);

  return routingVersion;
};
