// Belegdateien (Fotos, PDFs) im Gerätespeicher (IndexedDB).
// Später lädt die App sie zusätzlich in den passenden OneDrive-Ordner hoch.

const DB = 'steuerapp-files';
const STORE = 'files';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
  }));
}

export function saveFile(id, file) {
  return tx('readwrite', (s) => s.put({ name: file.name, type: file.type, blob: file }, id));
}

export function getFile(id) {
  return tx('readonly', (s) => s.get(id));
}

export function deleteFile(id) {
  return tx('readwrite', (s) => s.delete(id));
}
