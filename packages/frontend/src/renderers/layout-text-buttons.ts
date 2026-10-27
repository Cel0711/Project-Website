import { esc } from '../core/dom.js';
import { lines } from '../core/svg.js';
import { def } from './registry-core.js';

/* ============ LAYOUT ============ */

interface PanelProps { pattern: 'none' | 'dots' | 'lines' | 'grid' | 'glow' | 'noise'; }
def<PanelProps>('panel', {
  cat: 'layout', label: 'Panel', w: 420, h: 260, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 0,
  p: { pattern: 'none' },
  fields: [['pattern', 'Pattern', 'sel:none,dots,lines,grid,glow,noise']],
  make(e) {
    const p = e.p.pattern;
    let css = '';
    if (p === 'dots') css = 'background-image:radial-gradient(currentColor 1px,transparent 1px);background-size:14px 14px;color:var(--sc-line);opacity:.9';
    if (p === 'lines') css = 'background-image:repeating-linear-gradient(90deg,var(--sc-line) 0 1px,transparent 1px 16px)';
    if (p === 'grid') css = 'background-image:linear-gradient(var(--sc-line) 1px,transparent 1px),linear-gradient(90deg,var(--sc-line) 1px,transparent 1px);background-size:24px 24px';
    if (p === 'glow') css = 'background:radial-gradient(60% 80% at 20% 10%,color-mix(in srgb,var(--sc-brand) 45%,transparent),transparent 70%),radial-gradient(50% 70% at 90% 90%,color-mix(in srgb,var(--sc-accent) 40%,transparent),transparent 70%)';
    if (p === 'noise') css = 'background-image:repeating-conic-gradient(var(--sc-line) 0% 25%,transparent 0% 50%);background-size:6px 6px;opacity:.5';
    return p === 'none' ? '' : '<div style="position:absolute;inset:0;' + css + '"></div>';
  },
});

interface ShellProps { variant: 'both' | 'sidebar' | 'top'; title: string; nav: string; user: string; }
def<ShellProps>('shell', {
  cat: 'layout', label: 'App shell', w: 900, h: 560, fillVar: '--sc-bg', radius: 8, bw: 1, pad: 0,
  p: { variant: 'both', title: 'Operations', nav: 'Overview\nJobs\nAssets\nReports\nSettings', user: 'A. Rahman' },
  fields: [['variant', 'Layout', 'sel:both,sidebar,top'], ['title', 'Product name', 'text'], ['nav', 'Nav items', 'area'], ['user', 'User', 'text']],
  make(e) {
    const v = e.p.variant;
    let out = '';
    const sw = Math.min(190, Math.max(120, e.w * 0.2)), th = 44;
    if (v !== 'top') {
      const items = lines(e.p.nav).map((n, i) =>
        '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:5px;font:' + (i === 0 ? 600 : 400) + ' 11.5px/1 Archivo,sans-serif;color:' + (i === 0 ? 'var(--sc-text)' : 'var(--sc-mut)') + ';background:' + (i === 0 ? 'var(--sc-panel2)' : 'transparent') + '">' +
        '<span style="width:12px;height:12px;border-radius:3px;background:' + (i === 0 ? 'var(--sc-brand)' : 'var(--sc-line)') + ';flex:none"></span>' + esc(n) + '</div>',
      ).join('');
      out += '<div style="position:absolute;left:0;top:0;bottom:0;width:' + sw + 'px;background:var(--sc-panel);border-right:1px solid var(--sc-line);padding:12px 8px;display:flex;flex-direction:column;gap:3px">' +
        '<div style="display:flex;align-items:center;gap:7px;padding:2px 6px 12px"><span style="width:18px;height:18px;border-radius:4px;background:var(--sc-brand)"></span><b style="font:700 12.5px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b></div>' +
        items + '<div style="margin-top:auto;display:flex;align-items:center;gap:7px;padding:8px 6px;border-top:1px solid var(--sc-line)"><span style="width:20px;height:20px;border-radius:50%;background:var(--sc-line)"></span><span style="font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.user) + '</span></div></div>';
    }
    if (v !== 'sidebar') {
      const L = v === 'both' ? sw : 0;
      out += '<div style="position:absolute;left:' + L + 'px;right:0;top:0;height:' + th + 'px;background:var(--sc-panel);border-bottom:1px solid var(--sc-line);display:flex;align-items:center;gap:10px;padding:0 14px">' +
        (v === 'top' ? '<span style="width:18px;height:18px;border-radius:4px;background:var(--sc-brand)"></span><b style="font:700 12.5px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b>' : '') +
        '<div style="flex:1;max-width:240px;height:26px;border:1px solid var(--sc-line);border-radius:5px;background:var(--sc-bg);display:flex;align-items:center;padding:0 8px;gap:6px"><span style="width:10px;height:10px;border:1.4px solid var(--sc-mut);border-radius:50%"></span><span style="font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">Search</span></div>' +
        '<div style="margin-left:auto;display:flex;align-items:center;gap:8px"><span style="display:inline-flex;align-items:center;gap:4px;font:500 10px/1 Archivo,sans-serif;color:var(--sc-ok);background:color-mix(in srgb,var(--sc-ok) 16%,transparent);padding:3px 6px;border-radius:100px">Live</span>' +
        '<span style="width:22px;height:22px;border-radius:50%;background:var(--sc-line)"></span></div></div>';
    }
    return out;
  },
});

