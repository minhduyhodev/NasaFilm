import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GhostButton, PrimaryButton } from './Button';
import ActionMenu from './ActionMenu';

/**
 * Level 1 — page title + actions (max 1 primary, ghost secondaries, destructive in menu).
 */
const PageHeader = ({
  title,
  description,
  eyebrow,
  variant = 'default',
  backTo,
  onBack,
  primaryAction,
  secondaryActions = [],
  menuItems = [],
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
  };

  return (
    <header className="adm-page-header">
      <div className="flex items-start gap-3 min-w-0 adm-page-header__main">
        {(backTo || onBack) && (
          <GhostButton
            type="button"
            onClick={handleBack}
            className="mt-0.5 shrink-0 px-2"
            aria-label="Quay lai"
          >
            <ArrowLeft className="w-4 h-4" />
          </GhostButton>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="adm-eyebrow">{eyebrow}</p>}
          <h1 className={`adm-title ${variant === 'compact' ? 'adm-title--sm' : ''} truncate`}>
            {title}
          </h1>
          {description && <p className="adm-desc">{description}</p>}
        </div>
      </div>

      {(primaryAction || secondaryActions.length > 0 || menuItems.length > 0) && (
        <div className="adm-page-actions">
          {secondaryActions.map((action) => (
            <GhostButton
              key={action.label}
              type={action.type || 'button'}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon}
              {action.label}
            </GhostButton>
          ))}
          {primaryAction && (
            <PrimaryButton
              type={primaryAction.type || 'button'}
              onClick={primaryAction.onClick}
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </PrimaryButton>
          )}
          <ActionMenu items={menuItems} />
        </div>
      )}
    </header>
  );
};

export default PageHeader;
