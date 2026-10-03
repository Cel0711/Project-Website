import type { CapabilityCard } from '@coreloop/shared';

export const CAPS: CapabilityCard[] = [
  { t: 'AI automation and agents', d: 'Systems that read documents, decide against your rules and act — with a person kept in the loop wherever a wrong answer would be expensive.', tags: ['Document AI', 'Retrieval', 'Evaluations', 'Guardrails'], ic: 'M3 8h10M3 12h6M3 16h8' },
  { t: 'Process automation', d: 'The recurring work nobody enjoys: BOM roll-ups, price imports, report packs, ticket routing, month-end checks. Scheduled, logged and monitored.', tags: ['Schedulers', 'Integrations', 'Validation', 'Audit trails'], ic: 'M4 4h7v7H4zM13 13h7v7h-7zM11 7.5h2a2 2 0 0 1 2 2v3' },
  { t: 'Dashboards and analytics', d: 'From a board-level view down to a query an analyst can reproduce. We define the metrics with you first, so the numbers survive scrutiny.', tags: ['Warehouse', 'KPI models', 'Live feeds', 'Self-serve views'], ic: 'M4 19V9M10 19V5M16 19v-6M22 19H2' },
  { t: 'Infrastructure automation', d: 'Configuration for racks, switches and power generated from templates, validated against policy and shipped with a change record you can roll back.', tags: ['Templates', 'Topology', 'Compliance', 'Change review'], ic: 'M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01' },
  { t: 'Enterprise apps and web', d: 'Android apps that work with no signal, customer-facing sites wired into your ERP, and point of sale that keeps trading when the network does not.', tags: ['Android', 'Offline-first', 'Server-rendered web', 'Point of sale'], ic: 'M7 3h10v18H7zM11 18h2' },
  { t: 'Interface design', d: 'The screens themselves: information architecture, a component kit your teams share, and accessibility handled in the kit rather than argued about later.', tags: ['Design systems', 'Prototypes', 'Accessibility', 'Handover'], ic: 'M12 3l9 5-9 5-9-5zM3 14l9 5 9-5' },
];
