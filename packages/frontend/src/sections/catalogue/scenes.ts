import type { CanvasTheme, ElementInstance, SceneRegistry } from '@coreloop/shared';
import { E } from '../../engine/factory.js';

export const CX = 208;
export const CW = 1044;

export const SCENES: SceneRegistry = {};

function scene(key: string, cv: CanvasTheme, fn: () => ElementInstance[]): void {
  SCENES[key] = () => ({ w: 1280, h: 800, cv: cv || 'light', els: fn() });
}

function H(t: string, y?: number, sub?: string): ElementInstance[] {
  const a = [E('txt', CX, y || 60, 700, 38, { text: t, size: 29, weight: 700 })];
  if (sub) a.push(E('txt', CX, (y || 60) + 40, 760, 20, { text: sub, size: 13, weight: 400, color: 'var(--sc-mut)' }));
  return a;
}

/* WRK-01 — AI automation orchestrator */
scene('aiOrchestrator', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Orchestrator', nav: 'Pipelines\nRuns\nAgents\nTools\nAudit log', user: 'A. Rahman' }),
  ...H('Quote intake pipeline', 68, 'Runs every 5 minutes · last completed 09:41'),
  E('badge', 940, 74, 300, 30, { items: 'Live:ok\nRetries 2:warn\nCost today 4.10:info', variant: 'pill' }),
  E('nodeGraph', CX, 132, CW, 164, { title: '', steps: 'Watch inbox:ok\nRead PDF quote:ok\nMatch supplier:ok\nCheck price rules:run\nPost to ERP:wait\nNotify buyer:wait' }, { pad: 0, bw: 0, fill: 'transparent' }),
  E('kpi', CX, 318, 250, 104, { label: 'Quotes handled today', value: '146', delta: '+22', dir: 'up', seed: 4 }),
  E('kpi', CX + 265, 318, 250, 104, { label: 'Handled without a human', value: '92%', delta: '+6 pts', dir: 'up', seed: 9 }),
  E('kpi', CX + 530, 318, 250, 104, { label: 'Average time to ERP', value: '38s', delta: '−4s', dir: 'down', seed: 14 }),
  E('gauge', CX + 795, 318, 249, 104, { variant: 'score', label: 'Extraction confidence', value: 96 }),
  E('chart', CX, 440, 634, 206, { variant: 'multi', title: 'Documents processed per hour', points: 22, seed: 31 }),
  E('codeBlock', CX + 650, 440, 394, 206, { variant: 'logs', title: 'run-8841.log' }),
  E('table', CX, 664, CW, 120, { kind: 'runs', rows: 3, title: 'Latest stages' }),
]);

/* WRK-02 — AI knowledge development architecture */
scene('knowledge', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Knowledge base', nav: 'Sources\nIndexes\nRetrieval\nEvaluations\nAccess', user: 'L. Chen' }),
  ...H('Procurement knowledge domain', 68, '482 documents · re-indexed nightly · answers cite their source'),
  E('tree', CX, 140, 286, 300, { title: 'Document tree', items: '0:Procurement\n1:Policies\n2:Approval limits\n2:Supplier rules\n1:Runbooks\n2:Rack change\n2:Incident response\n1:Contracts\n2:Master agreements' }),
  E('nodeGraph', CX + 302, 140, 742, 140, { title: 'Indexing pipeline', steps: 'Collect:ok\nSplit:ok\nEmbed:ok\nIndex:run\nEvaluate:wait' }),
  E('chart', CX + 302, 294, 360, 146, { variant: 'radar', title: 'Answer quality by topic', labels: 'Policy\nPricing\nLead time\nSpec\nWarranty', seed: 12 }),
  E('pieChart', CX + 674, 294, 370, 146, { variant: 'stacked', title: 'Where answers come from', items: 'Policies:44\nContracts:27\nRunbooks:18\nSpec sheets:11' }),
  E('chat', CX, 456, 430, 214, { title: 'Ask the knowledge base', items: 'in:What is the approval limit for a 40k order?\nout:Two signatures above 25k — finance plus the site head. Source: Approval limits v4, page 2.' }),
  E('listRows', CX + 446, 456, 290, 214, { variant: 'files', title: 'Recently added' }),
  E('gauge', CX + 752, 456, 146, 214, { variant: 'ring', label: 'Cited answers', value: 97 }),
  E('gauge', CX + 914, 456, 130, 214, { variant: 'ring', label: 'Freshness', value: 88 }),
  E('table', CX, 688, CW, 96, { kind: 'users', rows: 2, title: 'Who can read what' }),
]);

