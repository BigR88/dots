/**
 * Rechtstexte der App (Datenschutz, Nutzungsregeln, Impressum) als Daten —
 * gerendert von components/LegalPage (Routen unter /legal/* und als Overlay im
 * Auth-Screen). Die Web-Version landet über den Pages-Export automatisch unter
 * https://bigr88.github.io/dots/legal/… und dient als Pflicht-URL im Store.
 *
 * ⚠️ Platzhalter in [eckigen Klammern] vor dem Launch mit echten Angaben füllen.
 */

export interface LegalSection {
  title?: string;
  body: string;
}

export interface LegalDoc {
  key: 'privacy' | 'terms' | 'imprint';
  title: string;
  updated: string;
  sections: LegalSection[];
}

export const IMPRINT: LegalDoc = {
  key: 'imprint',
  title: 'Impressum',
  updated: '19. Juli 2026',
  sections: [
    {
      title: 'Angaben gemäß § 5 DDG',
      body: '[Vor- und Nachname]\n[Straße und Hausnummer]\n[PLZ und Ort]\nDeutschland',
    },
    {
      title: 'Kontakt',
      body: 'E-Mail: dots.developer.dots@gmail.com',
    },
    {
      title: 'Verantwortlich für den Inhalt',
      body: '[Vor- und Nachname], Anschrift wie oben.',
    },
  ],
};

export const TERMS: LegalDoc = {
  key: 'terms',
  title: 'Nutzungsregeln',
  updated: '19. Juli 2026',
  sections: [
    {
      body: 'dots hilft dir, Events in Frankfurt zu entdecken und sie gemeinsam mit Freunden zu planen. Damit das für alle angenehm bleibt, gelten ein paar einfache Regeln.',
    },
    {
      title: 'Respektvoller Umgang',
      body: 'Behandle andere so, wie du selbst behandelt werden möchtest. Belästigung, Mobbing, Drohungen, Hassrede, Diskriminierung, sexuell übergriffige Inhalte und Spam sind verboten — im Chat genauso wie im Profil.',
    },
    {
      title: 'Verbotene Inhalte',
      body: 'Keine rechtswidrigen Inhalte, keine Gewaltverherrlichung, keine Weitergabe fremder personenbezogener Daten, keine Fake-Profile und keine kommerzielle Werbung ohne unsere Zustimmung.',
    },
    {
      title: 'Melden & Blockieren',
      body: 'Du kannst andere Personen jederzeit melden (Chat oder Profil → ⋯) und blockieren. Blockierte Personen können dich nicht mehr kontaktieren oder finden. Meldungen schauen wir uns zeitnah an.',
    },
    {
      title: 'Konsequenzen',
      body: 'Bei Verstößen können wir Inhalte entfernen und Konten vorübergehend oder dauerhaft sperren. Bei rechtswidrigen Inhalten behalten wir uns weitere Schritte vor.',
    },
    {
      title: 'Alter',
      body: 'dots ist für Personen ab 16 Jahren. Einzelne Events können eigene Altersbeschränkungen haben (z. B. 18+); maßgeblich sind die Regeln des Veranstalters vor Ort.',
    },
    {
      title: 'Events & Verfügbarkeit',
      body: 'Eventdaten stellen wir nach bestem Wissen zusammen, übernehmen aber keine Gewähr für Richtigkeit und Aktualität (z. B. Absagen oder Preisänderungen). Die App stellen wir ohne Verfügbarkeitsgarantie bereit.',
    },
    {
      title: 'Kontakt',
      body: 'Fragen zu diesen Regeln? Schreib uns an dots.developer.dots@gmail.com.',
    },
  ],
};

export const PRIVACY: LegalDoc = {
  key: 'privacy',
  title: 'Datenschutzerklärung',
  updated: '19. Juli 2026',
  sections: [
    {
      title: 'Verantwortlicher',
      body: '[Vor- und Nachname]\n[Straße und Hausnummer]\n[PLZ und Ort]\nDeutschland\nE-Mail: dots.developer.dots@gmail.com',
    },
    {
      title: 'Welche Daten wir verarbeiten',
      body: 'Konto: E-Mail-Adresse, Anzeigename, optional @username; dein Passwort wird ausschließlich als kryptografischer Hash bei unserem Auth-Dienst gespeichert.\n\nInhalte: Nachrichten an Freunde, Freundschaften und Anfragen, Event-Zusagen („Bin dabei“) sowie von dir abgegebene Meldungen.\n\nNur lokal auf deinem Gerät: Favoriten und dein Profilbild werden nicht auf unsere Server übertragen.\n\nNutzung: Aufrufe von Event-Seiten fließen anonym bzw. pseudonym in die Trend-Anzeige ein.',
    },
    {
      title: 'Rechtsgrundlagen',
      body: 'Konto, Freundschaften, Chat und Zusagen verarbeiten wir zur Bereitstellung der App (Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung). Die Trend-Anzeige, die Aufbewahrung von Meldungen zur Missbrauchs-Prävention und die technische Auslieferung der Karte stützen wir auf unser berechtigtes Interesse an einer funktionierenden, sicheren App (Art. 6 Abs. 1 lit. f DSGVO). Den Gerätestandort nutzt die App nur mit deiner Einwilligung über die Systemberechtigung (Art. 6 Abs. 1 lit. a DSGVO) — und ausschließlich lokal.',
    },
    {
      title: 'Standort',
      body: 'Deinen Gerätestandort verwenden wir nur lokal auf deinem Gerät — um Entfernungen zu Events anzuzeigen und deine Position auf der Karte zu markieren. Dein Standort wird nicht an unsere Server übertragen und nicht gespeichert. Die Berechtigung kannst du jederzeit in den Systemeinstellungen entziehen.',
    },
    {
      title: 'Profilbild',
      body: 'Ein gewähltes Profilbild wird nur lokal auf deinem Gerät gespeichert und nicht auf unsere Server hochgeladen.',
    },
    {
      title: 'Hosting, Empfänger & Drittlandübermittlung',
      body: 'Für Datenbank und Anmeldung nutzen wir Supabase als Auftragsverarbeiter. Die Kartendarstellung lädt Kacheln von CARTO auf Basis von OpenStreetMap; dabei wird deine IP-Adresse technisch bedingt an den Kartendienst übermittelt.\n\nSupabase Inc. und CARTO Inc. sind US-Unternehmen; eine Übermittlung in die USA ist daher möglich. Sie erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 DSGVO) bzw. — soweit zertifiziert — des EU-U.S. Data Privacy Framework.',
    },
    {
      title: 'Kein Tracking, keine Werbung',
      body: 'dots zeigt keine Werbung, setzt keine Werbe-Tracker ein und verkauft keine Daten.',
    },
    {
      title: 'Speicherdauer & Konto-Löschung',
      body: 'Deine Daten bleiben gespeichert, solange dein Konto besteht. Du kannst dein Konto jederzeit in der App löschen (Einstellungen → Konto löschen). Dabei werden Profil, Freundschaften, Nachrichten und Zusagen dauerhaft entfernt; Meldungen bewahren wir anonymisiert zur Missbrauchs-Prävention auf.',
    },
    {
      title: 'Deine Rechte',
      body: 'Nach der DSGVO hast du das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wende dich dazu an dots.developer.dots@gmail.com. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren.',
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [PRIVACY, TERMS, IMPRINT];
