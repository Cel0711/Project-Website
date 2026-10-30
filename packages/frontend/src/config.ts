import type { SiteConfig } from '@coreloop/shared';

/**
 * EDIT THESE to make the site yours — this is the one file most deployments
 * need to touch (see README at the repo root for the full checklist).
 */
export const CFG: SiteConfig = {
  company: 'Labb-Lace IT Software & Solutions',
  email: 'contact.support@labblace.com',

  /* Plans a visitor can pick when they send a design. Edit freely — add,
     remove or reprice. "rec" marks the highlighted one. */
  plans: [
    { id: 'review', name: 'Sketch review', price: 'Free', per: 'reply in 2 business days', items: ['We read your design', 'Rough price range', 'What we would change'] },
    { id: 'sprint', name: 'Design sprint', price: 'From 2,400', per: '1 week, fixed price', rec: 1, items: ['Clickable screens', 'Written scope', 'Fixed quote for the build'] },
    { id: 'build', name: 'Full build', price: 'From 12,000', per: 'fixed price project', items: ['Weekly releases', 'Testing with your data', 'Source code handover'] },
    { id: 'care', name: 'Care plan', price: 'From 900', per: 'per month, cancel anytime', items: ['Support and fixes', 'Small changes each month', 'Hosting and monitoring'] },
  ],
};
