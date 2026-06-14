// Dynamische Expo-Config: liest app.json und ergänzt NUR für den GitHub-Pages-
// Build (Umgebungsvariable DOTS_PAGES=1) den Unterpfad `baseUrl: '/dots'`.
// So bleibt der normale Dev-Server / die Web-Vorschau (ohne DOTS_PAGES) am
// Wurzelpfad und unverändert. Das Repo muss dafür „dots" heißen.
module.exports = ({ config }) => {
  if (process.env.DOTS_PAGES) {
    config.experiments = { ...(config.experiments || {}), baseUrl: '/dots' };
  }
  return config;
};
