import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * Teilt einen Text über das native Share-Sheet (iOS/Android) bzw. die
 * Web Share API. Desktop-Browser ohne `navigator.share` (z. B. Chrome/macOS,
 * Electron-Preview): Text landet stattdessen in der Zwischenablage —
 * Rückgabe 'copied', damit die UI einen Hinweis zeigen kann.
 */
export async function shareText(message: string): Promise<ShareOutcome> {
  if (Platform.OS !== 'web') {
    try {
      await Share.share({ message });
      return 'shared';
    } catch {
      return 'failed';
    }
  }

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ text: message });
      return 'shared';
    } catch (err) {
      // Abbruch durch Nutzer:in ist kein Fehler und braucht keinen Fallback.
      if ((err as Error | undefined)?.name === 'AbortError') return 'shared';
    }
  }

  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(message);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
  return 'failed';
}
