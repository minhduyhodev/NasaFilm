import { useState, useLayoutEffect, useCallback } from 'react';

const ADMIN_FLOATING_Z = 20100;
const VIEWPORT_PADDING = 8;

/** Khoảng trống thực tế trong modal (không tính footer/header che khuất). */
function getConstrainedSpaces(triggerEl, gap) {
  const rect = triggerEl.getBoundingClientRect();
  const modalPanel = triggerEl.closest('.admin-modal-panel');

  let belowLimit = window.innerHeight - VIEWPORT_PADDING;
  let aboveLimit = VIEWPORT_PADDING;

  if (modalPanel) {
    const panelRect = modalPanel.getBoundingClientRect();
    const footer = modalPanel.querySelector('.admin-modal-footer');
    const header = modalPanel.querySelector('.admin-modal-header');
    belowLimit = footer
      ? footer.getBoundingClientRect().top - gap
      : panelRect.bottom - gap;
    aboveLimit = header
      ? header.getBoundingClientRect().bottom + gap
      : panelRect.top + gap;
  }

  const spaceBelow = Math.max(0, belowLimit - rect.bottom);
  const spaceAbove = Math.max(0, rect.top - aboveLimit);

  return { spaceBelow, spaceAbove };
}

/**
 * Fixed-position panel coords for dropdowns/calendars inside scrollable modals.
 */
export function getFloatingPanelPosition(triggerEl, {
  width = null,
  maxHeight = 256,
  estimatedHeight = null,
  gap = 6,
  align = 'left',
  constrainToModal = true,
  /** 'auto' | 'bottom' | 'top' — 'bottom' luôn sổ xuống */
  placement = 'auto',
} = {}) {
  const rect = triggerEl.getBoundingClientRect();
  const panelWidth = width ?? rect.width;
  let left = align === 'right' ? rect.right - panelWidth : rect.left;
  left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - panelWidth - VIEWPORT_PADDING));

  const preferredHeight = estimatedHeight ?? maxHeight;
  const { spaceBelow, spaceAbove } = constrainToModal
    ? getConstrainedSpaces(triggerEl, gap)
    : {
        spaceBelow: Math.max(0, window.innerHeight - VIEWPORT_PADDING - rect.bottom),
        spaceAbove: Math.max(0, rect.top - VIEWPORT_PADDING),
      };

  const openUpward =
    placement === 'top'
      ? true
      : placement === 'bottom'
        ? false
        : spaceBelow < preferredHeight && spaceAbove > spaceBelow;

  let top;
  let computedMaxHeight;
  if (openUpward) {
    computedMaxHeight = Math.min(maxHeight, spaceAbove || preferredHeight, preferredHeight);
    top = rect.top - gap - computedMaxHeight;
  } else {
    // Prefer mở xuống: dùng tối đa khoảng trống bên dưới (hoặc maxHeight)
    computedMaxHeight = Math.min(maxHeight, Math.max(spaceBelow, 120), preferredHeight);
    if (spaceBelow < 80) {
      // Viewport quá hẹp dưới trigger — vẫn cố mở xuống, clamp theo viewport
      computedMaxHeight = Math.min(maxHeight, window.innerHeight - rect.bottom - gap - VIEWPORT_PADDING);
    }
    top = rect.bottom + gap;
  }

  return {
    position: 'fixed',
    top: Math.max(VIEWPORT_PADDING, top),
    left,
    width: panelWidth,
    maxHeight: Math.max(80, computedMaxHeight),
    zIndex: ADMIN_FLOATING_Z,
  };
}

export function useFloatingPanelPosition(open, triggerRef, options = {}) {
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    if (!triggerRef.current) return;
    setStyle(getFloatingPanelPosition(triggerRef.current, options));
  }, [
    triggerRef,
    options.width,
    options.maxHeight,
    options.estimatedHeight,
    options.gap,
    options.align,
    options.constrainToModal,
    options.placement,
  ]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null);
      return undefined;
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return style;
}

export const ADMIN_FLOATING_BACKDROP_Z = 20090;
