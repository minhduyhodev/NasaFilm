// Local persistence keys for the NASA Bot widget (AI chat session + wizard step).
// Kept here so both the widget and the auth layer clear the same keys on logout.
export const AI_SESSION_STORAGE_KEY = 'nasabot_ai_session_v1';
export const AI_UI_STATE_KEY = 'nasabot_ui_state_v1';

/** Wipe the NASA Bot chat state so a new session starts clean (e.g. on logout). */
export function clearNasaBotStorage() {
  try {
    localStorage.removeItem(AI_SESSION_STORAGE_KEY);
    localStorage.removeItem(AI_UI_STATE_KEY);
  } catch {
    /* localStorage unavailable — ignore */
  }
}