/* WRK-03 — AI automation analysis */
scene('aiAnalysis', 'dark', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Automation analysis', nav: 'Overview\nWorkloads\nQuality\nCost\nDrift', user: 'S. Devi' }),
  ...H('Where the automation earns its keep', 68, 'Rolling 30 days across 9 automated processes'),
  E('banner', CX, 140, CW, 58, { variant: 'warn', title: 'Supplier matching accuracy dropped 3 points after the new price file format', sub: 'Flagged automatically · sample of 40 failures ready to review' }),
  E('kpi', CX, 214, 250, 104, { label: 'Hours returned to staff', value: '612', delta: '+48', dir: 'up', seed: 6 }),
  E('kpi', CX + 265, 214, 250, 104, { label: 'Steps now automatic', value: '71%', delta: '+9 pts', dir: 'up', seed: 8 }),
  E('kpi', CX + 530, 214, 250, 104, { label: 'Rework caused by errors', value: '1.8%', delta: '−0.7', dir: 'down', seed: 21 }),
  E('kpi', CX + 795, 214, 249, 104, { label: 'Cost per 1,000 runs', value: '6.40', delta: '−1.10', dir: 'down', seed: 17 }),
  E('chart', CX, 336, 520, 212, { variant: 'area', title: 'Automated vs manual handling', points: 30, seed: 41 }),
  E('chart', CX + 536, 336, 290, 212, { variant: 'funnel', title: 'Where runs stop', labels: 'Received\nRead\nMatched\nPosted' }),
  E('pieChart', CX + 842, 336, 202, 212, { variant: 'donut', title: 'Failure reasons', center: '148', items: 'Format:41\nMissing price:33\nTimeout:16\nOther:10' }),
  E('chart', CX, 566, 520, 218, { variant: 'heatmap', title: 'Busy hours by weekday', seed: 55 }),
  E('table', CX + 536, 566, 508, 218, { kind: 'jobs', rows: 5, title: 'Slowest processes this week' }),
]);

/* WRK-04 — Data centre infrastructure configuration automation */
scene('datacenter', 'dark', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'DC automation', nav: 'Sites\nRacks\nTemplates\nChanges\nCompliance', user: 'M. Osei' }),
  ...H('Site KL1 — configuration state', 68, '184 racks · 42 templates · every change reviewed before it ships'),
  E('plan', CX, 140, 520, 300, { variant: 'floor', label: 'Hall 2 — 184 racks', seed: 8 }),
  E('plan', CX + 536, 140, 224, 300, { variant: 'rack', label: 'Rack B-14 elevation', seed: 3 }),
  E('topology', CX + 776, 140, 268, 300, { label: 'Spine and leaf', tiers: '2\n4\n8' }),
  E('progress', CX, 458, 330, 64, { variant: 'uptime', label: 'Fabric availability' }),
  E('progress', CX + 346, 458, 330, 64, { variant: 'segments', label: 'Template rollout', value: 82 }),
  E('gauge', CX + 692, 458, 170, 64, { variant: 'score', label: 'Compliance', value: 94 }),
  E('badge', CX + 878, 458, 166, 64, { items: 'Drift 2:warn\nFaults 1:bad', variant: 'square' }),
  E('codeBlock', CX, 540, 430, 244, { variant: 'yaml', title: 'rack-b14.yaml' }),
  E('table', CX + 446, 540, 598, 244, { kind: 'assets', rows: 6, title: 'Devices needing attention' }),
]);

