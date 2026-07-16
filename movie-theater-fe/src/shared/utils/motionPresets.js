/** Soft cinema fades — opacity-first, tiny lift, no heavy motion */

export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const tabTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const softFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const smoothEase = [0.16, 1, 0.3, 1];

export const pageTransitionMs = 0.3;
export const tabTransitionMs = 0.22;
export const softFadeMs = 0.2;
