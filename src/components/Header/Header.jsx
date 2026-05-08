import { useEffect, useState } from 'react';
import styles from './Header.module.css';

const LOGO_SRC = `${import.meta.env.BASE_URL}brand/argano-logo.svg`;

function formatRelative(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.round((now - then) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Header({ onToast }) {
  const [busy, setBusy] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Pull last-sync timestamp on mount (dev only).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    fetch('/__sync-figma')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setLastSyncedAt(j?.state?.syncedAt ?? null))
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    if (busy) return;
    setBusy(true);
    onToast?.('Syncing from Figma…');
    try {
      const res = await fetch('/__sync-figma', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const count = body.state?.downloaded ?? 0;
      setLastSyncedAt(body.state?.syncedAt ?? new Date().toISOString());
      onToast?.(`Synced ${count} icons from Figma`);
    } catch (err) {
      console.error(err);
      onToast?.(`Sync failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <img
            src={LOGO_SRC}
            alt="Argano"
            className={styles.logoMark}
            draggable={false}
          />
          <span className={styles.brandName}>Asset Library</span>
        </div>
        <div className={styles.actions}>
          {import.meta.env.DEV && (
            <>
              {lastSyncedAt && !busy && (
                <span className={styles.syncMeta}>
                  Synced {formatRelative(lastSyncedAt)}
                </span>
              )}
              <button
                type="button"
                className={styles.syncButton}
                onClick={handleSync}
                disabled={busy}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className={busy ? styles.syncIconSpinning : ''}
                >
                  <path
                    d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M3 4v4h4M21 20v-4h-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {busy ? 'Syncing…' : 'Sync from Figma'}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
