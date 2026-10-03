import { ih, iw } from '../core/box.js';
import { esc, round, srnd } from '../core/dom.js';
import { colFor, dot, lines, rect, svg, txt } from '../core/svg.js';
import { def } from './registry-core.js';

const WORLD = [
  '0000000000000000000000000000000000000000',
  '0001111000000011110000000000000000000000',
  '0011111110001111111111111111111111100000',
  '0011111111001111111111111111111111110000',
  '0001111110000111111111111111111111000000',
  '0000111000000011111111111000111110000000',
  '0000011100000001111111000000011110000000',
  '0000011100000000111110000000011100000000',
  '0000001100000001111100000000000000000000',
  '0000001110000011111000000000011000000000',
  '0000000111000011111100000000111100000000',
  '0000000111000001111100000000111110000000',
  '0000000111000001111000000000011110000000',
  '0000000011100000111000000000001100000000',
  '0000000011000000110000000000111000000000',
  '0000000001000000100000000000011000000000',
  '0000000000000000000000000000000000000000',
  '0000000000111100000011110000001111000000',
];

interface MapProps { variant: 'pins' | 'route' | 'region' | 'world' | 'geofence'; pins: string; label: string; seed: number; }
def<MapProps>('map', {
  cat: 'map', label: 'Map', w: 360, h: 230, fillVar: '--sc-panel2', radius: 8, bw: 1, pad: 0,
  p: { variant: 'pins', pins: 'Warehouse A\nPlant 2\nDepot 7', seed: 5, label: 'Live fleet' },
  fields: [['variant', 'Kind', 'sel:pins,route,region,world,geofence'], ['pins', 'Markers', 'area'], ['label', 'Overlay label', 'text'], ['seed', 'Layout seed', 'num']],
  make(e) {
    const v = e.p.variant, W = Math.max(80, e.w), H = Math.max(60, e.h), r = srnd(e.p.seed || 5);
    if (v === 'world') {
      const cols = WORLD[0]?.length ?? 0, rows = WORLD.length, cw = W / cols, chh = H / rows;
      let d = '', hot = '';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (WORLD[y]?.charAt(x) === '1') {
          const cx = round(x * cw + cw / 2, 1), cy = round(y * chh + chh / 2, 1), rr = round(Math.min(cw, chh) * 0.33, 1);
          if (r() > 0.965) hot += '<circle cx="' + cx + '" cy="' + cy + '" r="' + round(rr * 2.2, 1) + '" fill="var(--sc-accent)" opacity=".35"/><circle cx="' + cx + '" cy="' + cy + '" r="' + round(rr * 1.15, 1) + '" fill="var(--sc-accent)"/>';
          else d += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="var(--sc-mut)" opacity=".55"/>';
        }
      }
      return svg(W, H, rect(0, 0, W, H, 'var(--sc-panel)', 0) + d + hot) +
        (e.p.label ? '<div style="position:absolute;left:10px;bottom:8px;font:500 10px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.label) + '</div>' : '');
    }
    if (v === 'region') {
      const regions: [string, string][] = [
        ['M20,60 L80,40 L120,70 L100,120 L40,110 Z', '.85'],
        ['M120,70 L175,50 L205,95 L150,130 L100,120 Z', '.6'],
        ['M205,95 L260,70 L285,120 L230,150 L150,130 Z', '.35'],
        ['M40,110 L100,120 L150,130 L130,175 L55,165 Z', '.95'],
        ['M150,130 L230,150 L215,180 L130,175 Z', '.5'],
      ];
      const inner = rect(0, 0, 300, 200, 'var(--sc-panel)', 0) + regions.map((g) =>
        '<path d="' + g[0] + '" fill="var(--sc-brand)" fill-opacity="' + g[1] + '" stroke="var(--sc-panel)" stroke-width="1.6"/>',
      ).join('') + txt(24, 26, e.p.label || '', 'var(--sc-mut)', 10, 500);
      return '<svg width="100%" height="100%" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
    }
    let blocks = '', roads = '';
    const gw = Math.max(34, W / 6), gh = Math.max(30, H / 4.2);
    for (let by = -1; by * gh < H + gh; by++) for (let bx = -1; bx * gw < W + gw; bx++) {
      const jx = (r() - 0.5) * 6, jy = (r() - 0.5) * 6;
      blocks += rect(round(bx * gw + 5 + jx, 1), round(by * gh + 5 + jy, 1), round(gw - 14, 1), round(gh - 14, 1), 'var(--sc-panel)', 2, 'opacity=".95"');
    }
    for (let rx = 0; rx * gw < W + gw; rx++) roads += '<line x1="' + round(rx * gw, 1) + '" y1="0" x2="' + round(rx * gw, 1) + '" y2="' + H + '" stroke="var(--sc-line)" stroke-width="' + (rx % 3 === 0 ? 4 : 2) + '"/>';
    for (let ry = 0; ry * gh < H + gh; ry++) roads += '<line x1="0" y1="' + round(ry * gh, 1) + '" x2="' + W + '" y2="' + round(ry * gh, 1) + '" stroke="var(--sc-line)" stroke-width="' + (ry % 2 === 0 ? 4 : 2) + '"/>';
    const water = '<path d="M-10,' + round(H * 0.72, 1) + ' C' + round(W * 0.25, 1) + ',' + round(H * 0.62, 1) + ' ' + round(W * 0.45, 1) + ',' + round(H * 0.92, 1) + ' ' + (W + 10) + ',' + round(H * 0.78, 1) + ' L' + (W + 10) + ',' + (H + 10) + ' L-10,' + (H + 10) + ' Z" fill="var(--sc-info)" fill-opacity=".22"/>';
    const hiway = '<path d="M-10,' + round(H * 0.2, 1) + ' Q' + round(W * 0.5, 1) + ',' + round(H * 0.45, 1) + ' ' + (W + 10) + ',' + round(H * 0.3, 1) + '" stroke="var(--sc-accent)" stroke-width="5" fill="none" opacity=".75"/>';
    const out = svg(W, H, rect(0, 0, W, H, 'var(--sc-panel2)', 0) + blocks + roads + water + hiway);
    let ov = '';
    if (v === 'route') {
      const p1: [number, number] = [round(W * 0.16, 1), round(H * 0.74, 1)];
      const p2: [number, number] = [round(W * 0.42, 1), round(H * 0.36, 1)];
      const p3: [number, number] = [round(W * 0.72, 1), round(H * 0.56, 1)];
      const p4: [number, number] = [round(W * 0.88, 1), round(H * 0.22, 1)];
      ov = '<svg width="100%" height="100%" viewBox="0 0 ' + W + ' ' + H + '" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M' + p1 + ' Q' + [round(W * 0.3, 1), round(H * 0.4, 1)] + ' ' + p2 + ' T' + p3 + ' L' + p4 + '" stroke="var(--sc-brand)" stroke-width="4" fill="none" stroke-linecap="round"/>' +
        [p1, p2, p3, p4].map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 0 || i === 3 ? 7 : 5) + '" fill="' + (i === 3 ? 'var(--sc-accent)' : 'var(--sc-brand)') + '" stroke="var(--sc-panel)" stroke-width="2.5"/>').join('') + '</svg>';
    } else if (v === 'geofence') {
      const R = round(Math.min(W, H) * 0.33, 1);
      ov = '<svg width="100%" height="100%" viewBox="0 0 ' + W + ' ' + H + '" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="' + round(W / 2, 1) + '" cy="' + round(H / 2, 1) + '" r="' + R + '" fill="var(--sc-brand)" fill-opacity=".16" stroke="var(--sc-brand)" stroke-width="2" stroke-dasharray="6 5"/>' +
        '<circle cx="' + round(W / 2, 1) + '" cy="' + round(H / 2, 1) + '" r="6" fill="var(--sc-brand)" stroke="var(--sc-panel)" stroke-width="2.5"/>' +
        txt(W / 2, H / 2 - R - 7, '2 km radius', 'var(--sc-text)', 10, 600, 'middle') + '</svg>';
    } else {
      ov = lines(e.p.pins).slice(0, 6).map((l, i) => {
        const px = 12 + r() * Math.max(20, W - 100), py = 26 + r() * Math.max(20, H - 74);
        return '<div style="position:absolute;left:' + round(px, 1) + 'px;top:' + round(py, 1) + 'px;display:flex;align-items:center;gap:5px">' +
          '<svg width="18" height="22" viewBox="0 0 18 22" style="flex:none"><path d="M9 1c4 0 7 3 7 7 0 5-7 13-7 13S2 13 2 8c0-4 3-7 7-7z" fill="' + (i === 0 ? 'var(--sc-bad)' : 'var(--sc-brand)') + '"/><circle cx="9" cy="8" r="2.6" fill="#fff"/></svg>' +
          '<span style="background:var(--sc-panel);border:1px solid var(--sc-line);border-radius:4px;padding:2px 6px;font:500 9.5px/1.3 Archivo,sans-serif;color:var(--sc-text);white-space:nowrap">' + esc(l) + '</span></div>';
      }).join('');
    }
    const chip = e.p.label ? '<div style="position:absolute;left:10px;top:10px;background:var(--sc-panel);border:1px solid var(--sc-line);border-radius:5px;padding:4px 8px;font:500 10px/1 Archivo,sans-serif;color:var(--sc-text);display:flex;align-items:center;gap:5px">' + dot('var(--sc-ok)', 6) + esc(e.p.label) + '</div>' : '';
    const zoom = '<div style="position:absolute;right:8px;bottom:8px;display:flex;flex-direction:column;border:1px solid var(--sc-line);border-radius:4px;overflow:hidden;background:var(--sc-panel)"><span style="width:20px;height:20px;display:grid;place-items:center;font:500 12px/1 Archivo,sans-serif;color:var(--sc-mut);border-bottom:1px solid var(--sc-line)">+</span><span style="width:20px;height:20px;display:grid;place-items:center;font:500 12px/1 Archivo,sans-serif;color:var(--sc-mut)">&minus;</span></div>';
    return out + ov + chip + zoom;
  },
});

