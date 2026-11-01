// Streckenberechnung über OpenRouteService (kostenlos, Daten von OpenStreetMap).
// Schlüssel: kostenlose Registrierung unter https://openrouteservice.org/dev/#/signup

const BASE = 'https://api.openrouteservice.org';

async function geocode(text, key) {
  const url = `${BASE}/geocode/search?api_key=${encodeURIComponent(key)}&size=1&text=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (res.status === 401 || res.status === 403) throw new Error('Der OpenRouteService-Schlüssel ist ungültig.');
  if (!res.ok) throw new Error('Der Routendienst ist gerade nicht erreichbar.');
  const data = await res.json();
  const f = data.features && data.features[0];
  if (!f) throw new Error(`„${text}“ wurde nicht gefunden. Bitte genauer angeben.`);
  return { coords: f.geometry.coordinates, label: f.properties.label };
}

// Liefert die Strecke in km (einfache Fahrt, Auto)
export async function streckeKm(start, ziel, key) {
  if (!key) throw new Error('Bitte zuerst in den Einstellungen den OpenRouteService-Schlüssel eintragen.');
  const [a, b] = await Promise.all([geocode(start, key), geocode(ziel, key)]);
  const url = `${BASE}/v2/directions/driving-car?api_key=${encodeURIComponent(key)}&start=${a.coords.join(',')}&end=${b.coords.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Für diese Strecke wurde keine Route gefunden.');
  const data = await res.json();
  const meter = data.features?.[0]?.properties?.summary?.distance;
  if (!meter) throw new Error('Für diese Strecke wurde keine Route gefunden.');
  return { km: Math.round(meter / 100) / 10, von: a.label, nach: b.label };
}

export function googleMapsLink(start, ziel) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(ziel)}&travelmode=driving`;
}
