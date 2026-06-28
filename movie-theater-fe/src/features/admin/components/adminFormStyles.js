/** Shared form class names — backed by admin-theme.css tokens */

export const adminInputClass = 'adm-input';

export const adminSelectClass = `adm-select app-select`;

export const adminSelectTriggerClass = 'adm-select-trigger admin-select-trigger';

export const adminDropdownMenuClass =
  'adm-dropdown admin-dropdown-menu animate-dropdown-fade-in';

export const getAdminDropdownItemClass = (isSelected) =>
  `adm-dropdown__item admin-dropdown-item ${
    isSelected ? 'adm-dropdown__item--active admin-dropdown-item--selected' : ''
  }`;

export const adminFilterSelectClass =
  'adm-select adm-filter-select app-select text-xs';

export const adminLabelClass = 'adm-label';

export const adminTextareaClass = 'adm-textarea';

export const adminPanelClass = 'adm-panel';

export const adminPanelBodyClass = 'adm-panel__body';
