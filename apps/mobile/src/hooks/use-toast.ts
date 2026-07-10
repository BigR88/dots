import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Selbst-ausblendender Hinweis-Text (z. B. für MapToast): `showToast(msg)`
 * setzt die Nachricht und blendet sie nach `durationMs` wieder aus.
 */
export function useToast(durationMs = 3400) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return { toast, showToast };
}
