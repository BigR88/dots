import { useCallback, useState } from 'react';
import type { DotsEvent } from '@dots/shared';
import { type MapsProvider, openRouteWith } from '@/lib/maps-link';

type RouteEvent = Pick<DotsEvent, 'location' | 'venue' | 'addressOverride'>;

/**
 * State-Logik für die Anbieter-Auswahl (Apple Karten / Google Maps) vor dem
 * Öffnen einer Route. `promptRoute(event)` öffnet das Sheet; `chooserProps`
 * werden in <RouteChooserSheet /> gespreizt. So teilen sich alle Route-Trigger
 * (Karte wie Events) dieselbe Logik.
 */
export function useRouteChooser() {
  const [event, setEvent] = useState<RouteEvent | null>(null);

  const promptRoute = useCallback((e: RouteEvent) => setEvent(e), []);
  const close = useCallback(() => setEvent(null), []);
  const onSelect = useCallback(
    (provider: MapsProvider) => {
      if (event) void openRouteWith(event, provider);
      setEvent(null);
    },
    [event],
  );

  return { promptRoute, chooserProps: { visible: event != null, onSelect, onClose: close } };
}
