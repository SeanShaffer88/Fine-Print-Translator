// Local storage for analyses the user chooses to save. Everything stays in the
// browser's IndexedDB on this device. Nothing is written unless the user saves.
// Records are not encrypted; they are protected only by the browser profile.

const DB_NAME = 'fine-print-translator';
const STORE = 'analyses';

const done = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(new Error('storage_failed')); // no record content in errors
});

/** @param {IDBFactory} idb defaults to the browser's indexedDB */
export function createStore(idb = globalThis.indexedDB) {
  if (!idb) throw new Error('storage_unavailable');

  const open = () => new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('storage_unavailable'));
    req.onblocked = () => reject(new Error('storage_unavailable'));
  });

  async function run(mode, fn) {
    const db = await open();
    try {
      const tx = db.transaction(STORE, mode);
      const finished = new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(new Error('storage_failed'));
      });
      const result = await fn(tx.objectStore(STORE));
      await finished;
      return result;
    } finally {
      db.close();
    }
  }

  return {
    /** Saves or replaces one analysis record (must have an id). */
    save: (record) => run('readwrite', (s) => done(s.put(record))),
    get: (id) => run('readonly', (s) => done(s.get(id))),
    /** Summaries for the saved list, newest first. Does not return document text. */
    list: async () => {
      // Avoid creating an empty database just by looking (where the browser can tell us).
      if (idb.databases) {
        const names = (await idb.databases()).map((d) => d.name);
        if (!names.includes(DB_NAME)) return [];
      }
      const all = await run('readonly', (s) => done(s.getAll()));
      return all
        .map(({ id, name, date, savedAt, rulesetVersion }) => ({ id, name, date, savedAt, rulesetVersion }))
        .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
    },
    /** Deletes one analysis: results, extracted text, notes, and corrections. */
    remove: (id) => run('readwrite', (s) => done(s.delete(id))),
    /** Deletes the whole database, leaving nothing behind. */
    removeAll: () => new Promise((resolve, reject) => {
      const req = idb.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = req.onblocked = () => reject(new Error('storage_failed'));
    }),
  };
}
