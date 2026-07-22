import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CosmosHomeTransition.css';

export const COSMOS_HOME_TRANSITION_KEY = 'nasafilm-cosmos-home-in';

const OVERLAY_ID = 'cosmos-home-transition-root';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function removeOverlay() {
  const el = document.getElementById(OVERLAY_ID);
  if (el) el.remove();
  document.body.classList.remove('cosmos-home-transition-lock');
}

function pauseHeavyAuthLayers() {
  // Freeze constellation/canvas work during transition (major jank source)
  document.querySelectorAll('.cinema-auth-bg__canvas, .cinema-auth-bg__constellations').forEach((el) => {
    el.style.visibility = 'hidden';
  });
}

function mountOverlay() {
  removeOverlay();
  pauseHeavyAuthLayers();

  const root = document.createElement('div');
  root.id = OVERLAY_ID;
  root.className = 'cosmos-home-transition';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="cosmos-home-transition__nebula"></div>
    <div class="cosmos-home-transition__fade"></div>
  `;
  document.body.appendChild(root);
  document.body.classList.add('cosmos-home-transition-lock');
  void root.offsetWidth;
  root.classList.add('cosmos-home-transition--play');
  return root;
}

/** Lightweight cosmos zoom; transform/opacity only. */
export function playCosmosHomeTransition({ durationMs = 3400, onDone } = {}) {
  if (typeof document === 'undefined') {
    onDone?.();
    return () => {};
  }

  const wait = prefersReducedMotion() ? 220 : durationMs;
  mountOverlay();

  try {
    sessionStorage.setItem(COSMOS_HOME_TRANSITION_KEY, '1');
  } catch {
    /* ignore */
  }

  const timer = window.setTimeout(() => {
    onDone?.();
    window.setTimeout(removeOverlay, 60);
  }, wait);

  return () => {
    window.clearTimeout(timer);
    removeOverlay();
  };
}

/** Hook: brand click → cosmos zoom → navigate home. */
export function useCosmosHomeTransition({ to = '/', durationMs = 3400 } = {}) {
  const navigate = useNavigate();
  const busyRef = useRef(false);
  const cleanupRef = useRef(null);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    []
  );

  const startTransition = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (busyRef.current) return;
      busyRef.current = true;

      cleanupRef.current = playCosmosHomeTransition({
        durationMs,
        onDone: () => {
          navigate(to);
          busyRef.current = false;
        },
      });
    },
    [durationMs, navigate, to]
  );

  return { startTransition };
}

export default useCosmosHomeTransition;
