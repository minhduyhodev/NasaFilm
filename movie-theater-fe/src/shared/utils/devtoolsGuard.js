/**
 * Production-only soft deterrent against casual DevTools / view-source.
 * Does not provide real security — browser must still download JS to run the app.
 * Never enable in development (breaks debugging).
 */
export function initDevtoolsGuard() {
  if (!import.meta.env.PROD) {
    return;
  }

  const blockEvent = (event) => {
    event.preventDefault();
    return false;
  };

  document.addEventListener('contextmenu', blockEvent);

  document.addEventListener('keydown', (event) => {
    const key = event.key?.toLowerCase?.() ?? '';
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    const isDevtoolsShortcut =
      key === 'f12' ||
      (isCtrlOrMeta && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
      (isCtrlOrMeta && key === 'u') ||
      (isCtrlOrMeta && key === 's');

    if (isDevtoolsShortcut) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}
