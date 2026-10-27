import { clamp, esc, srnd } from '../core/dom.js';
import { colFor, dot, lines, pill } from '../core/svg.js';
import { def } from './registry-core.js';

type RowGen = (r: () => number, i: number) => string[];
const ROWGEN: Record<string, RowGen> = {
  bom: (r, i) => ['PN-' + (48210 + i * 17), ['Bracket, steel 4 mm', 'Cable harness 1.2 m', 'Sensor mount', 'Enclosure lid', 'Gasket set', 'Fan tray 80 mm', 'Label kit', 'DIN rail 35 mm'][i % 8] ?? '', String(2 + Math.floor(r() * 40)), (3 + r() * 180).toFixed(2), ['Approved', 'Pending', 'Approved', 'Sourcing'][i % 4] ?? ''],
  tickets: (r, i) => ['TK-' + (7120 + i * 3), ['Printer offline at line 3', 'Access request, finance drive', 'VPN drops every hour', 'New starter laptop', 'Label printer jam', 'Report export fails'][i % 6] ?? '', ['High', 'Normal', 'Urgent', 'Low'][i % 4] ?? '', ['A. Rahman', 'L. Chen', 'S. Devi', 'M. Osei'][i % 4] ?? '', ['Open', 'In progress', 'Waiting', 'Resolved'][i % 4] ?? ''],
  jobs: (r, i) => ['JOB-' + (2041 + i), ['Nightly BOM sync', 'ERP cost roll-up', 'Supplier price import', 'Rack config push', 'Weekly ops report', 'Ticket SLA sweep'][i % 6] ?? '', (0.4 + r() * 9).toFixed(1) + 's', ['Success', 'Success', 'Retried', 'Failed'][i % 4] ?? ''],
  orders: (r, i) => ['#' + (90441 + i * 7), ['Walk-in', 'Corporate', 'Delivery', 'Table 12'][i % 4] ?? '', String(1 + Math.floor(r() * 9)) + ' items', (12 + r() * 240).toFixed(2), ['Paid', 'Paid', 'Refunded', 'Open'][i % 4] ?? ''],
  assets: (r, i) => ['SRV-' + (1200 + i * 4), ['Rack A-' + (i + 1), 'Rack B-' + (i + 2), 'Rack C-' + (i + 1)][i % 3] ?? '', ['Compute', 'Storage', 'Network'][i % 3] ?? '', Math.round(28 + r() * 44) + '°C', ['Healthy', 'Healthy', 'Warning', 'Healthy'][i % 4] ?? ''],
  users: (r, i) => [['A. Rahman', 'L. Chen', 'S. Devi', 'M. Osei', 'J. Park', 'R. Silva'][i % 6] ?? '', ['Operations', 'Finance', 'IT', 'Plant floor'][i % 4] ?? '', ['Admin', 'Editor', 'Viewer'][i % 3] ?? '', ['Active', 'Active', 'Invited'][i % 3] ?? ''],
  runs: (r, i) => [new Date(Date.UTC(2026, 8, 20, 4 + i, (i * 13) % 60)).toISOString().slice(11, 16), ['Extract', 'Transform', 'Validate', 'Publish'][i % 4] ?? '', Math.round(120 + r() * 1800) + ' rows', ['OK', 'OK', 'OK', 'Warning'][i % 4] ?? ''],
};

