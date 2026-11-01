// Feste Daten: Personen, Kategorien und die Regeln für den Steuer-Topf (siehe Konzept, Stufe 1).

export const PERSONEN = ['Olga', 'Dominik', 'Gemeinsam'];

export const VERKEHRSMITTEL = {
  bahn: 'Bahn',
  flug: 'Flug',
  taxi: 'Taxi',
  fahrdienst: 'Uber / Fahrdienst',
  oepnv: 'Bus, U-Bahn, Tram',
  mietwagen: 'Mietwagen',
  auto: 'Eigenes Auto'
};

// Kilometersätze je Steuerjahr. Neues Jahr: Zeile ergänzen, sobald die Werte feststehen.
// reise: je gefahrenem km (Auswärtstätigkeit, z. B. Gastvertrag)
// arbeitsweg: je km einfache Entfernung und Arbeitstag (feste Arbeitsstätte, Festvertrag)
export const KM_SAETZE = {
  2026: { reise: 0.30, arbeitsweg: 0.38 }
};

export function kmSatz(jahr, art) {
  const jahre = Object.keys(KM_SAETZE).map(Number).sort((a, b) => a - b);
  const j = jahre.filter((x) => x <= Number(jahr)).pop() ?? jahre[0];
  return { satz: KM_SAETZE[j][art], jahr: j, geschaetzt: j !== Number(jahr) };
}

export const UNTERKUNFT = {
  hotel: 'Hotel mit Rechnung',
  ferienwohnung: 'Ferienwohnung mit Rechnung',
  gestellt: 'Vom Veranstalter gestellt',
  privat: 'Privat (Freunde, Familie)',
  keine: 'Keine Übernachtung'
};

// Tage eines Aufenthalts für die Verpflegungspauschale:
// An- und Abreisetag = kleine Pauschale, Tage dazwischen = volle Pauschale.
// Eintägig: kleine Pauschale nur bei mehr als 8 Stunden Abwesenheit.
export function aufenthaltTage(a) {
  if (!a.von || !a.bis) return null;
  const d = Math.round((Date.parse(a.bis) - Date.parse(a.von)) / 864e5);
  if (d < 0) return null;
  if (d === 0) return { teil: a.ueber8h ? 1 : 0, voll: 0, naechte: 0, kalendertage: 1 };
  return { teil: 2, voll: d - 1, naechte: d, kalendertage: d + 1 };
}
export const WAEHRUNGEN = ['EUR', 'CHF', 'USD', 'GBP'];

// gruppe: einnahme | beruf | privat
// fix: Steuer-Topf, der unabhängig vom Kontext gilt
export const KATEGORIEN = [
  { id: 'gage', name: 'Gage / Honorar', gruppe: 'einnahme' },
  { id: 'gehalt', name: 'Gehalt', gruppe: 'einnahme', fix: 'Anlage N (Gehalt)' },
  { id: 'erstattung', name: 'Erstattung Reisekosten', gruppe: 'einnahme' },
  { id: 'kapital', name: 'Kapitalerträge', gruppe: 'einnahme', fix: 'Kapitalerträge' },
  { id: 'sonst_ein', name: 'Sonstige Einnahme', gruppe: 'einnahme' },

  { id: 'fahrt', name: 'Fahrtkosten', gruppe: 'beruf' },
  { id: 'uebernachtung', name: 'Übernachtung', gruppe: 'beruf' },
  { id: 'nebenkosten', name: 'Reisenebenkosten', gruppe: 'beruf' },
  { id: 'verpflegung', name: 'Verpflegung auf Rechnung', gruppe: 'beruf', fix: 'Nicht absetzbar' },
  { id: 'provision', name: 'Agenturprovision', gruppe: 'beruf' },
  { id: 'unterricht', name: 'Unterricht und Coaching', gruppe: 'beruf' },
  { id: 'noten', name: 'Noten und Fachliteratur', gruppe: 'beruf' },
  { id: 'kleidung', name: 'Bühnenkleidung und Maske', gruppe: 'beruf' },
  { id: 'werbung', name: 'Bewerbung und Werbung', gruppe: 'beruf' },
  { id: 'fortbildung', name: 'Fortbildung', gruppe: 'beruf' },
  { id: 'kommunikation', name: 'Kommunikation', gruppe: 'beruf' },
  { id: 'arbeitszimmer', name: 'Arbeitszimmer / Überaum', gruppe: 'beruf' },
  { id: 'versicherung_beruf', name: 'Berufliche Versicherungen', gruppe: 'beruf' },
  { id: 'verband', name: 'Beiträge Berufsverband', gruppe: 'beruf' },
  { id: 'sonst_aus', name: 'Sonstige Ausgabe', gruppe: 'beruf' },

  { id: 'vorsorge', name: 'Vorsorge und private Versicherungen', gruppe: 'privat', fix: 'Sonderausgaben' },
  { id: 'krankheit', name: 'Krankheitskosten', gruppe: 'privat', fix: 'Außergew. Belastungen' },
  { id: 'handwerker', name: 'Handwerkerleistungen', gruppe: 'privat', fix: 'Handwerker' },
  { id: 'steuerberatung', name: 'Steuerberatung', gruppe: 'privat', fix: 'Gemischt' },
  { id: 'spenden', name: 'Spenden', gruppe: 'privat', fix: 'Sonderausgaben' },
  { id: 'kinderbetreuung', name: 'Kinderbetreuung', gruppe: 'privat', fix: 'Sonderausgaben' },
  { id: 'schulgeld', name: 'Schulgeld', gruppe: 'privat', fix: 'Sonderausgaben' }
];

