// Datenhaltung. In Stufe 1 liegen die Daten im Browser des Geräts (localStorage).
// Später ersetzt eine OneDrive-Ablage diese Datei, der Rest der App bleibt gleich.

import { beispielDaten } from './data.js';

const KEY = 'steuerapp.v1';

function leer() {
  return {
    version: 1, engagements: [], aufenthalte: [], belege: [], buchungen: [], gestartet: false,
    einstellungen: { heimat: '', orsKey: '' }
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return leer();
    const data = JSON.parse(raw);
    return Object.assign(leer(), data, { einstellungen: Object.assign(leer().einstellungen, data.einstellungen) });
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

// Einstellungen (Startadresse, Schlüssel) bleiben beim Laden von Beispieldaten und beim Löschen erhalten.
export function starteMitBeispielen() {
  state = Object.assign(leer(), beispielDaten(), { gestartet: true, einstellungen: state.einstellungen });
  persist();
}

export function starteLeer() {
  state = Object.assign(leer(), { gestartet: true, einstellungen: state.einstellungen });
  persist();
}

export function allesLoeschen() {
  state = Object.assign(leer(), { einstellungen: state.einstellungen });
  persist();
}

// Datensicherung als Datei (bis OneDrive angebunden ist). Der Routenschlüssel bleibt draußen.
export function exportJson() {
  const copy = JSON.parse(JSON.stringify(state));
  if (copy.einstellungen) copy.einstellungen.orsKey = '';
  return JSON.stringify(copy, null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.buchungen) || !Array.isArray(data.engagements)) throw new Error('Keine gültige Sicherung');
  const einstellungen = Object.assign({}, state.einstellungen, data.einstellungen, { orsKey: state.einstellungen.orsKey });
  state = Object.assign(leer(), data, { gestartet: true, einstellungen });
  persist();
}