interface CardProps { title: string; sub: string; body: string; }
def<CardProps>('card', {
  cat: 'layout', label: 'Card', w: 280, h: 170, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 14, shadow: 'sm',
  p: { title: 'Throughput', sub: 'Last 24 hours', body: 'Jobs completed on the primary queue.' },
  fields: [['title', 'Title', 'text'], ['sub', 'Subtitle', 'text'], ['body', 'Body', 'area']],
  make(e) {
    return '<div style="display:flex;flex-direction:column;height:100%;gap:6px">' +
      '<b style="font:600 13.5px/1.25 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b>' +
      (e.p.sub ? '<span style="font:400 10.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.sub) + '</span>' : '') +
      '<p style="margin:2px 0 0;font:400 12px/1.5 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.body) + '</p></div>';
  },
});

interface DividerProps { label: string; style: 'solid' | 'dashed' | 'thick'; }
def<DividerProps>('divider', {
  cat: 'layout', label: 'Divider', w: 300, h: 24, radius: 0, pad: 0,
  p: { label: '', style: 'solid' },
  fields: [['label', 'Label', 'text'], ['style', 'Style', 'sel:solid,dashed,thick']],
  make(e) {
    const b = e.p.style === 'dashed' ? '1px dashed var(--sc-line)' : e.p.style === 'thick' ? '2px solid var(--sc-text)' : '1px solid var(--sc-line)';
    if (!e.p.label) return '<div style="position:absolute;left:0;right:0;top:50%;border-top:' + b + '"></div>';
    return '<div style="display:flex;align-items:center;gap:10px;height:100%"><span style="flex:none;font:500 10.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.label) + '</span><span style="flex:1;border-top:' + b + '"></span></div>';
  },
});

interface RibbonProps { items: string; }
def<RibbonProps>('ribbon', {
  cat: 'layout', label: 'Status ribbon', w: 420, h: 36, fillVar: '--sc-panel2', radius: 6, bw: 1, pad: 0,
  p: { items: 'Queue 12\nWorkers 8/8\nErrors 0\nLag 240ms' },
  fields: [['items', 'Readouts', 'area']],
  make(e) {
    return '<div style="display:flex;align-items:center;height:100%">' + lines(e.p.items).map((s, i) => {
      const parts = s.split(/\s+(?=[^\s]+$)/);
      return '<div style="flex:1;padding:0 10px;border-left:' + (i ? '1px solid var(--sc-line)' : '0') + '">' +
        '<div style="font:400 9px/1.2 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(parts[0]) + '</div>' +
        '<div style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(parts[1] || '') + '</div></div>';
    }).join('') + '</div>';
  },
});

/* ============ TEXT ============ */

interface TxtProps { text: string; size: number; weight: 400 | 500 | 600 | 700; align: 'left' | 'center' | 'right'; color: string; lh: number; mono: 0 | 1; caps: 0 | 1; }
def<TxtProps>('txt', {
  cat: 'text', label: 'Text', w: 300, h: 44, pad: 0, radius: 0,
  p: { text: 'Heading', size: 26, weight: 700, align: 'left', color: '', lh: 1.2, mono: 0, caps: 0 },
  fields: [['text', 'Text', 'area'], ['size', 'Size', 'num'], ['weight', 'Weight', 'sel:400,500,600,700'], ['align', 'Align', 'sel:left,center,right'], ['mono', 'Mono face', 'chk']],
  make(e) {
    const p = e.p;
    return '<div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;font:' + p.weight + ' ' + p.size + 'px/' + (p.lh || 1.25) + ' ' + (p.mono ? "'IBM Plex Mono',monospace" : 'Archivo,sans-serif') + ';color:' + (p.color || 'var(--sc-text)') + ';text-align:' + p.align + ';letter-spacing:' + (p.size > 22 ? '-.025em' : '-.005em') + ';white-space:pre-wrap;word-break:break-word">' + esc(p.text) + '</div>';
  },
});

interface BulletsProps { items: string; mark: 'dot' | 'check' | 'dash' | 'num'; }
def<BulletsProps>('bullets', {
  cat: 'text', label: 'Bullet list', w: 280, h: 120, pad: 0, radius: 0,
  p: { items: 'Live status per site\nOne owner per task\nAudit trail on every change', mark: 'dot' },
  fields: [['items', 'Items', 'area'], ['mark', 'Marker', 'sel:dot,check,dash,num']],
  make(e) {
    const m = e.p.mark;
    return '<div style="display:flex;flex-direction:column;gap:7px;justify-content:center;height:100%">' + lines(e.p.items).map((s, i) => {
      const g = m === 'check' ? '<svg width="12" height="12" viewBox="0 0 12 12" style="flex:none;margin-top:2px"><path d="M2 6.4l2.6 2.6L10 3.4" stroke="var(--sc-brand)" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>'
        : m === 'num' ? '<span style="flex:none;font:500 10px/1.4 \'IBM Plex Mono\',monospace;color:var(--sc-brand)">' + (i + 1) + '.</span>'
        : m === 'dash' ? '<span style="flex:none;width:8px;height:1.5px;background:var(--sc-mut);margin-top:7px"></span>'
        : '<span style="flex:none;width:5px;height:5px;border-radius:50%;background:var(--sc-brand);margin-top:5px"></span>';
      return '<div style="display:flex;gap:8px;font:400 12px/1.45 Archivo,sans-serif;color:var(--sc-text)">' + g + '<span>' + esc(s) + '</span></div>';
    }).join('') + '</div>';
  },
});

interface QuoteProps { text: string; who: string; }
def<QuoteProps>('quote', {
  cat: 'text', label: 'Pull quote', w: 340, h: 140, fillVar: '--sc-panel2', radius: 8, pad: 16, bw: 0,
  p: { text: 'The morning report used to take two hours. It is now waiting when we arrive.', who: 'Operations lead, manufacturing' },
  fields: [['text', 'Quote', 'area'], ['who', 'Attribution', 'text']],
  make(e) {
    return '<div style="height:100%;display:flex;flex-direction:column;gap:10px;border-left:2px solid var(--sc-accent);padding-left:12px">' +
      '<p style="margin:0;font:500 14px/1.45 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.text) + '</p>' +
      '<span style="margin-top:auto;font:400 10.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.who) + '</span></div>';
  },
});

interface PriceProps { cur: string; amount: string; per: string; }
def<PriceProps>('price', {
  cat: 'text', label: 'Price', w: 200, h: 80, pad: 0, radius: 0,
  p: { cur: '$', amount: '4,800', per: 'per month' },
  fields: [['cur', 'Currency', 'text'], ['amount', 'Amount', 'text'], ['per', 'Period', 'text']],
  make(e) {
    return '<div style="height:100%;display:flex;align-items:baseline;gap:4px">' +
      '<span style="font:500 18px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.cur) + '</span>' +
      '<span style="font:700 38px/1 Archivo,sans-serif;letter-spacing:-.03em;color:var(--sc-text)">' + esc(e.p.amount) + '</span>' +
      '<span style="font:400 11px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.per) + '</span></div>';
  },
});

interface WordmarkProps { text: string; mark: 'square' | 'circle' | 'loop' | 'none'; }
def<WordmarkProps>('wordmark', {
  cat: 'text', label: 'Logo wordmark', w: 190, h: 40, pad: 0, radius: 0,
  p: { text: 'Northwind', mark: 'square' },
  fields: [['text', 'Name', 'text'], ['mark', 'Mark', 'sel:square,circle,loop,none']],
  make(e) {
    const m = e.p.mark;
    let g = '';
    if (m === 'square') g = '<span style="width:22px;height:22px;border-radius:5px;background:var(--sc-brand);flex:none"></span>';
    if (m === 'circle') g = '<span style="width:22px;height:22px;border-radius:50%;border:3px solid var(--sc-accent);flex:none"></span>';
    if (m === 'loop') g = '<svg width="24" height="24" viewBox="0 0 24 24" style="flex:none"><circle cx="8" cy="8" r="4" stroke="var(--sc-accent)" stroke-width="2" fill="none"/><circle cx="16" cy="16" r="4" stroke="var(--sc-brand)" stroke-width="2" fill="none"/></svg>';
    return '<div style="height:100%;display:flex;align-items:center;gap:9px">' + g + '<b style="font:700 19px/1 Archivo,sans-serif;letter-spacing:-.03em;color:var(--sc-text)">' + esc(e.p.text) + '</b></div>';
  },
});

/* ============ BUTTONS ============ */

interface BtnProps { label: string; variant: 'primary' | 'accent' | 'secondary' | 'ghost' | 'pill' | 'danger' | 'link' | 'loading'; icon: string; full: 0 | 1; }
def<BtnProps>('btn', {
  cat: 'button', label: 'Button', w: 140, h: 38, radius: 6, pad: 0,
  p: { label: 'Save changes', variant: 'primary', icon: '', full: 1 },
  fields: [['label', 'Label', 'text'], ['variant', 'Style', 'sel:primary,accent,secondary,ghost,pill,danger,link,loading'], ['icon', 'Icon/emoji', 'text']],
  make(e) {
    const v = e.p.variant;
    let bg = 'var(--sc-brand)', fg = '#fff', bd = 'transparent';
    const rad = v === 'pill' ? 100 : 6;
    if (v === 'accent') { bg = 'var(--sc-accent)'; fg = '#1B2128'; }
    if (v === 'secondary') { bg = 'transparent'; fg = 'var(--sc-text)'; bd = 'var(--sc-line)'; }
    if (v === 'ghost') { bg = 'transparent'; fg = 'var(--sc-brand)'; }
    if (v === 'danger') { bg = 'var(--sc-bad)'; }
    if (v === 'link') { bg = 'transparent'; fg = 'var(--sc-brand)'; }
    const inner = (e.p.icon ? '<span style="font-size:13px">' + esc(e.p.icon) + '</span>' : '') +
      (v === 'loading' ? '<span style="width:12px;height:12px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;display:inline-block"></span>' : '') +
      '<span style="' + (v === 'link' ? 'text-decoration:underline;text-underline-offset:3px' : '') + '">' + esc(e.p.label) + '</span>';
    return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:7px;background:' + bg + ';color:' + fg + ';border:1px solid ' + bd + ';border-radius:' + rad + 'px;font:600 12.5px/1 Archivo,sans-serif">' + inner + '</div>';
  },
});

interface BtnGroupProps { items: string; active: number; }
def<BtnGroupProps>('btnGroup', {
  cat: 'button', label: 'Button group', w: 250, h: 36, radius: 6, pad: 0,
  p: { items: 'Day\nWeek\nMonth', active: 1 },
  fields: [['items', 'Items', 'area'], ['active', 'Active #', 'num']],
  make(e) {
    const it = lines(e.p.items);
    const a = Math.max(1, Math.min(it.length, Math.round(e.p.active) || 1));
    return '<div style="display:flex;height:100%;border:1px solid var(--sc-line);border-radius:6px;overflow:hidden;background:var(--sc-panel)">' + it.map((s, i) => {
      const on = i === a - 1;
      return '<div style="flex:1;display:flex;align-items:center;justify-content:center;font:' + (on ? 600 : 500) + ' 11.5px/1 Archivo,sans-serif;color:' + (on ? '#fff' : 'var(--sc-mut)') + ';background:' + (on ? 'var(--sc-brand)' : 'transparent') + ';border-left:' + (i ? '1px solid var(--sc-line)' : '0') + '">' + esc(s) + '</div>';
    }).join('') + '</div>';
  },
});

interface FabProps { icon: string; }
def<FabProps>('fab', {
  cat: 'button', label: 'Floating button', w: 52, h: 52, radius: 100, pad: 0, shadow: 'md',
  p: { icon: '+' },
  fields: [['icon', 'Icon/emoji', 'text']],
  make(e) {
    return '<div style="width:100%;height:100%;border-radius:100px;background:var(--sc-accent);color:#1B2128;display:grid;place-items:center;font:600 22px/1 Archivo,sans-serif">' + esc(e.p.icon) + '</div>';
  },
});

interface CtaBarProps { title: string; label: string; }
def<CtaBarProps>('ctaBar', {
  cat: 'button', label: 'Call to action bar', w: 520, h: 88, fillVar: '--sc-dark', radius: 10, pad: 16,
  p: { title: 'Ready to automate this?', label: 'Request a quote' },
  fields: [['title', 'Message', 'text'], ['label', 'Button', 'text']],
  make(e) {
    return '<div style="height:100%;display:flex;align-items:center;gap:14px">' +
      '<b style="font:600 15px/1.3 Archivo,sans-serif;color:#F3F4F6;flex:1">' + esc(e.p.title) + '</b>' +
      '<span style="background:var(--sc-accent);color:#1B2128;padding:9px 15px;border-radius:6px;font:600 12.5px/1 Archivo,sans-serif;white-space:nowrap">' + esc(e.p.label) + '</span></div>';
  },
});
