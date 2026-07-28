import { useRouter } from 'expo-router';
import { LegalPage } from '@/components/LegalPage';
import { PRIVACY } from '@/lib/legal';

/** /legal/privacy — Datenschutzerklärung (auch Store-Pflicht-URL im Web-Export). */
export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <LegalPage
      doc={PRIVACY}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
    />
  );
}
