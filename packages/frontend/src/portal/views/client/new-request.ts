import { toast } from '../../../core/dom.js';
import { loadLocal } from '../../../sections/design-studio/persistence.js';
import { updateAttachState } from '../../../sections/design-studio/ui-utils.js';
import { initQuote } from '../../../sections/request-quote/index.js';
import type { View } from '../../routes.js';
import { pageHead } from '../../ui.js';

/** "Get a quote": the same form as the website's Contact page, inside the dashboard. */
const view: View = (ctx) => {
  ctx.root.innerHTML =
    pageHead('Get a quote', 'Tell us what is slowing you down. We reply within one business day with a scope, a price range and the questions we still have.') +
    `<p class="note-line">Want to sketch it first? <a href="/#/studio">Open the design studio</a> on our website. Your drawing is saved in this browser and can be attached below.</p>
     <div id="quoteHost" class="quote-host"></div>`;

  const tpl = document.querySelector<HTMLTemplateElement>('#tplQuoteForm');
  const host = ctx.root.querySelector<HTMLElement>('#quoteHost');
  if (!tpl || !host) return;
  host.appendChild(tpl.content.cloneNode(true));

  loadLocal(); // the design drawn in the studio, if any, from this browser
  initQuote({
    mode: 'portal',
    onSent: (q) => {
      toast(`Request ${q.ref} sent. We will be in touch within one business day.`);
      ctx.refresh();
      ctx.go(`/requests/${encodeURIComponent(q.ref)}`);
    },
  });
  updateAttachState();
};

export default view;