export const KAT = Object.fromEntries(KATEGORIEN.map((k) => [k.id, k]));

export function istEinnahme(katId) {
  return KAT[katId]?.gruppe === 'einnahme';
}

// Steuer-Topf einer Buchung. Die erste zutreffende Regel gilt.
export function steuerTopf(b, engagements) {
  if (b.topf) return b.topf; // manuell zugeordnet (z. B. bei gemischten Kosten)
  const k = KAT[b.kategorie];
  if (!k) return 'Gemischt';
  if (k.fix) return k.fix;
  if (b.kontext && b.kontext !== 'allgemein') {
    const e = engagements.find((x) => x.id === b.kontext);
    if (e && e.vertragsart !== 'angestellt') return 'EÜR';
    // angestellt: Erstattungen mindern die Werbungskosten, übrige Einnahmen gehören zum Gehalt
    if (e) return k.gruppe === 'einnahme' && k.id !== 'erstattung' ? 'Anlage N (Gehalt)' : 'Werbungskosten';
  }
  if (b.person === 'Dominik') return k.gruppe === 'einnahme' ? 'Anlage N (Gehalt)' : 'Werbungskosten';
  if (b.person === 'Olga' && k.id === 'gage') return 'EÜR';
  return 'Gemischt';
}

export const TOPF_STIL = {
  'EÜR': 'blue',
  'Werbungskosten': 'purple',
  'Anlage N (Gehalt)': 'purple',
  'Gemischt': 'orange',
  'Aufgeteilt': 'gray',
  'Nicht absetzbar': 'gray'
};

