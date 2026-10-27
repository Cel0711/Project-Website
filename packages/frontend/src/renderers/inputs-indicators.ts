import { clamp, esc, minmax, round, series, srnd } from '../core/dom.js';
import { bar, colFor, dot, lines, polyPts, svg } from '../core/svg.js';
import { def } from './registry-core.js';

/* ============ INPUTS & SELECTORS ============ */

interface FieldProps { label: string; value: string; ph: string; variant: 'text' | 'search' | 'select' | 'date' | 'time' | 'area' | 'password' | 'otp' | 'file'; icon: string; }
def<FieldProps>('field', {
  cat: 'input', label: 'Text field', w: 260, h: 62, pad: 0, radius: 0,
  p: { label: 'Part number', value: '', ph: 'Search the catalogue', variant: 'text', icon: '' },
  fields: [['label', 'Label', 'text'], ['ph', 'Placeholder', 'text'], ['value', 'Value', 'text'], ['variant', 'Type', 'sel:text,search,select,date,time,area,password,otp,file']],
  make(e) {
    const v = e.p.variant;
    const lab = e.p.label ? '<span style="font:400 10px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut);display:block;margin-bottom:5px">' + esc(e.p.label) + '</span>' : '';
    let val = e.p.value;
    const ph = e.p.ph;
    const boxH = v === 'area' ? 'calc(100% - 16px)' : '34px';
    let inner = '';
    if (v === 'search') inner = '<span style="width:11px;height:11px;border:1.5px solid var(--sc-mut);border-radius:50%;flex:none"></span>';
    if (v === 'password') val = val ? '••••••••••' : '';
    if (v === 'otp') {
      return '<div style="height:100%">' + lab + '<div style="display:flex;gap:6px">' + [0, 1, 2, 3, 4, 5].map((i) =>
        '<div style="flex:1;height:38px;border:1px solid ' + (i < 2 ? 'var(--sc-brand)' : 'var(--sc-line)') + ';border-radius:6px;background:var(--sc-panel);display:grid;place-items:center;font:600 15px/1 \'IBM Plex Mono\',monospace;color:var(--sc-text)">' + (i < 2 ? i + 3 : '') + '</div>',
      ).join('') + '</div></div>';
    }
    if (v === 'file') {
      return '<div style="height:100%">' + lab + '<div style="height:calc(100% - 16px);min-height:46px;border:1.5px dashed var(--sc-line);border-radius:8px;background:var(--sc-panel2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px">' +
        '<span style="font:600 11.5px/1 Archivo,sans-serif;color:var(--sc-text)">Drop files here</span><span style="font:400 10px/1 Archivo,sans-serif;color:var(--sc-mut)">CSV, XLSX or PDF up to 20 MB</span></div></div>';
    }
    const caret = v === 'select' ? '<svg width="10" height="10" viewBox="0 0 10 10" style="flex:none"><path d="M2 4l3 3 3-3" stroke="var(--sc-mut)" stroke-width="1.5" fill="none"/></svg>' : '';
    const cal = v === 'date' || v === 'time' ? '<svg width="12" height="12" viewBox="0 0 14 14" style="flex:none"><rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="var(--sc-mut)" stroke-width="1.2" fill="none"/><path d="M1.5 6h11M4.5 1.5v2M9.5 1.5v2" stroke="var(--sc-mut)" stroke-width="1.2"/></svg>' : '';
    return '<div style="height:100%">' + lab +
      '<div style="height:' + boxH + ';min-height:30px;border:1px solid var(--sc-line);border-radius:6px;background:var(--sc-panel);display:flex;align-items:' + (v === 'area' ? 'flex-start' : 'center') + ';gap:7px;padding:' + (v === 'area' ? '8px 10px' : '0 10px') + '">' +
      inner + '<span style="flex:1;font:400 12px/1.4 Archivo,sans-serif;color:' + (val ? 'var(--sc-text)' : 'var(--sc-mut)') + ';overflow:hidden;white-space:' + (v === 'area' ? 'pre-wrap' : 'nowrap') + '">' + esc(val || ph) + '</span>' + caret + cal + '</div></div>';
  },
});

