import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  tabTransition,
  smoothEase,
  tabTransitionMs,
} from '../utils/motionPresets';
import './PageTransition.css';

/**
 * Soft fade when switching tabs / filter pills.
 * Pass a stable activeKey (e.g. tab id) so content remounts with fade.
 */
const TabTransition = ({ activeKey, children, className = '' }) => {
  const reduceMotion = useReducedMotion();
  const key = activeKey ?? 'default';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        className={`tab-transition-root ${className}`.trim()}
        variants={tabTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: reduceMotion ? 0 : tabTransitionMs,
          ease: smoothEase,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default TabTransition;
