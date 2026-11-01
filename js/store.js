// Datenhaltung. In Stufe 1 liegen die Daten im Browser des Geräts (localStorage).
// Später ersetzt eine OneDrive-Ablage diese Datei, der Rest der App bleibt gleich.

import { beispielDaten } from './data.js';

const KEY = 'steuerapp.v1';

function leer() {
  return { version: 1, engagements: [], belege: [], buchungen: [], gestartet: false };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return leer();
    return Object.assign(leer(), JSON.parse(raw));
  } catch (e) {
    console.error('Daten konnten nicht geladen werden', e);
    return leer();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    alert('Speichern fehlgeschlagen: Der Speicher dieses Geräts ist voll.');
  }
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(mutator) {
  mutator(state);
  persist();
}

export function starteMitBeispielen() {
  state = Object.assign(leer(), beispielDaten(), { gestartet: true });
  persist();
}

export function starteLeer() {
  state = Object.assign(leer(), { gestartet: true });
  persist();
}

export function allesLoeschen() {
  state = leer();
  persist();
}

// Datensicherung als Datei (bis OneDrive angebunden ist)
export function exportJson() {
  return JSON.stringify(state, null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.buchungen) || !Array.isArray(data.engagements)) throw new Error('Keine gültige Sicherung');
  state = Object.assign(leer(), data, { gestartet: true });
  persist();
}