interface ChoiceProps { variant: 'checkbox' | 'radio' | 'switch' | 'segmented' | 'chips' | 'rating' | 'slider' | 'stepper' | 'toggleRow'; label: string; items: string; on: number; }
def<ChoiceProps>('choice', {
  cat: 'input', label: 'Selector', w: 250, h: 96, pad: 0, radius: 0,
  p: { variant: 'checkbox', label: 'Include in report', items: 'Cost roll-up\nLead times\nSupplier notes', on: 1 },
  fields: [['variant', 'Kind', 'sel:checkbox,radio,switch,segmented,chips,rating,slider,stepper,toggleRow'], ['label', 'Label', 'text'], ['items', 'Items', 'area'], ['on', 'Selected #', 'num']],
  make(e) {
    const v = e.p.variant;
    const it = lines(e.p.items);
    const on = clamp(Math.round(e.p.on) || 1, 1, Math.max(1, it.length));
    if (v === 'switch' || v === 'toggleRow') {
      return '<div style="height:100%;display:flex;flex-direction:column;gap:8px;justify-content:center">' + it.map((s, i) => {
        const act = i < on;
        return '<div style="display:flex;align-items:center;gap:10px"><span style="flex:1;font:400 12px/1.3 Archivo,sans-serif;color:var(--sc-text)">' + esc(s) + '</span>' +
          '<span style="width:34px;height:19px;border-radius:100px;background:' + (act ? 'var(--sc-brand)' : 'var(--sc-line)') + ';position:relative;flex:none"><span style="position:absolute;top:2px;' + (act ? 'right:2px' : 'left:2px') + ';width:15px;height:15px;border-radius:50%;background:#fff"></span></span></div>';
      }).join('') + '</div>';
    }
    if (v === 'segmented') {
      const a = clamp(on, 1, it.length);
      return '<div style="display:flex;height:100%;border:1px solid var(--sc-line);border-radius:6px;overflow:hidden;background:var(--sc-panel)">' + it.map((s, i) => {
        const activeSeg = i === a - 1;
        return '<div style="flex:1;display:flex;align-items:center;justify-content:center;font:' + (activeSeg ? 600 : 500) + ' 11.5px/1 Archivo,sans-serif;color:' + (activeSeg ? '#fff' : 'var(--sc-mut)') + ';background:' + (activeSeg ? 'var(--sc-brand)' : 'transparent') + ';border-left:' + (i ? '1px solid var(--sc-line)' : '0') + '">' + esc(s) + '</div>';
      }).join('') + '</div>';
    }
    if (v === 'chips') {
      return '<div style="height:100%;display:flex;flex-wrap:wrap;gap:6px;align-content:center">' + it.map((s, i) => {
        const act = i === on - 1;
        return '<span style="font:500 11px/1 Archivo,sans-serif;padding:6px 10px;border-radius:100px;border:1px solid ' + (act ? 'var(--sc-brand)' : 'var(--sc-line)') + ';background:' + (act ? 'var(--sc-brand)' : 'var(--sc-panel)') + ';color:' + (act ? '#fff' : 'var(--sc-mut)') + '">' + esc(s) + '</span>';
      }).join('') + '</div>';
    }
    if (v === 'rating') {
      return '<div style="height:100%;display:flex;align-items:center;gap:4px">' + [1, 2, 3, 4, 5].map((i) =>
        '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 2l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z" fill="' + (i <= on ? 'var(--sc-accent)' : 'var(--sc-line)') + '"/></svg>',
      ).join('') + '<span style="margin-left:6px;font:500 12px/1 Archivo,sans-serif;color:var(--sc-mut)">' + on + '.0</span></div>';
    }
    if (v === 'slider') {
      const pc = clamp((on / Math.max(1, it.length)) * 100, 6, 94);
      return '<div style="height:100%;display:flex;flex-direction:column;gap:9px;justify-content:center">' +
        '<div style="display:flex;justify-content:space-between;font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)"><span>' + esc(e.p.label) + '</span><span style="font-family:\'IBM Plex Mono\',monospace;color:var(--sc-text)">' + Math.round(pc) + '%</span></div>' +
        '<div style="position:relative;height:4px;background:var(--sc-line);border-radius:100px"><div style="position:absolute;left:0;top:0;bottom:0;width:' + pc + '%;background:var(--sc-brand);border-radius:100px"></div>' +
        '<span style="position:absolute;top:-6px;left:calc(' + pc + '% - 8px);width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid var(--sc-brand)"></span></div></div>';
    }
    if (v === 'stepper') {
      return '<div style="height:100%;display:flex;align-items:center;gap:0"><span style="flex:1;font:400 12px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.label) + '</span>' +
        '<div style="display:flex;align-items:center;border:1px solid var(--sc-line);border-radius:6px;overflow:hidden;background:var(--sc-panel)">' +
        '<span style="width:28px;height:30px;display:grid;place-items:center;font:500 14px/1 Archivo,sans-serif;color:var(--sc-mut);border-right:1px solid var(--sc-line)">&minus;</span>' +
        '<span style="width:38px;text-align:center;font:600 12.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-text)">' + on + '</span>' +
        '<span style="width:28px;height:30px;display:grid;place-items:center;font:500 14px/1 Archivo,sans-serif;color:var(--sc-mut);border-left:1px solid var(--sc-line)">+</span></div></div>';
    }
    /* checkbox + radio */
    return '<div style="height:100%;display:flex;flex-direction:column;gap:9px;justify-content:center">' + it.map((s, i) => {
      const act = v === 'radio' ? i === on - 1 : i < on;
      const box = v === 'radio'
        ? '<span style="width:15px;height:15px;border-radius:50%;border:1.6px solid ' + (act ? 'var(--sc-brand)' : 'var(--sc-line)') + ';display:grid;place-items:center;flex:none">' + (act ? '<span style="width:7px;height:7px;border-radius:50%;background:var(--sc-brand)"></span>' : '') + '</span>'
        : '<span style="width:15px;height:15px;border-radius:4px;border:1.6px solid ' + (act ? 'var(--sc-brand)' : 'var(--sc-line)') + ';background:' + (act ? 'var(--sc-brand)' : 'transparent') + ';display:grid;place-items:center;flex:none">' + (act ? '<svg width="9" height="9" viewBox="0 0 10 10"><path d="M1.5 5.2l2.2 2.2L8.5 2.6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>' : '') + '</span>';
      return '<div style="display:flex;align-items:center;gap:9px;font:400 12px/1.3 Archivo,sans-serif;color:var(--sc-text)">' + box + '<span>' + esc(s) + '</span></div>';
    }).join('') + '</div>';
  },
});

