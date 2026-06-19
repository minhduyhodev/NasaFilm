import React from 'react';

/**
 * Linear-inspired page shell — max width handled by AdminLayout.
 * Section spacing: 32px (space-y-8)
 */
const AdminPage = ({ children, className = '' }) => (
  <div className={`w-full space-y-8 text-left ${className}`}>{children}</div>
);

export default AdminPage;
