import { useLanguage, type Language } from '@/hooks/use-language';

/**
 * Minimale i18n-Schicht: Wörterbuch (DE/EN) + `useT()` → `t(key)` für die aktuelle
 * Sprache. Bewusst klein gehalten; aktuell von der Einstellungs-Seite genutzt,
 * weitere Screens können dieselben Keys verwenden.
 */
type Entry = Record<Language, string>;

const DICT: Record<string, Entry> = {
  'settings.title': { de: 'Einstellungen', en: 'Settings' },
  'settings.back': { de: 'Zurück', en: 'Back' },

  'section.account': { de: 'Konto', en: 'Account' },
  'section.privacy': { de: 'Privatsphäre', en: 'Privacy' },
  'section.map': { de: 'Karte', en: 'Map' },
  'section.language': { de: 'Sprache', en: 'Language' },

  'account.editProfile': { de: 'Profil bearbeiten', en: 'Edit profile' },
  'account.editProfile.sub': {
    de: 'Name, @username, Bio & Vibe',
    en: 'Name, @username, bio & vibe',
  },
  'privacy.entry.sub': {
    de: 'Sichtbarkeit, Auffindbarkeit & Standort',
    en: 'Visibility, discoverability & location',
  },
  'account.signOut': { de: 'Abmelden', en: 'Sign out' },

  'priv.locationFriends': { de: 'Standort für Freunde', en: 'Location for friends' },
  'priv.locationFriends.sub': {
    de: 'Freunde dürfen sehen, wo du gerade bist',
    en: 'Friends can see where you are',
  },
  'priv.discoverable': { de: 'Über @username auffindbar', en: 'Findable by @username' },
  'priv.discoverable.sub': {
    de: 'Andere können dich per Benutzername finden',
    en: 'Others can find you by your username',
  },
  'priv.showAttendance': { de: 'Meine Zusagen zeigen', en: 'Show my plans' },
  'priv.showAttendance.sub': {
    de: 'Freunde sehen, zu welchen Events du gehst',
    en: 'Friends see which events you attend',
  },
  'priv.profileVisible': { de: 'Profil für Freunde sichtbar', en: 'Profile visible to friends' },
  'priv.profileVisible.sub': {
    de: 'Bio & Vibe nur für bestätigte Freunde',
    en: 'Bio & vibe only for accepted friends',
  },

  'map.location': { de: 'Standort auf der Karte', en: 'Location on the map' },
  'map.location.sub': {
    de: 'Zeigt deine Position als Symbol auf der Karte',
    en: 'Shows your position as a marker on the map',
  },

  'lang.hint': { de: 'Sprache der App', en: 'App language' },
  'lang.de': { de: 'Deutsch', en: 'German' },
  'lang.en': { de: 'Englisch', en: 'English' },
  'lang.note': {
    de: 'Weitere Bereiche der App folgen schrittweise auf Englisch.',
    en: 'More parts of the app will follow in English step by step.',
  },

  'tag.soon': { de: 'bald', en: 'soon' },
  'privacy.note': {
    de: 'Mit „bald" markierte Optionen werden mit dem Server-Rollout durchgesetzt.',
    en: 'Options marked “soon” will take effect with the server rollout.',
  },
};

export function useT(): (key: string) => string {
  const [lang] = useLanguage();
  return (key: string) => DICT[key]?.[lang] ?? key;
}
