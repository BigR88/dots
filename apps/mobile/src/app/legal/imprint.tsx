import { useRouter } from 'expo-router';
import { LegalPage } from '@/components/LegalPage';
import { IMPRINT } from '@/lib/legal';

/** /legal/imprint — Impressum (§ 5 DDG). */
export default function ImprintScreen() {
  const router = useRouter();
  return (
    <LegalPage
      doc={IMPRINT}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings'))}
    />
  );
}
