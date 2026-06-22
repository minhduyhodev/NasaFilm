import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  tabTransition,
  smoothEase,
  tabTransitionMs,
} from '../utils/motionPresets';
import './PageTransition.css';

const TabTransition = ({ activeKey, children, className = '' }) => {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        className={`tab-transition-root ${className}`.trim()}
        variants={tabTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: reduceMotion ? 0 : tabTransitionMs, ease: smoothEase }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default TabTransition;
