
const VARIANT_MAP = {
  success: 'adm-badge--success',
  warning: 'adm-badge--warning',
  danger: 'adm-badge--danger',
  info: 'adm-badge--info',
  accent: 'adm-badge--accent',
  muted: 'adm-badge--muted',
};

/**
 * Soft pill status badge — semantic variants only (no decorative colors).
 */
const StatusBadge = ({ children, variant = 'muted', className = '', title }) => {
  const variantClass = VARIANT_MAP[variant] || VARIANT_MAP.muted;
  return (
    <span className={`adm-badge ${variantClass}${className ? ` ${className}` : ''}`} title={title}>
      {children}
    </span>
  );
};

export default StatusBadge;
