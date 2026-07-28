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
  'section.appearance': { de: 'Erscheinungsbild', en: 'Appearance' },
  'section.language': { de: 'Sprache', en: 'Language' },

  'account.editProfile': { de: 'Profil bearbeiten', en: 'Edit profile' },
  'account.editProfile.sub': {
    de: 'Name, @username, Bio & Bereich',
    en: 'Name, @username, bio & area',
  },
  'privacy.entry.sub': {
    de: 'Sichtbarkeit, Auffindbarkeit & Standort',
    en: 'Visibility, discoverability & location',
  },
  'account.signOut': { de: 'Abmelden', en: 'Sign out' },
  'account.delete': { de: 'Konto löschen', en: 'Delete account' },
  'account.signIn': { de: 'Anmelden oder registrieren', en: 'Sign in or sign up' },

  'section.legal': { de: 'Rechtliches', en: 'Legal' },
  'legal.privacy': { de: 'Datenschutzerklärung', en: 'Privacy policy' },
  'legal.privacy.sub': { de: 'Welche Daten dots verarbeitet', en: 'What data dots processes' },
  'legal.terms': { de: 'Nutzungsregeln', en: 'Community rules' },
  'legal.terms.sub': { de: 'Fairer Umgang, Melden & Blockieren', en: 'Fair conduct, reporting & blocking' },
  'legal.imprint': { de: 'Impressum', en: 'Imprint' },
  'legal.imprint.sub': { de: 'Anbieterkennzeichnung', en: 'Provider identification' },
  'account.delete.confirmTitle': {
    de: 'Konto wirklich löschen?',
    en: 'Really delete your account?',
  },
  'account.delete.confirmMessage': {
    de: 'Dein Profil, deine Freundschaften, Nachrichten und Zusagen werden dauerhaft gelöscht. Das lässt sich nicht rückgängig machen.',
    en: 'Your profile, friendships, messages and RSVPs will be permanently deleted. This cannot be undone.',
  },
  'account.delete.confirm': { de: 'Endgültig löschen', en: 'Delete permanently' },
  'common.cancel': { de: 'Abbrechen', en: 'Cancel' },

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

  'theme.system': { de: 'System', en: 'System' },
  'theme.light': { de: 'Hell', en: 'Light' },
  'theme.dark': { de: 'Dunkel', en: 'Dark' },
  'theme.note': {
    de: '„System“ folgt der Einstellung deines Geräts.',
    en: '“System” follows your device setting.',
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
    de: 'Mit „bald“ markierte Optionen werden mit dem Server-Rollout durchgesetzt.',
    en: 'Options marked “soon” will take effect with the server rollout.',
  },
};

export function useT(): (key: string) => string {
  const [lang] = useLanguage();
  return (key: string) => DICT[key]?.[lang] ?? key;
}