/* WRK-05 — Bill of material process automation */
scene('bom', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'BOM control', nav: 'Assemblies\nSuppliers\nPrice files\nApprovals\nExport', user: 'J. Park' }),
  ...H('Assembly 4471 — revision C', 68, 'Costs roll up the moment a supplier price changes'),
  E('wizard', CX, 140, CW, 74, { steps: 'Upload price file\nMap columns\nValidate\nRoll up cost\nApprove', at: 4 }),
  E('table', CX, 230, 700, 330, { kind: 'bom', rows: 8, title: 'Line items' }),
  E('card', CX + 716, 230, 328, 120, { title: 'Rolled-up cost', sub: 'Revision C · 214 lines', body: 'Includes freight and 6% tax. Recalculated 4 minutes ago.' }),
  E('price', CX + 730, 300, 300, 54, { cur: '$', amount: '184,220', per: 'per unit run' }),
  E('chart', CX + 716, 362, 328, 198, { variant: 'hBar', title: 'Cost by category', labels: 'Metalwork\nElectronics\nCables\nFasteners\nPackaging', seed: 26 }),
  E('timeline', CX, 584, 300, 200, { items: 'Price file received:09:12\nCosts matched:09:14\nBuyer approved:10:40\nSent to ERP:10:41' }),
  E('chart', CX + 316, 584, 384, 200, { variant: 'waterfall', title: 'Cost movement since revision B', points: 9, seed: 33 }),
  E('listRows', CX + 716, 584, 328, 200, { variant: 'stat', title: 'Checks that ran', items: 'Parts missing a price · 3\nDuplicate part numbers · 0\nLead time over 30 days · 7\nPrice jump over 15% · 2' }),
]);

/* WRK-06 — Systematized ticketing */
scene('tickets', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Service desk', nav: 'Queues\nBoard\nSLA\nKnowledge\nReports', user: 'S. Devi' }),
  ...H('Site operations queue', 68, 'Routing, ownership and escalation decided by rules, not memory'),
  E('navbar', CX, 138, 560, 40, { variant: 'tabs', items: 'All open\nMine\nBreaching\nWaiting on user', at: 3 }, { bw: 0, fill: 'transparent' }),
  E('choice', CX + 580, 138, 230, 40, { variant: 'chips', items: 'Urgent\nHigh\nNormal', on: 1 }),
  E('progress', CX + 826, 132, 218, 52, { variant: 'sla', label: 'SLA on track', value: 93, sub: '3 tickets at risk' }),
  E('kanban', CX, 194, CW, 276, { cols: 'Triage:3\nIn progress:3\nWaiting:2\nEscalated:1\nResolved:4' }),
  E('table', CX, 488, 700, 296, { kind: 'tickets', rows: 7, title: 'Queue detail' }),
  E('kpi', CX + 716, 488, 328, 96, { label: 'First response, median', value: '11 min', delta: '−4 min', dir: 'down', seed: 19 }),
  E('chart', CX + 716, 596, 328, 188, { variant: 'bar', title: 'Tickets closed per day', points: 14, seed: 44 }),
]);

