import React from 'react';

/**
 * Level 2 — section layout (replaces nested cards).
 * Field spacing inside: 16px (space-y-4)
 */
const Section = ({ title, description, action, children, className = '', divided = false }) => (
  <section className={`adm-section ${divided ? 'adm-section--divided' : ''} ${className}`}>
    {(title || description || action) && (
      <div className="flex items-start justify-between gap-4">
        <div>
          {title && <h2 className="adm-section__title">{title}</h2>}
          {description && <p className="adm-section__desc">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className="space-y-4">{children}</div>
  </section>
);

export default Section;
