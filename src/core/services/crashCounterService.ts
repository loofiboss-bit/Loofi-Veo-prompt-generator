const CRASH_COUNT_KEY = 'veo-crash-count';
const LAST_CRASH_KEY = 'veo-last-crash';
const SESSION_CRASH_RECORDED_KEY = 'veo-session-crash-recorded';
const DEV_HMR_SUPPRESS_TS_KEY = 'veo-dev-hmr-suppress-ts';
const DEV_HMR_SUPPRESS_WINDOW_MS = 5000;

function isSuppressedByDevHmr(): boolean {
  if (!import.meta.env.DEV) return false;

  const tsRaw = sessionStorage.getItem(DEV_HMR_SUPPRESS_TS_KEY);
  if (!tsRaw) return false;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) {
    sessionStorage.removeItem(DEV_HMR_SUPPRESS_TS_KEY);
    return false;
  }

  const withinWindow = Date.now() - ts <= DEV_HMR_SUPPRESS_WINDOW_MS;
  if (!withinWindow) {
    sessionStorage.removeItem(DEV_HMR_SUPPRESS_TS_KEY);
  }

  return withinWindow;
}

export function initCrashCounterGuards(): void {
  if (!import.meta.env.DEV || !import.meta.hot) return;

  import.meta.hot.dispose(() => {
    sessionStorage.setItem(DEV_HMR_SUPPRESS_TS_KEY, String(Date.now()));
  });
}

export function incrementCrashCounterFromComponentDidCatch(): void {
  if (sessionStorage.getItem(SESSION_CRASH_RECORDED_KEY) === '1') return;
  if (isSuppressedByDevHmr()) return;

  const countRaw = localStorage.getItem(CRASH_COUNT_KEY);
  const current = countRaw ? Number.parseInt(countRaw, 10) : 0;
  const safeCurrent = Number.isFinite(current) ? current : 0;

  localStorage.setItem(CRASH_COUNT_KEY, String(safeCurrent + 1));
  localStorage.setItem(LAST_CRASH_KEY, String(Date.now()));
  sessionStorage.setItem(SESSION_CRASH_RECORDED_KEY, '1');
}
