/**
 * Pure Web Audio API Synthesizer for Windows 11 system chimes and alerts.
 * Completely local, zero network latency, no external audio files required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Windows 11 style notification toast chime (bright, gentle harmonic chime)
 */
export function playWindowsToastChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 880, 1174.66]; // D5, A5, D6
    const delays = [0, 0.08, 0.16];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delays[idx]);

      gain.gain.setValueAtTime(0, now + delays[idx]);
      gain.gain.linearRampToValueAtTime(0.15, now + delays[idx] + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delays[idx] + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delays[idx]);
      osc.stop(now + delays[idx] + 0.5);
    });
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
}

/**
 * Windows batch completion fanfare (rewarding 4-note ascending chord)
 */
export function playBatchCompleteChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // F#5 -> A#5 -> C#6 -> F#6 chord progression
    const notes = [739.99, 932.33, 1108.73, 1479.98];
    const delays = [0, 0.09, 0.18, 0.28];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delays[idx]);

      gain.gain.setValueAtTime(0, now + delays[idx]);
      gain.gain.linearRampToValueAtTime(0.18, now + delays[idx] + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delays[idx] + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delays[idx]);
      osc.stop(now + delays[idx] + 0.7);
    });
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
}

/**
 * Subtle tick / start audio feedback
 */
export function playStartTick() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch {
    // ignore
  }
}

/**
 * Error / warning feedback sound
 */
export function playErrorChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.setValueAtTime(220, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch {
    // ignore
  }
}