/* ============ INDICATORS ============ */

interface KpiProps { label: string; value: string; delta: string; dir: 'up' | 'down' | 'flat'; spark: 0 | 1; seed: number; }
def<KpiProps>('kpi', {
  cat: 'indicator', label: 'KPI stat', w: 210, h: 96, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 14,
  p: { label: 'Jobs completed', value: '1,284', delta: '+12.4%', dir: 'up', spark: 1, seed: 11 },
  fields: [['label', 'Label', 'text'], ['value', 'Value', 'text'], ['delta', 'Change', 'text'], ['dir', 'Direction', 'sel:up,down,flat'], ['spark', 'Sparkline', 'chk']],
  make(e) {
    const d = e.p.dir;
    const c = d === 'down' ? 'var(--sc-bad)' : d === 'flat' ? 'var(--sc-mut)' : 'var(--sc-ok)';
    const arrow = d === 'down' ? 'M1 1l4 5 4-5' : d === 'flat' ? 'M1 3.5h8' : 'M1 6l4-5 4 5';
    let sp = '';
    if (+e.p.spark) {
      const v = series(e.p.seed || 11, 14, 20, 90, true);
      const mm = minmax(v);
      const w = Math.max(40, e.w - 28);
      sp = '<div style="margin-top:auto;height:26px">' + svg(w, 26, '<polyline points="' + polyPts(v, 1, 2, w - 2, 22, mm[0] - 4, mm[1] + 4).join(' ') + '" stroke="' + c + '" stroke-width="1.6" fill="none"/>') + '</div>';
    }
    return '<div style="height:100%;display:flex;flex-direction:column;gap:3px">' +
      '<span style="font:400 10.5px/1.2 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.label) + '</span>' +
      '<div style="display:flex;align-items:baseline;gap:7px"><b style="font:700 26px/1.05 Archivo,sans-serif;letter-spacing:-.03em;color:var(--sc-text)">' + esc(e.p.value) + '</b>' +
      (e.p.delta ? '<span style="display:inline-flex;align-items:center;gap:3px;font:600 11px/1 Archivo,sans-serif;color:' + c + '"><svg width="10" height="7" viewBox="0 0 10 7"><path d="' + arrow + '" stroke="' + c + '" stroke-width="1.6" fill="none"/></svg>' + esc(e.p.delta) + '</span>' : '') + '</div>' + sp + '</div>';
  },
});

