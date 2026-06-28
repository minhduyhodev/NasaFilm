import React from 'react';

/**
 * Level 3 — label + value field pair (16px internal spacing via parent grid gap-4).
 */
const MetadataRow = ({ label, value, children, className = '' }) => (
  <div className={`space-y-1 ${className}`}>
    <dt className="text-xs font-medium text-gray-500">{label}</dt>
    <dd className="text-sm text-gray-200">{children ?? value ?? '—'}</dd>
  </div>
);

export default MetadataRow;
