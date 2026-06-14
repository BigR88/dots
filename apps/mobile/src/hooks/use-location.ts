import * as Location from 'expo-location';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { GeoPoint } from '@dots/shared';
import { FRANKFURT_CENTER } from '@/lib/geo';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied';

export interface UseLocation {
  location: GeoPoint | null;
  status: LocationStatus;
  /** DSGVO-konformer Opt-in: fragt erst auf Nutzeraktion nach Berechtigung. */
  request: () => Promise<GeoPoint | null>;
}

// Standort wird strikt opt-in geholt (§8) und nur transient im Speicher gehalten
// — kein dauerhaftes Persistieren ohne bewusste home_location.
export function useLocation(): UseLocation {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(async (): Promise<GeoPoint | null> => {
    setStatus('requesting');
    // Im Web (v. a. die Vorschau im iFrame) ist Geolocation oft blockiert. Damit
    // der Standort-Punkt trotzdem erscheint, fallen wir dort auf das Frankfurt-
    // Zentrum zurück. Auf echten Geräten (native) bleibt es beim echten Standort
    // bzw. „denied".
    const webFallback = (): GeoPoint | null => {
      if (Platform.OS === 'web') {
        setLocation(FRANKFURT_CENTER);
        setStatus('granted');
        return FRANKFURT_CENTER;
      }
      setStatus('denied');
      return null;
    };
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return webFallback();
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const point: GeoPoint = {
        lon: pos.coords.longitude,
        lat: pos.coords.latitude,
      };
      setLocation(point);
      setStatus('granted');
      return point;
    } catch {
      return webFallback();
    }
  }, []);

  return { location, status, request };
}
