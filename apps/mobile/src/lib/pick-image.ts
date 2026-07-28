import * as ImagePicker from 'expo-image-picker';

/**
 * Öffnet die Foto-Galerie (quadratischer Zuschnitt) und liefert das gewählte
 * Bild als data-URL (überlebt App-Neustart im Demo-Modus) bzw. URI. Gibt `null`
 * zurück, wenn die Berechtigung fehlt oder nichts gewählt wurde. Gleiche
 * Konfiguration wie beim Profilbild (siehe use-avatar).
 */
export async function pickImageDataUrl(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  return asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
}