/* WRK-07 — Higher-ops command dashboard (also the hero) */
scene('execOps', 'dark', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Ops command', nav: 'Today\nSites\nQuality\nSupply\nFinance', user: 'Board view' }),
  ...H('Group operations — Monday 21 September', 68, 'One screen the leadership team opens at 08:00'),
  E('ribbon', CX, 140, CW, 50, { items: 'Sites live 9/9\nOrders today 1,482\nOn-time 96.4%\nOpen incidents 2\nStaff on shift 318' }),
  E('kpi', CX, 204, 250, 110, { label: 'Output vs plan', value: '104%', delta: '+4 pts', dir: 'up', seed: 3 }),
  E('kpi', CX + 265, 204, 250, 110, { label: 'On-time delivery', value: '96.4%', delta: '+1.2', dir: 'up', seed: 7 }),
  E('kpi', CX + 530, 204, 250, 110, { label: 'Scrap rate', value: '1.4%', delta: '−0.3', dir: 'down', seed: 12 }),
  E('kpi', CX + 795, 204, 249, 110, { label: 'Cost per unit', value: '12.80', delta: '−0.40', dir: 'down', seed: 16 }),
  E('chart', CX, 330, 600, 224, { variant: 'multi', title: 'Output against plan, 30 days', points: 30, seed: 52 }),
  E('gauge', CX + 616, 330, 200, 224, { variant: 'arc', label: 'Capacity used', value: 78 }),
  E('map', CX + 832, 330, 212, 224, { variant: 'region', label: 'Output by region' }),
  E('banner', CX, 572, 600, 58, { variant: 'bad', title: 'Line 3 at Plant 2 stopped 22 minutes ago', sub: 'Maintenance acknowledged · estimated restart 11:40' }),
  E('chart', CX, 648, 600, 136, { variant: 'bullet', title: 'Against quarterly targets', labels: 'Revenue\nUnits\nMargin', seed: 61 }),
  E('listRows', CX + 616, 572, 428, 212, { variant: 'activity', title: 'What changed in the last hour' }),
]);

/* WRK-08 — Universal dashboard builder */
scene('universal', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'top', title: 'Universal dashboards', nav: '', user: 'R. Silva' }),
  E('navbar', CX, 68, CW, 46, { variant: 'toolbar', items: 'Add widget\nData sources\nFilters\nShare\nSchedule', at: 1 }),
  ...H('Warehouse view — built by the team, not by us', 150, 'Any table, any chart, any source. Saved views per department.'),
  E('chart', CX, 240, 420, 216, { variant: 'area', title: 'Picks per hour', points: 26, seed: 71 }),
  E('pieChart', CX + 436, 240, 278, 216, { variant: 'donut', title: 'Stock by class', center: 'A 46%', items: 'Class A:46\nClass B:31\nClass C:23' }),
  E('map', CX + 730, 240, 314, 216, { variant: 'world', label: 'Shipments in transit' }),
  E('kpi', CX, 472, 204, 102, { label: 'Lines picked', value: '8,412', delta: '+312', dir: 'up', seed: 5 }),
  E('kpi', CX + 218, 472, 204, 102, { label: 'Dock utilisation', value: '81%', delta: '+3', dir: 'up', seed: 13 }),
  E('calendar', CX + 436, 472, 278, 102, { variant: 'strip', title: 'This week', mark: '15,17,19' }),
  E('progress', CX + 730, 472, 314, 102, { variant: 'stacked', label: 'Order pipeline', value: 46 }),
  E('table', CX, 590, 700, 194, { kind: 'orders', rows: 4, title: 'Open orders' }),
  E('emptyState', CX + 716, 590, 328, 194, { icon: '➕', title: 'Drop a widget here', body: 'Pick a source and a chart type. Anyone on the team can build a view.', cta: 'Add widget' }, { bw: 1, bc: 'var(--sc-line)', radius: 10 }),
]);

