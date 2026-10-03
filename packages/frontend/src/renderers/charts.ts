import { ih, iw } from '../core/box.js';
import { clamp, esc, minmax, round, series, srnd } from '../core/dom.js';
import { colFor, dot, lines, polyPts, rect, svg, txt } from '../core/svg.js';
import { def } from './registry-core.js';

type ChartVariant =
  | 'line' | 'area' | 'bar' | 'stackBar' | 'hBar' | 'spark' | 'scatter' | 'funnel'
  | 'radar' | 'gantt' | 'waterfall' | 'bullet' | 'heatmap' | 'multi';

interface ChartProps {
  variant: ChartVariant;
  title: string;
  unit: string;
  seed: number;
  points: number;
  color: 'brand' | 'accent' | 'ok' | 'warn' | 'bad' | 'info';
  grid: 0 | 1;
  labels: string;
}

def<ChartProps>('chart', {
  cat: 'chart', label: 'Chart', w: 340, h: 200, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 14,
  p: { variant: 'line', title: 'Throughput per hour', unit: '', seed: 23, points: 24, color: 'brand', grid: 1, labels: 'Mon\nTue\nWed\nThu\nFri' },
  fields: [
    ['variant', 'Kind', 'sel:line,area,bar,stackBar,hBar,spark,scatter,funnel,radar,gantt,waterfall,bullet,heatmap,multi'],
    ['title', 'Title', 'text'], ['color', 'Colour', 'sel:brand,accent,ok,warn,bad,info'],
    ['points', 'Data points', 'num'], ['seed', 'Data seed', 'num'], ['labels', 'Labels', 'area'], ['grid', 'Grid lines', 'chk'],
  ],
  make(e) {
    const v = e.p.variant, C = colFor(e.p.color), W = iw(e), H = ih(e);
    const titleH = e.p.title ? 22 : 0;
    const ch = Math.max(30, H - titleH - (v === 'heatmap' ? 12 : 14));
    const n = clamp(e.p.points || 12, 3, 60);
    let body = '';
    const t = e.p.title ? '<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b>' + (e.p.unit ? '<span style="font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.unit) + '</span>' : '') + '</div>' : '';
    let gridLines = '';
    if (+e.p.grid && ['line', 'area', 'bar', 'stackBar', 'multi', 'scatter', 'waterfall'].indexOf(v) >= 0) {
      for (let g = 0; g < 4; g++) {
        const gy = round((ch * g) / 3, 1);
        gridLines += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" stroke="var(--sc-line)" stroke-width="1" stroke-dasharray="' + (g === 3 ? '0' : '3 3') + '"/>';
      }
    }
    if (v === 'line' || v === 'area' || v === 'spark' || v === 'multi') {
      const sets = v === 'multi' ? [series(e.p.seed || 23, n, 30, 95, true), series((e.p.seed || 23) + 9, n, 10, 60, true)] : [series(e.p.seed || 23, n, 15, 95, true)];
      const all = ([] as number[]).concat(...sets);
      const mm = minmax(all), lo = mm[0] - 6, hi = mm[1] + 6;
      let inner = gridLines;
      sets.forEach((vals, si) => {
        const col = si === 0 ? C : 'var(--sc-accent)';
        const pts = polyPts(vals, 0, 2, W, ch - 4, lo, hi);
        if (v === 'area' || v === 'spark') inner += '<path d="M' + pts.join(' L') + ' L' + W + ',' + ch + ' L0,' + ch + ' Z" fill="' + col + '" opacity=".16"/>';
        inner += '<polyline points="' + pts.join(' ') + '" stroke="' + col + '" stroke-width="' + (v === 'spark' ? 1.8 : 2) + '" fill="none" stroke-linejoin="round"/>';
        if (v !== 'spark') {
          const last = (pts[pts.length - 1] ?? '0,0').split(',');
          inner += '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="6.5" fill="' + col + '" opacity=".2"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3.4" fill="' + col + '"/>';
        }
      });
      body = svg(W, ch, inner);
    } else if (v === 'bar' || v === 'stackBar' || v === 'waterfall') {
      const vals2 = series(e.p.seed || 23, Math.min(n, 18), 20, 95, false);
      const bw = W / vals2.length;
      let inner1 = gridLines, acc = 0;
      vals2.forEach((val, i) => {
        const x = i * bw + bw * 0.18, wd = bw * 0.64;
        if (v === 'stackBar') {
          const h1 = (ch * val) / 110, h2 = (ch * (val * 0.45)) / 110;
          inner1 += rect(round(x, 1), round(ch - h1 - h2, 1), round(wd, 1), round(h2, 1), 'var(--sc-accent)', 2) + rect(round(x, 1), round(ch - h1, 1), round(wd, 1), round(h1, 1), C, 2);
        } else if (v === 'waterfall') {
          const dv = ((val - 55) / 110) * ch, y0 = ch * 0.55 - acc - Math.max(0, dv), hh = Math.abs(dv);
          inner1 += rect(round(x, 1), round(y0, 1), round(wd, 1), round(Math.max(2, hh), 1), dv >= 0 ? 'var(--sc-ok)' : 'var(--sc-bad)', 2);
          acc += dv;
        } else {
          const h = (ch * val) / 110;
          inner1 += rect(round(x, 1), round(ch - h, 1), round(wd, 1), round(h, 1), i === vals2.length - 1 ? 'var(--sc-accent)' : C, 2);
        }
      });
      body = svg(W, ch, inner1);
    } else if (v === 'hBar') {
      let labs = lines(e.p.labels).slice(0, 6);
      if (!labs.length) labs = ['A', 'B', 'C', 'D'];
      const vs = series(e.p.seed || 23, labs.length, 25, 98, false);
      body = '<div style="display:flex;flex-direction:column;gap:6px;height:' + ch + 'px;justify-content:space-around">' + labs.map((l, i) =>
        '<div style="display:flex;align-items:center;gap:8px"><span style="width:52px;flex:none;font:400 10px/1 Archivo,sans-serif;color:var(--sc-mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l) + '</span>' +
        '<span style="flex:1">' + `<div style="height:9px;background:var(--sc-panel2);border-radius:100px;overflow:hidden"><div style="width:${clamp(vs[i] ?? 0, 0, 100)}%;height:100%;background:${i === 0 ? 'var(--sc-accent)' : C};border-radius:100px"></div></div>` + '</span>' +
        '<span style="width:30px;flex:none;text-align:right;font:500 10px/1 \'IBM Plex Mono\',monospace;color:var(--sc-text)">' + Math.round(vs[i] ?? 0) + '</span></div>',
      ).join('') + '</div>';
    } else if (v === 'scatter') {
      const r = srnd(e.p.seed || 23);
      let inner2 = gridLines;
      for (let i2 = 0; i2 < Math.min(n * 2, 64); i2++) inner2 += '<circle cx="' + round(r() * W, 1) + '" cy="' + round(r() * ch, 1) + '" r="' + round(2 + r() * 3.5, 1) + '" fill="' + (r() > 0.75 ? 'var(--sc-accent)' : C) + '" opacity=".8"/>';
      body = svg(W, ch, inner2);
    } else if (v === 'funnel') {
      let stg = lines(e.p.labels).slice(0, 5);
      if (stg.length < 3) stg = ['Visits', 'Signups', 'Trials', 'Paid'];
      const sh = ch / stg.length;
      body = svg(W, ch, stg.map((l, i) => {
        const wTop = W * (1 - i * 0.17), wBot = W * (1 - (i + 1) * 0.17), y = i * sh, x1 = (W - wTop) / 2, x2 = (W - wBot) / 2;
        return '<path d="M' + round(x1, 1) + ' ' + round(y, 1) + ' L' + round(x1 + wTop, 1) + ' ' + round(y, 1) + ' L' + round(x2 + wBot, 1) + ' ' + round(y + sh - 3, 1) + ' L' + round(x2, 1) + ' ' + round(y + sh - 3, 1) + ' Z" fill="' + C + '" opacity="' + (1 - i * 0.16) + '"/>' + txt(W / 2, y + sh / 2 + 1, l, '#fff', 10, 600, 'middle');
      }).join(''));
    } else if (v === 'radar') {
      let ax = lines(e.p.labels).slice(0, 6);
      if (ax.length < 3) ax = ['Speed', 'Cost', 'Risk', 'Effort', 'Value'];
      const N = ax.length, R = Math.min(W, ch) / 2 - 16, cx = W / 2, cy = ch / 2;
      const vs2 = series(e.p.seed || 23, N, 35, 98, false);
      let inner3 = '';
      const pt = (i: number, rad: number): [number, number] => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
        return [round(cx + rad * Math.cos(a), 1), round(cy + rad * Math.sin(a), 1)];
      };
      [0.33, 0.66, 1].forEach((f) => {
        const p: string[] = [];
        for (let i = 0; i < N; i++) p.push(pt(i, R * f).join(','));
        inner3 += '<polygon points="' + p.join(' ') + '" stroke="var(--sc-line)" stroke-width="1" fill="none"/>';
      });
      const pp: string[] = [];
      for (let i3 = 0; i3 < N; i3++) pp.push(pt(i3, (R * (vs2[i3] ?? 50)) / 100).join(','));
      inner3 += '<polygon points="' + pp.join(' ') + '" fill="' + C + '" fill-opacity=".25" stroke="' + C + '" stroke-width="2"/>';
      for (let i4 = 0; i4 < N; i4++) { const q = pt(i4, R + 9); inner3 += txt(q[0], q[1] + 3, ax[i4] ?? '', 'var(--sc-mut)', 9, 500, 'middle'); }
      body = svg(W, ch, inner3);
    } else if (v === 'gantt') {
      let tasks = lines(e.p.labels).slice(0, 6);
      if (tasks.length < 3) tasks = ['Discovery', 'Build', 'Test', 'Release'];
      const r2 = srnd(e.p.seed || 23);
      body = '<div style="display:flex;flex-direction:column;gap:5px;height:' + ch + 'px;justify-content:space-around">' + tasks.map((l, i) => {
        const st = r2() * 45, ln = 18 + r2() * 36;
        return '<div style="display:flex;align-items:center;gap:8px"><span style="width:58px;flex:none;font:400 10px/1 Archivo,sans-serif;color:var(--sc-mut);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + esc(l) + '</span>' +
          '<span style="flex:1;position:relative;height:12px;background:var(--sc-panel2);border-radius:3px"><span style="position:absolute;left:' + round(st, 1) + '%;width:' + round(ln, 1) + '%;top:0;bottom:0;background:' + (i % 2 ? 'var(--sc-accent)' : C) + ';border-radius:3px"></span></span></div>';
      }).join('') + '</div>';
    } else if (v === 'bullet') {
      const vs3 = series(e.p.seed || 23, 3, 40, 95, false);
      let labs2 = lines(e.p.labels).slice(0, 3);
      if (labs2.length < 3) labs2 = ['Revenue', 'Units', 'Margin'];
      body = '<div style="display:flex;flex-direction:column;gap:10px;height:' + ch + 'px;justify-content:center">' + labs2.map((l, i) =>
        '<div><div style="display:flex;justify-content:space-between;font:400 9.5px/1 Archivo,sans-serif;color:var(--sc-mut);margin-bottom:4px"><span>' + esc(l) + '</span><span style="font-family:\'IBM Plex Mono\',monospace">' + Math.round(vs3[i] ?? 0) + '% of target</span></div>' +
        '<div style="position:relative;height:12px;background:var(--sc-panel2);border-radius:2px"><span style="position:absolute;left:0;top:0;bottom:0;width:' + (vs3[i] ?? 0) + '%;background:' + C + ';border-radius:2px"></span><span style="position:absolute;left:82%;top:-2px;bottom:-2px;width:2px;background:var(--sc-text)"></span></div></div>',
      ).join('') + '</div>';
    } else if (v === 'heatmap') {
      const cols = Math.min(26, Math.max(8, Math.floor(W / 12)));
      const r3 = srnd(e.p.seed || 23);
      let cells = '';
      for (let y = 0; y < 5; y++) for (let x = 0; x < cols; x++) {
        const val = r3(), op = val < 0.35 ? 0.12 : val < 0.6 ? 0.35 : val < 0.82 ? 0.62 : 1;
        cells += '<span style="background:' + C + ';opacity:' + op + ';border-radius:2px"></span>';
      }
      body = '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:2px;height:' + ch + 'px">' + cells + '</div>';
    }
    const legend = v === 'multi'
      ? '<div style="display:flex;gap:12px;margin-top:6px;font:400 9.5px/1 Archivo,sans-serif;color:var(--sc-mut)"><span style="display:flex;align-items:center;gap:4px">' + dot(C, 6) + 'This period</span><span style="display:flex;align-items:center;gap:4px">' + dot('var(--sc-accent)', 6) + 'Last period</span></div>'
      : ['line', 'area', 'bar', 'stackBar', 'waterfall', 'heatmap'].indexOf(v) >= 0
        ? '<div style="display:flex;justify-content:space-between;margin-top:5px;font:400 9px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)"><span>00:00</span><span>12:00</span><span>23:00</span></div>'
        : '';
    return '<div style="height:100%;display:flex;flex-direction:column">' + t + '<div style="flex:1;min-height:0">' + body + '</div>' + legend + '</div>';
  },
});

