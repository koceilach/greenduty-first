export const GD_REPORTED_AREA_CITY_LOOKUP = [
  { name: "Algiers", lat: 36.7538, lng: 3.0588 },
  { name: "Oran", lat: 35.6971, lng: -0.6308 },
  { name: "Constantine", lat: 36.365, lng: 6.6147 },
  { name: "Annaba", lat: 36.9, lng: 7.7667 },
  { name: "Blida", lat: 36.47, lng: 2.83 },
  { name: "Tizi Ouzou", lat: 36.7118, lng: 4.045 },
  { name: "Setif", lat: 36.19, lng: 5.41 },
  { name: "Bejaia", lat: 36.75, lng: 5.06 },
] as const;

export const GD_getNearestCity = (lat: number, lng: number): string => {
  let nearest: string = GD_REPORTED_AREA_CITY_LOOKUP[0]?.name ?? "Unknown";
  let minDistance = Number.POSITIVE_INFINITY;

  GD_REPORTED_AREA_CITY_LOOKUP.forEach((city) => {
    const distance = Math.hypot(lat - city.lat, lng - city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city.name;
    }
  });

  return nearest;
};

export const GD_formatHotspotLabel = (lat: number, lng: number) => {
  const city = GD_getNearestCity(lat, lng);
  const latKey = (Math.round(lat * 100) / 100).toFixed(2);
  const lngKey = (Math.round(lng * 100) / 100).toFixed(2);
  return `${city} - Sector ${latKey}, ${lngKey}`;
};