interface ProgressProps { variant: 'bar' | 'segments' | 'health' | 'uptime' | 'sla' | 'stacked'; label: string; value: number; sub: string; }
def<ProgressProps>('progress', {
  cat: 'indicator', label: 'Progress', w: 250, h: 56, pad: 0, radius: 0,
  p: { variant: 'bar', label: 'Migration', value: 68, sub: '34 of 50 racks' },
  fields: [['variant', 'Kind', 'sel:bar,segments,health,uptime,sla,stacked'], ['label', 'Label', 'text'], ['value', 'Percent', 'num'], ['sub', 'Sub label', 'text']],
  make(e) {
    const v = clamp(e.p.value || 0, 0, 100);
    const lab = e.p.label, sub = e.p.sub;
    const c = v >= 90 ? 'var(--sc-ok)' : v >= 50 ? 'var(--sc-brand)' : v >= 25 ? 'var(--sc-warn)' : 'var(--sc-bad)';
    if (e.p.variant === 'segments') {
      const n = 20, on = Math.round((n * v) / 100);
      return '<div style="height:100%;display:flex;flex-direction:column;gap:7px;justify-content:center">' +
        '<div style="display:flex;justify-content:space-between;font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)"><span>' + esc(lab) + '</span><span style="font-family:\'IBM Plex Mono\',monospace;color:var(--sc-text)">' + v + '%</span></div>' +
        '<div style="display:flex;gap:2px;height:14px">' + Array.from({ length: n }, (_, i) =>
          '<span style="flex:1;border-radius:1px;background:' + (i < on ? c : 'var(--sc-line)') + '"></span>',
        ).join('') + '</div></div>';
    }
    if (e.p.variant === 'uptime') {
      const r = srnd(31);
      const cells: string[] = [];
      for (let i = 0; i < 30; i++) { const x = r(); cells.push(x > 0.94 ? 'var(--sc-bad)' : x > 0.88 ? 'var(--sc-warn)' : 'var(--sc-ok)'); }
      return '<div style="height:100%;display:flex;flex-direction:column;gap:7px;justify-content:center">' +
        '<div style="display:flex;justify-content:space-between;font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)"><span>' + esc(lab) + '</span><span style="font-family:\'IBM Plex Mono\',monospace;color:var(--sc-ok)">99.94%</span></div>' +
        '<div style="display:flex;gap:2px;height:18px">' + cells.map((c2) => '<span style="flex:1;border-radius:2px;background:' + c2 + '"></span>').join('') + '</div>' +
        '<span style="font:400 9.5px/1 Archivo,sans-serif;color:var(--sc-mut)">30 days</span></div>';
    }
    if (e.p.variant === 'sla') {
      return '<div style="height:100%;display:flex;align-items:center;gap:10px">' +
        '<div style="width:34px;height:34px;border-radius:50%;background:conic-gradient(' + c + ' ' + v * 3.6 + 'deg,var(--sc-line) 0);display:grid;place-items:center;flex:none"><span style="width:24px;height:24px;border-radius:50%;background:var(--sc-panel);display:grid;place-items:center;font:600 9px/1 \'IBM Plex Mono\',monospace;color:var(--sc-text)">' + v + '</span></div>' +
        '<div style="min-width:0"><div style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(lab) + '</div><div style="font:400 10px/1.2 Archivo,sans-serif;color:var(--sc-mut)">' + esc(sub) + '</div></div></div>';
    }
    if (e.p.variant === 'health') {
      return '<div style="height:100%;display:flex;flex-direction:column;gap:6px;justify-content:center">' +
        '<div style="display:flex;align-items:center;gap:6px;font:600 11.5px/1 Archivo,sans-serif;color:var(--sc-text)">' + dot(c, 8) + esc(lab) + '<span style="margin-left:auto;font:400 10px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(sub) + '</span></div>' +
        bar(v, c, 8) + '</div>';
    }
    if (e.p.variant === 'stacked') {
      const segs: [number, string][] = [[v, 'var(--sc-brand)'], [Math.max(0, (100 - v) * 0.55), 'var(--sc-accent)'], [Math.max(0, (100 - v) * 0.45), 'var(--sc-line)']];
      return '<div style="height:100%;display:flex;flex-direction:column;gap:7px;justify-content:center">' +
        '<div style="font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(lab) + '</div>' +
        '<div style="display:flex;height:10px;border-radius:100px;overflow:hidden">' + segs.map((s) => '<span style="width:' + s[0] + '%;background:' + s[1] + '"></span>').join('') + '</div>' +
        '<div style="display:flex;gap:10px;font:400 9.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + ['Done', 'Running', 'Queued'].map((l, i) => '<span style="display:flex;align-items:center;gap:4px">' + dot(segs[i]?.[1] ?? c, 6) + l + '</span>').join('') + '</div></div>';
    }
    return '<div style="height:100%;display:flex;flex-direction:column;gap:7px;justify-content:center">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font:500 11.5px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(lab) + '</span><span style="font:400 10.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(sub) + '</span></div>' +
      bar(v, c, 8) + '</div>';
  },
});