/* WRK-09 — Android development software */
scene('android', 'light', () => {
  const PX = 170, PY = 118, PW = 290, PH = 600;
  const phoneAt = (x: number) => E('frame', x, PY, PW, PH, { variant: 'phone' });
  return [
    E('panel', 0, 0, 1280, 800, { pattern: 'glow' }, { radius: 0, bw: 0, fill: 'var(--sc-bg)' }),
    ...H('Field service app for Android', 56, 'Works offline in the plant, syncs when the phone finds signal'),
    phoneAt(PX),
    E('txt', PX + 22, PY + 46, 190, 26, { text: 'Today · 6 jobs', size: 17, weight: 700 }),
    E('badge', PX + 22, PY + 78, 200, 24, { items: 'Offline:warn\n2 to sync:info', variant: 'pill' }),
    E('listRows', PX + 18, PY + 110, 254, 300, { variant: 'queue', title: 'Assigned to you', items: 'Line 3 conveyor check · 09:00\nPump seal replacement · 10:30\nCalibrate scale 4 · 13:00\nQuarterly safety audit · 15:00\nSpare part pickup · 16:15' }, { bw: 0, fill: 'transparent' }),
    E('btn', PX + 18, PY + 420, 254, 44, { label: 'Start next job', variant: 'primary' }),
    E('tabbar', PX + 8, PY + 536, 274, 56, { items: '📋 Jobs\n🗺️ Map\n📷 Capture\n🔔 Alerts\n👤 Me', at: 1 }, { bw: 0 }),
    phoneAt(PX + 330),
    E('map', PX + 338, PY + 40, 274, 250, { variant: 'route', label: '', pins: '' }, { radius: 0, bw: 0 }),
    E('card', PX + 348, PY + 300, 254, 120, { title: 'Pump seal replacement', sub: 'Plant 2 · Bay 4 · due 10:30', body: 'Asset PMP-2214. Last service 82 days ago. Two spare seals in stock.' }),
    E('choice', PX + 348, PY + 430, 254, 84, { variant: 'toggleRow', items: 'Isolation confirmed\nPermit signed', on: 1 }),
    E('btn', PX + 348, PY + 524, 254, 44, { label: 'Complete and sync', variant: 'accent' }),
    phoneAt(PX + 660),
    E('txt', PX + 682, PY + 46, 190, 24, { text: 'Capture reading', size: 16, weight: 700 }),
    E('field', PX + 678, PY + 84, 254, 62, { label: 'Asset', value: 'PMP-2214', variant: 'text' }),
    E('field', PX + 678, PY + 156, 254, 62, { label: 'Vibration (mm/s)', value: '3.4', variant: 'text' }),
    E('choice', PX + 678, PY + 228, 254, 96, { variant: 'radio', label: '', items: 'Normal\nMonitor\nFault', on: 2 }),
    E('media', PX + 678, PY + 336, 254, 120, { variant: 'image', label: 'Photo attached' }),
    E('btn', PX + 678, PY + 472, 254, 44, { label: 'Save offline', variant: 'secondary' }),
    E('banner', PX + 660, PY + 528, 290, 52, { variant: 'ok', title: 'Saved. Will sync in 3 min.', sub: '' }),
  ];
});

/* WRK-10 — Automation software (runtime and scheduler) */
scene('runtime', 'dark', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Automation runtime', nav: 'Jobs\nSchedule\nWorkers\nLogs\nAlerts', user: 'Ops' }),
  ...H('Scheduled work across the estate', 68, '92 jobs, 8 workers, retries and alerts handled for you'),
  E('ribbon', CX, 140, CW, 50, { items: 'Queue 12\nWorkers 8/8\nFailed today 1\nMedian run 2.4s' }),
  E('table', CX, 204, 660, 272, { kind: 'jobs', rows: 6, title: 'Jobs' }),
  E('chart', CX + 676, 204, 368, 272, { variant: 'gantt', title: "Tonight’s window", labels: 'BOM sync\nCost roll-up\nPrice import\nOps report\nSLA sweep', seed: 29 }),
  E('progress', CX, 494, 320, 60, { variant: 'stacked', label: 'Run outcomes, 24 h', value: 88 }),
  E('kpi', CX + 336, 494, 324, 60, { label: 'Runs completed today', value: '2,481', delta: '+140', dir: 'up', spark: 0 }),
  E('badge', CX + 676, 494, 368, 60, { items: 'Success 2,468:ok\nRetried 12:warn\nFailed 1:bad', variant: 'square' }),
  E('codeBlock', CX, 570, 520, 214, { variant: 'terminal', title: 'worker-03' }),
  E('calendar', CX + 536, 570, 508, 214, { variant: 'agenda', title: 'Change windows this week' }),
]);

