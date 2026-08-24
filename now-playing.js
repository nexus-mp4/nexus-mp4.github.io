(function () {
  'use strict';

  var card = document.getElementById('nowPlaying');
  var audio = document.getElementById('npAudio');
  var playBtn = document.getElementById('npPlayBtn');
  var trackEl = document.getElementById('npTrack');
  var currentEl = document.getElementById('npCurrent');
  var durationEl = document.getElementById('npDuration');
  var scrubber = document.getElementById('npScrubber');
  var wave = document.getElementById('npWave');
  var trackPath = wave.querySelector('.np-wave-track');
  var fillPath = wave.querySelector('.np-wave-fill');

  if (!card || !audio) return;

  /* ---------- M3 wavy progress indicator constants ----------
     Matches Material 3's "wavy" linear/circular progress indicator:
     a continuous sine wave with fixed wavelength, whose amplitude
     eases to 0 (flat line) when idle/paused and eases up to full
     amplitude while actively progressing. The wave itself scrolls
     continuously (phase advances) rather than just sitting static. */

  var VIEW_W = 300;
  var VIEW_H = 20;
  var MID = VIEW_H / 2;
  var WAVELENGTH = 16;        // px per full sine cycle (M3 spec: small, dense ripple)
  var MAX_AMPLITUDE = 3;      // px, subtle — M3 keeps this restrained, not cartoonish
  var PHASE_SPEED = 0.09;     // radians per frame the wave scrolls by
  var AMP_EASE = 0.08;        // how fast amplitude eases toward its target

  var phase = 0;
  var amplitude = 0;          // current animated amplitude
  var targetAmplitude = 0;    // 0 when paused, MAX_AMPLITUDE when playing
  var rafId = null;
  var dragging = false;

  /* ---------- Path generation ---------- */
  // Builds ONE continuous sine path across the full width so the fill
  // and track segments phase-align seamlessly at the split point,
  // exactly like the real component (no visual seam at the progress head).

  function wavePathAt(amp, phaseOffset) {
    if (amp <= 0.05) {
      return 'M 0 ' + MID + ' L ' + VIEW_W + ' ' + MID;
    }
    var step = 2;
    var d = '';
    for (var x = 0; x <= VIEW_W; x += step) {
      var y = MID + Math.sin((x / WAVELENGTH) * Math.PI * 2 + phaseOffset) * amp;
      d += (x === 0 ? 'M ' : ' L ') + x.toFixed(2) + ' ' + y.toFixed(2);
    }
    return d;
  }

  function render(progressRatio) {
    var d = wavePathAt(amplitude, phase);
    trackPath.setAttribute('d', d);
    fillPath.setAttribute('d', d);

    // Same underlying wave for both; fill is clipped to the played portion
    // so crest/trough positions line up continuously across the boundary,
    // matching how M3 renders the active vs. remaining track segments.
    var clipX = Math.max(0, Math.min(1, progressRatio)) * VIEW_W;
    fillPath.style.clipPath = 'inset(-6px ' + (VIEW_W - clipX) + 'px -6px 0)';
    trackPath.style.clipPath = 'inset(-6px 0 -6px ' + clipX + 'px)';
  }

  /* ---------- Time formatting ---------- */

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function currentRatio() {
    if (!audio.duration || !isFinite(audio.duration)) return 0;
    return audio.currentTime / audio.duration;
  }

  /* ---------- Animation loop ---------- */
  // Keeps running briefly even after pause so the amplitude can ease
  // down to a flat line smoothly, then stops itself.

  function tick() {
    amplitude += (targetAmplitude - amplitude) * AMP_EASE;
    if (targetAmplitude > 0) {
      phase += PHASE_SPEED;
    }

    render(currentRatio());
    currentEl.textContent = formatTime(audio.currentTime);

    var settled = Math.abs(amplitude - targetAmplitude) < 0.03;
    if (settled && targetAmplitude === 0) {
      amplitude = 0;
      render(currentRatio());
      rafId = null;
      return; // stop the loop; fully flat and idle
    }
    rafId = requestAnimationFrame(tick);
  }

  function ensureAnim() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  /* ---------- Playback controls ---------- */

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch(function () {
        trackEl.textContent = 'Couldn\u2019t play audio.mp3';
      });
    } else {
      audio.pause();
    }
  }

  playBtn.addEventListener('click', togglePlay);

  audio.addEventListener('play', function () {
    card.classList.add('is-playing');
    playBtn.setAttribute('aria-label', 'Pause');
    targetAmplitude = MAX_AMPLITUDE;
    ensureAnim();
  });

  audio.addEventListener('pause', function () {
    card.classList.remove('is-playing');
    playBtn.setAttribute('aria-label', 'Play');
    targetAmplitude = 0;
    ensureAnim(); // let it ease out to flat, then auto-stop
  });

  audio.addEventListener('ended', function () {
    card.classList.remove('is-playing');
    playBtn.setAttribute('aria-label', 'Play');
    targetAmplitude = 0;
    ensureAnim();
  });

  audio.addEventListener('loadedmetadata', function () {
    durationEl.textContent = formatTime(audio.duration);
    render(currentRatio());
  });

  audio.addEventListener('timeupdate', function () {
    if (!rafId) {
      currentEl.textContent = formatTime(audio.currentTime);
      render(currentRatio());
    }
  });

  audio.addEventListener('error', function () {
    trackEl.textContent = 'audio.mp3 not found';
  });

  // Track title — set whatever text you want here.
  trackEl.textContent = 'Beneath The Mask — Lyn';

  /* ---------- Seeking (click + drag) ---------- */

  function ratioFromEvent(evt) {
    var rect = scrubber.getBoundingClientRect();
    var clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    var ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, ratio));
  }

  function seekTo(evt) {
    if (!audio.duration || !isFinite(audio.duration)) return;
    var ratio = ratioFromEvent(evt);
    audio.currentTime = ratio * audio.duration;
    render(ratio);
    currentEl.textContent = formatTime(audio.currentTime);
  }

  scrubber.addEventListener('mousedown', function (evt) {
    dragging = true;
    seekTo(evt);
  });
  window.addEventListener('mousemove', function (evt) {
    if (dragging) seekTo(evt);
  });
  window.addEventListener('mouseup', function () {
    dragging = false;
  });

  scrubber.addEventListener('touchstart', function (evt) {
    dragging = true;
    seekTo(evt);
  }, { passive: true });
  scrubber.addEventListener('touchmove', function (evt) {
    if (dragging) seekTo(evt);
  }, { passive: true });
  scrubber.addEventListener('touchend', function () {
    dragging = false;
  });

  /* ---------- Autoplay on first interaction ----------
     Browsers block audio.play() with sound until the visitor has
     interacted with the page at least once. This starts playback
     on the very first click/tap/keypress anywhere on the page,
     so it feels close to automatic without being silently blocked. */

  var hasAutoplayed = false;

  function tryAutoplayOnce() {
    if (hasAutoplayed) return;
    hasAutoplayed = true;
    audio.play().catch(function () {
      // Interaction still wasn't enough for this browser — leave it
      // for the visitor to press play manually.
      hasAutoplayed = false;
    });
  }

  ['click', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, tryAutoplayOnce, { once: false, passive: true });
  });

  /* ---------- Initial render ---------- */

  render(0);
})();
