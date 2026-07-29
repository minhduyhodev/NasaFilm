/** Soft cinema fades — opacity-first, tiny lift, no heavy motion */

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const tabTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

/** Per-card dashboard swap: exit left / enter from right (flip when direction < 0). */
export const dashboardCardTransition = {
  initial: (direction = 1) => ({
    opacity: 0,
    x: direction > 0 ? 72 : -72,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction = 1) => ({
    opacity: 0,
    x: direction > 0 ? -72 : 72,
  }),
};

export const dashboardCardStagger = {
  animate: { staggerChildren: 0.09, delayChildren: 0.04 },
  exit: { staggerChildren: 0.07, staggerDirection: 1 },
};

export const softFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const smoothEase = [0.16, 1, 0.3, 1];

export const pageTransitionMs = 0.18;
export const tabTransitionMs = 0.22;
export const softFadeMs = 0.2;
export const dashboardCardTransitionMs = 0.36;