interface PlanProps { variant: 'floor' | 'rack'; label: string; seed: number; }
def<PlanProps>('plan', {
  cat: 'map', label: 'Floor / rack plan', w: 380, h: 240, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { variant: 'floor', label: 'Hall 2 — 184 racks', seed: 8 },
  fields: [['variant', 'Kind', 'sel:floor,rack'], ['label', 'Label', 'text'], ['seed', 'Seed', 'num']],
  make(e) {
    const W = iw(e), H = Math.max(40, ih(e) - 18), r = srnd(e.p.seed || 8);
    if (e.p.variant === 'rack') {
      const us = 22, uh = (H - 14) / us;
      let inner = rect(0, 0, W, H, 'var(--sc-panel2)', 4) + rect(3, 3, W - 6, H - 6, 'var(--sc-bg)', 3);
      for (let i = 0; i < us; i++) {
        const y = 7 + i * uh;
        if (r() > 0.28) {
          const kind = r(), col = kind > 0.86 ? 'var(--sc-accent)' : kind > 0.7 ? 'var(--sc-info)' : 'var(--sc-line)';
          inner += rect(8, round(y, 1), W - 16, round(uh - 2, 1), col, 1.5);
          inner += '<circle cx="' + (W - 16) + '" cy="' + round(y + uh / 2 - 1, 1) + '" r="2" fill="' + (r() > 0.12 ? 'var(--sc-ok)' : 'var(--sc-bad)') + '"/>';
          if (uh > 7) inner += txt(14, round(y + uh / 2 + 1.5, 1), kind > 0.86 ? 'PDU' : kind > 0.7 ? 'SW-' + (i + 1) : 'SRV-' + (40 + i), 'var(--sc-text)', Math.min(7.5, uh * 0.7), 500);
        }
        inner += txt(W - 4, round(y + uh / 2 + 1.5, 1), us - i + 'U', 'var(--sc-mut)', 5.5, 400, 'end');
      }
      return '<div style="height:100%;display:flex;flex-direction:column">' + svg(W, H, inner) + '<span style="margin-top:4px;font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.label) + '</span></div>';
    }
    const rows = 5, perRow = 9;
    let inner2 = rect(0, 0, W, H, 'var(--sc-bg)', 4) + '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="4" stroke="var(--sc-line)" stroke-width="1.5" fill="none"/>';
    const mx = 16, my = 14, aw = W - mx * 2, ah = H - my * 2;
    for (let ry = 0; ry < rows; ry++) {
      const y2 = my + ry * (ah / rows);
      for (let rx = 0; rx < perRow; rx++) {
        const x2 = mx + rx * (aw / perRow), st = r();
        const c = st > 0.93 ? 'var(--sc-bad)' : st > 0.82 ? 'var(--sc-warn)' : st > 0.2 ? 'var(--sc-brand)' : 'var(--sc-line)';
        inner2 += rect(round(x2 + 1, 1), round(y2 + 1, 1), round(aw / perRow - 4, 1), round(ah / rows - 6, 1), c, 1.5, 'opacity=".9"');
      }
      inner2 += txt(4, round(y2 + ah / rows / 2, 1), String.fromCharCode(65 + ry), 'var(--sc-mut)', 7, 500);
    }
    inner2 += rect(W - 11, my, 8, ah - 6, 'var(--sc-info)', 2, 'opacity=".5"');
    return '<div style="height:100%;display:flex;flex-direction:column">' + svg(W, H, inner2) +
      '<div style="margin-top:4px;display:flex;gap:9px;font:400 9px/1 Archivo,sans-serif;color:var(--sc-mut)"><span style="display:flex;gap:3px;align-items:center">' + dot('var(--sc-brand)', 6) + 'In service</span><span style="display:flex;gap:3px;align-items:center">' + dot('var(--sc-warn)', 6) + 'Warning</span><span style="display:flex;gap:3px;align-items:center">' + dot('var(--sc-bad)', 6) + 'Fault</span><span style="margin-left:auto;font-family:\'IBM Plex Mono\',monospace">' + esc(e.p.label) + '</span></div></div>';
  },
});

