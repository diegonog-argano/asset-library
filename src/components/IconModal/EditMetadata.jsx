import { useState } from 'react';
import styles from './EditMetadata.module.css';

export default function EditMetadata({ asset, onCancel, onSaved, onError }) {
  const [name, setName] = useState(asset.name);
  const [keywords, setKeywords] = useState([...asset.keywords]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const addKeyword = () => {
    const k = draft.trim().toLowerCase();
    if (!k) return;
    if (keywords.includes(k)) {
      setDraft('');
      return;
    }
    setKeywords((curr) => [...curr, k]);
    setDraft('');
  };

  const removeKeyword = (k) => {
    setKeywords((curr) => curr.filter((x) => x !== k));
  };

  const updateKeyword = (idx, value) => {
    setKeywords((curr) => {
      const next = [...curr];
      next[idx] = value.toLowerCase();
      return next;
    });
  };

  const handleSave = async () => {
    if (busy) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      onError?.('Name cannot be empty');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/__edit-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: asset.id,
          name: trimmedName,
          keywords: keywords.map((k) => k.trim()).filter(Boolean),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onSaved?.(body.asset);
    } catch (err) {
      console.error(err);
      onError?.(`Save failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.devBadge}>Dev edit</div>
      <label className={styles.label}>
        Name
        <input
          type="text"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          spellCheck="false"
        />
      </label>

      <label className={styles.label}>
        Keywords
        <div className={styles.chips}>
          {keywords.map((k, i) => (
            <span key={i} className={styles.chip}>
              <input
                type="text"
                value={k}
                onChange={(e) => updateKeyword(i, e.target.value)}
                className={styles.chipInput}
                size={Math.max(k.length, 4)}
                spellCheck="false"
              />
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeKeyword(k)}
                aria-label={`Remove ${k}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            className={styles.draftInput}
            placeholder="Add keyword…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addKeyword();
              } else if (
                e.key === 'Backspace' &&
                draft === '' &&
                keywords.length > 0
              ) {
                setKeywords((curr) => curr.slice(0, -1));
              }
            }}
            onBlur={addKeyword}
            spellCheck="false"
          />
        </div>
      </label>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
