import React from 'react';

const AdminPage = ({ children, className = '' }) => (
  <div className={`adm-page ${className}`}>{children}</div>
);

export default AdminPage;
