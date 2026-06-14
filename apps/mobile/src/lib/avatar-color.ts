// Deterministische Avatar-Farbe aus einer User-ID (echte Profile haben keine
// gespeicherte Farbe). Gleiche ID → immer gleiche Farbe aus der Markenpalette.
const PALETTE = [
  '#7B61FF', '#FF2E93', '#00D6A0', '#2E8BFF',
  '#FF6A3D', '#FF9F0A', '#B06CFF', '#FF2D55',
];

export function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
