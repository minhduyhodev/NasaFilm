import React from 'react';

const AdminPage = ({ children, className = '', softEnter = true }) => (
  <div className={`adm-page${softEnter ? ' adm-page--enter' : ''}${className ? ` ${className}` : ''}`}>
    {children}
  </div>
);

export default AdminPage;
