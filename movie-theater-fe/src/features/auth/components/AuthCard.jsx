import { motion } from 'framer-motion';
import './AuthCard.css';

export const AuthCard = ({ children, title, subtitle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="auth-card"
    >
      <div className="auth-card__inner">
        <header className="auth-card__header">
          <h2 className="auth-card__title">{title}</h2>
          {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
        </header>
        <div className="auth-card__body">{children}</div>
      </div>
    </motion.div>
  );
};

export default AuthCard;
