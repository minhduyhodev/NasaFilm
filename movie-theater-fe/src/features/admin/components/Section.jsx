import React from 'react';

/**
 * Level 2 — section layout (replaces nested cards).
 * Field spacing inside: 16px (space-y-4)
 */
const Section = ({ title, description, action, children, className = '', divided = false, titleVariant = 'default' }) => (
  <section
    className={`space-y-4 ${divided ? 'pt-8 border-t border-white/[0.06]' : ''} ${className}`}
  >
    {(title || description || action) && (
      <div className="flex items-start justify-between gap-4">
        <div>
          {title && (
            <h2
              className={`font-heading ${
                titleVariant === 'admin'
                  ? 'text-[10px] font-black uppercase tracking-widest text-gray-500'
                  : 'text-sm font-semibold text-gray-300'
              }`}
            >
              {title}
            </h2>
          )}
          {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className="space-y-4">{children}</div>
  </section>
);

export default Section;
