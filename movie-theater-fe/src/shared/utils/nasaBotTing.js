/**
 * Soft "ting" chime for NASA BOT FAB attention (Web Audio — no asset file).
 */
export const playNasaBotTing = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    master.connect(ctx.destination);

    const partials = [
      { freq: 1320, type: 'sine', gain: 0.9 },
      { freq: 1980, type: 'triangle', gain: 0.28 },
      { freq: 2640, type: 'sine', gain: 0.14 },
    ];

    partials.forEach(({ freq, type, gain }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain * 0.18, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 0.45);
    });

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // ignore autoplay / AudioContext errors
  }
};
