import type { GeoPoint } from './types';

/**
 * Wandelt eine PostGIS-`geography`-Spalte aus PostgREST in einen `GeoPoint`.
 * PostgREST liefert solche Spalten standardmäßig als **(E)WKB-Hex-String**
 * (z. B. `0101000020E6100000…`), nicht als GeoJSON — daher dekodieren wir das
 * hier clientseitig. GeoJSON-Objekte werden ebenfalls akzeptiert (falls die
 * Antwort doch mal als `application/geo+json` kommt).
 */
export function geoPointFromPostgis(value: unknown): GeoPoint | null {
  if (!value) return null;
  if (typeof value === 'object' && 'coordinates' in value) {
    const c = (value as { coordinates: unknown }).coordinates;
    if (Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
      return { lon: c[0], lat: c[1] };
    }
    return null;
  }
  if (typeof value === 'string') return geoPointFromWkbHex(value);
  return null;
}

function hexBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

function readU32(bytes: number[], offset: number, littleEndian: boolean): number {
  const b = bytes.slice(offset, offset + 4);
  const ordered = littleEndian ? b : b.reverse();
  return (ordered[0] | (ordered[1] << 8) | (ordered[2] << 16) | (ordered[3] << 24)) >>> 0;
}

function readF64(bytes: number[], offset: number, littleEndian: boolean): number {
  const view = new DataView(new ArrayBuffer(8));
  for (let i = 0; i < 8; i++) view.setUint8(i, bytes[offset + i]);
  return view.getFloat64(0, littleEndian);
}

/** Dekodiert einen (E)WKB-Hex-String eines Point (X=lon, Y=lat). */
function geoPointFromWkbHex(hex: string): GeoPoint | null {
  const clean = hex.trim();
  if (clean.length < 42 || !/^[0-9a-fA-F]+$/.test(clean)) return null;
  try {
    const bytes = hexBytes(clean);
    const littleEndian = bytes[0] === 1;
    const type = readU32(bytes, 1, littleEndian);
    const hasSrid = (type & 0x20000000) !== 0;
    let offset = 5; // byte-order(1) + type(4)
    if (hasSrid) offset += 4; // SRID überspringen
    const lon = readF64(bytes, offset, littleEndian);
    const lat = readF64(bytes, offset + 8, littleEndian);
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { lon, lat };
  } catch {
    return null;
  }
  return null;
}