interface PieChartProps { variant: 'donut' | 'pie' | 'ring' | 'stacked'; title: string; center: string; items: string; }
def<PieChartProps>('pieChart', {
  cat: 'chart', label: 'Donut', w: 200, h: 180, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 14,
  p: { variant: 'donut', title: 'Spend by site', center: '68%', items: 'Site A:38\nSite B:26\nSite C:21\nOther:15' },
  fields: [['variant', 'Kind', 'sel:donut,pie,ring,stacked'], ['title', 'Title', 'text'], ['center', 'Centre text', 'text'], ['items', 'Slices (label:value)', 'area']],
  make(e) {
    let it = lines(e.p.items).map((s) => { const p = s.split(':'); return { l: p[0] ?? '', v: parseFloat(p[1] ?? '0') || 0 }; });
    if (!it.length) it = [{ l: 'A', v: 1 }];
    const tot = it.reduce((a, b) => a + b.v, 0) || 1;
    const pal = ['var(--sc-brand)', 'var(--sc-accent)', 'var(--sc-info)', 'var(--sc-line)', 'var(--sc-warn)', 'var(--sc-ok)'];
    const W = iw(e), H = ih(e), titleH = e.p.title ? 20 : 0;
    if (e.p.variant === 'stacked') {
      return '<div style="height:100%;display:flex;flex-direction:column;gap:9px">' +
        (e.p.title ? '<b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b>' : '') +
        '<div style="display:flex;height:14px;border-radius:100px;overflow:hidden">' + it.map((s, i) => '<span style="width:' + (s.v / tot) * 100 + '%;background:' + (pal[i % pal.length]) + '"></span>').join('') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:5px">' + it.map((s, i) =>
          '<div style="display:flex;align-items:center;gap:6px;font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + dot(pal[i % pal.length] ?? 'var(--sc-brand)', 7) + '<span style="flex:1">' + esc(s.l) + '</span><span style="font-family:\'IBM Plex Mono\',monospace;color:var(--sc-text)">' + Math.round((s.v / tot) * 100) + '%</span></div>',
        ).join('') + '</div></div>';
    }
    const stops: string[] = [];
    let acc = 0;
    it.forEach((s, i) => { const a = acc, b = acc + (s.v / tot) * 360; stops.push((pal[i % pal.length]) + ' ' + round(a, 1) + 'deg ' + round(b, 1) + 'deg'); acc = b; });
    const hole = e.p.variant === 'pie' ? 0 : e.p.variant === 'ring' ? 0.72 : 0.58;
    const size = Math.max(56, Math.min(W * 0.5, H - titleH - 10));
    return '<div style="height:100%;display:flex;flex-direction:column;gap:8px">' +
      (e.p.title ? '<b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b>' : '') +
      '<div style="flex:1;display:flex;align-items:center;gap:12px;min-height:0">' +
      '<div style="width:' + round(size, 0) + 'px;height:' + round(size, 0) + 'px;border-radius:50%;background:conic-gradient(' + stops.join(',') + ');display:grid;place-items:center;flex:none">' +
      (hole ? '<div style="width:' + hole * 100 + '%;height:' + hole * 100 + '%;border-radius:50%;background:var(--sc-panel);display:grid;place-items:center;text-align:center"><span style="font:700 15px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.center || '') + '</span></div>' : '') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:5px;min-width:0;flex:1">' + it.slice(0, 5).map((s, i) =>
        '<div style="display:flex;align-items:center;gap:6px;font:400 10px/1.2 Archivo,sans-serif;color:var(--sc-mut);min-width:0">' + dot(pal[i % pal.length] ?? 'var(--sc-brand)', 7) + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.l) + '</span><span style="margin-left:auto;font-family:\'IBM Plex Mono\',monospace;color:var(--sc-text)">' + Math.round((s.v / tot) * 100) + '</span></div>',
      ).join('') + '</div></div></div>';
  },
});