/* WRK-11 — Analytical development dashboard */
scene('analytics', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Analytics workbench', nav: 'Queries\nModels\nCharts\nExperiments\nShare', user: 'Data team' }),
  ...H('Demand model — build and test in one place', 68, 'Write the query, see the shape, publish the chart'),
  E('codeBlock', CX, 140, 520, 206, { variant: 'code', title: 'demand_by_site.sql', body: "select site, week, sum(units) as units\nfrom orders\nwhere week >= date_trunc('week', now()) - 84\ngroup by 1, 2\norder by 2 desc" }),
  E('chart', CX + 536, 140, 508, 206, { variant: 'line', title: 'Units per week by site', points: 26, seed: 81 }),
  E('chart', CX, 362, 340, 200, { variant: 'scatter', title: 'Price against volume', points: 26, seed: 37 }),
  E('chart', CX + 356, 362, 340, 200, { variant: 'funnel', title: 'Quote to order', labels: 'Quoted\nShortlisted\nOrdered\nRepeat' }),
  E('chart', CX + 712, 362, 332, 200, { variant: 'radar', title: 'Model fit by segment', labels: 'Retail\nTrade\nExport\nOEM\nSpares', seed: 47 }),
  E('table', CX, 578, 700, 206, { kind: 'runs', rows: 5, title: 'Query history' }),
  E('gauge', CX + 716, 578, 164, 206, { variant: 'ring', label: 'Forecast accuracy', value: 91 }),
  E('listRows', CX + 896, 578, 148, 206, { variant: 'stat', title: 'Run', items: 'Rows · 84k\nCost · 0.02\nTime · 1.4s\nCached · yes' }),
]);

/* WRK-12 — Report automation */
scene('reports', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Report automation', nav: 'Reports\nSchedules\nRecipients\nTemplates\nArchive', user: 'Finance' }),
  ...H('Monthly operations pack', 68, 'Built, checked and emailed before anyone arrives'),
  E('wizard', CX, 140, 624, 74, { steps: 'Pull data\nBuild pages\nCheck totals\nSend', at: 3 }),
  E('badge', CX + 640, 148, 404, 32, { items: 'Next run 01 Oct 06:00:info\nLast run clean:ok', variant: 'pill' }),
  E('panel', CX, 230, 400, 554, { pattern: 'none' }, { fill: '#FFFFFF', radius: 4, bw: 1, shadow: 'md' }),
  E('txt', CX + 28, 258, 260, 26, { text: 'Operations pack', size: 17, weight: 700, color: '#1B2128' }),
  E('txt', CX + 28, 286, 300, 16, { text: 'September 2026 · prepared automatically', size: 10, weight: 400, color: '#727B85' }),
  E('divider', CX + 28, 310, 344, 12, { style: 'solid' }),
  E('chart', CX + 28, 328, 344, 150, { variant: 'bar', title: 'Units shipped by week', points: 13, seed: 91 }, { bw: 0, pad: 0, fill: 'transparent' }),
  E('table', CX + 28, 490, 344, 170, { kind: 'orders', rows: 4, title: 'Top accounts' }, { bw: 1, fill: '#FFFFFF' }),
  E('txt', CX + 28, 676, 344, 80, { text: 'Notes: scrap rate improved for the third month. Two supplier price increases land in October and are already in the cost model.', size: 10, weight: 400, color: '#505A64', lh: 1.5 }),
  E('listRows', CX + 416, 230, 308, 268, { variant: 'files', title: 'Archive' }),
  E('choice', CX + 740, 230, 304, 268, { variant: 'toggleRow', items: 'Board pack (PDF)\nSite managers (PDF)\nFinance (XLSX)\nSupply chain (CSV)\nRaw data (API)', on: 4 }),
  E('calendar', CX + 416, 514, 308, 270, { variant: 'month', title: 'Send calendar', mark: '1,8,15,22,29' }),
  E('table', CX + 740, 514, 304, 270, { kind: 'runs', rows: 6, title: 'Delivery log' }),
]);

