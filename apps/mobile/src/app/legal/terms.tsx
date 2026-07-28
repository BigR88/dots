import { useRouter } from 'expo-router';
import { LegalPage } from '@/components/LegalPage';
import { TERMS } from '@/lib/legal';

/** /legal/terms — Nutzungsregeln (Community-Richtlinien für Chat & Profile). */
export default function TermsScreen() {
  const router = useRouter();
  return (
    <LegalPage
      doc={TERMS}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
    />
  );
}