type TableKind = 'bom' | 'tickets' | 'jobs' | 'orders' | 'assets' | 'users' | 'runs';
interface TableProps { kind: TableKind; rows: number; title: string; cols: string; }
def<TableProps>('table', {
  cat: 'data', label: 'Table', w: 460, h: 230, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 0,
  p: { kind: 'bom', rows: 6, title: 'Bill of material — assembly 4471', cols: '' },
  fields: [['kind', 'Data', 'sel:bom,tickets,jobs,orders,assets,users,runs'], ['title', 'Title', 'text'], ['rows', 'Rows', 'num'], ['cols', 'Custom headers', 'text']],
  make(e) {
    const HD: Record<TableKind, string[]> = {
      bom: ['Part', 'Description', 'Qty', 'Unit cost', 'Status'],
      tickets: ['Ref', 'Subject', 'Priority', 'Owner', 'Status'],
      jobs: ['Job', 'Name', 'Duration', 'Result'],
      orders: ['Order', 'Channel', 'Lines', 'Total', 'Status'],
      assets: ['Asset', 'Location', 'Type', 'Temp', 'Health'],
      users: ['Name', 'Team', 'Role', 'Status'],
      runs: ['Time', 'Stage', 'Volume', 'Result'],
    };
    const cols = e.p.cols ? e.p.cols.split(',') : HD[e.p.kind] || HD.bom;
    const gen = ROWGEN[e.p.kind] || ROWGEN['bom'];
    const r = srnd(7), n = clamp(e.p.rows || 6, 1, 14);
    const stCol = cols.length - 1;
    const cw = '1.1fr ' + cols.slice(1).map((_c, i) => (i === 0 && cols.length > 3 ? '2fr' : '1fr')).join(' ');
    let out = '<div style="height:100%;display:flex;flex-direction:column;overflow:hidden">';
    if (e.p.title) out += '<div style="padding:11px 14px 9px;border-bottom:1px solid var(--sc-line);display:flex;align-items:center;gap:8px"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b><span style="margin-left:auto;font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + n + ' of ' + n * 7 + '</span></div>';
    out += '<div style="display:grid;grid-template-columns:' + cw + ';gap:8px;padding:8px 14px;background:var(--sc-panel2);border-bottom:1px solid var(--sc-line)">' +
      cols.map((c) => '<span style="font:500 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut);overflow:hidden;white-space:nowrap">' + esc(c.trim()) + '</span>').join('') + '</div>';
    out += '<div style="flex:1;overflow:hidden">';
    for (let i = 0; i < n; i++) {
      const cells = (gen ?? ROWGEN['bom'])!(r, i);
      out += '<div style="display:grid;grid-template-columns:' + cw + ';gap:8px;padding:8px 14px;border-bottom:1px solid var(--sc-line);align-items:center">' +
        cells.slice(0, cols.length).map((c, ci) => {
          if (ci === stCol) {
            const k = /fail|refund|urgent|fault/i.test(c) ? 'bad' : /warn|pend|retr|waiting|sourcing|high/i.test(c) ? 'warn' : /open|invited|progress|normal/i.test(c) ? 'info' : 'ok';
            return '<span>' + pill(c, colFor(k), 'color-mix(in srgb,' + colFor(k) + ' 15%,transparent)') + '</span>';
          }
          const mono = ci === 0 || /^[\d.,#]+$/.test(String(c));
          return '<span style="font:' + (ci === 0 ? 500 : 400) + ' 10.5px/1.3 ' + (mono ? "'IBM Plex Mono',monospace" : 'Archivo,sans-serif') + ';color:' + (ci === 0 ? 'var(--sc-text)' : 'var(--sc-mut)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c) + '</span>';
        }).join('') + '</div>';
    }
    return out + '</div></div>';
  },
});

type ListVariant = 'activity' | 'files' | 'stat' | 'queue' | 'inbox';
interface ListRowsProps { variant: ListVariant; title: string; items: string; }
def<ListRowsProps>('listRows', {
  cat: 'data', label: 'List', w: 300, h: 190, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { variant: 'activity', title: 'Recent activity', items: '' },
  fields: [['variant', 'Kind', 'sel:activity,files,stat,queue,inbox'], ['title', 'Title', 'text'], ['items', 'Items (one per line)', 'area']],
  make(e) {
    const v = e.p.variant, custom = lines(e.p.items);
    const sets: Record<ListVariant, string[]> = {
      activity: ['Cost roll-up finished · 2 min', 'Supplier price file imported · 14 min', 'Rack B-14 config pushed · 31 min', 'SLA breach cleared · 1 hr'],
      files: ['ops-report-2026-09.pdf · 1.2 MB', 'bom-export.xlsx · 486 KB', 'rack-config-kl1.yaml · 12 KB', 'ticket-audit.csv · 903 KB'],
      stat: ['Open tickets · 42', 'Breaching SLA · 3', 'Avg first response · 11 min', 'Resolved today · 67'],
      queue: ['Nightly BOM sync · queued', 'ERP cost roll-up · running', 'Weekly ops report · 04:00', 'Price import · waiting'],
      inbox: ['Procurement: revised quote attached', 'Plant 2: line 3 stoppage report', 'IT: access approval needed', 'Finance: month-end close'],
    };
    const it = custom.length ? custom : sets[v] || sets.activity;
    return '<div style="height:100%;display:flex;flex-direction:column">' + (e.p.title ? '<div style="display:flex;align-items:center;gap:8px;padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--sc-line)"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b></div>' : '') +
      '<div style="display:flex;flex-direction:column;gap:0;flex:1;overflow:hidden">' + it.map((s, i) => {
        const p = s.split(' · ');
        let ic = '';
        if (v === 'files') ic = '<svg width="14" height="16" viewBox="0 0 14 16" style="flex:none"><path d="M2 1.5h6l4 4v9H2z" stroke="var(--sc-mut)" stroke-width="1.2" fill="none"/><path d="M8 1.5v4h4" stroke="var(--sc-mut)" stroke-width="1.2" fill="none"/></svg>';
        else if (v === 'inbox') ic = '<span style="width:20px;height:20px;border-radius:50%;background:var(--sc-panel2);flex:none;display:grid;place-items:center;font:600 8.5px/1 Archivo,sans-serif;color:var(--sc-mut)">' + esc((p[0] ?? '').charAt(0)) + '</span>';
        else ic = dot(i === 0 ? 'var(--sc-brand)' : 'var(--sc-line)', 7);
        return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:' + (i < it.length - 1 ? '1px solid var(--sc-line)' : '0') + '">' + ic +
          '<span style="flex:1;min-width:0;font:400 11px/1.35 Archivo,sans-serif;color:var(--sc-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p[0]) + '</span>' +
          (p[1] ? '<span style="font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut);flex:none">' + esc(p[1]) + '</span>' : '') + '</div>';
      }).join('') + '</div></div>';
  },
});

interface KanbanProps { cols: string; title: string; }
def<KanbanProps>('kanban', {
  cat: 'data', label: 'Kanban board', w: 460, h: 240, pad: 0, radius: 0,
  p: { cols: 'Triage:3\nIn progress:2\nBlocked:1\nDone:4', title: '' },
  fields: [['cols', 'Columns (name:cards)', 'area'], ['title', 'Title', 'text']],
  make(e) {
    const cs = lines(e.p.cols).map((s) => { const p = s.split(':'); return { n: p[0] ?? '', c: clamp(parseInt(p[1] ?? '2', 10) || 2, 0, 6) }; });
    const subj = ['Printer offline line 3', 'VPN drops hourly', 'New starter laptop', 'Label jam', 'Cost report fails', 'Access request', 'Rack audit', 'Price import'];
    const r = srnd(9);
    let k = 0;
    return '<div style="height:100%;display:flex;gap:8px">' + cs.map((c) => {
      let cards = '';
      for (let i = 0; i < c.c; i++) {
        const pr = ['bad', 'warn', 'info', 'ok'][k % 4];
        cards += '<div style="background:var(--sc-panel);border:1px solid var(--sc-line);border-radius:6px;padding:8px;display:flex;flex-direction:column;gap:6px">' +
          '<span style="font:500 10px/1.3 Archivo,sans-serif;color:var(--sc-text)">' + esc(subj[k++ % subj.length]) + '</span>' +
          '<div style="display:flex;align-items:center;gap:5px">' + pill(['Urgent', 'High', 'Normal', 'Low'][k % 4] ?? '', colFor(pr), 'color-mix(in srgb,' + colFor(pr) + ' 15%,transparent)') +
          '<span style="margin-left:auto;width:16px;height:16px;border-radius:50%;background:var(--sc-panel2)"></span></div></div>';
      }
      return '<div style="flex:1;min-width:0;background:var(--sc-panel2);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px;overflow:hidden">' +
        '<div style="display:flex;align-items:center;gap:6px"><b style="font:600 10px/1 Archivo,sans-serif;color:var(--sc-text)">' + esc(c.n) + '</b>' +
        '<span style="font:400 9px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + c.c + '</span></div>' + cards + '</div>';
    }).join('') + '</div>';
  },
});

interface TimelineProps { items: string; }
def<TimelineProps>('timeline', {
  cat: 'data', label: 'Timeline', w: 290, h: 190, pad: 0, radius: 0,
  p: { items: 'Quote received:09:12\nCosts matched:09:14\nApproved by buyer:10:40\nSent to ERP:10:41' },
  fields: [['items', 'Events (label:time)', 'area']],
  make(e) {
    const it = lines(e.p.items);
    return '<div style="height:100%;display:flex;flex-direction:column;justify-content:space-between">' + it.map((s, i) => {
      const p = s.split(':'), tm = p.slice(1).join(':');
      return '<div style="display:flex;gap:10px"><div style="display:flex;flex-direction:column;align-items:center;flex:none">' +
        '<span style="width:11px;height:11px;border-radius:50%;background:' + (i === it.length - 1 ? 'var(--sc-panel)' : 'var(--sc-brand)') + ';border:2px solid var(--sc-brand)"></span>' +
        (i < it.length - 1 ? '<span style="width:2px;flex:1;min-height:14px;background:var(--sc-line)"></span>' : '') + '</div>' +
        '<div style="padding-bottom:10px"><div style="font:500 11.5px/1.3 Archivo,sans-serif;color:var(--sc-text)">' + esc(p[0]) + '</div>' +
        '<div style="font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut);margin-top:2px">' + esc(tm) + '</div></div></div>';
    }).join('') + '</div>';
  },
});

interface ChatProps { items: string; title: string; }
def<ChatProps>('chat', {
  cat: 'data', label: 'Messages', w: 300, h: 200, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { items: 'in:Where is the revised BOM?\nout:Attached — costs rolled up at 09:14.\nin:Approved, push it to ERP.', title: 'Procurement thread' },
  fields: [['items', 'Messages (in:/out:)', 'area'], ['title', 'Title', 'text']],
  make(e) {
    return '<div style="height:100%;display:flex;flex-direction:column;gap:8px">' + (e.p.title ? '<div style="display:flex;align-items:center;gap:8px;padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--sc-line)"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b></div>' : '') +
      '<div style="flex:1;display:flex;flex-direction:column;gap:7px;justify-content:flex-end;overflow:hidden">' + lines(e.p.items).map((s) => {
        const out = /^out:/i.test(s), body = s.replace(/^(in|out):/i, '');
        return '<div style="display:flex;justify-content:' + (out ? 'flex-end' : 'flex-start') + '"><span style="max-width:80%;background:' + (out ? 'var(--sc-brand)' : 'var(--sc-panel2)') + ';color:' + (out ? '#fff' : 'var(--sc-text)') + ';border-radius:' + (out ? '10px 10px 3px 10px' : '10px 10px 10px 3px') + ';padding:7px 10px;font:400 11px/1.4 Archivo,sans-serif">' + esc(body) + '</span></div>';
      }).join('') + '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;border:1px solid var(--sc-line);border-radius:100px;padding:5px 6px 5px 11px"><span style="flex:1;font:400 10.5px/1 Archivo,sans-serif;color:var(--sc-mut)">Write a reply</span><span style="width:22px;height:22px;border-radius:50%;background:var(--sc-brand)"></span></div></div>';
  },
});

interface CalendarProps { variant: 'month' | 'strip' | 'agenda'; title: string; mark: string; }
def<CalendarProps>('calendar', {
  cat: 'data', label: 'Calendar', w: 280, h: 210, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { variant: 'month', title: 'September 2026', mark: '8,14,15,22,27' },
  fields: [['variant', 'Kind', 'sel:month,strip,agenda'], ['title', 'Title', 'text'], ['mark', 'Marked days', 'text']],
  make(e) {
    const marks = String(e.p.mark || '').split(',').map((s) => parseInt(s, 10));
    const headHtml = (title: string) => '<div style="display:flex;align-items:center;gap:8px;padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--sc-line)"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(title) + '</b></div>';
    if (e.p.variant === 'strip') {
      return '<div style="height:100%;display:flex;flex-direction:column;gap:8px">' + headHtml(e.p.title) +
        '<div style="display:flex;gap:5px;flex:1">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
          const on = i === 2;
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:7px 0;border-radius:7px;background:' + (on ? 'var(--sc-brand)' : 'var(--sc-panel2)') + '">' +
            '<span style="font:400 9px/1 Archivo,sans-serif;color:' + (on ? 'rgba(255,255,255,.75)' : 'var(--sc-mut)') + '">' + d + '</span>' +
            '<b style="font:600 13px/1 Archivo,sans-serif;color:' + (on ? '#fff' : 'var(--sc-text)') + '">' + (14 + i) + '</b>' +
            (marks.indexOf(14 + i) >= 0 ? dot(on ? '#fff' : 'var(--sc-accent)', 5) : '<span style="height:5px"></span>') + '</div>';
        }).join('') + '</div></div>';
    }
    if (e.p.variant === 'agenda') {
      const agenda: [string, string, string][] = [['08:30', 'Shift handover', 'ok'], ['10:00', 'Change window: rack B', 'warn'], ['13:30', 'BOM review with buyer', 'info'], ['16:00', 'Weekly ops report out', 'brand']];
      return '<div style="height:100%;display:flex;flex-direction:column;gap:8px">' + headHtml(e.p.title) +
        '<div style="display:flex;flex-direction:column;gap:6px;flex:1">' + agenda.map((a) =>
          '<div style="display:flex;gap:8px;align-items:center;border-left:3px solid ' + colFor(a[2]) + ';padding:4px 0 4px 8px">' +
          '<span style="font:500 10px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut);flex:none">' + a[0] + '</span>' +
          '<span style="font:500 11px/1.3 Archivo,sans-serif;color:var(--sc-text)">' + a[1] + '</span></div>',
        ).join('') + '</div></div>';
    }
    let cells = '';
    for (let i = 0; i < 35; i++) {
      const day = i - 1;
      const on = marks.indexOf(day) >= 0, cur = day === 15;
      cells += '<div style="aspect-ratio:1;display:grid;place-items:center;border-radius:5px;font:' + (cur ? 600 : 400) + ' 9.5px/1 Archivo,sans-serif;background:' + (cur ? 'var(--sc-brand)' : on ? 'color-mix(in srgb,var(--sc-accent) 30%,transparent)' : 'transparent') + ';color:' + (cur ? '#fff' : day > 0 && day < 31 ? 'var(--sc-text)' : 'transparent') + '">' + (day > 0 && day < 31 ? day : '') + '</div>';
    }
    return '<div style="height:100%;display:flex;flex-direction:column;gap:6px">' + headHtml(e.p.title) +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => '<div style="text-align:center;font:400 8px/1 \'IBM Plex Mono\',monospace;color:var(--sc-mut)">' + d + '</div>').join('') + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;flex:1">' + cells + '</div></div>';
  },
});

