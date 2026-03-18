export interface RobotVoiceRig {
  context: AudioContext | null;
  current:
    | {
        output: GainNode;
        oscillators: OscillatorNode[];
      }
    | null;
}

function getAudioContextClass() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

function getSeed(label: string) {
  return Array.from(label).reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 11),
    0
  );
}

function getContext(rig: RobotVoiceRig) {
  if (rig.context) {
    return rig.context;
  }

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    return null;
  }

  rig.context = new AudioContextClass();
  return rig.context;
}

export function createRobotVoiceRig(): RobotVoiceRig {
  return {
    context: null,
    current: null,
  };
}

export function stopRobotVoice(rig: RobotVoiceRig) {
  const context = rig.context;
  const active = rig.current;

  if (!context || !active) {
    return;
  }

  const stopAt = context.currentTime + 0.08;
  active.output.gain.cancelScheduledValues(context.currentTime);
  active.output.gain.setValueAtTime(active.output.gain.value, context.currentTime);
  active.output.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  for (const oscillator of active.oscillators) {
    try {
      oscillator.stop(stopAt);
    } catch {
      // Node already stopped.
    }
  }

  rig.current = null;
}

export async function startRobotVoice(rig: RobotVoiceRig, label: string) {
  const context = getContext(rig);
  if (!context) {
    return false;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return false;
    }
  }

  stopRobotVoice(rig);

  const seed = getSeed(label);
  const baseFrequency = 92 + (seed % 70);

  const carrier = context.createOscillator();
  carrier.type = "sawtooth";
  carrier.frequency.value = baseFrequency;

  const harmonic = context.createOscillator();
  harmonic.type = "square";
  harmonic.frequency.value = baseFrequency * (1.72 + (seed % 5) * 0.07);

  const formant = context.createBiquadFilter();
  formant.type = "bandpass";
  formant.frequency.value = 640 + (seed % 6) * 90;
  formant.Q.value = 6.4;

  const output = context.createGain();
  output.gain.value = 0.0001;

  const chatterLfo = context.createOscillator();
  chatterLfo.type = "square";
  chatterLfo.frequency.value = 7 + (seed % 4) * 1.6;

  const chatterGain = context.createGain();
  chatterGain.gain.value = 0.02;

  const pitchLfo = context.createOscillator();
  pitchLfo.type = "triangle";
  pitchLfo.frequency.value = 13 + (seed % 3) * 1.5;

  const pitchGain = context.createGain();
  pitchGain.gain.value = 18 + (seed % 5) * 3;

  chatterLfo.connect(chatterGain);
  chatterGain.connect(output.gain);

  pitchLfo.connect(pitchGain);
  pitchGain.connect(carrier.frequency);
  pitchGain.connect(harmonic.frequency);

  carrier.connect(formant);
  harmonic.connect(formant);
  formant.connect(output);
  output.connect(context.destination);

  const now = context.currentTime;
  output.gain.exponentialRampToValueAtTime(0.024, now + 0.05);

  for (const oscillator of [carrier, harmonic, chatterLfo, pitchLfo]) {
    oscillator.start(now);
  }

  rig.current = {
    output,
    oscillators: [carrier, harmonic, chatterLfo, pitchLfo],
  };

  return true;
}

export async function destroyRobotVoice(rig: RobotVoiceRig) {
  stopRobotVoice(rig);

  if (rig.context) {
    try {
      await rig.context.close();
    } catch {
      // Context already closed.
    }

    rig.context = null;
  }
}
