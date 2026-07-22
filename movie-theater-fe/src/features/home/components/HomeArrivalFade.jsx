import { useEffect, useState } from 'react';
import { COSMOS_HOME_TRANSITION_KEY } from '../../auth/components/CosmosHomeTransition.jsx';
import './HomeArrivalFade.css';

/** Soft fade-in when arriving from auth cosmos zoom transition. */
export function HomeArrivalFade() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let fromAuth = false;
    try {
      fromAuth = sessionStorage.getItem(COSMOS_HOME_TRANSITION_KEY) === '1';
      if (fromAuth) sessionStorage.removeItem(COSMOS_HOME_TRANSITION_KEY);
    } catch {
      /* ignore */
    }
    if (!fromAuth) return undefined;

    setShow(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setShow(false), reduced ? 150 : 700);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return <div className="home-arrival-fade" aria-hidden="true" />;
}

export default HomeArrivalFade;