type CodeVariant = 'logs' | 'code' | 'terminal' | 'yaml';
interface CodeBlockProps { variant: CodeVariant; title: string; body: string; }
def<CodeBlockProps>('codeBlock', {
  cat: 'data', label: 'Code / log', w: 380, h: 180, fillVar: '--sc-dark', radius: 8, bw: 0, pad: 12,
  p: { variant: 'logs', title: 'runner.log', body: '' },
  fields: [['variant', 'Kind', 'sel:logs,code,terminal,yaml'], ['title', 'Header', 'text'], ['body', 'Custom lines', 'area']],
  make(e) {
    const v = e.p.variant, custom = lines(e.p.body);
    const sets: Record<CodeVariant, string[]> = {
      logs: ['04:00:01 INFO  start job=bom-sync id=2041', '04:00:02 INFO  fetched 1,284 rows from ERP', '04:00:04 WARN  3 parts missing unit cost', '04:00:06 INFO  cost roll-up complete', '04:00:06 INFO  notified 4 subscribers', '04:00:07 INFO  done in 6.2s'],
      code: ['async function rollUp(bomId) {', '  const parts = await erp.parts(bomId);', '  const missing = parts.filter(p => !p.cost);', '  if (missing.length) await notify(missing);', '  return sum(parts, p => p.qty * p.cost);', '}'],
      terminal: ['$ lablace deploy --site kl1', '✓ validated 42 config templates', '✓ pushed to 184 racks', '! 1 rack needs manual review', '✓ done in 1m 12s'],
      yaml: ['site: kl1', 'racks: 184', 'templates:', '  - switch-leaf-v3', '  - pdu-standard', 'validate: strict'],
    };
    const it = custom.length ? custom : sets[v] || sets.logs;
    return '<div style="height:100%;display:flex;flex-direction:column;gap:7px">' +
      (e.p.title
        ? '<div style="display:flex;align-items:center;gap:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.1)">' +
          '<span style="display:flex;gap:4px">' + ['#F2704A', '#FFC41F', '#3FBD79'].map((c) => '<span style="width:8px;height:8px;border-radius:50%;background:' + c + '"></span>').join('') + '</span>' +
          '<span style="font:400 9.5px/1 \'IBM Plex Mono\',monospace;color:rgba(255,255,255,.55)">' + esc(e.p.title) + '</span></div>'
        : '') +
      '<div style="flex:1;overflow:hidden;display:flex;flex-direction:column;gap:3px">' + it.map((l) => {
        let c = 'rgba(255,255,255,.82)';
        if (/WARN|!/.test(l)) c = '#FFC41F';
        if (/ERROR|fail/i.test(l)) c = '#F2704A';
        if (/✓|INFO/.test(l)) c = 'rgba(255,255,255,.82)';
        if (v === 'code' || v === 'yaml') c = '#9FE6D4';
        return '<div style="font:400 9.5px/1.55 \'IBM Plex Mono\',monospace;color:' + c + ';white-space:pre;overflow:hidden;text-overflow:ellipsis">' + esc(l) + '</div>';
      }).join('') + '</div></div>';
  },
});

