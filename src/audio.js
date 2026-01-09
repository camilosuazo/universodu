export function createAmbientAudio() {
  const AudioContext =
    typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AudioContext) return null;

  const ctx = new AudioContext();
  const duration = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    const slowLfo = Math.sin((i / data.length) * Math.PI * 2) * 0.4;
    data[i] = white * 0.4 + slowLfo * 0.3;
  }

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 220;
  filter.Q.value = 0.7;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 80;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const reverb = ctx.createConvolver();
  const impulse = ctx.createBuffer(2, ctx.sampleRate * 2, ctx.sampleRate);
  for (let ch = 0; ch < impulse.numberOfChannels; ch += 1) {
    const impulseData = impulse.getChannelData(ch);
    for (let i = 0; i < impulseData.length; i += 1) {
      impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseData.length, 2.5);
    }
  }
  reverb.buffer = impulse;

  const gain = ctx.createGain();
  gain.gain.value = 0.24;

  filter.connect(reverb);
  reverb.connect(gain);
  gain.connect(ctx.destination);

  let source = null;

  function start() {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    if (source) return;
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(filter);
    source.start(0);
  }

  function stop() {
    if (!source) return;
    try {
      source.stop();
    } catch (err) {
      // ignore
    }
    source.disconnect();
    source = null;
  }

  return {
    start,
    stop,
    isActive: () => !!source,
  };
}
