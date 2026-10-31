import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentDetail } from '../src/components.js';
import { configureAccess, setAccess } from '../src/access/access.js';
import { seed } from '../src/domain.js';

function documentMarkup(role: string, kind: 'estimate' | 'invoice') {
  configureAccess('fieldpilot');
  setAccess(
    {
      mode: 'account',
      role,
      workspaceId: 'sample-workspace',
      user: { id: 'sample-user', email: 'user@example.com' },
    },
    false,
  );
  const state = seed();
  const doc =
    kind === 'estimate'
      ? state.estimates.find((e) => e.status === 'draft')!
      : state.invoices.find((i) => i.status === 'unpaid')!;
  return renderToStaticMarkup(
    React.createElement(DocumentDetail, {
      doc,
      kind,
      state,
      busy: false,
      onClose: () => {},
      onAction: async () => {},
    }),
  );
}

test('viewer can read document details without approval or payment controls', () => {
  const estimate = documentMarkup('viewer', 'estimate');
  const invoice = documentMarkup('viewer', 'invoice');
  assert.match(estimate, /Estimate details/);
  assert.match(invoice, /Invoice details/);
  assert.doesNotMatch(estimate, /Approve &amp; schedule job/);
  assert.doesNotMatch(invoice, /Mark as paid/);
});
test('staff cannot approve estimates or mark invoices paid', () => {
  assert.doesNotMatch(documentMarkup('staff', 'estimate'), /Approve &amp; schedule job/);
  assert.doesNotMatch(documentMarkup('staff', 'invoice'), /Mark as paid/);
});
test('manager and owner receive document mutation controls', () => {
  for (const role of ['editor', 'owner']) {
    assert.match(documentMarkup(role, 'estimate'), /Approve &amp; schedule job/);
    assert.match(documentMarkup(role, 'invoice'), /Mark as paid/);
  }
});
