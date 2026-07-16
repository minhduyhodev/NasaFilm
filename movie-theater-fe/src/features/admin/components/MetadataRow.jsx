import React from 'react';

/**
 * Level 3 — label + value field pair (16px internal spacing via parent grid gap-4).
 */
const MetadataRow = ({ label, value, children, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <dt className="adm-label !mb-1">{label}</dt>
    <dd className="amd-meta__value">
      {children ?? value ?? '—'}
    </dd>
  </div>
);

export default MetadataRow;
