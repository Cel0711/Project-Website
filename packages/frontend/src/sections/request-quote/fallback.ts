import { toast } from '../../core/dom.js';
import { CFG } from '../../config.js';
import { S } from '../design-studio/state.js';
import { designPayload } from './form.js';

/**
 * Client-side fallbacks that work on any static host with zero backend:
 * a real browser download, or a clipboard copy if downloads are blocked.
 * This is the "no internet at all... it still works" path the README
 * describes — it never depends on the Express/PM2 API being reachable.
 */
export function saveDesignFile(data?: string, fname?: string): void {
  const payload = data || JSON.stringify({ design: designPayload(), savedAt: new Date().toISOString() }, null, 2);
  const name = fname || `studio-design-${S.dev}.json`;
  try {
    const b = new Blob([payload], { type: 'application/json' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast('Saved to your downloads. Attach it to your email to ' + CFG.email);
    return;
  } catch {
    /* fall through to clipboard */
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(payload).then(
      () => toast('Downloads are not available here — the design was copied to your clipboard instead'),
      () => toast('Could not save the file in this view'),
    );
  } else {
    toast('Could not save the file in this view');
  }
}
