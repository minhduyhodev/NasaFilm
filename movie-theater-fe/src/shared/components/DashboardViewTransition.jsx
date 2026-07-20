import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  dashboardCardStagger,
  dashboardCardTransition,
  dashboardCardTransitionMs,
  smoothEase,
} from '../utils/motionPresets';
import './PageTransition.css';

/**
 * Staggered per-card slide: old cards exit left + fade, new cards enter from right.
 * Wrap each visual block in `.dash-motion-card` (or pass as direct children).
 */
const DashboardViewTransition = ({
  activeKey,
  direction = 1,
  children,
  className = '',
}) => {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : dashboardCardTransitionMs;

  return (
    <div className={`dashboard-view-transition ${className}`.trim()}>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={activeKey}
          className="dashboard-view-transition__stage"
          custom={direction}
          variants={{
            initial: {},
            animate: {
              transition: reduceMotion ? undefined : dashboardCardStagger.animate,
            },
            exit: {
              transition: reduceMotion ? undefined : dashboardCardStagger.exit,
            },
          }}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {Array.isArray(children)
            ? children.map((child, index) => (
                <motion.div
                  key={child?.key || `dash-card-${index}`}
                  className="dash-motion-card"
                  custom={direction}
                  variants={dashboardCardTransition}
                  transition={{ duration, ease: smoothEase }}
                >
                  {child}
                </motion.div>
              ))
            : (
              <motion.div
                className="dash-motion-card"
                custom={direction}
                variants={dashboardCardTransition}
                transition={{ duration, ease: smoothEase }}
              >
                {children}
              </motion.div>
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DashboardViewTransition;
