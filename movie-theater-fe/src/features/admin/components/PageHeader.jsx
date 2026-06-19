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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3 min-w-0">
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
          {eyebrow && (
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5 font-heading">
              {eyebrow}
            </p>
          )}
          <h1
            className={`text-white tracking-tight truncate font-heading ${
              variant === 'display'
                ? 'text-3xl sm:text-4xl font-black uppercase leading-none'
                : 'text-2xl font-bold'
            }`}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-gray-400 leading-relaxed max-w-2xl">{description}</p>
          )}
        </div>
      </div>

      {(primaryAction || secondaryActions.length > 0 || menuItems.length > 0) && (
        <div className="flex items-center gap-1 shrink-0">
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