interface TopologyProps { label: string; tiers: string; }
def<TopologyProps>('topology', {
  cat: 'map', label: 'Network topology', w: 400, h: 230, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { label: 'Spine and leaf — site 1', tiers: '2\n4\n8' },
  fields: [['label', 'Label', 'text'], ['tiers', 'Nodes per tier', 'area']],
  make(e) {
    const W = iw(e), H = Math.max(50, ih(e) - 16);
    let tiers = lines(e.p.tiers).map(Number).filter((n) => n > 0);
    if (!tiers.length) tiers = [2, 4, 8];
    const pos: [number, number][][] = [];
    let inner = '';
    const names = ['Core', 'Leaf', 'Host', 'Edge'];
    tiers.forEach((n, ti) => {
      const y = 18 + ti * ((H - 32) / Math.max(1, tiers.length - 1));
      const row: [number, number][] = [];
      for (let i = 0; i < n; i++) row.push([round((W * (i + 1)) / (n + 1), 1), round(y, 1)]);
      pos.push(row);
    });
    for (let t = 0; t < pos.length - 1; t++) (pos[t] ?? []).forEach((a) => {
      (pos[t + 1] ?? []).forEach((b, bi) => {
        if ((pos[t + 1]?.length ?? 0) > 4 && bi % 2 && t > 0) return;
        inner += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="var(--sc-line)" stroke-width="1.2"/>';
      });
    });
    const r = srnd(13);
    pos.forEach((row, ti) => {
      row.forEach((p) => {
        const bad = r() > 0.9, size = ti === 0 ? 9 : ti === 1 ? 7 : 5.5;
        inner += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + size + '" fill="' + (ti === 0 ? 'var(--sc-brand)' : 'var(--sc-panel2)') + '" stroke="' + (bad ? 'var(--sc-bad)' : ti === 0 ? 'var(--sc-brand)' : 'var(--sc-line)') + '" stroke-width="1.8"/>';
        if (ti > 0) inner += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + round(size * 0.4, 1) + '" fill="' + (bad ? 'var(--sc-bad)' : 'var(--sc-ok)') + '"/>';
      });
      const firstRow = row[0];
      if (firstRow) inner += txt(2, firstRow[1] + 2, names[ti] || 'T' + ti, 'var(--sc-mut)', 7.5, 500);
    });
    return '<div style="height:100%;display:flex;flex-direction:column">' + svg(W, H, inner) + '<span style="margin-top:2px;font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.label) + '</span></div>';
  },
});

