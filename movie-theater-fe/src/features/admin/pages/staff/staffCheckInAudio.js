export const playCheckInBeep = (isSuccess) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (isSuccess) {
      const playTone = (pitch, delay, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };
      playTone(880, 0, 0.15);
      playTone(1046.5, 0.12, 0.2);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    /* audio optional */
  }
};

export const speakCheckInText = (text, enabled) => {
  if (!enabled || !text) return;
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang === 'vi-VN' || v.lang === 'vi_VN')
      || voices.find((v) => v.lang?.startsWith('vi'));
    if (viVoice) utterance.voice = viVoice;
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* TTS optional */
  }
};