/* WRK-13 — Enterprise web pages */
scene('web', 'light', () => {
  const BX = 64, BY = 70, BW = 1152, BH = 660;
  return [
    E('panel', 0, 0, 1280, 800, { pattern: 'dots' }, { radius: 0, bw: 0, fill: 'var(--sc-panel2)' }),
    E('frame', BX, BY, BW, BH, { variant: 'browser', url: 'northwind-industrial.example/solutions' }),
    E('navbar', BX + 1, BY + 33, BW - 2, 56, { variant: 'top', brand: 'Northwind Industrial', items: 'Solutions\nIndustries\nSupport\nAbout', cta: 'Request pricing', at: 1 }, { radius: 0 }),
    E('txt', BX + 56, BY + 140, 560, 110, { text: 'Pumps and valves,\nspecified in minutes.', size: 40, weight: 700, lh: 1.08 }),
    E('txt', BX + 56, BY + 262, 470, 60, { text: 'Search 12,000 parts by spec, check stock at your nearest branch and send a request straight to your account manager.', size: 14, weight: 400, color: 'var(--sc-mut)', lh: 1.55 }),
    E('btn', BX + 56, BY + 336, 168, 46, { label: 'Find a part', variant: 'primary' }),
    E('btn', BX + 236, BY + 336, 168, 46, { label: 'Talk to sales', variant: 'secondary' }),
    E('field', BX + 56, BY + 400, 348, 62, { label: '', variant: 'search', ph: 'Search by part number or spec' }),
    E('media', BX + 620, BY + 140, 476, 322, { variant: 'image', label: 'Product photography' }),
    E('card', BX + 56, BY + 490, 330, 130, { title: 'Live branch stock', sub: '14 branches', body: 'See what is on the shelf before you commit to a delivery date.' }),
    E('card', BX + 402, BY + 490, 330, 130, { title: 'Account pricing', sub: 'Signed in', body: 'Your contract prices and payment terms applied automatically.' }),
    E('card', BX + 748, BY + 490, 348, 130, { title: 'Spec sheets', sub: 'PDF and CAD', body: 'Drawings and datasheets attached to every part, always current.' }),
  ];
});

