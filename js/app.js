// Steuer-App, Stufe 1: Erfassen, Ablegen, Überblicken.
// Aufbau: ein Zustand (store.js), Ansichten als Funktionen, die HTML liefern,
// Klicks und Eingaben werden zentral über data-Attribute verarbeitet.

import { getState, subscribe, update, starteMitBeispielen, starteLeer, allesLoeschen, exportJson, importJson } from './store.js';
import { PERSONEN, WAEHRUNGEN, KATEGORIEN, KAT, istEinnahme, steuerTopf, TOPF_STIL, UNTERKUNFT, aufenthaltTage } from './data.js';
import { esc, eur, money, parseNum, numInput, date, shortDate, period, today, uid, slug } from './format.js';
import { saveFile, getFile, deleteFile } from './files.js';

const APP_VERSION = '1.2';
const app = document.getElementById('app');

const ui = {
  view: 'start',
  params: {},
  stack: [],
  jahr: String(new Date().getFullYear()),
  filter: 'Alle',
  draft: null,
  toast: '',
  viewer: null
};

// ---------- Icons ----------
const I = {
  home: '<path d="M4 11l8-7 8 7v9H4z"/>',
  music: '<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  list: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  doc: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h4"/>',
  check: '<path d="M14 3H6v18h12V7z"/><path d="M9 14l2 2 4-4"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><path d="M12 17h.01"/>',
  folder: '<path d="M3 7h6l2 2h10v10H3z"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  up: '<path d="M12 20V9M7 14l5-5 5 5"/><path d="M5 4h14"/>'
};
const icon = (name, size = 20, stroke = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name]}</svg>`;

// ---------- Berechnungen ----------
const S = () => getState();
const engagement = (id) => S().engagements.find((e) => e.id === id);
const topf = (b) => steuerTopf(b, S().engagements);
const jahrVon = (b) => (b.zahlungsdatum || '').slice(0, 4);
const imJahr = () => S().buchungen.filter((b) => jahrVon(b) === ui.jahr);
const summe = (list) => Math.round(list.reduce((a, b) => a + (Number(b.eur) || 0), 0) * 100) / 100;
const einnahmen = (list) => list.filter((b) => istEinnahme(b.kategorie));
const ausgaben = (list) => list.filter((b) => !istEinnahme(b.kategorie));
const vertragText = (e) => (e.vertragsart === 'angestellt' ? 'angestellt' : 'selbständig');
const vertragChip = (e) => (e.vertragsart === 'angestellt' ? 'purple' : 'blue');

function offenePunkte() {
  const list = imJahr();
  const ohneBeleg = list.filter((b) => !b.belegId);
  const gemischt = list.filter((b) => topf(b) === 'Gemischt');
  return { ohneBeleg, gemischt, anzahl: ohneBeleg.length + gemischt.length };
}

function engagementsImJahr() {
  return S().engagements
    .filter((e) => (e.von || '').startsWith(ui.jahr) || S().buchungen.some((b) => b.kontext === e.id && jahrVon(b) === ui.jahr))
    .sort((a, b) => (b.von || '').localeCompare(a.von || ''));
}

function engagementZahlen(e) {
  const list = S().buchungen.filter((b) => b.kontext === e.id);
  const ein = summe(einnahmen(list));
  const aus = summe(ausgaben(list));
  return { list, ein, aus, ergebnis: Math.round((ein - aus) * 100) / 100 };
}

function ordnerPfad(e) {
  const j = (e.von || ui.jahr).slice(0, 4);
  const monat = (e.von || '').slice(0, 7) || j;
  return `Steuer/${j}/${e.person}/Engagements/${monat} ${slug(e.titel).replace(/-/g, ' ')}`;
}

function dateiName(belegdatum, aussteller, katId, gesamt, waehrung, original) {
  const ext = (original || '').includes('.') ? original.split('.').pop().toLowerCase() : 'pdf';
  const betrag = String(Math.round(parseNum(gesamt))).replace('.', '');
  return `${belegdatum}_${slug(aussteller) || 'Beleg'}_${slug(KAT[katId]?.name || '')}_${betrag}${waehrung}.${ext}`;
}

function vorschlagKontext(belegdatum) {
  const e = S().engagements.find((x) => x.von && x.von <= belegdatum && (!x.bis || x.bis >= belegdatum));
  return e ? e.id : 'allgemein';
}

// ---------- Navigation ----------
function go(view, params = {}) {
  ui.stack.push({ view: ui.view, params: ui.params });
  ui.view = view;
  ui.params = params;
  ui.draft = null;
  render();
  window.scrollTo(0, 0);
}

function tab(view) {
  ui.stack = [];
  ui.view = view;
  ui.params = {};
  ui.draft = null;
  render();
  window.scrollTo(0, 0);
}

function back() {
  const prev = ui.stack.pop();
  ui.draft = null;
  if (prev) { ui.view = prev.view; ui.params = prev.params; } else { ui.view = 'start'; ui.params = {}; }
  render();
  window.scrollTo(0, 0);
}

let toastTimer;
function toast(msg) {
  ui.toast = msg;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = ''; render(); }, 3200);
}

// ---------- Bausteine ----------
const backBtn = (label = 'Zurück') => `<button class="back" data-act="back">${icon('back')}${esc(label)}</button>`;

function buchungZeile(b, { zeigeKontext = false } = {}) {
  const t = topf(b);
  const ein = istEinnahme(b.kategorie);
  const e = engagement(b.kontext);
  const sub = [shortDate(b.zahlungsdatum), KAT[b.kategorie]?.name];
  if (zeigeKontext) sub.push(e ? e.titel : b.person);
  if (b.waehrung && b.waehrung !== 'EUR') sub.push(money(b.betrag, b.waehrung));
  return `<button class="list-item" data-act="editBuchung" data-id="${b.id}">
    <div class="grow">
      <div class="t">${esc(b.beschreibung || KAT[b.kategorie]?.name)}</div>
      <div class="s"><span>${esc(sub.filter(Boolean).join(' · '))}</span>
        ${!b.belegId ? '<span class="chip orange">Beleg fehlt</span>' : ''}
        ${t === 'Gemischt' ? '<span class="chip orange">gemischt</span>' : ''}
      </div>
    </div>
    <span class="num ${ein ? 'pos' : ''}">${ein ? '+ ' : ''}${eur(b.eur)}</span>
  </button>`;
}

function engagementKarte(e) {
  const z = engagementZahlen(e);
  const selb = e.vertragsart !== 'angestellt';
  return `<button class="card stack" data-act="openEng" data-id="${e.id}">
    <div class="between" style="align-items:flex-start">
      <div><div style="font-size:16px;font-weight:700">${esc(e.titel)}</div>
      <div class="muted small" style="font-size:13px;margin-top:3px">${esc([period(e.von, e.bis), e.land].filter(Boolean).join(' · '))}</div></div>
      <span class="chip lg ${vertragChip(e)}">${vertragText(e)}</span>
    </div>
    <div class="between" style="border-top:1px solid var(--line-soft);padding-top:10px">
      <span class="muted" style="font-size:13px">${selb ? 'Ergebnis' : 'Werbungskosten'}</span>
      <span class="num ${selb ? 'pos' : ''}">${selb ? (z.ergebnis >= 0 ? '+ ' : '') + eur(z.ergebnis) : eur(z.aus)}</span>
    </div>
  </button>`;
}

function kategorieOptionen(selected) {
  const grp = (g, label) => `<optgroup label="${label}">${KATEGORIEN.filter((k) => k.gruppe === g)
    .map((k) => `<option value="${k.id}" ${k.id === selected ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</optgroup>`;
  return grp('einnahme', 'Einnahmen') + grp('beruf', 'Berufliche Ausgaben') + grp('privat', 'Private Ausgaben');
}

function kontextOptionen(selected) {
  const es = [...S().engagements].sort((a, b) => (b.von || '').localeCompare(a.von || ''));
  return `<option value="allgemein" ${selected === 'allgemein' ? 'selected' : ''}>Allgemein / laufend</option>` +
    es.map((e) => `<option value="${e.id}" ${e.id === selected ? 'selected' : ''}>${esc(e.titel)}</option>`).join('');
}

function personOptionen(selected) {
  return PERSONEN.map((p) => `<option ${p === selected ? 'selected' : ''}>${p}</option>`).join('');
}

function waehrungOptionen(selected) {
  return WAEHRUNGEN.map((w) => `<option ${w === selected ? 'selected' : ''}>${w}</option>`).join('');
}

// ---------- Ansichten ----------
function vWelcome() {
  return `<div class="hero">
    <div class="eyebrow">Willkommen</div>
    <h1>Steuer-App</h1>
    <p class="muted" style="margin:0;line-height:1.5">Hier erfasst du Einnahmen, Ausgaben und Belege für Olga und dich. Zum Ausprobieren gibt es Beispieldaten. Du kannst sie später in den Einstellungen wieder löschen.</p>
    <div class="card info small" style="line-height:1.45">In dieser Testversion bleiben die Daten nur auf diesem Gerät. Die Ablage in OneDrive folgt im nächsten Schritt.</div>
    <button class="btn primary block" data-act="beispiele">Mit Beispieldaten ausprobieren</button>
    <button class="btn block" data-act="leer">Leer starten</button>
  </div>`;
}

function vStart() {
  const list = imJahr();
  const o = offenePunkte();
  const es = engagementsImJahr();
  const teile = [];
  if (o.ohneBeleg.length) teile.push(`${o.ohneBeleg.length} ohne Beleg`);
  if (o.gemischt.length) teile.push(`${o.gemischt.length} gemischt`);
  return `
  <div class="between">
    <div><div class="eyebrow">Olga &amp; Dominik</div>
      <div class="row" style="gap:6px">
        <button class="icon-btn" data-act="jahr" data-d="-1" aria-label="Vorheriges Jahr" style="width:36px;height:36px">${icon('back', 16)}</button>
        <h1>Steuerjahr ${esc(ui.jahr)}</h1>
        <button class="icon-btn" data-act="jahr" data-d="1" aria-label="Nächstes Jahr" style="width:36px;height:36px">${icon('chev', 16)}</button>
      </div>
    </div>
    <button class="icon-btn" data-act="tab" data-v="einstellungen" aria-label="Einstellungen">${icon('gear')}</button>
  </div>
  <div class="card grid3">
    <div class="stat"><div class="k">Einnahmen</div><div class="v pos">${eur(summe(einnahmen(list)))}</div></div>
    <div class="stat"><div class="k">Ausgaben</div><div class="v">${eur(summe(ausgaben(list)))}</div></div>
    <div class="stat"><div class="k">Buchungen</div><div class="v">${list.length}</div></div>
  </div>
  ${o.anzahl
    ? `<button class="card warn row" data-act="go" data-v="offen">
        <span style="width:36px;height:36px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon('alert', 18, '#9A5B00')}</span>
        <span class="grow"><span style="display:block;font-weight:700">${o.anzahl} ${o.anzahl === 1 ? 'offener Punkt' : 'offene Punkte'}</span><span style="font-size:13px">${teile.join(' · ')}</span></span>
        ${icon('chev', 18)}</button>`
    : (list.length ? '<div class="card ok">Keine offenen Punkte</div>' : '')}
  <div class="between"><h2>Engagements</h2><button class="link" data-act="tab" data-v="engagements">Alle</button></div>
  ${es.length ? es.slice(0, 3).map(engagementKarte).join('') : `<button class="card dashed" data-act="go" data-v="engForm">${icon('plus', 16)} Erstes Engagement für ${esc(ui.jahr)} anlegen</button>`}
  <button class="card dashed between" data-act="tab" data-v="allgemein">
    <span><span style="display:block;font-weight:700">Allgemein &amp; privat</span><span class="muted" style="font-size:13px">Internet, Versicherungen, Kita, Spenden …</span></span>${icon('chev', 18)}
  </button>`;
}

function vOffen() {
  const o = offenePunkte();
  return `${backBtn('Start')}<h1>Offene Punkte</h1>
  ${!o.anzahl ? '<div class="card ok">Alles erledigt. Die Steuerberatung bekommt ein vollständiges Jahr.</div>' : ''}
  ${o.ohneBeleg.length ? `<div class="label">Beleg fehlt</div><div class="card flat">${o.ohneBeleg.map((b) => buchungZeile(b, { zeigeKontext: true })).join('')}</div>
    <div class="muted small">Antippen, um den Beleg anzuhängen.</div>` : ''}
  ${o.gemischt.length ? `<div class="label">Gemischte Kosten zuordnen</div>
    ${o.gemischt.map((b) => `<div class="card stack">
      <div class="between"><div><div style="font-weight:700">${esc(b.beschreibung || KAT[b.kategorie]?.name)}</div>
      <div class="muted small">${esc(b.person)} · ${esc(KAT[b.kategorie]?.name)}</div></div><span class="num">${eur(b.eur)}</span></div>
      <div class="muted small">Gehört das zur selbständigen oder zur angestellten Tätigkeit?</div>
      <div class="grid3">
        <button class="btn small" data-act="topf" data-id="${b.id}" data-t="EÜR">selbständig</button>
        <button class="btn small" data-act="topf" data-id="${b.id}" data-t="Werbungskosten" style="color:var(--purple)">angestellt</button>
        <button class="btn small" data-act="topf" data-id="${b.id}" data-t="Aufgeteilt" style="color:var(--ink-2)">50/50</button>
      </div></div>`).join('')}` : ''}`;
}

function vEngagements() {
  const es = engagementsImJahr();
  return `<div class="between"><h1>Engagements ${esc(ui.jahr)}</h1>
    <button class="icon-btn" data-act="go" data-v="engForm" aria-label="Neues Engagement">${icon('plus', 18, 'var(--accent)')}</button></div>
    ${es.length ? es.map(engagementKarte).join('') : `<div class="empty">Noch keine Engagements in ${esc(ui.jahr)}.<br><br><button class="btn primary" data-act="go" data-v="engForm">Engagement anlegen</button></div>`}`;
}

function vEngDetail() {
  const e = engagement(ui.params.id);
  if (!e) return `${backBtn()}<div class="empty">Engagement nicht gefunden.</div>`;
  const z = engagementZahlen(e);
  const selb = e.vertragsart !== 'angestellt';
  const kat = {};
  ausgaben(z.list).forEach((b) => { kat[b.kategorie] = (kat[b.kategorie] || 0) + b.eur; });
  const kats = Object.entries(kat).sort((a, b) => b[1] - a[1]);
  const liste = [...z.list].sort((a, b) => (b.zahlungsdatum || '').localeCompare(a.zahlungsdatum || ''));
  return `${backBtn()}
  <div class="stack" style="gap:8px">
    <div class="between" style="align-items:flex-start"><h1 style="font-size:26px">${esc(e.titel)}</h1>
      <button class="link" data-act="go" data-v="engForm" data-id="${e.id}">Bearbeiten</button></div>
    <div class="row" style="flex-wrap:wrap;gap:6px">
      <span class="chip lg ${vertragChip(e)}">${selb ? 'Gastvertrag · selbständig' : 'Festvertrag · angestellt'}</span>
      ${e.haus || e.land ? `<span class="chip lg">${esc([e.haus, e.land].filter(Boolean).join(' · '))}</span>` : ''}
      ${e.von ? `<span class="chip lg">${esc(period(e.von, e.bis))}</span>` : ''}
      <span class="chip lg">${esc(e.person)}</span>
    </div>
  </div>
  <div class="card stack">
    <div class="grid3">
      <div class="stat"><div class="k">Einnahmen</div><div class="v pos">${selb ? eur(z.ein) : 'Gehalt'}</div></div>
      <div class="stat"><div class="k">Ausgaben</div><div class="v">${eur(z.aus)}</div></div>
      <div class="stat"><div class="k">${selb ? 'Ergebnis' : 'Werbungsk.'}</div><div class="v" style="font-weight:800">${eur(selb ? z.ergebnis : z.aus)}</div></div>
    </div>
    ${kats.length ? `<div class="stack" style="gap:6px;border-top:1px solid var(--line-soft);padding-top:10px">${kats.map(([k, v]) =>
      `<div class="between small" style="font-size:13px"><span style="color:var(--ink-2)">${esc(KAT[k]?.name)}</span><span class="num">${eur(v)}</span></div>`).join('')}</div>` : ''}
    ${e.gage && selb ? `<div class="muted small">Vereinbarte Gage: ${money(e.gage, e.waehrung || 'EUR')}</div>` : ''}
  </div>
  ${e.kontext ? `<div class="card stack" style="gap:6px"><div class="label">Kontext</div><div style="font-size:14px;line-height:1.45;white-space:pre-line">${esc(e.kontext)}</div></div>` : ''}
  ${aufenthalteBlock(e)}
  <div class="between"><h2>Buchungen</h2><button class="link" data-act="go" data-v="buchung" data-kontext="${e.id}">+ ohne Beleg</button></div>
  ${liste.length ? `<div class="card flat">${liste.map((b) => buchungZeile(b)).join('')}</div>` : '<div class="empty">Noch keine Buchungen. Tippe unten auf „Beleg“.</div>'}
  <div class="card row small" style="font-size:13px">${icon('folder', 18, 'var(--accent)')}<span class="grow"><span class="muted">OneDrive-Ordner (ab Anbindung)</span><br><span class="num" style="font-weight:500;white-space:normal">${esc(ordnerPfad(e))}</span></span></div>`;
}

function tageText(t) {
  if (!t) return 'Datum prüfen';
  if (!t.naechte) return t.teil ? 'Tagesreise über 8 Std.' : 'Tagesreise unter 8 Std.';
  return `${t.naechte} ${t.naechte === 1 ? 'Nacht' : 'Nächte'} · ${t.voll} volle ${t.voll === 1 ? 'Tag' : 'Tage'} + An-/Abreise`;
}

function mahlzeitenText(a) {
  const m = [a.fruehstueck && 'Frühstück', a.mittag && 'Mittagessen', a.abend && 'Abendessen'].filter(Boolean);
  return m.length ? `${m.join(', ')} gestellt` : '';
}

function aufenthalteBlock(e) {
  const list = S().aufenthalte.filter((a) => a.engagementId === e.id).sort((a, b) => (a.von || '').localeCompare(b.von || ''));
  const sum = list.reduce((acc, a) => {
    const t = aufenthaltTage(a);
    if (t) { acc.voll += t.voll; acc.teil += t.teil; acc.naechte += t.naechte; }
    return acc;
  }, { voll: 0, teil: 0, naechte: 0 });
  return `<div class="between"><h2>Aufenthalte</h2><button class="link" data-act="go" data-v="aufenthalt" data-kontext="${e.id}">+ Aufenthalt</button></div>
  ${list.length ? `<div class="card flat">${list.map((a) => `<button class="list-item" data-act="go" data-v="aufenthalt" data-id="${a.id}">
      <div class="grow"><div class="t">${esc(period(a.von, a.bis) || 'ohne Datum')}${a.ort ? ' · ' + esc(a.ort) : ''}</div>
      ${a.notiz ? `<div style="font-size:14px;color:var(--ink-2);margin-top:2px">${esc(a.notiz)}</div>` : ''}
      <div class="s"><span>${esc(tageText(aufenthaltTage(a)))}</span></div>
      <div class="s"><span class="chip ${a.unterkunft === 'hotel' || a.unterkunft === 'ferienwohnung' ? 'blue' : 'gray'}">${esc(UNTERKUNFT[a.unterkunft] || '')}</span>${mahlzeitenText(a) ? `<span>${esc(mahlzeitenText(a))}</span>` : ''}</div></div>
      ${icon('chev', 18, '#5B6168')}</button>`).join('')}
    <div class="list-item" style="font-size:13px;display:block"><span class="muted">Summe für die Verpflegungspauschale:</span><br><span style="font-weight:700">${sum.voll} volle Tage · ${sum.teil} An-/Abreisetage</span></div></div>`
    : '<div class="card dashed muted small" style="font-size:13px;line-height:1.45">Noch keine Aufenthalte. Trage die Zeiträume ein, in denen Olga vor Ort war, auch wenn das Hotel gestellt wurde. Daraus berechnet die App später die Verpflegungspauschale.</div>'}`;
}

function vAufenthalt() {
  const id = ui.params.id;
  if (!ui.draft) {
    const a = id ? S().aufenthalte.find((x) => x.id === id) : null;
    if (a) ui.draft = { ...a };
    else {
      const e = engagement(ui.params.kontext);
      const vorhandene = S().aufenthalte.filter((x) => x.engagementId === e?.id && x.bis).sort((x, y) => x.bis.localeCompare(y.bis));
      ui.draft = {
        engagementId: e?.id, von: vorhandene.length ? '' : (e?.von || ''), bis: vorhandene.length ? '' : (e?.bis || ''),
        ort: e?.ort || '', land: e?.land || 'Deutschland', unterkunft: 'hotel', fruehstueck: false, mittag: false, abend: false, ueber8h: false, notiz: ''
      };
    }
  }
  const d = ui.draft;
  const e = engagement(d.engagementId);
  const t = aufenthaltTage(d);
  const cb = (k, label) => `<label class="row" style="min-height:40px;font-size:15px"><input type="checkbox" data-cb="${k}" ${d[k] ? 'checked' : ''} style="width:20px;height:20px">${label}</label>`;
  return `${backBtn()}<h1 style="font-size:24px">${id ? 'Aufenthalt bearbeiten' : 'Neuer Aufenthalt'}</h1>
  ${e ? `<div class="muted small">${esc(e.titel)}</div>` : ''}
  <div class="grid2">
    <label class="field">Anreise<input type="date" data-f="von" data-rr="1" value="${esc(d.von)}"></label>
    <label class="field">Abreise<input type="date" data-f="bis" data-rr="1" value="${esc(d.bis)}"></label>
  </div>
  <div class="card info small" style="font-size:13px">${esc(tageText(t))}</div>
  ${t && t.naechte === 0 ? cb('ueber8h', 'Mehr als 8 Stunden unterwegs') : ''}
  <div class="grid2">
    <label class="field">Ort<input data-f="ort" value="${esc(d.ort)}"></label>
    <label class="field">Land<input data-f="land" value="${esc(d.land)}"><span class="hint">bestimmt die Pauschale im Ausland</span></label>
  </div>
  <label class="field">Unterkunft<select data-f="unterkunft">${Object.entries(UNTERKUNFT).map(([k, v]) => `<option value="${k}" ${d.unterkunft === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <span class="hint">Bei „gestellt“ oder „privat“ gibt es keine Übernachtungskosten, die Verpflegungspauschale aber trotzdem.</span></label>
  <div class="field">Gestellte Mahlzeiten (kürzen die Pauschale)
    ${cb('fruehstueck', 'Frühstück')}${cb('mittag', 'Mittagessen')}${cb('abend', 'Abendessen')}</div>
  <label class="field">Notiz<input data-f="notiz" value="${esc(d.notiz)}" placeholder="z. B. Probenphase, Wohnung vom Theater"></label>
  <button class="btn primary block" data-act="saveAuf">Speichern</button>
  ${id ? '<button class="btn danger block" data-act="deleteAuf">Aufenthalt löschen</button>' : ''}`;
}

function vEngForm() {
  const id = ui.params.id;
  if (!ui.draft) {
    const e = id ? engagement(id) : null;
    ui.draft = e ? { ...e, gage: numInput(e.gage) } : {
      titel: '', person: 'Olga', vertragsart: 'selbstaendig', haus: '', ort: '', land: 'Deutschland',
      von: '', bis: '', gage: '', waehrung: 'EUR', agentur: '', kontext: ''
    };
  }
  const d = ui.draft;
  return `${backBtn()}<h1>${id ? 'Engagement bearbeiten' : 'Neues Engagement'}</h1>
  <label class="field">Titel<input data-f="titel" value="${esc(d.titel)}" placeholder="z. B. Bern – Zauberflöte"></label>
  <div class="field">Vertragsart
    <div class="seg"><button data-act="set" data-k="vertragsart" data-val="selbstaendig" class="${d.vertragsart !== 'angestellt' ? 'on' : ''}">Gast · selbständig</button>
    <button data-act="set" data-k="vertragsart" data-val="angestellt" class="${d.vertragsart === 'angestellt' ? 'on' : ''}">angestellt</button></div>
    <span class="hint">Bestimmt, wohin die Buchungen steuerlich gehören.</span></div>
  <div class="grid2">
    <label class="field">Person<select data-f="person">${personOptionen(d.person)}</select></label>
    <label class="field">Land<input data-f="land" value="${esc(d.land)}"></label>
  </div>
  <div class="grid2">
    <label class="field">Haus / Veranstalter<input data-f="haus" value="${esc(d.haus)}"></label>
    <label class="field">Ort<input data-f="ort" value="${esc(d.ort)}"></label>
  </div>
  <div class="grid2">
    <label class="field">Von<input type="date" data-f="von" value="${esc(d.von)}"></label>
    <label class="field">Bis<input type="date" data-f="bis" value="${esc(d.bis)}"><span class="hint">leer = laufend</span></label>
  </div>
  <div class="grid2">
    <label class="field">Vereinbarte Gage<input class="mono" inputmode="decimal" data-f="gage" value="${esc(d.gage)}"></label>
    <label class="field">Währung<select data-f="waehrung">${waehrungOptionen(d.waehrung)}</select></label>
  </div>
  <label class="field">Agentur<input data-f="agentur" value="${esc(d.agentur)}"></label>
  <label class="field">Kontext<textarea data-f="kontext" placeholder="Rolle, Vorstellungen, Anreise, Besonderheiten … ersetzt die Word-Notiz">${esc(d.kontext)}</textarea></label>
  <button class="btn primary block" data-act="saveEng">Speichern</button>
  ${id ? '<button class="btn danger block" data-act="deleteEng">Engagement löschen</button>' : ''}`;
}

function vBeleg() {
  if (!ui.draft) {
    const d0 = today();
    const kontext = ui.params.kontext || vorschlagKontext(d0);
    ui.draft = {
      file: null, fileName: '', preview: '', belegdatum: d0, aussteller: '', gesamt: '', waehrung: 'EUR', eurGesamt: '',
      kontext, kontextManuell: !!ui.params.kontext, person: engagement(kontext)?.person || 'Olga',
      positionen: [], neu: { kategorie: kontext === 'allgemein' ? 'kommunikation' : 'uebernachtung', betrag: '', notiz: '' }
    };
  }
  const d = ui.draft;
  const e = engagement(d.kontext);
  const r = restInfo(d);
  return `<div class="between"><h1 style="font-size:24px">Beleg erfassen</h1>
    <button class="icon-btn" data-act="back" aria-label="Schließen">${icon('x')}</button></div>
  <div class="card file-pick">
    <div class="thumb">${d.preview ? `<img src="${d.preview}" alt="">` : icon('doc', 24, '#5B6168')}</div>
    <div class="grow"><div style="font-weight:700;font-size:14px;word-break:break-all">${d.fileName ? esc(d.fileName) : 'Noch keine Datei'}</div>
      <div class="muted small">Foto aufnehmen, Bild oder PDF wählen</div></div>
    <label class="btn small" for="beleg-file">${d.fileName ? 'Ändern' : 'Wählen'}</label>
    <input id="beleg-file" class="file-input" type="file" accept="image/*,application/pdf" data-file="beleg">
  </div>
  <div class="grid2">
    <label class="field">Belegdatum<input type="date" data-f="belegdatum" data-rr="1" value="${esc(d.belegdatum)}"></label>
    <label class="field">Aussteller<input data-f="aussteller" value="${esc(d.aussteller)}" placeholder="z. B. Hotel Bern"></label>
  </div>
  <div class="grid2">
    <label class="field">Gesamtbetrag<input class="mono" inputmode="decimal" data-f="gesamt" data-live="1" value="${esc(d.gesamt)}" placeholder="0,00"></label>
    <label class="field">Währung<select data-f="waehrung" data-rr="1">${waehrungOptionen(d.waehrung)}</select></label>
  </div>
  ${d.waehrung !== 'EUR' ? `<label class="field">EUR-Betrag laut Konto<input class="mono" inputmode="decimal" data-f="eurGesamt" value="${esc(d.eurGesamt)}" placeholder="0,00"><span class="hint">Der tatsächlich abgebuchte Betrag. Wird anteilig auf die Positionen verteilt.</span></label>` : ''}
  <div class="label" style="margin-top:4px">Zuordnung</div>
  <label class="field">Engagement oder allgemein<select data-f="kontext" data-rr="1">${kontextOptionen(d.kontext)}</select>
    ${!d.kontextManuell && e ? '<span class="hint">Vorgeschlagen: Das Belegdatum liegt im Zeitraum.</span>' : ''}</label>
  ${e ? `<div class="muted small">Person: ${esc(e.person)} · ${vertragText(e)}</div>` : `<label class="field">Person<select data-f="person">${personOptionen(d.person)}</select></label>`}
  <div class="between" style="margin-top:4px"><h2 style="font-size:16px">Positionen</h2><span class="chip ${r.ok ? 'green' : 'orange'}" id="rest">${esc(r.text)}</span></div>
  <div class="card flat">
    ${d.positionen.map((p) => `<div class="list-item" style="padding:10px 8px 10px 14px">
      <div class="grow"><div class="t">${esc(KAT[p.kategorie]?.name)}</div><div class="s">${esc(p.notiz || '–')}</div></div>
      <span class="num">${money(p.betrag, d.waehrung)}</span>
      <button class="icon-btn" style="border:none;width:40px;height:40px" data-act="delPos" data-id="${p.id}" aria-label="Position entfernen">${icon('x', 16, '#5B6168')}</button></div>`).join('')}
    <div class="pos-add">
      <label class="field">Kategorie<select data-f="neu.kategorie">${kategorieOptionen(d.neu.kategorie)}</select></label>
      <div class="grid2">
        <label class="field">Betrag<input class="mono" inputmode="decimal" data-f="neu.betrag" value="${esc(d.neu.betrag)}" placeholder="${d.positionen.length ? '0,00' : 'leer = Gesamtbetrag'}"></label>
        <label class="field">Notiz<input data-f="neu.notiz" value="${esc(d.neu.notiz)}" placeholder="z. B. Frühstück"></label>
      </div>
      <button class="btn small" data-act="addPos" style="border-style:dashed">${icon('plus', 16)} Position hinzufügen</button>
      <div class="muted small">Nur eine Kategorie? Dann einfach Kategorie wählen und speichern.</div>
    </div>
  </div>
  <button class="btn primary block" data-act="saveBeleg">Speichern und ablegen</button>
  <div class="muted small" style="text-align:center;font-family:var(--mono);word-break:break-all">${esc(dateiName(d.belegdatum, d.aussteller, d.positionen[0]?.kategorie || d.neu.kategorie, d.gesamt, d.waehrung, d.fileName))}</div>`;
}

function restInfo(d) {
  const gesamt = parseNum(d.gesamt);
  const used = d.positionen.reduce((a, p) => a + p.betrag, 0);
  if (!d.positionen.length) return { ok: true, rest: 0, text: gesamt ? 'eine Position = Gesamtbetrag' : 'Gesamtbetrag eingeben' };
  const rest = Math.round((gesamt - used) * 100) / 100;
  if (Math.abs(rest) < 0.005) return { ok: true, rest: 0, text: 'Rest 0,00' };
  return { ok: false, rest, text: rest > 0 ? `Offen ${money(rest, d.waehrung)}` : `Zu viel ${money(-rest, d.waehrung)}` };
}

function vBuchung() {
  const id = ui.params.id;
  if (!ui.draft) {
    const b = id ? S().buchungen.find((x) => x.id === id) : null;
    const kontext = ui.params.kontext || 'allgemein';
    ui.draft = b ? { ...b, betrag: numInput(b.betrag), eur: numInput(b.eur), quellensteuer: numInput(b.quellensteuer) } : {
      person: engagement(kontext)?.person || 'Olga', kontext, kategorie: kontext === 'allgemein' ? 'kommunikation' : 'gage',
      zahlungsdatum: today(), betrag: '', waehrung: 'EUR', eur: '', beschreibung: '', quellensteuer: '', belegId: null
    };
  }
  const d = ui.draft;
  const e = engagement(d.kontext);
  const ein = istEinnahme(d.kategorie);
  const beleg = d.belegId ? S().belege.find((x) => x.id === d.belegId) : null;
  const t = id ? topf(S().buchungen.find((x) => x.id === id)) : null;
  return `${backBtn()}<h1 style="font-size:24px">${id ? 'Buchung bearbeiten' : 'Buchung ohne Beleg'}</h1>
  ${t ? `<div class="row small"><span class="muted">Steuer-Topf:</span><span class="chip ${TOPF_STIL[t] || 'green'}">${esc(t)}</span></div>` : ''}
  <label class="field">Kategorie<select data-f="kategorie" data-rr="1">${kategorieOptionen(d.kategorie)}</select></label>
  <label class="field">Beschreibung<input data-f="beschreibung" value="${esc(d.beschreibung)}" placeholder="was und warum beruflich"></label>
  <div class="grid2">
    <label class="field">Zahlungsdatum<input type="date" data-f="zahlungsdatum" value="${esc(d.zahlungsdatum)}"><span class="hint">bestimmt das Steuerjahr</span></label>
    <label class="field">Währung<select data-f="waehrung" data-rr="1">${waehrungOptionen(d.waehrung)}</select></label>
  </div>
  <div class="grid2">
    <label class="field">Betrag${ein ? ' (Einnahme)' : ''}<input class="mono" inputmode="decimal" data-f="betrag" value="${esc(d.betrag)}" placeholder="0,00"></label>
    ${d.waehrung !== 'EUR' ? `<label class="field">EUR laut Konto<input class="mono" inputmode="decimal" data-f="eur" value="${esc(d.eur)}" placeholder="0,00"></label>` : '<div></div>'}
  </div>
  ${ein && e && e.land && e.land !== 'Deutschland' ? `<label class="field">Einbehaltene Quellensteuer (EUR)<input class="mono" inputmode="decimal" data-f="quellensteuer" value="${esc(d.quellensteuer)}" placeholder="0,00"><span class="hint">laut Abrechnung oder Bescheinigung</span></label>` : ''}
  <label class="field">Engagement oder allgemein<select data-f="kontext" data-rr="1">${kontextOptionen(d.kontext)}</select></label>
  ${e ? `<div class="muted small">Person: ${esc(e.person)} · ${vertragText(e)}</div>` : `<label class="field">Person<select data-f="person">${personOptionen(d.person)}</select></label>`}
  <div class="card file-pick">
    <div class="thumb">${icon(beleg || d.belegId ? 'check' : 'doc', 24, beleg || d.belegId ? '#2E6B3F' : '#5B6168')}</div>
    <div class="grow"><div style="font-weight:700;font-size:14px;word-break:break-all">${beleg ? esc(beleg.dateiname) : d.belegId ? 'Beispiel-Beleg' : 'Kein Beleg'}</div>
      <div class="muted small">${beleg ? date(beleg.belegdatum) : d.belegId ? 'nur in den Beispieldaten' : 'Foto oder PDF anhängen'}</div></div>
    ${beleg && beleg.hatDatei ? `<button class="btn small" data-act="viewBeleg" data-id="${beleg.id}">Ansehen</button>` : ''}
    ${!d.belegId ? '<label class="btn small" for="anh-file">Anhängen</label><input id="anh-file" class="file-input" type="file" accept="image/*,application/pdf" data-file="anhang">' : ''}
  </div>
  <button class="btn primary block" data-act="saveBuchung">Speichern</button>
  ${id ? '<button class="btn danger block" data-act="deleteBuchung">Buchung löschen</button>' : ''}`;
}

function vAllgemein() {
  const list = imJahr().filter((b) => b.kontext === 'allgemein' || !engagement(b.kontext))
    .filter((b) => ui.filter === 'Alle' || b.person === ui.filter)
    .sort((a, b) => (b.zahlungsdatum || '').localeCompare(a.zahlungsdatum || ''));
  return `<h1>Allgemein &amp; privat</h1>
  <div class="muted" style="font-size:13px;margin-top:-6px">Laufende Kosten ohne Engagement und private Ausgaben der gemeinsamen Erklärung, ${esc(ui.jahr)}</div>
  <div class="filters">${['Alle', ...PERSONEN].map((p) => `<button class="${ui.filter === p ? 'on' : ''}" data-act="filter" data-v="${p}">${p}</button>`).join('')}</div>
  ${list.length ? `<div class="card flat">${list.map((b) => {
    const t = topf(b);
    const ein = istEinnahme(b.kategorie);
    return `<button class="list-item" data-act="editBuchung" data-id="${b.id}"><div class="grow"><div class="t">${esc(b.beschreibung || KAT[b.kategorie]?.name)}</div>
      <div class="s"><span>${esc(b.person)} · ${esc(KAT[b.kategorie]?.name)}</span><span class="chip ${TOPF_STIL[t] || 'green'}">${esc(t === 'Aufgeteilt' ? '50/50' : t)}</span>${!b.belegId ? '<span class="chip orange">Beleg fehlt</span>' : ''}</div></div>
      <span class="num ${ein ? 'pos' : ''}">${ein ? '+ ' : ''}${eur(b.eur)}</span></button>`;
  }).join('')}</div>` : '<div class="empty">Keine Einträge.</div>'}
  <button class="btn block" data-act="go" data-v="buchung" data-kontext="allgemein">${icon('plus', 16)} Buchung ohne Beleg</button>`;
}

function jahresSummen() {
  const list = imJahr();
  const by = (fn) => summe(list.filter(fn));
  const split = by((b) => topf(b) === 'Aufgeteilt' && !istEinnahme(b.kategorie)) / 2;
  const eürEin = by((b) => topf(b) === 'EÜR' && istEinnahme(b.kategorie));
  const eürAus = by((b) => topf(b) === 'EÜR' && !istEinnahme(b.kategorie)) + split;
  const wk = (p) => by((b) => b.person === p && topf(b) === 'Werbungskosten' && !istEinnahme(b.kategorie))
    - by((b) => b.person === p && topf(b) === 'Werbungskosten' && istEinnahme(b.kategorie));
  return {
    eürEin, eürAus, ergebnis: Math.round((eürEin - eürAus) * 100) / 100,
    gehalt: by((b) => topf(b) === 'Anlage N (Gehalt)'),
    wkOlga: wk('Olga') + split,
    wkDominik: wk('Dominik'),
    sonder: by((b) => topf(b) === 'Sonderausgaben'),
    agb: by((b) => topf(b) === 'Außergew. Belastungen'),
    handwerker: by((b) => topf(b) === 'Handwerker'),
    kapital: by((b) => topf(b) === 'Kapitalerträge'),
    gemischt: by((b) => topf(b) === 'Gemischt'),
    nicht: by((b) => topf(b) === 'Nicht absetzbar'),
    quelle: Math.round(list.reduce((a, b) => a + (Number(b.quellensteuer) || 0), 0) * 100) / 100
  };
}

function vJahr() {
  const s = jahresSummen();
  const z = (label, sub, val, opt = {}) => `<tr><td><div style="font-weight:${opt.bold ? 800 : 600}">${label}</div><div class="muted small">${sub}</div></td>
    <td class="r"><span class="num ${opt.pos ? 'pos' : ''}">${eur(val)}</span></td></tr>`;
  return `<h1>Jahr ${esc(ui.jahr)}</h1>
  <div class="muted" style="font-size:13px;margin-top:-6px">Summen für die gemeinsame Erklärung (vereinfachte Zuordnung, vor Stufe 4 steuerlich prüfen)</div>
  <div class="card flat"><table class="sum">
    ${z('Einnahmen selbständig', 'EÜR · Olga', s.eürEin, { pos: true })}
    ${z('Betriebsausgaben', 'EÜR · Olga', s.eürAus)}
    ${z('Ergebnis selbständig', 'Gewinn laut EÜR', s.ergebnis, { bold: true })}
    ${s.gehalt ? z('Gehalt', 'Anlage N · laut Lohnsteuerbescheinigung', s.gehalt, { pos: true }) : ''}
    ${z('Werbungskosten Olga', 'Anlage N', s.wkOlga)}
    ${z('Werbungskosten Dominik', 'Anlage N', s.wkDominik)}
    ${z('Sonderausgaben', 'Vorsorge, Kita, Schulgeld, Spenden', s.sonder)}
    ${z('Außergewöhnliche Belastungen', 'Krankheitskosten', s.agb)}
    ${z('Handwerkerleistungen', 'Steuerermäßigung, nur Arbeitskosten', s.handwerker)}
    ${z('Kapitalerträge', 'Anlage KAP', s.kapital, { pos: true })}
    ${s.quelle ? z('Einbehaltene Quellensteuer', 'Ausland', s.quelle) : ''}
    ${s.nicht ? z('Nicht absetzbar', 'z. B. Frühstück auf Hotelrechnung', s.nicht) : ''}
  </table></div>
  ${s.gemischt ? `<button class="card warn" data-act="go" data-v="offen" style="font-size:13px;font-weight:600">Noch nicht zugeordnet: ${eur(s.gemischt)} gemischte Kosten. Antippen zum Zuordnen.</button>` : ''}
  <button class="btn primary block" data-act="csv">${icon('down')} Jahresübersicht exportieren</button>
  <div class="muted small">Die Datei öffnet sich in Excel. Der Export als echte Excel-Datei mit mehreren Blättern folgt mit der OneDrive-Anbindung.</div>`;
}

function vEinstellungen() {
  const s = S();
  return `${ui.stack.length ? backBtn() : ''}<h1>Einstellungen</h1>
  <div class="card stack">
    <div class="label">OneDrive</div>
    <div style="font-size:14px">Noch nicht verbunden. Die Anbindung ist der nächste Schritt.</div>
    <div class="muted small">Bis dahin liegen alle Daten nur auf diesem Gerät. Mach ab und zu eine Datensicherung.</div>
  </div>
  <div class="card stack">
    <div class="label">Datensicherung</div>
    <div class="muted small">${s.buchungen.length} Buchungen, ${s.engagements.length} Engagements, ${s.belege.length} Belege. Belegdateien sind in der Sicherung nicht enthalten.</div>
    <button class="btn block" data-act="backup">${icon('down')} Sicherung speichern</button>
    <label class="btn block" for="restore-file">${icon('up')} Sicherung wiederherstellen</label>
    <input id="restore-file" class="file-input" type="file" accept="application/json,.json" data-file="restore">
  </div>
  <div class="card stack">
    <div class="label">Testdaten</div>
    <button class="btn block" data-act="beispiele">Beispieldaten laden</button>
    <button class="btn danger block" data-act="wipe">Alle Daten löschen</button>
  </div>
  <div class="muted small" style="text-align:center">Steuer-App · Version ${APP_VERSION} · Testversion</div>`;
}

const VIEWS = {
  start: vStart, offen: vOffen, engagements: vEngagements, engDetail: vEngDetail, engForm: vEngForm,
  beleg: vBeleg, buchung: vBuchung, allgemein: vAllgemein, jahr: vJahr, einstellungen: vEinstellungen, aufenthalt: vAufenthalt
};

function nav() {
  const active = {
    start: ['start', 'offen'], engagements: ['engagements', 'engDetail', 'engForm', 'aufenthalt'],
    allgemein: ['allgemein'], jahr: ['jahr'], einstellungen: ['einstellungen']
  };
  const b = (v, label, ic) => `<button class="${active[v].includes(ui.view) ? 'active' : ''}" data-act="tab" data-v="${v}">${icon(ic, 22)}<span>${label}</span></button>`;
  return `<nav class="nav" aria-label="Hauptnavigation">
    <div class="brand"><img src="icons/icon-192.png" alt="">Steuer-App</div>
    ${b('start', 'Start', 'home')}${b('engagements', 'Engagements', 'music')}${b('allgemein', 'Allgemein', 'list')}${b('jahr', 'Jahr', 'chart')}
    <div class="nav-extra">${b('einstellungen', 'Einstellungen', 'gear')}</div>
  </nav>`;
}

function viewerHtml() {
  const v = ui.viewer;
  return `<div class="viewer" role="dialog" aria-label="Beleg">
    <div class="bar-top"><span style="word-break:break-all">${esc(v.name)}</span>
      <button class="icon-btn" style="background:transparent;border-color:#555;color:#fff" data-act="closeViewer" aria-label="Schließen">${icon('x', 20, '#fff')}</button></div>
    <div class="body">${v.type.startsWith('image/') ? `<img src="${v.url}" alt="Beleg">` : `<iframe src="${v.url}" title="Beleg"></iframe>`}</div>
  </div>`;
}

function render() {
  const s = S();
  if (!s.gestartet) {
    app.innerHTML = `<main class="main">${vWelcome()}</main>`;
    return;
  }
  const showFab = !['beleg', 'buchung', 'engForm', 'einstellungen', 'aufenthalt'].includes(ui.view);
  const kontext = ui.view === 'engDetail' ? ui.params.id : '';
  app.innerHTML = nav() +
    `<main class="main">${(VIEWS[ui.view] || vStart)()}</main>` +
    (showFab ? `<button class="fab" data-act="go" data-v="beleg" data-kontext="${kontext}">${icon('camera', 20, '#fff')}Beleg</button>` : '') +
    (ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '') +
    (ui.viewer ? viewerHtml() : '');
}

// ---------- Aktionen ----------
function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o = o[k]; });
  o[keys[keys.length - 1]] = value;
}

function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function csvExport() {
  const list = [...imJahr()].sort((a, b) => (a.zahlungsdatum || '').localeCompare(b.zahlungsdatum || ''));
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const n = (v) => (v === '' || v == null ? '' : String(Math.round(Number(v) * 100) / 100).replace('.', ','));
  const head = ['Zahlungsdatum', 'Person', 'Engagement', 'Vertragsart', 'Kategorie', 'Einnahme/Ausgabe', 'Steuer-Topf', 'Beschreibung', 'Betrag', 'Währung', 'EUR', 'Quellensteuer', 'Beleg'];
  const rows = list.map((b) => {
    const e = engagement(b.kontext);
    const beleg = S().belege.find((x) => x.id === b.belegId);
    return [date(b.zahlungsdatum), b.person, e ? e.titel : 'Allgemein', e ? vertragText(e) : '', KAT[b.kategorie]?.name,
      istEinnahme(b.kategorie) ? 'Einnahme' : 'Ausgabe', topf(b), b.beschreibung, n(b.betrag), b.waehrung, n(b.eur), n(b.quellensteuer),
      beleg ? beleg.dateiname : (b.belegId ? 'Beispiel' : 'fehlt')].map(q).join(';');
  });
  download(`Jahresuebersicht_${ui.jahr}.csv`, '﻿' + [head.map(q).join(';'), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
}

async function saveBeleg() {
  const d = ui.draft;
  const gesamt = parseNum(d.gesamt);
  if (!(gesamt > 0)) return toast('Bitte den Gesamtbetrag eingeben.');
  if (!d.belegdatum) return toast('Bitte das Belegdatum eingeben.');
  let pos = d.positionen;
  if (!pos.length) pos = [{ id: uid(), kategorie: d.neu.kategorie, betrag: gesamt, notiz: d.neu.notiz }];
  const r = restInfo({ ...d, positionen: pos });
  if (!r.ok) return toast(`Die Positionen ergeben nicht den Gesamtbetrag (${r.text}).`);
  let faktor = 1;
  if (d.waehrung !== 'EUR') {
    const eurG = parseNum(d.eurGesamt);
    if (!(eurG > 0)) return toast('Bitte den EUR-Betrag laut Konto eingeben.');
    faktor = eurG / gesamt;
  }
  const e = engagement(d.kontext);
  const belegId = uid();
  const name = dateiName(d.belegdatum, d.aussteller, pos[0].kategorie, d.gesamt, d.waehrung, d.fileName);
  if (d.file) {
    try { await saveFile(belegId, d.file); } catch (err) { return toast('Die Datei konnte nicht gespeichert werden.'); }
  }
  update((s) => {
    s.belege.push({ id: belegId, dateiname: name, originalname: d.fileName, belegdatum: d.belegdatum, aussteller: d.aussteller,
      gesamt, waehrung: d.waehrung, eurGesamt: d.waehrung === 'EUR' ? gesamt : parseNum(d.eurGesamt), hatDatei: !!d.file });
    pos.forEach((p) => {
      s.buchungen.push({ id: uid(), person: e ? e.person : d.person, kontext: d.kontext, kategorie: p.kategorie, zahlungsdatum: d.belegdatum,
        betrag: p.betrag, waehrung: d.waehrung, eur: Math.round(p.betrag * faktor * 100) / 100,
        beschreibung: [p.notiz, d.aussteller].filter(Boolean).join(' – ') || KAT[p.kategorie]?.name, belegId });
    });
  });
  if (d.preview) URL.revokeObjectURL(d.preview);
  ui.jahr = d.belegdatum.slice(0, 4);
  back();
  toast(`Gespeichert: ${pos.length} ${pos.length === 1 ? 'Buchung' : 'Buchungen'}. Datei: ${name}`);
}

function saveBuchung() {
  const d = ui.draft;
  const betrag = parseNum(d.betrag);
  if (!(betrag > 0)) return toast('Bitte einen Betrag eingeben.');
  const eurBetrag = d.waehrung === 'EUR' ? betrag : parseNum(d.eur);
  if (!(eurBetrag > 0)) return toast('Bitte den EUR-Betrag laut Konto eingeben.');
  const e = engagement(d.kontext);
  const rec = {
    person: e ? e.person : d.person, kontext: d.kontext, kategorie: d.kategorie, zahlungsdatum: d.zahlungsdatum,
    betrag, waehrung: d.waehrung, eur: eurBetrag, beschreibung: d.beschreibung, belegId: d.belegId || null,
    quellensteuer: parseNum(d.quellensteuer) || ''
  };
  const id = ui.params.id;
  update((s) => {
    if (id) {
      const i = s.buchungen.findIndex((b) => b.id === id);
      const alt = s.buchungen[i];
      // eine manuelle Zuordnung gilt nur, solange Kategorie und Kontext gleich bleiben
      const topfBleibt = alt.topf && alt.kategorie === rec.kategorie && alt.kontext === rec.kontext && alt.person === rec.person;
      s.buchungen[i] = { ...alt, ...rec, topf: topfBleibt ? alt.topf : undefined };
    } else {
      s.buchungen.push({ id: uid(), ...rec });
    }
  });
  ui.jahr = d.zahlungsdatum.slice(0, 4);
  back();
  toast('Buchung gespeichert.');
}

async function anhangHinzufuegen(file) {
  const d = ui.draft;
  const belegId = uid();
  const name = dateiName(d.zahlungsdatum, d.beschreibung, d.kategorie, d.betrag, d.waehrung, file.name);
  try { await saveFile(belegId, file); } catch (err) { return toast('Die Datei konnte nicht gespeichert werden.'); }
  update((s) => {
    s.belege.push({ id: belegId, dateiname: name, originalname: file.name, belegdatum: d.zahlungsdatum, aussteller: d.beschreibung,
      gesamt: parseNum(d.betrag), waehrung: d.waehrung, eurGesamt: parseNum(d.eur) || parseNum(d.betrag), hatDatei: true });
    const b = s.buchungen.find((x) => x.id === ui.params.id);
    if (b) b.belegId = belegId;
  });
  d.belegId = belegId;
  render();
  toast(ui.params.id ? 'Beleg angehängt.' : 'Beleg angehängt. Speichern nicht vergessen.');
}

async function zeigeBeleg(id) {
  const f = await getFile(id).catch(() => null);
  if (!f) return toast('Die Datei liegt nicht auf diesem Gerät.');
  ui.viewer = { name: S().belege.find((b) => b.id === id)?.dateiname || f.name, type: f.type || '', url: URL.createObjectURL(f.blob) };
  render();
}

const ACTIONS = {
  back,
  tab: (el) => tab(el.dataset.v),
  go: (el) => go(el.dataset.v, { id: el.dataset.id, kontext: el.dataset.kontext || undefined }),
  openEng: (el) => go('engDetail', { id: el.dataset.id }),
  editBuchung: (el) => go('buchung', { id: el.dataset.id }),
  jahr: (el) => { ui.jahr = String(Number(ui.jahr) + Number(el.dataset.d)); render(); },
  filter: (el) => { ui.filter = el.dataset.v; render(); },
  beispiele: () => {
    if (S().gestartet && S().buchungen.length && !confirm('Beispieldaten laden? Deine bisherigen Daten werden dabei ersetzt.')) return;
    starteMitBeispielen(); ui.jahr = '2026'; tab('start'); toast('Beispieldaten geladen (Steuerjahr 2026).');
  },
  leer: () => { starteLeer(); tab('start'); },
  wipe: () => { if (confirm('Wirklich alle Daten auf diesem Gerät löschen?')) { allesLoeschen(); ui.stack = []; ui.view = 'start'; render(); } },
  set: (el) => { ui.draft[el.dataset.k] = el.dataset.val; render(); },
  topf: (el) => {
    update((s) => { const b = s.buchungen.find((x) => x.id === el.dataset.id); if (b) b.topf = el.dataset.t; });
    toast(el.dataset.t === 'Aufgeteilt' ? 'Je zur Hälfte auf EÜR und Werbungskosten verteilt.' : `Zugeordnet: ${el.dataset.t}.`);
  },
  saveEng: () => {
    const d = ui.draft;
    if (!d.titel.trim()) return toast('Bitte einen Titel eingeben.');
    const id = ui.params.id || uid();
    const rec = { ...d, id, titel: d.titel.trim(), gage: parseNum(d.gage) || '' };
    update((s) => {
      const i = s.engagements.findIndex((e) => e.id === id);
      if (i >= 0) s.engagements[i] = rec; else s.engagements.push(rec);
    });
    if (rec.von) ui.jahr = rec.von.slice(0, 4);
    if (ui.params.id) back(); else { ui.view = 'engDetail'; ui.params = { id }; ui.draft = null; render(); }
    toast('Engagement gespeichert.');
  },
  deleteEng: () => {
    const id = ui.params.id;
    const n = S().buchungen.filter((b) => b.kontext === id).length;
    if (!confirm(n ? `Engagement und ${n} zugehörige Buchungen löschen?` : 'Engagement löschen?')) return;
    update((s) => {
      s.engagements = s.engagements.filter((e) => e.id !== id);
      s.buchungen = s.buchungen.filter((b) => b.kontext !== id);
      s.aufenthalte = s.aufenthalte.filter((a) => a.engagementId !== id);
    });
    ui.stack = []; tab('engagements'); toast('Engagement gelöscht.');
  },
  addPos: () => {
    const d = ui.draft;
    const betrag = parseNum(d.neu.betrag) || (d.positionen.length ? 0 : parseNum(d.gesamt));
    if (!(betrag > 0)) return toast('Bitte einen Betrag für die Position eingeben.');
    d.positionen.push({ id: uid(), kategorie: d.neu.kategorie, betrag, notiz: d.neu.notiz });
    d.neu = { ...d.neu, betrag: '', notiz: '' };
    render();
  },
  delPos: (el) => { ui.draft.positionen = ui.draft.positionen.filter((p) => p.id !== el.dataset.id); render(); },
  saveBeleg,
  saveBuchung,
  deleteBuchung: () => {
    if (!confirm('Buchung löschen?')) return;
    const id = ui.params.id;
    update((s) => { s.buchungen = s.buchungen.filter((b) => b.id !== id); });
    back(); toast('Buchung gelöscht.');
  },
  saveAuf: () => {
    const d = ui.draft;
    const t = aufenthaltTage(d);
    if (!d.von || !d.bis) return toast('Bitte Anreise und Abreise eingeben.');
    if (!t) return toast('Die Abreise liegt vor der Anreise.');
    const id = ui.params.id || uid();
    update((s) => {
      const rec = { ...d, id };
      const i = s.aufenthalte.findIndex((a) => a.id === id);
      if (i >= 0) s.aufenthalte[i] = rec; else s.aufenthalte.push(rec);
    });
    back();
    toast('Aufenthalt gespeichert.');
  },
  deleteAuf: () => {
    if (!confirm('Aufenthalt löschen?')) return;
    const id = ui.params.id;
    update((s) => { s.aufenthalte = s.aufenthalte.filter((a) => a.id !== id); });
    back(); toast('Aufenthalt gelöscht.');
  },
  viewBeleg: (el) => zeigeBeleg(el.dataset.id),
  closeViewer: () => { URL.revokeObjectURL(ui.viewer.url); ui.viewer = null; render(); },
  csv: csvExport,
  backup: () => download(`Steuer-App-Sicherung_${today()}.json`, exportJson(), 'application/json')
};

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el); }
});

function onField(ev) {
  const el = ev.target;
  if (!el.dataset || !el.dataset.f || !ui.draft) return;
  setPath(ui.draft, el.dataset.f, el.value);
  const d = ui.draft;
  if (ui.view === 'beleg') {
    if (el.dataset.f === 'belegdatum' && !d.kontextManuell) {
      d.kontext = vorschlagKontext(d.belegdatum);
    }
    if (el.dataset.f === 'kontext') d.kontextManuell = true;
  }
  if (el.dataset.rr && ev.type === 'change') render();
  if (el.dataset.live) {
    const r = restInfo(d);
    const chip = document.getElementById('rest');
    if (chip) { chip.textContent = r.text; chip.className = 'chip ' + (r.ok ? 'green' : 'orange'); }
  }
}
app.addEventListener('input', onField);
app.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.cb && ui.draft) {
    ui.draft[el.dataset.cb] = el.checked;
    if (el.dataset.cb === 'ueber8h') render();
    return;
  }
  if (el.dataset && el.dataset.file) {
    const file = el.files && el.files[0];
    if (!file) return;
    if (el.dataset.file === 'beleg') {
      const d = ui.draft;
      if (d.preview) URL.revokeObjectURL(d.preview);
      d.file = file; d.fileName = file.name;
      d.preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      render();
    } else if (el.dataset.file === 'anhang') {
      await anhangHinzufuegen(file);
    } else if (el.dataset.file === 'restore') {
      try {
        importJson(await file.text());
        tab('start'); toast('Sicherung wiederhergestellt.');
      } catch (err) { toast('Diese Datei ist keine gültige Sicherung.'); }
    }
    return;
  }
  onField(ev);
});

subscribe(() => render());
render();

// Updates: beim Start und beim Zurückkehren in die App nach einer neuen Version fragen.
// Ist eine neue Version aktiv, lädt die App einmal neu.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
}
