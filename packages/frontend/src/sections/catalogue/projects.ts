import type { Project } from '@coreloop/shared';

export const PROJECTS: Project[] = [
  {
    id: 'WRK-01', t: 'AI automation orchestrator', cat: 'AI & automation', scene: 'aiOrchestrator',
    blurb: 'Reads incoming supplier quotes, pulls out the numbers, checks them against price rules and posts them to the ERP without anyone re-typing.',
    read: [
      ['Pipeline', 'The row of boxes is one process. Green steps are done, amber is running, grey has not started. Anyone can see where a document is stuck.'],
      ['Counters', 'Volume handled today, how much went through untouched, and how long a document takes end to end.'],
      ['Log', 'The raw record of a single run, kept for audit. Every decision the system made is traceable.'],
    ],
    specs: { 'Built for': 'Procurement and supply chain teams drowning in email attachments', 'Replaces': 'Manual reading and re-keying of PDF and spreadsheet quotes', 'Key screens': 'Pipeline board, run detail, rule editor, audit log', 'Human in the loop': 'Anything below the confidence threshold is routed to a person instead of guessed' },
    stack: ['Python', 'Document AI', 'Queue workers', 'ERP API', 'Postgres', 'Audit trail'],
  },
  {
    id: 'WRK-02', t: 'AI knowledge architecture', cat: 'AI & automation', scene: 'knowledge',
    blurb: 'A private question-and-answer layer over your own documents, where every answer cites the page it came from.',
    read: [
      ['Document tree', 'Your real folder structure. Permissions follow it, so staff only get answers from documents they are allowed to read.'],
      ['Indexing pipeline', 'How a document becomes searchable: collected, split, embedded, indexed, then scored for quality.'],
      ['Answer panel', 'A plain answer with the source named. If the system cannot find a source, it says so rather than inventing one.'],
    ],
    specs: { 'Built for': 'Teams whose knowledge lives in policies, contracts and runbooks', 'Replaces': 'Asking the one person who remembers, or searching a shared drive', 'Key screens': 'Ask, sources, index health, evaluations, access control', 'Kept honest': 'Answers without a citation are blocked, and quality is re-scored on every re-index' },
    stack: ['Vector index', 'Retrieval pipeline', 'Permission model', 'Evaluation suite', 'Nightly re-index'],
  },
  {
    id: 'WRK-03', t: 'AI automation analysis', cat: 'AI & automation', scene: 'aiAnalysis',
    blurb: 'The reporting layer that proves whether your automation is actually working, and tells you the moment it starts drifting.',
    read: [
      ['Alert bar', 'A plain-language warning raised by the system itself, with a sample of failures already collected for review.'],
      ['Headline numbers', 'Hours returned to staff, share of steps now automatic, rework caused by mistakes, and cost per thousand runs.'],
      ['Failure breakdown', 'Where runs stop and why, so effort goes to the biggest cause instead of the loudest complaint.'],
    ],
    specs: { 'Built for': 'Whoever has to justify the automation budget', 'Replaces': 'Guesswork and anecdotes about whether automation helped', 'Key screens': 'Overview, workload detail, quality, cost, drift alerts', 'Answers': 'What did this save, where does it still fail, and is it getting worse' },
    stack: ['Metrics warehouse', 'Drift detection', 'Cost tracking', 'Scheduled reports'],
  },
  {
    id: 'WRK-04', t: 'Data centre configuration automation', cat: 'Enterprise systems', scene: 'datacenter',
    blurb: 'Rack, switch and power configuration generated from templates, validated against policy, then pushed to the estate with a reviewable change record.',
    read: [
      ['Floor plan', 'Every rack in the hall, coloured by state. Faults and warnings are visible from the doorway.'],
      ['Rack elevation', 'What is installed in each U position, with live health per device.'],
      ['Config file', 'The generated configuration for one rack. It is produced from a template, so two racks of the same type cannot drift apart by accident.'],
    ],
    specs: { 'Built for': 'Infrastructure teams running more sites than people', 'Replaces': 'Hand-edited configs, tribal knowledge and inconsistent builds', 'Key screens': 'Site map, rack detail, template library, change review, compliance', 'Safety': 'Every change is previewed and diffed before it ships, and can be rolled back' },
    stack: ['Template engine', 'Config validation', 'Change review', 'Topology model', 'Compliance checks'],
  },
  {
    id: 'WRK-05', t: 'Bill of material process automation', cat: 'Enterprise systems', scene: 'bom',
    blurb: "Supplier price files land, costs roll up, exceptions are flagged and approvals are recorded. The BOM stops living in someone’s spreadsheet.",
    read: [
      ['Import steps', 'The path a price file takes: uploaded, columns mapped, validated, rolled up, approved. You can see exactly which stage a revision is at.'],
      ['Line items', 'The BOM itself, with per-line status. Anything missing a price or with a suspicious jump is marked rather than silently averaged.'],
      ['Cost movement', 'What changed since the last revision, and which category caused it.'],
    ],
    specs: { 'Built for': 'Manufacturing, assembly and engineering-to-order businesses', 'Replaces': 'Emailed spreadsheets, manual cost roll-ups and version confusion', 'Key screens': 'Assembly view, price import, validation report, approvals, ERP export', 'Controls': 'Approval limits, change history per line, and checks that run on every import' },
    stack: ['Import pipeline', 'Validation rules', 'Cost engine', 'Approval workflow', 'ERP export'],
  },
  {
    id: 'WRK-06', t: 'Systematised ticketing', cat: 'Enterprise systems', scene: 'tickets',
    blurb: 'Requests arrive from email, chat or the floor, get routed by rules, and carry a clock. Nothing sits unowned.',
    read: [
      ['Board', 'Work in columns by state. Each card shows priority and owner, so triage is a glance instead of a meeting.'],
      ['SLA dial', 'How much of the queue is still inside its promised response time, and how many tickets are at risk right now.'],
      ['Queue table', 'The detail view for people who prefer a list, with the same data as the board.'],
    ],
    specs: { 'Built for': 'Internal service desks, maintenance teams and plant support', 'Replaces': 'Shared inboxes, WhatsApp groups and lost requests', 'Key screens': 'Queues, board, ticket detail, SLA report, knowledge links', 'Rules': 'Routing, priority and escalation are configuration, not code changes' },
    stack: ['Rules engine', 'Email and chat intake', 'SLA clocks', 'Reporting', 'Role permissions'],
  },
  {
    id: 'WRK-07', t: 'Operations command dashboard', cat: 'Dashboards & analytics', scene: 'execOps',
    blurb: 'One screen for the leadership team: output against plan, delivery, quality and cost, with incidents surfaced as they happen.',
    read: [
      ['Status ribbon', 'The five numbers the group cares about, refreshed continuously so the morning meeting starts from fact.'],
      ['Output against plan', 'Two lines: this period against the last. The gap is the conversation.'],
      ['Incident banner', 'Live operational problems raised into the executive view, with who acknowledged it and the expected restart.'],
    ],
    specs: { 'Built for': 'Group and site leadership, board reporting', 'Replaces': 'A pack of slides assembled by hand every Monday', 'Key screens': 'Today, site comparison, quality, supply, finance', 'Access': 'Role-based, so a site head sees their site and the board sees the group' },
    stack: ['Data warehouse', 'Live feeds', 'KPI definitions', 'Role permissions', 'Mobile layout'],
  },
  {
    id: 'WRK-08', t: 'Universal dashboard builder', cat: 'Dashboards & analytics', scene: 'universal',
    blurb: 'A dashboard your own team assembles: pick a source, pick a chart, save the view. No ticket to us every time a question changes.',
    read: [
      ['Widget toolbar', 'Add a widget, choose a data source, set filters, share or schedule the view.'],
      ['Mixed widgets', 'Charts, tables, maps and counters share one grid, so a department can build the view it actually needs.'],
      ['Drop zone', 'The dashed panel is an empty slot. Anyone with edit rights can fill it, and saved views are per team.'],
    ],
    specs: { 'Built for': 'Organisations where every department wants a different view of the same data', 'Replaces': 'A backlog of one-off dashboard requests', 'Key screens': 'View builder, source catalogue, filter panel, sharing and schedules', 'Governance': 'Sources and metric definitions are centrally managed, layouts are not' },
    stack: ['Widget framework', 'Source connectors', 'Saved views', 'Scheduled exports', 'Permissions'],
  },
  {
    id: 'WRK-09', t: 'Android field application', cat: 'Apps & web', scene: 'android',
    blurb: "A phone app for people away from a desk: today’s jobs, guided steps, photo capture and readings, all working with no signal.",
    read: [
      ['Job list', 'What this technician is doing today, in order, with a clear sync state so they know what is still on the device.'],
      ['Job detail and map', 'Route to site, asset history and the safety confirmations that must be ticked before work starts.'],
      ['Capture form', 'Readings, a photo and a verdict. Saved locally, then synced when the phone finds signal.'],
    ],
    specs: { 'Built for': 'Field service, maintenance, delivery and plant-floor staff', 'Replaces': 'Paper job cards, photos in a personal camera roll, end-of-day data entry', 'Key screens': 'Job list, job detail, map, capture, sync status', 'Offline': 'Full read and write offline with conflict handling on sync' },
    stack: ['Android (Kotlin)', 'Offline store', 'Background sync', 'Camera and GPS', 'Push notifications'],
  },
  {
    id: 'WRK-10', t: 'Automation runtime and scheduler', cat: 'AI & automation', scene: 'runtime',
    blurb: 'The engine room: every scheduled job, its workers, retries and alerts, in one place you can actually debug.',
    read: [
      ['Job table', 'Each automation with its last result and duration. Failures are obvious and clickable rather than buried in a log file.'],
      ["Tonight’s window", 'The schedule as a timeline, so overlapping jobs and long runs are visible before they collide.'],
      ['Worker console', 'Live output from one worker. When something breaks at 04:00, this is the screen that explains it.'],
    ],
    specs: { 'Built for': 'Teams running more than a handful of scheduled scripts', 'Replaces': 'Cron jobs nobody can see, and scripts on a laptop under a desk', 'Key screens': 'Jobs, schedule, workers, run detail, alerts', 'Operations': 'Retries, alerting, change windows and a full run history' },
    stack: ['Job scheduler', 'Worker pool', 'Retry and alerting', 'Structured logs', 'Metrics'],
  },
  {
    id: 'WRK-11', t: 'Analytical development workbench', cat: 'Dashboards & analytics', scene: 'analytics',
    blurb: 'Where an analyst writes the query, sees the shape of the data and publishes the chart, without a hand-off.',
    read: [
      ['Query panel', 'Real SQL against governed sources, versioned so a result can be reproduced months later.'],
      ['Exploration charts', 'Scatter, funnel and fit views for testing an idea quickly before committing to it.'],
      ['Run details', 'Rows, cost, duration and whether the result came from cache, so expensive habits are visible.'],
    ],
    specs: { 'Built for': 'Analysts and data teams building models, not just reading dashboards', 'Replaces': 'Notebooks on personal machines and results nobody can reproduce', 'Key screens': 'Query editor, chart builder, experiments, publish, history', 'Discipline': 'Versioned queries, governed sources and a cost readout on every run' },
    stack: ['SQL engine', 'Chart builder', 'Version history', 'Source governance', 'Publishing'],
  },
  {
    id: 'WRK-12', t: 'Report automation', cat: 'Enterprise systems', scene: 'reports',
    blurb: 'The monthly pack builds itself: data pulled, pages laid out, totals checked, then emailed to each audience in the format they want.',
    read: [
      ['Build steps', 'Pull, build, check, send. The check stage compares totals against the source and stops the send if they disagree.'],
      ['Document preview', 'The actual output, page by page, before it goes out. Commentary blocks can be edited by a human.'],
      ['Recipients', 'Who gets what, in which format. Turning a group on or off is a switch, not a code change.'],
    ],
    specs: { 'Built for': 'Finance, operations and any team with a recurring reporting deadline', 'Replaces': 'A person spending two days a month copying charts into slides', 'Key screens': 'Report list, schedule, template editor, recipients, delivery log', 'Safeguards': 'Totals reconciliation before send, plus a full archive of what was sent to whom' },
    stack: ['Template engine', 'PDF and XLSX output', 'Scheduler', 'Reconciliation checks', 'Delivery log'],
  },
  {
    id: 'WRK-13', t: 'Enterprise web platform', cat: 'Apps & web', scene: 'web',
    blurb: 'A customer-facing site wired into the business: live stock, account pricing, spec sheets and requests that reach a real person.',
    read: [
      ['Search', 'Customers search by part number or specification against the live catalogue, not a static PDF list.'],
      ['Branch stock', 'Availability per branch, pulled from the same system the counter staff use, so quoted dates hold.'],
      ['Account pricing', 'Signed-in customers see their contract prices and terms, which removes a whole email round trip.'],
    ],
    specs: { 'Built for': 'Distributors, manufacturers and B2B suppliers', 'Replaces': 'A brochure website with a contact form and a phone call', 'Key screens': 'Catalogue search, product detail, branch stock, account area, request', 'Performance': 'Server-rendered, indexed for search, and accessible on old plant-floor browsers' },
    stack: ['Server-rendered web', 'Catalogue search', 'ERP integration', 'CMS for content', 'Analytics'],
  },
  {
    id: 'WRK-14', t: 'Enterprise interface system', cat: 'Apps & web', scene: 'designsys',
    blurb: 'One component kit and set of rules so nine product teams stop shipping nine different-looking screens.',
    read: [
      ['Foundations', 'Colour and type as fixed tokens. A team changes a token, not a hex code buried in a stylesheet.'],
      ['Components', 'Buttons, fields, selectors, banners and tables in every state, so nobody invents a fifth button style.'],
      ['System health', 'How many components exist, how many teams use the current version, and the accessibility failures still open.'],
    ],
    specs: { 'Built for': 'Organisations with several internal products and no shared language', 'Replaces': 'Screens designed from scratch each time, and inconsistent behaviour', 'Key screens': 'Foundations, component catalogue, patterns, accessibility, release notes', 'Accessibility': 'Contrast and keyboard behaviour are checked in the kit, not per screen' },
    stack: ['Design tokens', 'Component library', 'Documentation site', 'Accessibility tests', 'Versioned releases'],
  },
  {
    id: 'WRK-15', t: 'Point of sale for enterprises', cat: 'Enterprise systems', scene: 'pos',
    blurb: 'A till that works on a bad network, reports to head office, and can be reconfigured across every branch at once.',
    read: [
      ['Product grid', 'Big targets, organised by category. Staff can be productive in their first hour with no training manual.'],
      ['Order panel', 'The running order with tax and totals calculated live, and split payment options for real-world situations.'],
      ['Till activity', 'Takings, shift events and the offline queue, which shows staff whether a sale has reached head office yet.'],
    ],
    specs: { 'Built for': 'Multi-branch retail, food service and trade counters', 'Replaces': 'Off-the-shelf tills that cannot be changed and do not report centrally', 'Key screens': 'Sale, order, payment, returns, shift and cash management, branch reporting', 'Resilience': 'Sales complete offline and queue for sync, with card reader integration' },
    stack: ['Offline-first client', 'Payment integration', 'Central catalogue', 'Branch reporting', 'Shift and cash controls'],
  },
];