/* WRK-14 — Enterprise GUI / UI / UX system */
scene('designsys', 'light', () => {
  const sw = ['#5E6A76', '#C5CBD3', '#FFC41F', '#1D5B98', '#C93F16', '#1C7A49', '#1B2128', '#D8DBE0'];
  const els: ElementInstance[] = [
    E('shell', 0, 0, 1280, 800, { variant: 'both', title: 'Design system', nav: 'Foundations\nComponents\nPatterns\nAccessibility\nReleases', user: 'Design' }),
    ...H('Northwind interface system v4', 68, 'One kit, used by nine product teams — no more screens that disagree'),
  ];
  els.push(E('txt', CX, 142, 200, 18, { text: 'Colour', size: 12, weight: 600, mono: 1, color: 'var(--sc-mut)' }));
  sw.forEach((c, i) => els.push(E('shape', CX + i * 66, 166, 56, 56, { variant: 'rrect' }, { fill: c, radius: 8 })));
  els.push(E('txt', CX + 556, 142, 200, 18, { text: 'Type scale', size: 12, weight: 600, mono: 1, color: 'var(--sc-mut)' }));
  els.push(E('txt', CX + 556, 162, 470, 40, { text: 'Display 36 / Archivo 700', size: 26, weight: 700 }));
  els.push(E('txt', CX + 556, 204, 470, 24, { text: 'Heading 20 / Archivo 600', size: 17, weight: 600 }));
  els.push(E('txt', CX + 556, 230, 470, 20, { text: 'Body 14 / Archivo 400 — set to 66 characters for comfortable reading.', size: 12, weight: 400, color: 'var(--sc-mut)' }));
  return els.concat([
    E('txt', CX, 244, 200, 18, { text: 'Buttons', size: 12, weight: 600, mono: 1, color: 'var(--sc-mut)' }),
    E('btn', CX, 268, 120, 40, { label: 'Primary', variant: 'primary' }),
    E('btn', CX + 130, 268, 120, 40, { label: 'Secondary', variant: 'secondary' }),
    E('btn', CX + 260, 268, 120, 40, { label: 'Ghost', variant: 'ghost' }),
    E('btn', CX + 390, 268, 120, 40, { label: 'Danger', variant: 'danger' }),
    E('choice', CX, 326, 250, 96, { variant: 'switch', items: 'Enabled\nDisabled', on: 1 }),
    E('choice', CX + 266, 326, 250, 96, { variant: 'checkbox', items: 'Checked\nUnchecked\nMixed', on: 1 }),
    E('field', CX + 556, 268, 250, 62, { label: 'Field, default', ph: 'Placeholder' }),
    E('field', CX + 822, 268, 222, 62, { label: 'Field, with value', value: 'PN-48210' }),
    E('choice', CX + 556, 344, 250, 78, { variant: 'segmented', items: 'Day\nWeek\nMonth', on: 2 }),
    E('choice', CX + 822, 344, 222, 78, { variant: 'slider', label: 'Threshold', items: '1\n2\n3\n4', on: 3 }),
    E('banner', CX, 440, 514, 58, { variant: 'info', title: 'Banner, informational', sub: 'Used for state the user did not cause' }),
    E('banner', CX + 530, 440, 514, 58, { variant: 'bad', title: 'Banner, blocking error', sub: 'Says what happened and what to do next' }),
    E('table', CX, 516, 660, 268, { kind: 'users', rows: 6, title: 'Table, default density' }),
    E('listRows', CX + 676, 516, 368, 268, { variant: 'stat', title: 'System health', items: 'Components · 64\nPatterns · 21\nTeams using v4 · 9\nContrast failures · 0\nOpen design debt · 3' }),
  ]);
});

/* WRK-15 — Point of sale for enterprises */
scene('pos', 'light', () => [
  E('shell', 0, 0, 1280, 800, { variant: 'top', title: 'Northwind POS', nav: '', user: 'Till 3 · A. Rahman' }),
  E('navbar', 24, 68, 880, 46, { variant: 'toolbar', items: 'Coffee\nFood\nRetail\nGift cards\nReturns', at: 1 }),
  E('posGrid', 24, 126, 880, 404, { cols: 4, cur: '$', items: 'Flat white:9.50:☕\nIced latte:11.00:🥤\nEspresso:7.00:☕\nCold brew:12.00:🧊\nCroissant:7.00:🥐\nBagel set:12.50:🥯\nChicken wrap:15.00:🌯\nSoup of the day:11.50:🍲\nOrange juice:8.00:🍊\nMuffin:6.50:🧁\nFruit cup:9.00:🍓\nBottled water:4.00:💧' }),
  E('keypad', 24, 546, 206, 238, { display: '128.50', cur: '$' }),
  E('table', 248, 546, 656, 238, { kind: 'orders', rows: 5, title: 'Open tabs and recent orders' }),
  E('cart', 924, 68, 332, 470, { title: 'Order #90441', cur: '$', cta: 'Charge card', items: '2 × Flat white:19.00\n1 × Croissant:7.00\n1 × Chicken wrap:15.00\n1 × Orange juice:8.00' }),
  E('badge', 924, 554, 332, 34, { items: 'Till open:ok\nOffline queue 0:info', variant: 'dot' }),
  E('kpi', 924, 598, 332, 90, { label: 'Takings today, till 3', value: '4,182', delta: '+312', dir: 'up', seed: 23 }),
  E('listRows', 924, 700, 332, 84, { variant: 'activity', title: '', items: 'Shift started 07:00 · A. Rahman\nCash drop recorded 11:20' }, { bw: 1, radius: 8 }),
]);
