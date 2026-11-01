// Kleine Hilfsfunktionen für Anzeige und Eingabe.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function eur(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const frac = Math.abs(v % 1) > 0.001;
  return v.toLocaleString('de-DE', { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
}

export function money(n, currency) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (currency === 'EUR' ? '€' : currency);
}

// "1.234,56" oder "1234.56" -> 1234.56
export function parseNum(s) {
  if (typeof s === 'number') return s;
  let t = String(s || '').trim().replace(/\s|€|CHF/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

export function numInput(n) {
  if (n === '' || n == null) return '';
  return (Math.round(Number(n) * 100) / 100).toLocaleString('de-DE', { maximumFractionDigits: 2, useGrouping: false });
}

// "2027-03-14" -> "14.03.2027"
export function date(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function shortDate(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function period(von, bis) {
  if (!von) return '';
  if (!bis) return `${shortDate(von)}–laufend`;
  if (von === bis) return date(von);
  return `${shortDate(von)}–${date(bis)}`;
}

export function today() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Für Datei- und Ordnernamen: keine Umlaute, keine Sonderzeichen
export function slug(s) {
  return String(s || '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
