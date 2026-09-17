// The photograph is always present. Video is optional progressive enhancement.
(() => {
  const hero = document.querySelector('.hero');
  const video = document.querySelector('.hero-video');
  const control = document.querySelector('.hero-video-toggle');
  if (!hero || !video || !control) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const STARTUP_TIMEOUT = 12000;
  const BUFFER_TIMEOUT = 10000;
  const FADE_CLEANUP_DELAY = 900; // Longer than the .8s opacity transition in CSS.
  let disabled = false;
  let started = false;
  let hasPlayed = false;
  let userPaused = false;
  let inView = true;
  let startupTimer;
  let stallTimer;
  let waitingAt = null;
  let playRequest = 0;
  let playPending = false;

  const slowConnection = () => Boolean(connection && (
    connection.saveData ||
    ['slow-2g', '2g', '3g'].includes(connection.effectiveType) ||
    (typeof connection.downlink === 'number' && connection.downlink < 1.5)
  ));
  const wantsPlayback = () => !disabled && !document.hidden && inView && !userPaused;

  function clearTimers() {
    clearTimeout(startupTimer);
    clearTimeout(stallTimer);
    startupTimer = undefined;
    stallTimer = undefined;
  }

  function showPhoto() {
    video.classList.remove('is-playing');
    control.hidden = true;
  }

  function usePhoto() {
    if (disabled) return;
    disabled = true;
    ++playRequest; // Invalidate promises from an earlier play attempt.
    playPending = false;
    clearTimers();
    showPhoto();
    video.pause();
    const release = () => {
      video.removeAttribute('src');
      video.load();
    };
    // load() immediately clears the decoded frame. Keep it until the fade ends,
    // even when another failure occurs during a fade already in progress.
    if (hasPlayed && !motion.matches) setTimeout(release, FADE_CLEANUP_DELAY);
    else release();
  }

  function updateControl() {
    const label = userPaused ? 'Play background video' : 'Pause background video';
    control.textContent = userPaused ? '▶' : 'Ⅱ';
    control.setAttribute('aria-label', label);
    control.setAttribute('title', label);
  }

  function showVideo() {
    video.classList.add('is-playing');
    control.hidden = false;
    updateControl();
  }

  function watchBuffering() {
    if (!wantsPlayback() || !hasPlayed || stallTimer !== undefined) return;
    if (waitingAt === null) waitingAt = video.currentTime;
    stallTimer = setTimeout(() => {
      stallTimer = undefined;
      if (!wantsPlayback() || waitingAt === null) return;
      if (video.currentTime !== waitingAt || video.readyState >= 3) {
        waitingAt = null;
        return;
      }
      // A real, prolonged interruption fades gently to the photograph. Keep
      // the source and play intent so buffering can finish and playback recover.
      showPhoto();
    }, BUFFER_TIMEOUT);
  }

  function syncPlayback() {
    if (disabled || !started) return;
    if (!wantsPlayback()) {
      ++playRequest;
      playPending = false;
      clearTimers();
      video.pause();
      return;
    }
    if (!hasPlayed && startupTimer === undefined) {
      startupTimer = setTimeout(usePhoto, STARTUP_TIMEOUT);
    }
    if (waitingAt !== null) watchBuffering();
    if (!video.paused || playPending) return;
    const request = ++playRequest;
    playPending = true;
    try {
      const playback = video.play();
      if (playback && playback.then) playback.then(() => {
        if (request === playRequest) playPending = false;
      }, error => {
        if (request !== playRequest || disabled) return;
        playPending = false;
        // A canceled play request is not a failed video. In particular, rapid
        // scrolling or tab switches can reject an old request after a new one.
        if (error && error.name === 'AbortError') return;
        usePhoto();
      });
      else playPending = false;
    } catch (_) {
      playPending = false;
      usePhoto();
    }
  }

  function start() {
    if (disabled || started || document.hidden || !inView) return;
    if (motion.matches || slowConnection()) {
      usePhoto();
      return;
    }
    started = true;
    video.muted = true;
    video.defaultMuted = true;
    // Select once; a fluctuating bandwidth estimate must not stop good playback.
    const compact = window.matchMedia('(max-width: 850px)').matches ||
      (connection && connection.downlink < 3);
    video.src = compact ? video.dataset.mobileSrc : video.dataset.desktopSrc;
    syncPlayback();
  }

  video.addEventListener('playing', () => {
    if (!wantsPlayback()) {
      video.pause();
      return;
    }
    hasPlayed = true;
    waitingAt = null;
    clearTimers();
    showVideo();
  });

  // "stalled" reports a download delay, not necessarily interrupted playback.
  // Only actual "waiting" starts a watchdog; progress cancels stale watchdogs.
  video.addEventListener('waiting', watchBuffering);
  video.addEventListener('timeupdate', () => {
    if (!wantsPlayback() || waitingAt === null || video.currentTime === waitingAt) return;
    waitingAt = null;
    clearTimeout(stallTimer);
    stallTimer = undefined;
    if (hasPlayed && video.readyState >= 2) showVideo();
  });
  video.addEventListener('canplay', syncPlayback);
  video.addEventListener('error', usePhoto);

  control.addEventListener('click', () => {
    userPaused = !userPaused;
    updateControl();
    syncPlayback();
  });

  document.addEventListener('visibilitychange', () => {
    if (!started) start();
    syncPlayback();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!started) start();
      syncPlayback();
    }, { threshold: 0.05 });
    observer.observe(hero);
  }

  const respectPreferences = () => {
    if (motion.matches || (connection && connection.saveData)) usePhoto();
  };
  if (motion.addEventListener) motion.addEventListener('change', respectPreferences);
  else if (motion.addListener) motion.addListener(respectPreferences);
  if (connection && connection.addEventListener) connection.addEventListener('change', respectPreferences);

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
