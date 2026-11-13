(() => {
  const GRADUATION_TRACK_SRC = "./Philippine-Graduation.mp3";

  let ctx = null;
  let completionAudio = null;
  let currentOnEnded = null;
  let audioPrimed = false;
  let isPlayingTrack = false;

  function ensureContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx || ctx.state === "closed") {
      ctx = new AudioCtx();
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function ensureTrack() {
    if (!completionAudio) {
      completionAudio = new Audio(GRADUATION_TRACK_SRC);
      completionAudio.preload = "auto";
      completionAudio.addEventListener("ended", () => {
        isPlayingTrack = false;
        completionAudio.currentTime = 0;
        if (typeof currentOnEnded === "function") {
          const cb = currentOnEnded;
          currentOnEnded = null;
          cb();
        }
      });
      completionAudio.addEventListener("error", () => {
        isPlayingTrack = false;
        if (typeof currentOnEnded === "function") {
          const cb = currentOnEnded;
          currentOnEnded = null;
          cb();
        }
      });
    }
    return completionAudio;
  }

  function stop() {
    if (completionAudio) {
      try {
        completionAudio.pause();
        completionAudio.currentTime = 0;
      } catch {
        // Ignore media reset errors.
      }
    }
    isPlayingTrack = false;

    if (typeof currentOnEnded === "function") {
      const cb = currentOnEnded;
      currentOnEnded = null;
      cb();
    }
  }

  function playGraduationMusic(options = {}) {
    stop();

    const track = ensureTrack();
    currentOnEnded = typeof options.onEnded === "function" ? options.onEnded : null;
    isPlayingTrack = true;

    try {
      track.muted = false;
      track.volume = 0.85;
      track.currentTime = 0;
      const playPromise = track.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          isPlayingTrack = false;
          if (typeof currentOnEnded === "function") {
            const cb = currentOnEnded;
            currentOnEnded = null;
            cb();
          }
        });
      }
      return true;
    } catch {
      isPlayingTrack = false;
      return false;
    }
  }

  function unlock() {
    ensureContext();
    const track = ensureTrack();
    if (!audioPrimed && !isPlayingTrack) {
      audioPrimed = true;
      try {
        track.muted = true;
        const p = track.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            if (!isPlayingTrack) {
              track.pause();
              track.currentTime = 0;
            }
            track.muted = false;
          }).catch(() => {
            track.muted = false;
          });
        } else {
          track.muted = false;
        }
      } catch {
        track.muted = false;
      }
    }
  }

  function playControlSound(action) {
    const audioCtx = ensureContext();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;

      function tone(freqStart, freqEnd, delay, duration, peak, wave) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freqStart, now + delay);
        if (freqEnd !== freqStart) {
          osc.frequency.exponentialRampToValueAtTime(freqEnd, now + delay + duration);
        }
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(peak, now + delay + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration + 0.02);
      }

      if (action === "start") {
        tone(440, 440, 0, 0.055, 0.07, "sine");
        tone(659.25, 659.25, 0.045, 0.095, 0.08, "triangle");
      } else if (action === "pause") {
        tone(523.25, 523.25, 0, 0.055, 0.065, "sine");
        tone(392, 392, 0.045, 0.095, 0.065, "sine");
      } else if (action === "reset") {
        tone(340, 210, 0, 0.075, 0.075, "triangle");
      }
    } catch {
      // Ignore audio errors.
    }
  }

  window.MorrowAudio = {
    playGraduationMusic,
    playControlSound,
    stop,
    unlock
  };
})();