interface NodeGraphProps { steps: string; title: string; }
def<NodeGraphProps>('nodeGraph', {
  cat: 'map', label: 'Workflow pipeline', w: 440, h: 150, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 14,
  p: { steps: 'Watch inbox:ok\nExtract fields:ok\nMatch supplier:run\nPost to ERP:wait\nNotify buyer:wait', title: 'Quote intake pipeline' },
  fields: [['title', 'Title', 'text'], ['steps', 'Steps (label:ok|run|wait|bad)', 'area']],
  make(e) {
    const st = lines(e.p.steps);
    const cols: Record<string, string> = { ok: 'var(--sc-ok)', run: 'var(--sc-accent)', wait: 'var(--sc-mut)', bad: 'var(--sc-bad)' };
    return '<div style="height:100%;display:flex;flex-direction:column;gap:10px">' +
      (e.p.title
        ? '<div style="display:flex;align-items:center;gap:8px;padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--sc-line)"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b><span style="margin-left:auto;font:400 10px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">auto-run / 5 min</span></div>'
        : '') +
      '<div style="flex:1;display:flex;align-items:stretch;gap:0">' + st.map((s, i) => {
        const p = s.split(':'), c = cols[p[1] ?? ''] || cols['wait'], on = p[1] === 'ok' || p[1] === 'run';
        return (i ? '<div style="width:20px;align-self:center;height:2px;background:' + (on ? 'var(--sc-brand)' : 'var(--sc-line)') + ';flex:none;position:relative"><span style="position:absolute;right:-1px;top:-3px;width:0;height:0;border-left:5px solid ' + (on ? 'var(--sc-brand)' : 'var(--sc-line)') + ';border-top:4px solid transparent;border-bottom:4px solid transparent"></span></div>' : '') +
          '<div style="flex:1;min-width:0;border:1.5px solid ' + (p[1] === 'run' ? 'var(--sc-accent)' : 'var(--sc-line)') + ';background:var(--sc-panel2);border-radius:7px;padding:8px;display:flex;flex-direction:column;gap:5px">' +
          '<div style="display:flex;align-items:center;gap:5px">' + dot(c ?? 'var(--sc-mut)', 7) + '<span style="font:400 8.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">0' + (i + 1) + '</span></div>' +
          '<span style="font:600 10.5px/1.25 Archivo,sans-serif;color:var(--sc-text)">' + esc(p[0]) + '</span>' +
          (p[1] === 'run' ? '<div style="height:4px;background:var(--sc-panel2);border-radius:100px;overflow:hidden"><div style="width:62%;height:100%;background:var(--sc-accent);border-radius:100px"></div></div>' : '') + '</div>';
      }).join('') + '</div></div>';
  },
});
