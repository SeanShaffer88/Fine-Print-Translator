import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createStore } from '../src/storage/store.js';

const rec = (id, extra = {}) => ({
  id, name: `${id}.pdf`, date: '2026-11-11', savedAt: 1, rulesetVersion: '0.2.0',
  text: `SECRET TEXT ${id}`, analysis: { categories: [] },
  annotations: { 'renewal:10': { note: 'my note' } }, ...extra,
});

test('nothing exists until something is saved', async () => {
  const idb = new IDBFactory();
  assert.deepEqual(await createStore(idb).list(), []);
  assert.deepEqual(await idb.databases(), [], 'listing does not create a database');
});

test('save, get, and update a record', async () => {
  const store = createStore(new IDBFactory());
  await store.save(rec('a'));
  assert.equal((await store.get('a')).text, 'SECRET TEXT a');
  await store.save(rec('a', { annotations: { 'renewal:10': { note: 'changed' } } }));
  assert.equal((await store.get('a')).annotations['renewal:10'].note, 'changed');
  assert.equal((await store.list()).length, 1);
});

test('list returns summaries without document text, newest first', async () => {
  const store = createStore(new IDBFactory());
  await store.save(rec('old', { savedAt: 1 }));
  await store.save(rec('new', { savedAt: 2 }));
  const list = await store.list();
  assert.deepEqual(list.map((r) => r.id), ['new', 'old']);
  assert.ok(!JSON.stringify(list).includes('SECRET'));
  assert.ok(!('annotations' in list[0]));
});

test('deleting an analysis removes its text, results, and notes', async () => {
  const idb = new IDBFactory();
  const store = createStore(idb);
  await store.save(rec('a'));
  await store.save(rec('b'));
  await store.remove('a');
  assert.equal(await store.get('a'), undefined);
  assert.deepEqual((await store.list()).map((r) => r.id), ['b']);
  // Look at the raw database, not through the store API.
  const db = await new Promise((res) => { const r = idb.open('fine-print-translator'); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const r = db.transaction('analyses').objectStore('analyses').getAll(); r.onsuccess = () => res(r.result); });
  db.close();
  assert.ok(!JSON.stringify(all).includes('SECRET TEXT a'));
});

test('delete all removes the database itself', async () => {
  const idb = new IDBFactory();
  const store = createStore(idb);
  await store.save(rec('a'));
  await store.removeAll();
  assert.deepEqual(await idb.databases(), []);
  assert.deepEqual(await store.list(), []);
  assert.deepEqual(await idb.databases(), [], 'still nothing after listing');
});

test('unavailable storage is reported without detail', () => {
  assert.throws(() => createStore(null), /storage_unavailable/);
});