// Beispieldaten zum Ausprobieren
export function beispielDaten() {
  const e = [
    { id: 'e-bern', titel: 'Bern – Zauberflöte', person: 'Olga', vertragsart: 'selbstaendig', haus: 'Theater Bern', ort: 'Bern', land: 'Schweiz', von: '2026-03-12', bis: '2026-04-24', gage: 12000, waehrung: 'EUR', agentur: 'Agentur', kontext: 'Pamina, 9 Vorstellungen. Anreise mit dem Auto, Hotel nahe dem Theater.' },
    { id: 'e-zuerich', titel: 'Zürich – Konzert', person: 'Olga', vertragsart: 'selbstaendig', haus: 'Tonhalle', ort: 'Zürich', land: 'Schweiz', von: '2026-06-05', bis: '2026-06-14', gage: 7000, waehrung: 'EUR', agentur: '', kontext: 'Sopransolo, 2 Konzerte. Flug und Hotel selbst gebucht.' },
    { id: 'e-augsburg', titel: 'Augsburg – La Bohème', person: 'Olga', vertragsart: 'angestellt', haus: 'Staatstheater', ort: 'Augsburg', land: 'Deutschland', von: '2026-09-01', bis: '', gage: '', waehrung: 'EUR', agentur: '', kontext: 'Musetta, Spielzeitvertrag. Gehalt über die Lohnsteuerbescheinigung.' }
  ];
  const b = (id, person, kontext, kategorie, datum, eurBetrag, beschreibung, mitBeleg = true, extra = {}) => ({
    id, person, kontext, kategorie, zahlungsdatum: datum, betrag: eurBetrag, waehrung: 'EUR', eur: eurBetrag,
    beschreibung, belegId: mitBeleg ? 'beispiel' : null, ...extra
  });
  const buchungen = [
    b('b1', 'Olga', 'e-bern', 'gage', '2026-04-30', 6000, 'Gage 1. Rate'),
    b('b2', 'Olga', 'e-bern', 'gage', '2026-05-31', 6000, 'Gage 2. Rate'),
    b('b3', 'Olga', 'e-bern', 'provision', '2026-05-05', 1200, 'Agenturprovision'),
    b('b4', 'Olga', 'e-bern', 'fahrt', '2026-03-12', 480, 'Autofahrt Zuhause – Bern', false,
      { verkehrsmittel: 'auto', kmFahrt: { start: 'Zuhause', ziel: 'Bern', km: 800, hinRueck: true, tage: 1, satz: 0.30, art: 'reise' } }),
    b('b5', 'Olga', 'e-bern', 'fahrt', '2026-03-18', 24, 'Taxi Bahnhof – Theater', false, { verkehrsmittel: 'taxi' }),
    b('b6', 'Olga', 'e-zuerich', 'gage', '2026-06-30', 7000, 'Gage'),
    b('b7', 'Olga', 'e-zuerich', 'uebernachtung', '2026-06-14', 1380, 'Hotel Zürich', false),
    b('b8', 'Olga', 'e-zuerich', 'fahrt', '2026-06-05', 420, 'Flug nach Zürich', false, { verkehrsmittel: 'flug' }),
    b('b9', 'Olga', 'e-augsburg', 'noten', '2026-08-20', 64, 'Klavierauszug La Bohème'),
    b('b10', 'Olga', 'e-augsburg', 'fahrt', '2026-09-30', 319.2, 'Arbeitsweg September', false,
      { verkehrsmittel: 'auto', kmFahrt: { start: 'Zuhause', ziel: 'Staatstheater Augsburg', km: 42, hinRueck: false, tage: 20, satz: 0.38, art: 'arbeitsweg' } }),
    b('b11', 'Olga', 'allgemein', 'kommunikation', '2026-12-31', 480, 'Internet (Jahr)'),
    b('b12', 'Olga', 'allgemein', 'unterricht', '2026-02-01', 1800, 'Gesangsunterricht Jahrespaket'),
    b('b13', 'Gemeinsam', 'allgemein', 'kinderbetreuung', '2026-12-31', 2160, 'Kita-Gebühren'),
    b('b14', 'Gemeinsam', 'allgemein', 'spenden', '2026-11-20', 150, 'Spende'),
    b('b15', 'Gemeinsam', 'allgemein', 'krankheit', '2026-07-08', 280, 'Zahnarzt Zuzahlung'),
    b('b16', 'Gemeinsam', 'allgemein', 'handwerker', '2026-10-02', 240, 'Heizungswartung (Arbeitskosten)'),
    b('b17', 'Dominik', 'allgemein', 'sonst_aus', '2026-03-03', 89, 'Arbeitstasche'),
    b('b18', 'Gemeinsam', 'allgemein', 'kapital', '2026-12-31', 620, 'Kapitalerträge laut Jahressteuerbescheinigung')
  ];
  const aufenthalte = [
    { id: 'a1', engagementId: 'e-bern', von: '2026-03-12', bis: '2026-03-27', ort: 'Bern', land: 'Schweiz', unterkunft: 'hotel', fruehstueck: true, mittag: false, abend: false, ueber8h: false, notiz: 'Probenphase' },
    { id: 'a2', engagementId: 'e-bern', von: '2026-04-09', bis: '2026-04-24', ort: 'Bern', land: 'Schweiz', unterkunft: 'gestellt', fruehstueck: false, mittag: false, abend: false, ueber8h: false, notiz: 'Vorstellungen, Wohnung vom Theater' },
    { id: 'a3', engagementId: 'e-zuerich', von: '2026-06-05', bis: '2026-06-14', ort: 'Zürich', land: 'Schweiz', unterkunft: 'hotel', fruehstueck: true, mittag: false, abend: false, ueber8h: false, notiz: '' }
  ];
  return { engagements: e, aufenthalte, belege: [], buchungen };
}