interface TreeProps { items: string; title: string; }
def<TreeProps>('tree', {
  cat: 'data', label: 'Tree / hierarchy', w: 250, h: 190, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 12,
  p: { items: '0:Knowledge base\n1:Policies\n2:Procurement rules\n2:Approval limits\n1:Runbooks\n2:Rack change\n2:Incident response\n1:Product data', title: '' },
  fields: [['items', 'Items (depth:label)', 'area'], ['title', 'Title', 'text']],
  make(e) {
    return '<div style="height:100%;display:flex;flex-direction:column;gap:5px">' + (e.p.title ? '<div style="display:flex;align-items:center;gap:8px;padding:0 0 8px;margin-bottom:8px;border-bottom:1px solid var(--sc-line)"><b style="font:600 12px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b></div>' : '') +
      lines(e.p.items).map((s) => {
        const p = s.split(':'), d = parseInt(p[0] ?? '0', 10) || 0, l = p.slice(1).join(':');
        const ic = d === 0
          ? '<svg width="12" height="12" viewBox="0 0 12 12" style="flex:none"><path d="M1 3.5h4l1 1.5h5v5H1z" fill="var(--sc-brand)"/></svg>'
          : d === 1
            ? '<svg width="12" height="12" viewBox="0 0 12 12" style="flex:none"><path d="M1 3h4l1 1.5h5v5H1z" fill="var(--sc-mut)" opacity=".6"/></svg>'
            : '<svg width="10" height="12" viewBox="0 0 10 12" style="flex:none"><path d="M1.5 1h4l3 3v7h-7z" stroke="var(--sc-mut)" stroke-width="1" fill="none"/></svg>';
        return '<div style="display:flex;align-items:center;gap:7px;padding-left:' + d * 14 + 'px;font:' + (d === 0 ? 600 : 400) + ' 10.5px/1.4 Archivo,sans-serif;color:' + (d === 0 ? 'var(--sc-text)' : 'var(--sc-mut)') + '">' + ic + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l) + '</span></div>';
      }).join('') + '</div>';
  },
});

