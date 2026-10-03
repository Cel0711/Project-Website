import { esc, srnd } from '../core/dom.js';
import { def } from './registry-core.js';

type MediaVariant = 'image' | 'video' | 'gallery' | 'avatar' | 'avatarRow' | 'iconTile' | 'qr' | 'barcode' | 'logoGrid';
interface MediaProps { variant: MediaVariant; label: string; seed: number; }
def<MediaProps>('media', {
  cat: 'media', label: 'Media', w: 220, h: 150, fillVar: '--sc-panel2', radius: 8, bw: 1, pad: 0,
  p: { variant: 'image', label: '', seed: 4 },
  fields: [['variant', 'Kind', 'sel:image,video,gallery,avatar,avatarRow,iconTile,qr,barcode,logoGrid'], ['label', 'Label', 'text'], ['seed', 'Seed', 'num']],
  make(e) {
    const v = e.p.variant, r = srnd(e.p.seed || 4);
    if (v === 'avatar') return '<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(140deg,var(--sc-brand),var(--sc-accent));display:grid;place-items:center;font:700 ' + Math.max(10, e.w * 0.34) + 'px/1 Archivo,sans-serif;color:#fff">' + esc((e.p.label || 'AR').slice(0, 2)) + '</div>';
    if (v === 'avatarRow') {
      return '<div style="height:100%;display:flex;align-items:center">' + [0, 1, 2, 3].map((i) =>
        '<span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(140deg,var(--sc-brand),var(--sc-accent));border:2px solid var(--sc-panel);margin-left:' + (i ? '-9px' : '0') + ';display:grid;place-items:center;font:600 9px/1 Archivo,sans-serif;color:#fff">' + (['AR', 'LC', 'SD', 'MO'][i]) + '</span>',
      ).join('') + '<span style="margin-left:8px;font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">+6 others</span></div>';
    }
    if (v === 'qr') {
      let cells = '';
      for (let i = 0; i < 25 * 25; i++) cells += '<span style="background:' + (r() > 0.5 ? 'var(--sc-text)' : 'transparent') + '"></span>';
      return '<div style="width:100%;height:100%;background:#fff;padding:7%;display:grid"><div style="display:grid;grid-template-columns:repeat(25,1fr);grid-auto-rows:1fr">' + cells + '</div></div>';
    }
    if (v === 'barcode') {
      let bars = '';
      for (let b = 0; b < 48; b++) bars += '<span style="flex:' + (0.4 + r() * 1.6) + ';background:' + (b % 2 ? 'transparent' : 'var(--sc-text)') + '"></span>';
      return '<div style="width:100%;height:100%;background:#fff;padding:8px;display:flex;flex-direction:column;gap:4px"><div style="flex:1;display:flex;gap:1px">' + bars + '</div><span style="text-align:center;font:400 9px/1 \'IBM Plex Mono\',monospace;color:#17242A">' + esc(e.p.label || '4 871 220 01984') + '</span></div>';
    }
    if (v === 'logoGrid') {
      return '<div style="height:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--sc-line)">' + [0, 1, 2, 3, 4, 5].map(() =>
        '<div style="background:var(--sc-panel);display:grid;place-items:center"><span style="width:60%;height:10px;border-radius:3px;background:var(--sc-line)"></span></div>',
      ).join('') + '</div>';
    }
    if (v === 'iconTile') {
      return '<div style="height:100%;display:grid;place-items:center;gap:6px;align-content:center"><span style="width:40px;height:40px;border-radius:10px;background:var(--sc-brand);display:grid;place-items:center;font-size:20px">' + esc(e.p.label || '⚙️') + '</span></div>';
    }
    if (v === 'gallery') {
      return '<div style="height:100%;display:flex;gap:5px">' + [0, 1, 2].map((i) =>
        '<div style="flex:' + (i === 0 ? 2 : 1) + ';background:linear-gradient(' + (120 + i * 40) + 'deg,var(--sc-panel2),var(--sc-line));border-radius:6px"></div>',
      ).join('') + '</div>';
    }
    const play = v === 'video' ? '<span style="position:absolute;inset:0;display:grid;place-items:center"><span style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center"><span style="width:0;height:0;border-left:13px solid #17242A;border-top:8px solid transparent;border-bottom:8px solid transparent;margin-left:4px"></span></span></span>' : '';
    return '<div style="position:relative;width:100%;height:100%;background:linear-gradient(135deg,var(--sc-panel2),var(--sc-line));display:grid;place-items:center">' +
      (v === 'image' ? '<svg width="34" height="34" viewBox="0 0 24 24" opacity=".45"><rect x="2.5" y="4.5" width="19" height="15" rx="2" stroke="var(--sc-mut)" stroke-width="1.4" fill="none"/><circle cx="8.5" cy="10" r="1.8" fill="var(--sc-mut)"/><path d="M4 17l4.5-4.5 3 3 3.5-3.5L20 17" stroke="var(--sc-mut)" stroke-width="1.4" fill="none"/></svg>' : '') + play +
      (e.p.label ? '<span style="position:absolute;left:8px;bottom:8px;font:500 10px/1 Archivo,sans-serif;color:var(--sc-text);background:var(--sc-panel);padding:3px 7px;border-radius:4px">' + esc(e.p.label) + '</span>' : '') + '</div>';
  },
});
