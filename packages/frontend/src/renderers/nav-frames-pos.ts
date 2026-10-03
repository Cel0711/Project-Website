import { clamp, esc } from '../core/dom.js';
import { lines } from '../core/svg.js';
import { def } from './registry-core.js';

/* ============ NAVIGATION ============ */

type NavVariant = 'top' | 'tabs' | 'breadcrumb' | 'pagination' | 'menu' | 'command' | 'toolbar' | 'footer';
interface NavbarProps { variant: NavVariant; items: string; brand: string; cta: string; at: number; }
def<NavbarProps>('navbar', {
  cat: 'nav', label: 'Navigation', w: 520, h: 56, fillVar: '--sc-panel', radius: 0, bw: 1, pad: 0,
  p: { variant: 'top', items: 'Overview\nJobs\nAssets\nReports', brand: 'Northwind', cta: 'New job', at: 1 },
  fields: [['variant', 'Kind', 'sel:top,tabs,breadcrumb,pagination,menu,command,toolbar,footer'], ['brand', 'Brand', 'text'], ['items', 'Items', 'area'], ['cta', 'Button', 'text'], ['at', 'Active #', 'num']],
  make(e) {
    const v = e.p.variant, it = lines(e.p.items), at = clamp(e.p.at || 1, 1, Math.max(1, it.length));
    if (v === 'breadcrumb') {
      return '<div style="height:100%;display:flex;align-items:center;gap:7px;padding:0 4px;font:400 11px/1 Archivo,sans-serif;color:var(--sc-mut)">' + it.map((s, i) =>
        (i ? '<span style="color:var(--sc-line)">/</span>' : '') + '<span style="' + (i === it.length - 1 ? 'color:var(--sc-text);font-weight:600' : '') + '">' + esc(s) + '</span>',
      ).join('') + '</div>';
    }
    if (v === 'pagination') {
      return '<div style="height:100%;display:flex;align-items:center;justify-content:center;gap:4px">' + ['‹', '1', '2', '3', '…', '18', '›'].map((s) => {
        const on = s === '2';
        return '<span style="min-width:26px;height:26px;display:grid;place-items:center;border:1px solid ' + (on ? 'var(--sc-brand)' : 'var(--sc-line)') + ';background:' + (on ? 'var(--sc-brand)' : 'var(--sc-panel)') + ';color:' + (on ? '#fff' : 'var(--sc-mut)') + ';border-radius:5px;font:500 10.5px/1 Archivo,sans-serif">' + s + '</span>';
      }).join('') + '</div>';
    }
    if (v === 'tabs') {
      return '<div style="height:100%;display:flex;align-items:flex-end;gap:2px;border-bottom:1px solid var(--sc-line)">' + it.map((s, i) => {
        const on = i === at - 1;
        return '<span style="padding:8px 13px;font:' + (on ? 600 : 400) + ' 11.5px/1 Archivo,sans-serif;color:' + (on ? 'var(--sc-text)' : 'var(--sc-mut)') + ';border-bottom:2px solid ' + (on ? 'var(--sc-accent)' : 'transparent') + '">' + esc(s) + '</span>';
      }).join('') + '</div>';
    }
    if (v === 'menu') {
      return '<div style="width:100%;background:var(--sc-panel);border:1px solid var(--sc-line);border-radius:8px;padding:5px;box-shadow:0 12px 30px -12px rgba(0,0,0,.35)">' + it.map((s, i) =>
        '<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:5px;background:' + (i === at - 1 ? 'var(--sc-panel2)' : 'transparent') + ';font:400 11px/1 Archivo,sans-serif;color:var(--sc-text)"><span style="width:12px;height:12px;border-radius:3px;background:var(--sc-line)"></span>' + esc(s) + '</div>',
      ).join('') + '</div>';
    }
    if (v === 'command') {
      return '<div style="width:100%;background:var(--sc-panel);border:1px solid var(--sc-line);border-radius:10px;overflow:hidden;box-shadow:0 20px 40px -16px rgba(0,0,0,.4)">' +
        '<div style="display:flex;align-items:center;gap:8px;padding:11px 13px;border-bottom:1px solid var(--sc-line)"><span style="font:400 11px/1 \'IBM Plex Mono\',monospace;color:var(--sc-brand)">&gt;</span><span style="font:400 12px/1 Archivo,sans-serif;color:var(--sc-mut)">Run a command or search</span><span style="margin-left:auto;font:400 9px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut);border:1px solid var(--sc-line);border-radius:3px;padding:2px 5px">esc</span></div>' +
        it.slice(0, 4).map((s, i) =>
          '<div style="display:flex;align-items:center;gap:8px;padding:8px 13px;background:' + (i === 0 ? 'var(--sc-panel2)' : 'transparent') + ';font:400 11px/1 Archivo,sans-serif;color:var(--sc-text)"><span style="width:12px;height:12px;border-radius:3px;background:var(--sc-brand)"></span>' + esc(s) + '</div>',
        ).join('') + '</div>';
    }
    if (v === 'toolbar') {
      return '<div style="height:100%;display:flex;align-items:center;gap:5px;padding:0 8px;background:var(--sc-panel2);border-radius:7px">' +
        it.slice(0, 5).map((s, i) =>
          '<span style="padding:5px 9px;border-radius:5px;background:' + (i === at - 1 ? 'var(--sc-panel)' : 'transparent') + ';border:1px solid ' + (i === at - 1 ? 'var(--sc-line)' : 'transparent') + ';font:500 10.5px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(s) + '</span>',
        ).join('') + '<span style="margin-left:auto;width:26px;height:22px;border-radius:5px;background:var(--sc-panel);border:1px solid var(--sc-line)"></span></div>';
    }
    if (v === 'footer') {
      return '<div style="height:100%;display:flex;align-items:center;gap:14px;border-top:1px solid var(--sc-line);padding:0 4px">' +
        '<b style="font:700 12px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.brand) + '</b>' +
        it.map((s) => '<span style="font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(s) + '</span>').join('') +
        '<span style="margin-left:auto;font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">© 2026</span></div>';
    }
    return '<div style="height:100%;display:flex;align-items:center;gap:16px;padding:0 14px;border-bottom:1px solid var(--sc-line)">' +
      '<div style="display:flex;align-items:center;gap:7px"><span style="width:18px;height:18px;border-radius:5px;background:var(--sc-brand)"></span><b style="font:700 12.5px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.brand) + '</b></div>' +
      '<div style="display:flex;gap:12px">' + it.map((s, i) =>
        '<span style="font:' + (i === at - 1 ? 600 : 400) + ' 11.5px/1 Archivo,sans-serif;color:' + (i === at - 1 ? 'var(--sc-text)' : 'var(--sc-mut)') + '">' + esc(s) + '</span>',
      ).join('') + '</div>' +
      (e.p.cta ? '<span style="margin-left:auto;background:var(--sc-brand);color:#fff;padding:7px 12px;border-radius:6px;font:600 11px/1 Archivo,sans-serif">' + esc(e.p.cta) + '</span>' : '') + '</div>';
  },
});

interface SidebarNavProps { brand: string; items: string; at: number; user: string; }
def<SidebarNavProps>('sidebarNav', {
  cat: 'nav', label: 'Sidebar', w: 180, h: 400, fillVar: '--sc-panel', radius: 0, bw: 1, pad: 10,
  p: { brand: 'Northwind', items: 'Overview\nJobs\nAssets\nReports\nTeam\nSettings', at: 1, user: 'A. Rahman' },
  fields: [['brand', 'Brand', 'text'], ['items', 'Items', 'area'], ['at', 'Active #', 'num'], ['user', 'Footer user', 'text']],
  make(e) {
    const it = lines(e.p.items), at = clamp(e.p.at || 1, 1, Math.max(1, it.length));
    return '<div style="height:100%;display:flex;flex-direction:column;gap:3px">' +
      '<div style="display:flex;align-items:center;gap:7px;padding:2px 6px 12px"><span style="width:18px;height:18px;border-radius:5px;background:var(--sc-brand)"></span><b style="font:700 12.5px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.brand) + '</b></div>' +
      it.map((s, i) => {
        const on = i === at - 1;
        return '<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:6px;background:' + (on ? 'var(--sc-panel2)' : 'transparent') + ';font:' + (on ? 600 : 400) + ' 11.5px/1 Archivo,sans-serif;color:' + (on ? 'var(--sc-text)' : 'var(--sc-mut)') + '">' +
          '<span style="width:13px;height:13px;border-radius:4px;background:' + (on ? 'var(--sc-brand)' : 'var(--sc-line)') + ';flex:none"></span>' + esc(s) + '</div>';
      }).join('') +
      (e.p.user ? '<div style="margin-top:auto;display:flex;align-items:center;gap:7px;padding-top:10px;border-top:1px solid var(--sc-line)"><span style="width:22px;height:22px;border-radius:50%;background:var(--sc-line)"></span><span style="font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.user) + '</span></div>' : '') + '</div>';
  },
});

interface TabbarProps { items: string; at: number; }
def<TabbarProps>('tabbar', {
  cat: 'nav', label: 'Mobile tab bar', w: 300, h: 58, fillVar: '--sc-panel', radius: 0, bw: 1, pad: 0,
  p: { items: '🏠 Home\n📋 Jobs\n➕ New\n🔔 Alerts\n👤 Me', at: 1 },
  fields: [['items', 'Tabs (emoji label)', 'area'], ['at', 'Active #', 'num']],
  make(e) {
    const it = lines(e.p.items), at = clamp(e.p.at || 1, 1, Math.max(1, it.length));
    return '<div style="height:100%;display:flex;align-items:center;border-top:1px solid var(--sc-line)">' + it.map((s, i) => {
      const parts = s.split(' '), ic = parts[0], lb = parts.slice(1).join(' '), on = i === at - 1;
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px"><span style="font-size:15px;line-height:1;' + (on ? '' : 'opacity:.5') + '">' + esc(ic) + '</span>' +
        '<span style="font:' + (on ? 600 : 400) + ' 8.5px/1 Archivo,sans-serif;color:' + (on ? 'var(--sc-brand)' : 'var(--sc-mut)') + '">' + esc(lb) + '</span></div>';
    }).join('') + '</div>';
  },
});

/* ============ FRAMES ============ */

type FrameVariant = 'phone' | 'tablet' | 'browser' | 'app' | 'watch' | 'kiosk';
interface FrameProps { variant: FrameVariant; label: string; url: string; }
def<FrameProps>('frame', {
  cat: 'frame', label: 'Device frame', w: 300, h: 600, pad: 0, radius: 0,
  p: { variant: 'phone', label: '', url: 'northwind.example/ops' },
  fields: [['variant', 'Device', 'sel:phone,tablet,browser,app,watch,kiosk'], ['url', 'URL / title', 'text']],
  make(e) {
    const v = e.p.variant;
    if (v === 'phone' || v === 'tablet') {
      const rad = v === 'phone' ? 34 : 22;
      return '<div style="width:100%;height:100%;border-radius:' + rad + 'px;background:#0B1214;padding:' + (v === 'phone' ? 8 : 12) + 'px;box-shadow:0 20px 50px -18px rgba(0,0,0,.6)">' +
        '<div style="width:100%;height:100%;border-radius:' + (rad - 7) + 'px;background:var(--sc-bg);position:relative;overflow:hidden">' +
        (v === 'phone' ? '<div style="position:absolute;left:50%;transform:translateX(-50%);top:6px;width:34%;height:16px;border-radius:100px;background:#0B1214;z-index:5"></div>' : '') +
        '</div></div>';
    }
    if (v === 'watch') {
      return '<div style="width:100%;height:100%;display:grid;place-items:center"><div style="width:86%;height:74%;border-radius:26%;background:#0B1214;padding:7px"><div style="width:100%;height:100%;border-radius:22%;background:var(--sc-bg)"></div></div></div>';
    }
    if (v === 'kiosk') {
      return '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center">' +
        '<div style="flex:1;width:100%;border-radius:10px;background:#0B1214;padding:10px"><div style="width:100%;height:100%;border-radius:5px;background:var(--sc-bg)"></div></div>' +
        '<div style="width:28%;height:12px;background:#0B1214"></div><div style="width:52%;height:7px;border-radius:0 0 6px 6px;background:#0B1214"></div></div>';
    }
    return '<div style="width:100%;height:100%;border-radius:9px;overflow:hidden;background:var(--sc-panel);border:1px solid var(--sc-line);box-shadow:0 18px 44px -18px rgba(0,0,0,.45);display:flex;flex-direction:column">' +
      '<div style="height:32px;flex:none;background:var(--sc-panel2);border-bottom:1px solid var(--sc-line);display:flex;align-items:center;gap:8px;padding:0 10px">' +
      '<span style="display:flex;gap:5px">' + ['#F2704A', '#FFC41F', '#3FBD79'].map((c) => '<span style="width:9px;height:9px;border-radius:50%;background:' + c + '"></span>').join('') + '</span>' +
      (v === 'browser'
        ? '<span style="flex:1;max-width:280px;height:19px;background:var(--sc-bg);border:1px solid var(--sc-line);border-radius:100px;display:flex;align-items:center;padding:0 8px;font:400 9px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + esc(e.p.url) + '</span>'
        : '<span style="font:500 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc(e.p.url) + '</span>') +
      '</div><div style="flex:1;background:var(--sc-bg)"></div></div>';
  },
});

/* ============ POINT OF SALE ============ */

interface PosGridProps { cols: number; items: string; cur: string; }
def<PosGridProps>('posGrid', {
  cat: 'frame', label: 'POS product grid', w: 400, h: 270, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { cols: 3, items: 'Flat white:9.50:☕\nIced latte:11.00:🥤\nCroissant:7.00:🥐\nBagel set:12.50:🥯\nOrange juice:8.00:🍊\nMuffin:6.50:🧁', cur: '$' },
  fields: [['items', 'Items (name:price:emoji)', 'area'], ['cols', 'Columns', 'num'], ['cur', 'Currency', 'text']],
  make(e) {
    const it = lines(e.p.items), c = clamp(e.p.cols || 3, 1, 5);
    return '<div style="height:100%;display:grid;grid-template-columns:repeat(' + c + ',1fr);gap:7px">' + it.map((s, i) => {
      const p = s.split(':');
      return '<div style="background:var(--sc-panel2);border:1px solid var(--sc-line);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:4px;justify-content:space-between' + (i === 0 ? ';outline:2px solid var(--sc-accent);outline-offset:-2px' : '') + '">' +
        '<span style="font-size:17px;line-height:1">' + esc(p[2] || '🧾') + '</span>' +
        '<span style="font:600 10.5px/1.25 Archivo,sans-serif;color:var(--sc-text)">' + esc(p[0]) + '</span>' +
        '<span style="font:500 11px/1 \'IBM Plex Mono\',monospace;color:var(--sc-brand)">' + esc(e.p.cur || '$') + esc(p[1] || '') + '</span></div>';
    }).join('') + '</div>';
  },
});

interface CartProps { items: string; cur: string; title: string; cta: string; }
def<CartProps>('cart', {
  cat: 'frame', label: 'Order / cart panel', w: 250, h: 330, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 14,
  p: { items: '2 × Flat white:19.00\n1 × Croissant:7.00\n1 × Orange juice:8.00', cur: '$', title: 'Order #90441', cta: 'Charge card' },
  fields: [['title', 'Title', 'text'], ['items', 'Lines (label:amount)', 'area'], ['cur', 'Currency', 'text'], ['cta', 'Button', 'text']],
  make(e) {
    const it = lines(e.p.items);
    let sum = 0;
    const rows = it.map((s) => {
      const p = s.split(':'), amt = parseFloat(p[1] ?? '0') || 0;
      sum += amt;
      return '<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--sc-line)"><span style="flex:1;font:400 11px/1.3 Archivo,sans-serif;color:var(--sc-text)">' + esc(p[0]) + '</span>' +
        '<span style="font:500 11px/1.3 \'IBM Plex Mono\',monospace;color:var(--sc-text)">' + esc(e.p.cur || '$') + amt.toFixed(2) + '</span></div>';
    }).join('');
    const tax = sum * 0.06;
    return '<div style="height:100%;display:flex;flex-direction:column">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--sc-line)"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b><span style="margin-left:auto;font:400 10px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">Table 12</span></div>' +
      rows +
      '<div style="margin-top:10px;display:flex;flex-direction:column;gap:5px">' +
      ([['Subtotal', sum], ['Service tax 6%', tax], ['Total', sum + tax]] as [string, number][]).map((row, i) => {
        const big = i === 2;
        return '<div style="display:flex;gap:8px' + (big ? ';margin-top:5px;padding-top:8px;border-top:1px solid var(--sc-line)' : '') + '"><span style="flex:1;font:' + (big ? 600 : 400) + ' ' + (big ? 12 : 10.5) + 'px/1.3 Archivo,sans-serif;color:' + (big ? 'var(--sc-text)' : 'var(--sc-mut)') + '">' + row[0] + '</span>' +
          '<span style="font:' + (big ? 700 : 400) + ' ' + (big ? 14 : 10.5) + 'px/1.3 \'IBM Plex Mono\',monospace;color:var(--sc-text)">' + esc(e.p.cur || '$') + row[1].toFixed(2) + '</span></div>';
      }).join('') + '</div>' +
      '<div style="margin-top:auto;display:flex;flex-direction:column;gap:6px;padding-top:12px">' +
      '<div style="background:var(--sc-brand);color:#fff;border-radius:6px;padding:10px;text-align:center;font:600 12px/1 Archivo,sans-serif">' + esc(e.p.cta) + '</div>' +
      '<div style="display:flex;gap:6px">' + ['Cash', 'QR', 'Split'].map((l) =>
        '<span style="flex:1;border:1px solid var(--sc-line);border-radius:6px;padding:7px;text-align:center;font:500 10px/1 Archivo,sans-serif;color:var(--sc-mut)">' + l + '</span>',
      ).join('') + '</div></div></div>';
  },
});

interface KeypadProps { display: string; cur: string; }
def<KeypadProps>('keypad', {
  cat: 'frame', label: 'Keypad', w: 190, h: 230, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 10,
  p: { display: '128.50', cur: '$' },
  fields: [['display', 'Display', 'text'], ['cur', 'Currency', 'text']],
  make(e) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];
    return '<div style="height:100%;display:flex;flex-direction:column;gap:7px">' +
      '<div style="background:var(--sc-panel2);border-radius:6px;padding:8px 10px;text-align:right;font:600 18px/1 \'IBM Plex Mono\',monospace;color:var(--sc-text)">' + esc(e.p.cur || '$') + esc(e.p.display) + '</div>' +
      '<div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:5px">' + keys.map((k) =>
        '<div style="background:var(--sc-panel2);border:1px solid var(--sc-line);border-radius:6px;display:grid;place-items:center;font:500 13px/1 Archivo,sans-serif;color:var(--sc-text)">' + k + '</div>',
      ).join('') + '</div></div>';
  },
});
