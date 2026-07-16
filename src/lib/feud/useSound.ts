"use client";

export function useSound() {
  const ctxRef = { current: null as AudioContext | null };
  const getCtx = () =>
    (ctxRef.current ??= new window.AudioContext());

  const playTone = (
    type: OscillatorType = "sine",
    freq = 440,
    duration = 0.2,
    vol = 0.2,
  ) => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + duration);
  };

  const correct = () => {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    gain.gain.value = 0.25;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  };

  const wrong = () => {
    const ctx = getCtx();
    const burst = (startFreq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.19);
    };
    burst(300);
    setTimeout(() => burst(250), 110);
  };

  return { playTone, correct, wrong };
}