interface GaugeProps { variant: 'arc' | 'ring' | 'score'; label: string; value: number; unit: string; }
def<GaugeProps>('gauge', {
  cat: 'indicator', label: 'Gauge', w: 150, h: 120, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { variant: 'arc', label: 'Capacity', value: 74, unit: '%' },
  fields: [['variant', 'Kind', 'sel:arc,ring,score'], ['label', 'Label', 'text'], ['value', 'Value', 'num'], ['unit', 'Unit', 'text']],
  make(e) {
    const v = clamp(e.p.value || 0, 0, 100);
    const c = v > 85 ? 'var(--sc-bad)' : v > 65 ? 'var(--sc-warn)' : 'var(--sc-ok)';
    if (e.p.variant === 'ring') {
      return '<div style="height:100%;display:grid;place-items:center;gap:6px">' +
        '<div style="width:72px;height:72px;border-radius:50%;background:conic-gradient(' + c + ' ' + v * 3.6 + 'deg,var(--sc-line) 0);display:grid;place-items:center">' +
        '<div style="width:54px;height:54px;border-radius:50%;background:var(--sc-panel);display:grid;place-items:center;font:700 17px/1 Archivo,sans-serif;color:var(--sc-text)">' + v + '<span style="font-size:9px"></span></div></div>' +
        '<span style="font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.label) + '</span></div>';
    }
    if (e.p.variant === 'score') {
      return '<div style="height:100%;display:flex;flex-direction:column;justify-content:center;gap:8px">' +
        '<div style="display:flex;align-items:baseline;gap:5px"><b style="font:700 32px/1 Archivo,sans-serif;letter-spacing:-.03em;color:' + c + '">' + v + '</b><span style="font:500 11px/1 Archivo,sans-serif;color:var(--sc-mut)">/ 100</span></div>' +
        bar(v, c, 6) + '<span style="font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.label) + '</span></div>';
    }
    const w = Math.max(80, e.w - 24), R = Math.min(w / 2 - 4, e.h - 40), cx = w / 2, cy = R + 6;
    const a = Math.PI * (1 - v / 100), ex = cx + R * Math.cos(a), ey = cy - R * Math.sin(a);
    return '<div style="height:100%;display:flex;flex-direction:column">' + svg(w, cy + 8,
      '<path d="M' + (cx - R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy + '" stroke="var(--sc-line)" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M' + (cx - R) + ' ' + cy + ' A ' + R + ' ' + R + ' 0 0 1 ' + round(ex, 1) + ' ' + round(ey, 1) + '" stroke="' + c + '" stroke-width="9" stroke-linecap="round"/>' +
      '<text x="' + cx + '" y="' + (cy - 4) + '" fill="var(--sc-text)" font-size="18" font-weight="700" font-family="Archivo, sans-serif" text-anchor="middle">' + esc(v + (e.p.unit || '')) + '</text>') +
      '<span style="text-align:center;font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut);margin-top:auto">' + esc(e.p.label) + '</span></div>';
  },
});

interface BadgeProps { items: string; variant: 'pill' | 'dot' | 'square' | 'bell'; }
def<BadgeProps>('badge', {
  cat: 'indicator', label: 'Badge row', w: 230, h: 32, pad: 0, radius: 0,
  p: { items: 'Running:ok\nQueued:info\nFailed:bad', variant: 'pill' },
  fields: [['items', 'Items (label:ok|warn|bad|info)', 'area'], ['variant', 'Style', 'sel:pill,dot,square,bell']],
  make(e) {
    const it = lines(e.p.items), v = e.p.variant;
    if (v === 'bell') {
      return '<div style="height:100%;display:flex;align-items:center;gap:14px">' + it.slice(0, 3).map((s) => {
        const p = s.split(':'), c = colFor(p[1]);
        return '<span style="position:relative;display:inline-flex;align-items:center;gap:6px;font:500 11.5px/1 Archivo,sans-serif;color:var(--sc-text)">' +
          '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2a4 4 0 0 0-4 4v3l-1 2h10l-1-2V6a4 4 0 0 0-4-4z" stroke="var(--sc-mut)" stroke-width="1.3" fill="none"/><path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="var(--sc-mut)" stroke-width="1.3" fill="none"/></svg>' +
          esc(p[0]) + '<span style="position:absolute;top:-4px;left:9px;min-width:14px;height:14px;border-radius:100px;background:' + c + ';color:#fff;font:600 9px/14px Archivo,sans-serif;text-align:center;padding:0 3px">4</span></span>';
      }).join('') + '</div>';
    }
    return '<div style="height:100%;display:flex;align-items:center;gap:7px;flex-wrap:wrap">' + it.map((s) => {
      const p = s.split(':'), c = colFor(p[1]);
      if (v === 'dot') return '<span style="display:inline-flex;align-items:center;gap:5px;font:500 11px/1 Archivo,sans-serif;color:var(--sc-text)">' + dot(c, 7) + esc(p[0]) + '</span>';
      if (v === 'square') return '<span style="font:600 10px/1 \'IBM Plex Mono\',monospace;color:#fff;background:' + c + ';padding:4px 7px;border-radius:3px">' + esc(p[0]) + '</span>';
      return `<span style="display:inline-flex;align-items:center;gap:4px;font:500 10px/1 Archivo,sans-serif;color:${c};background:color-mix(in srgb,${c} 15%,transparent);padding:3px 6px;border-radius:100px;white-space:nowrap;">${esc(p[0] ?? '')}</span>`;
    }).join('') + '</div>';
  },
});

interface BannerProps { variant: 'info' | 'warn' | 'bad' | 'ok' | 'toast'; title: string; sub: string; }
def<BannerProps>('banner', {
  cat: 'indicator', label: 'Alert banner', w: 420, h: 60, radius: 8, pad: 12, bw: 1,
  p: { variant: 'warn', title: 'Rack B-14 above thermal threshold', sub: 'Escalated to site engineer 4 minutes ago' },
  fields: [['variant', 'Kind', 'sel:info,warn,bad,ok,toast'], ['title', 'Title', 'text'], ['sub', 'Detail', 'text']],
  make(e) {
    const v = e.p.variant;
    const c = colFor(v === 'info' ? 'info' : v === 'ok' ? 'ok' : v === 'bad' ? 'bad' : v === 'toast' ? 'brand' : 'warn');
    const g = ({ info: 'i', warn: '!', bad: '!', ok: '✓', toast: 'i' } as Record<string, string>)[v] || 'i';
    const dark = v === 'toast';
    return '<div style="height:100%;display:flex;align-items:center;gap:10px;background:' + (dark ? 'var(--sc-dark)' : 'color-mix(in srgb,' + c + ' 12%,transparent)') + ';border:1px solid ' + (dark ? 'transparent' : 'color-mix(in srgb,' + c + ' 35%,transparent)') + ';border-radius:7px;padding:0 12px;margin:-12px">' +
      '<span style="width:20px;height:20px;border-radius:50%;background:' + c + ';color:#fff;display:grid;place-items:center;font:700 12px/1 Archivo,sans-serif;flex:none">' + g + '</span>' +
      '<div style="min-width:0"><div style="font:600 12px/1.25 Archivo,sans-serif;color:' + (dark ? '#F3F4F6' : 'var(--sc-text)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(e.p.title) + '</div>' +
      (e.p.sub ? '<div style="font:400 10.5px/1.3 Archivo,sans-serif;color:' + (dark ? '#AEB5BD' : 'var(--sc-mut)') + '">' + esc(e.p.sub) + '</div>' : '') + '</div></div>';
  },
});

interface LoaderProps { variant: 'skeleton' | 'spinner' | 'bars' | 'steps'; }
def<LoaderProps>('loader', {
  cat: 'indicator', label: 'Loading state', w: 220, h: 70, pad: 0, radius: 0,
  p: { variant: 'skeleton' },
  fields: [['variant', 'Kind', 'sel:skeleton,spinner,bars,steps']],
  make(e) {
    const v = e.p.variant;
    if (v === 'spinner') return '<div style="height:100%;display:grid;place-items:center"><span style="width:26px;height:26px;border:3px solid var(--sc-line);border-top-color:var(--sc-brand);border-radius:50%;display:block"></span></div>';
    if (v === 'bars') return '<div style="height:100%;display:flex;align-items:flex-end;justify-content:center;gap:4px">' + [14, 22, 30, 20, 12].map((h) => '<span style="width:6px;height:' + h + 'px;background:var(--sc-brand);border-radius:2px"></span>').join('') + '</div>';
    if (v === 'steps') return '<div style="height:100%;display:flex;align-items:center;gap:0">' + ['Read', 'Validate', 'Write', 'Notify'].map((l, i) => {
      const done = i < 2;
      return '<div style="flex:1;display:flex;align-items:center;gap:6px"><span style="width:18px;height:18px;border-radius:50%;flex:none;background:' + (done ? 'var(--sc-brand)' : 'var(--sc-panel2)') + ';border:1.5px solid ' + (done ? 'var(--sc-brand)' : 'var(--sc-line)') + ';display:grid;place-items:center;font:600 9px/1 Archivo,sans-serif;color:' + (done ? '#fff' : 'var(--sc-mut)') + '">' + (done ? '✓' : i + 1) + '</span>' +
        '<span style="font:500 10px/1.2 Archivo,sans-serif;color:' + (done ? 'var(--sc-text)' : 'var(--sc-mut)') + '">' + l + '</span>' + (i < 3 ? '<span style="flex:1;height:1.5px;background:var(--sc-line)"></span>' : '') + '</div>';
    }).join('') + '</div>';
    return '<div style="height:100%;display:flex;flex-direction:column;gap:8px;justify-content:center">' +
      ['70%', '92%', '48%'].map((w) => '<span style="height:10px;width:' + w + ';border-radius:4px;background:linear-gradient(90deg,var(--sc-panel2),var(--sc-line),var(--sc-panel2))"></span>').join('') + '</div>';
  },
});
