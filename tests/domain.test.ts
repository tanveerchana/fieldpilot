import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, seed, reduce, parseCommand } from '../src/domain.js';

test('money uses integer cents and rounds tax once', () => {
  assert.deepEqual(totals([{ description: 'Paint', quantity: 3, unitCents: 1999 }], 10), {
    subtotal: 5997,
    tax: 600,
    total: 6597,
  });
  assert.throws(() => totals([{ description: 'bad', quantity: -1, unitCents: 2 }], 10));
});
test('approval creates one scheduled job and refuses repeated approval', () => {
  const s = seed();
  const id = s.estimates.find((x) => x.status === 'draft')!.id;
  const next = reduce(s, { type: 'approve_estimate', id });
  assert.equal(next.jobs.length, s.jobs.length + 1);
  assert.equal(next.jobs.at(-1)?.status, 'scheduled');
  assert.throws(() => reduce(next, { type: 'approve_estimate', id }), /approved/i);
  assert.equal(s.estimates.find((x) => x.id === id)?.status, 'draft');
});
test('jobs require sequential transitions; invoice requires completed work and can be issued once', () => {
  const s = seed();
  const id = s.jobs.find((x) => x.status === 'scheduled')!.id;
  assert.throws(() => reduce(s, { type: 'move_job', id, status: 'completed' }), /transition/i);
  assert.throws(() => reduce(s, { type: 'create_invoice', jobId: id }), /completed/i);
  const active = reduce(s, { type: 'move_job', id, status: 'in_progress' });
  const complete = reduce(active, { type: 'move_job', id, status: 'completed' });
  const invoiced = reduce(complete, { type: 'create_invoice', jobId: id });
  assert.equal(invoiced.invoices.length, s.invoices.length + 1);
  assert.throws(() => reduce(invoiced, { type: 'create_invoice', jobId: id }), /already/i);
  const paid = reduce(invoiced, { type: 'pay_invoice', id: invoiced.invoices.at(-1)!.id });
  assert.equal(paid.invoices.at(-1)?.status, 'paid');
});
test('typed and voice command parsing only returns an editable proposal', () => {
  const s = seed();
  const before = JSON.stringify(s);
  const p = parseCommand('Create a painting estimate for Alex Morgan', s);
  assert.equal(p.customerId, 'c-alex');
  assert.match(p.title, /painting/i);
  assert.ok(p.items.length);
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => parseCommand('Delete all customers', s), /Try/i);
  assert.throws(
    () => parseCommand('Create a painting estimate for Unknown Person', s),
    /customer/i,
  );
});
test('customer and estimate commands validate data and preserve the source state', () => {
  const s = seed();
  assert.throws(() => reduce(s, { type: 'create_customer', name: '', email: 'bad', address: '' }));
  const c = reduce(s, {
    type: 'create_customer',
    name: 'Jamie Lee',
    email: 'jamie@example.com',
    phone: '0400 000 000',
    address: '2 Sample Street, Melbourne VIC',
  });
  assert.equal(c.customers.length, s.customers.length + 1);
  assert.throws(() =>
    reduce(s, {
      type: 'create_estimate',
      customerId: 'missing',
      title: 'Painting',
      items: [{ description: 'Paint', quantity: 1, unitCents: 100 }],
      taxRate: 10,
    }),
  );
});