interface WizardProps { steps: string; at: number; }
def<WizardProps>('wizard', {
  cat: 'data', label: 'Step wizard', w: 420, h: 80, fillVar: '--sc-panel', radius: 8, bw: 1, pad: 14,
  p: { steps: 'Upload file\nMap columns\nValidate\nImport', at: 2 },
  fields: [['steps', 'Steps', 'area'], ['at', 'Current step', 'num']],
  make(e) {
    const st = lines(e.p.steps), at = clamp(e.p.at || 1, 1, st.length);
    return '<div style="height:100%;display:flex;align-items:center">' + st.map((s, i) => {
      const done = i < at - 1, cur = i === at - 1;
      return '<div style="flex:1;display:flex;align-items:center;gap:7px;min-width:0">' +
        '<span style="width:22px;height:22px;flex:none;border-radius:50%;display:grid;place-items:center;font:600 10px/1 Archivo,sans-serif;background:' + (done ? 'var(--sc-brand)' : cur ? 'var(--sc-accent)' : 'var(--sc-panel2)') + ';color:' + (done ? '#fff' : cur ? '#1B2128' : 'var(--sc-mut)') + ';border:1.5px solid ' + (done ? 'var(--sc-brand)' : cur ? 'var(--sc-accent)' : 'var(--sc-line)') + '">' + (done ? '✓' : i + 1) + '</span>' +
        '<span style="font:' + (cur ? 600 : 400) + ' 10.5px/1.2 Archivo,sans-serif;color:' + (cur ? 'var(--sc-text)' : 'var(--sc-mut)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s) + '</span>' +
        (i < st.length - 1 ? '<span style="flex:1;min-width:8px;height:1.5px;background:' + (done ? 'var(--sc-brand)' : 'var(--sc-line)') + '"></span>' : '') + '</div>';
    }).join('') + '</div>';
  },
});

interface PricingProps { plan: string; price: string; per: string; items: string; cta: string; featured: 0 | 1; }
def<PricingProps>('pricing', {
  cat: 'data', label: 'Pricing card', w: 230, h: 260, fillVar: '--sc-panel', radius: 10, bw: 1, pad: 18, shadow: 'sm',
  p: { plan: 'Build', price: 'From 12k', per: 'fixed price', items: 'Discovery workshop\nClickable screens\nBuild in weekly releases\nSource code handover', cta: 'Request a quote', featured: 0 },
  fields: [['plan', 'Plan', 'text'], ['price', 'Price', 'text'], ['per', 'Note', 'text'], ['items', 'Included', 'area'], ['cta', 'Button', 'text'], ['featured', 'Highlight', 'chk']],
  make(e) {
    const f = +e.p.featured;
    return '<div style="height:100%;display:flex;flex-direction:column;gap:10px;' + (f ? 'outline:2px solid var(--sc-accent);outline-offset:6px;border-radius:4px' : '') + '">' +
      '<span style="font:600 11px/1 \'IBM Plex Mono\',monospace;color:var(--sc-brand)">' + esc(e.p.plan) + '</span>' +
      '<div><b style="font:700 25px/1 Archivo,sans-serif;letter-spacing:-.03em;color:var(--sc-text)">' + esc(e.p.price) + '</b>' +
      '<div style="font:400 10px/1 Archivo,sans-serif;color:var(--sc-mut);margin-top:4px">' + esc(e.p.per) + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:7px;margin-top:2px">' + lines(e.p.items).map((s) =>
        '<div style="display:flex;gap:7px;font:400 11px/1.4 Archivo,sans-serif;color:var(--sc-text)"><svg width="11" height="11" viewBox="0 0 12 12" style="flex:none;margin-top:3px"><path d="M2 6.4l2.6 2.6L10 3.4" stroke="var(--sc-brand)" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg><span>' + esc(s) + '</span></div>',
      ).join('') + '</div>' +
      '<div style="margin-top:auto;background:' + (f ? 'var(--sc-accent)' : 'var(--sc-panel2)') + ';color:' + (f ? '#1B2128' : 'var(--sc-text)') + ';border:1px solid ' + (f ? 'var(--sc-accent)' : 'var(--sc-line)') + ';border-radius:6px;padding:9px;text-align:center;font:600 11.5px/1 Archivo,sans-serif">' + esc(e.p.cta) + '</div></div>';
  },
});

interface EmptyStateProps { title: string; body: string; cta: string; icon: string; }
def<EmptyStateProps>('emptyState', {
  cat: 'data', label: 'Empty state', w: 300, h: 170, radius: 8, pad: 16, bw: 1,
  p: { title: 'No jobs scheduled', body: 'Create your first automation to see runs here.', cta: 'New job', icon: '🗂️' },
  fields: [['icon', 'Icon', 'text'], ['title', 'Title', 'text'], ['body', 'Message', 'area'], ['cta', 'Button', 'text']],
  make(e) {
    return '<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center">' +
      '<span style="font-size:24px;line-height:1">' + esc(e.p.icon) + '</span>' +
      '<b style="font:600 13px/1.2 Archivo,sans-serif;color:var(--sc-text)">' + esc(e.p.title) + '</b>' +
      '<span style="font:400 11px/1.45 Archivo,sans-serif;color:var(--sc-mut);max-width:30ch">' + esc(e.p.body) + '</span>' +
      (e.p.cta ? '<span style="margin-top:4px;background:var(--sc-brand);color:#fff;padding:7px 13px;border-radius:6px;font:600 11px/1 Archivo,sans-serif">' + esc(e.p.cta) + '</span>' : '') + '</div>';
  },
});
