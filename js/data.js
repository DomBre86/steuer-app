// Feste Daten: Personen, Kategorien und die Regeln für den Steuer-Topf (siehe Konzept, Stufe 1).

export const PERSONEN = ['Olga', 'Dominik', 'Gemeinsam'];
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
    b('b4', 'Olga', 'e-bern', 'fahrt', '2026-03-12', 480, 'Fahrt mit eigenem Pkw'),
    b('b5', 'Olga', 'e-bern', 'fahrt', '2026-03-18', 74, 'Tankstelle Bern', false),
    b('b6', 'Olga', 'e-zuerich', 'gage', '2026-06-30', 7000, 'Gage'),
    b('b7', 'Olga', 'e-zuerich', 'uebernachtung', '2026-06-14', 1380, 'Hotel Zürich', false),
    b('b8', 'Olga', 'e-zuerich', 'fahrt', '2026-06-05', 420, 'Flug nach Zürich', false),
    b('b9', 'Olga', 'e-augsburg', 'noten', '2026-08-20', 64, 'Klavierauszug La Bohème'),
    b('b10', 'Olga', 'e-augsburg', 'fahrt', '2026-09-30', 312, 'Fahrten zu den Proben'),
    b('b11', 'Olga', 'allgemein', 'kommunikation', '2026-12-31', 480, 'Internet (Jahr)'),
    b('b12', 'Olga', 'allgemein', 'unterricht', '2026-02-01', 1800, 'Gesangsunterricht Jahrespaket'),
    b('b13', 'Gemeinsam', 'allgemein', 'kinderbetreuung', '2026-12-31', 2160, 'Kita-Gebühren'),
    b('b14', 'Gemeinsam', 'allgemein', 'spenden', '2026-11-20', 150, 'Spende'),
    b('b15', 'Gemeinsam', 'allgemein', 'krankheit', '2026-07-08', 280, 'Zahnarzt Zuzahlung'),
    b('b16', 'Gemeinsam', 'allgemein', 'handwerker', '2026-10-02', 240, 'Heizungswartung (Arbeitskosten)'),
    b('b17', 'Dominik', 'allgemein', 'sonst_aus', '2026-03-03', 89, 'Arbeitstasche'),
    b('b18', 'Gemeinsam', 'allgemein', 'kapital', '2026-12-31', 620, 'Kapitalerträge laut Jahressteuerbescheinigung')
  ];
  return { engagements: e, belege: [], buchungen };
}
