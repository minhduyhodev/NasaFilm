import React from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  pageTransition,
  smoothEase,
  pageTransitionMs,
} from '../utils/motionPresets';
import './PageTransition.css';

/**
 * Soft fade between routes. AnimatePresence initial={false} skips the first paint;
 * every subsequent pathname change fades out/in.
 */
const PageTransition = ({ children, className = '', scrollTarget }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    if (scrollTarget) {
      const el = document.querySelector(scrollTarget);
      if (el) el.scrollTop = 0;
    }
  }, [location.pathname, scrollTarget]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className={`page-transition-root ${className}`.trim()}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: reduceMotion ? 0 : pageTransitionMs,
          ease: smoothEase,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
